import {
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, MoreThan, Repository } from 'typeorm';
import { CourseSection } from '../../database/entities/course-section.entity';
import {
  Enrollment,
  EnrollmentRole,
  EnrollmentStatus,
} from '../../database/entities/enrollment.entity';
import { AiConversation } from '../ai/entities/ai-conversation.entity';
import { AiMessage, MessageRole } from '../ai/entities/ai-message.entity';
import type { AiProvider } from '../ai/providers/ai-provider.interface';
import { AI_PROVIDER } from '../ai/providers/ai-provider.interface';
import { GovernanceService } from '../ai/governance.service';
import { UsageTrackingService } from '../ai/usage-tracking.service';
import {
  AccessControlService,
  Actor,
} from '../access-control/access-control.service';
import {
  TutorConversationSummary,
  TutorGapAnalysis,
  TutorGapGroup,
  TutorStudentActivity,
  TutorTranscriptMessage,
} from './dto/tutor-insights.types';

/**
 * Phrases that mean a student is stuck. Deterministic on purpose: the
 * "needs attention" flag runs on every page load, so it must be free and
 * explainable ("said they were confused 3 times"), not a model call.
 */
const CONFUSION_PATTERNS: RegExp[] = [
  /\b(i'?m|im|i am) (so |really |still )?(lost|confused|stuck)\b/i,
  /\bdon'?t (understand|get (it|this))\b/i,
  /\bdoesn'?t make (any )?sense\b/i,
  /\bno idea\b/i,
];

/** Asking the Socratic tutor to just hand over the answer. */
const ANSWER_SEEKING_PATTERNS: RegExp[] = [
  /\b(just )?(give|tell|show) me the (answer|solution)\b/i,
  /\bwhat'?s the answer\b/i,
  /\bdo (it|this|my homework) for me\b/i,
];

interface StudentRef {
  id: string;
  name: string;
}

interface RawGapGroup {
  topic?: unknown;
  summary?: unknown;
  students?: unknown;
}

/**
 * Tutor Mission Control (COMPETITORS.md #1, after SchoolAI Mission Control).
 *
 * WHY: Study Coach conversations were invisible to instructors, so the AI
 * tutor was a student toy, not a teaching tool. This service lets section
 * staff see who is using the tutor, read full transcripts (MagicSchool is
 * criticized for showing summaries only), and group students by shared gaps.
 *
 * PATTERN: Resource-level authorization through AccessControlService, then
 * a section → course → enrolled-students scope. A conversation is visible
 * only when it is tagged to the section's course AND its owner is an active
 * student of the section, so an instructor of section A never sees section B.
 *
 * TRADEOFF: "Live" is polling from the client, not a socket push. Tutor
 * chats move at human speed, and polling reuses the existing GraphQL path.
 */
@Injectable()
export class TutorInsightsService {
  private readonly logger = new Logger(TutorInsightsService.name);
  private readonly GAP_MODEL = 'claude-haiku-4-5-20251001';
  private readonly ATTENTION_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
  private readonly GAP_WINDOW_MS = 14 * 24 * 60 * 60 * 1000;
  private readonly GAP_MAX_MESSAGES = 150;
  private readonly GAP_MAX_CHARS_PER_MESSAGE = 400;
  private readonly GAP_MAX_GROUPS = 5;

  constructor(
    @InjectRepository(CourseSection)
    private readonly sectionRepo: Repository<CourseSection>,
    @InjectRepository(Enrollment)
    private readonly enrollmentRepo: Repository<Enrollment>,
    @InjectRepository(AiConversation)
    private readonly conversationRepo: Repository<AiConversation>,
    @InjectRepository(AiMessage)
    private readonly messageRepo: Repository<AiMessage>,
    @Inject(AI_PROVIDER) private readonly aiProvider: AiProvider,
    private readonly governanceService: GovernanceService,
    private readonly usageTrackingService: UsageTrackingService,
    private readonly accessControl: AccessControlService,
  ) {}

  // ─── Queries ──────────────────────────────────────────────────────────

  async getSectionActivity(
    actor: Actor,
    sectionId: string,
    tenantId: string,
  ): Promise<TutorStudentActivity[]> {
    await this.accessControl.assertSectionStaff(actor, sectionId, tenantId);
    const courseId = await this.getSectionCourseId(sectionId, tenantId);
    const students = await this.getActiveStudents(sectionId, tenantId);
    if (students.length === 0) return [];

    const conversations = await this.conversationRepo.find({
      where: {
        tenantId,
        courseId,
        userId: In(students.map((s) => s.id)),
      },
    });

    const messages =
      conversations.length === 0
        ? []
        : await this.messageRepo.find({
            where: {
              conversationId: In(conversations.map((c) => c.id)),
              role: MessageRole.USER,
            },
            select: ['id', 'conversationId', 'content', 'createdAt'],
            order: { createdAt: 'ASC' },
          });

    const messagesByConversation = new Map<string, AiMessage[]>();
    for (const msg of messages) {
      const list = messagesByConversation.get(msg.conversationId) ?? [];
      list.push(msg);
      messagesByConversation.set(msg.conversationId, list);
    }

    const attentionCutoff = Date.now() - this.ATTENTION_WINDOW_MS;

    const activity = students.map((student): TutorStudentActivity => {
      const own = conversations.filter((c) => c.userId === student.id);
      const summaries: TutorConversationSummary[] = [];
      let confusedCount = 0;
      let answerSeekingCount = 0;
      let studentMessageCount = 0;

      for (const conversation of own) {
        const convMessages = messagesByConversation.get(conversation.id) ?? [];
        if (convMessages.length === 0) continue;
        studentMessageCount += convMessages.length;

        for (const msg of convMessages) {
          if (msg.createdAt.getTime() < attentionCutoff) continue;
          if (CONFUSION_PATTERNS.some((p) => p.test(msg.content))) {
            confusedCount++;
          }
          if (ANSWER_SEEKING_PATTERNS.some((p) => p.test(msg.content))) {
            answerSeekingCount++;
          }
        }

        summaries.push({
          id: conversation.id,
          title: this.truncate(convMessages[0].content, 80),
          studentMessageCount: convMessages.length,
          lastActiveAt: convMessages[convMessages.length - 1].createdAt,
        });
      }

      summaries.sort(
        (a, b) => b.lastActiveAt.getTime() - a.lastActiveAt.getTime(),
      );

      const attentionReasons: string[] = [];
      if (confusedCount > 0) {
        attentionReasons.push(
          `Said they were stuck or confused ${this.times(confusedCount)} this week`,
        );
      }
      if (answerSeekingCount > 0) {
        attentionReasons.push(
          `Asked the tutor for the answer ${this.times(answerSeekingCount)} this week`,
        );
      }

      return {
        studentId: student.id,
        studentName: student.name,
        conversationCount: summaries.length,
        studentMessageCount,
        lastActiveAt: summaries[0]?.lastActiveAt,
        needsAttention: attentionReasons.length > 0,
        attentionReasons,
        conversations: summaries,
      };
    });

    // Needs attention first, then most recently active, then inactive.
    return activity.sort((a, b) => {
      if (a.needsAttention !== b.needsAttention) {
        return a.needsAttention ? -1 : 1;
      }
      const aTime = a.lastActiveAt?.getTime() ?? 0;
      const bTime = b.lastActiveAt?.getTime() ?? 0;
      if (aTime !== bTime) return bTime - aTime;
      return a.studentName.localeCompare(b.studentName);
    });
  }

  async getTranscript(
    actor: Actor,
    sectionId: string,
    conversationId: string,
    tenantId: string,
  ): Promise<TutorTranscriptMessage[]> {
    await this.accessControl.assertSectionStaff(actor, sectionId, tenantId);
    const courseId = await this.getSectionCourseId(sectionId, tenantId);

    const conversation = await this.conversationRepo.findOne({
      where: { id: conversationId, tenantId },
    });
    // Same NotFound for "wrong course" and "not your student" so staff of
    // one section can't probe for conversations in another.
    if (!conversation || conversation.courseId !== courseId) {
      throw new NotFoundException('Conversation not found');
    }
    const enrollment = await this.enrollmentRepo.findOne({
      where: {
        sectionId,
        tenantId,
        userId: conversation.userId,
        role: EnrollmentRole.STUDENT,
        status: EnrollmentStatus.ACTIVE,
      },
    });
    if (!enrollment) {
      throw new NotFoundException('Conversation not found');
    }

    const messages = await this.messageRepo.find({
      where: {
        conversationId,
        role: In([MessageRole.USER, MessageRole.ASSISTANT]),
      },
      order: { createdAt: 'ASC' },
    });

    return messages
      .filter((m) => m.content.trim().length > 0)
      .map((m) => ({
        id: m.id,
        speaker: m.role === MessageRole.USER ? 'student' : 'tutor',
        content: m.content,
        createdAt: m.createdAt,
      }));
  }

  // ─── Mutations ────────────────────────────────────────────────────────

  /**
   * Group students by shared gaps using one cheap model call.
   *
   * WHY on demand, not scheduled: model calls cost money, so they run only
   * when an instructor clicks, and they go through the same rate limit and
   * budgets as every other AI feature.
   *
   * PRIVACY: names never leave Axis. Students are sent as S1, S2, ... and
   * mapped back after parsing.
   */
  async analyzeGaps(
    actor: Actor,
    sectionId: string,
    tenantId: string,
  ): Promise<TutorGapAnalysis> {
    await this.accessControl.assertSectionStaff(actor, sectionId, tenantId);
    const courseId = await this.getSectionCourseId(sectionId, tenantId);
    const students = await this.getActiveStudents(sectionId, tenantId);

    const generatedAt = new Date();
    const empty: TutorGapAnalysis = {
      groups: [],
      strengths: [],
      analyzedMessageCount: 0,
      generatedAt,
    };
    if (students.length === 0) return empty;

    const conversations = await this.conversationRepo.find({
      where: {
        tenantId,
        courseId,
        userId: In(students.map((s) => s.id)),
      },
      select: ['id', 'userId'],
    });
    if (conversations.length === 0) return empty;

    const recent = await this.messageRepo.find({
      where: {
        conversationId: In(conversations.map((c) => c.id)),
        role: MessageRole.USER,
        createdAt: MoreThan(new Date(Date.now() - this.GAP_WINDOW_MS)),
      },
      select: ['id', 'conversationId', 'content', 'createdAt'],
      order: { createdAt: 'DESC' },
      take: this.GAP_MAX_MESSAGES,
    });
    if (recent.length === 0) return empty;

    await this.assertAiBudget(tenantId, actor.id);

    const ownerByConversation = new Map(
      conversations.map((c) => [c.id, c.userId]),
    );
    const aliasByStudent = new Map<string, string>();
    const studentByAlias = new Map<string, StudentRef>();
    const studentById = new Map(students.map((s) => [s.id, s]));

    const lines: string[] = [];
    for (const msg of [...recent].reverse()) {
      const ownerId = ownerByConversation.get(msg.conversationId);
      const owner = ownerId ? studentById.get(ownerId) : undefined;
      if (!owner) continue;
      let alias = aliasByStudent.get(owner.id);
      if (!alias) {
        alias = `S${aliasByStudent.size + 1}`;
        aliasByStudent.set(owner.id, alias);
        studentByAlias.set(alias, owner);
      }
      const text = this.truncate(
        msg.content.replace(/\s+/g, ' '),
        this.GAP_MAX_CHARS_PER_MESSAGE,
      );
      lines.push(`${alias}: ${text}`);
    }

    // Provider errors (billing, outages) are logged in full but shown to the
    // teacher as one plain sentence, never the raw vendor payload.
    let response: Awaited<ReturnType<AiProvider['sendMessage']>>;
    try {
      response = await this.aiProvider.sendMessage({
        systemPrompt: this.buildGapPrompt(),
        messages: [
          {
            role: 'user',
            content: `Student messages to the course tutor, oldest first:\n\n${lines.join('\n')}`,
          },
        ],
        model: this.GAP_MODEL,
        maxTokens: 1500,
      });
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      this.logger.error(`Gap analysis model call failed: ${detail}`);
      throw new HttpException(
        'The AI is unavailable right now. Try again later.',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    await this.usageTrackingService.logUsage({
      tenantId,
      userId: actor.id,
      agentType: 'tutor-insights',
      inputTokens: response.usage.inputTokens,
      outputTokens: response.usage.outputTokens,
      model: response.model,
    });

    const textBlock = response.content.find((b) => b.type === 'text');
    const raw = textBlock && textBlock.type === 'text' ? textBlock.text : '';
    const parsed = this.parseGapJson(raw);

    const groups: TutorGapGroup[] = parsed.groups
      .map((g): TutorGapGroup | null => {
        const topic = typeof g.topic === 'string' ? g.topic.trim() : '';
        const summary = typeof g.summary === 'string' ? g.summary.trim() : '';
        const aliases = Array.isArray(g.students) ? g.students : [];
        const members = [
          ...new Set(
            aliases
              .filter((a): a is string => typeof a === 'string')
              .map((a) => studentByAlias.get(a.trim()))
              .filter((s): s is StudentRef => !!s),
          ),
        ];
        if (!topic || members.length === 0) return null;
        return {
          topic,
          summary,
          studentIds: members.map((s) => s.id),
          studentNames: members.map((s) => s.name),
        };
      })
      .filter((g): g is TutorGapGroup => g !== null)
      .slice(0, this.GAP_MAX_GROUPS);

    return {
      groups,
      strengths: parsed.strengths,
      analyzedMessageCount: lines.length,
      generatedAt,
    };
  }

  // ─── Private helpers ──────────────────────────────────────────────────

  private async getSectionCourseId(
    sectionId: string,
    tenantId: string,
  ): Promise<string> {
    const section = await this.sectionRepo
      .createQueryBuilder('section')
      .innerJoin('section.course', 'course')
      .where('section.id = :sectionId', { sectionId })
      .andWhere('course.tenantId = :tenantId', { tenantId })
      .getOne();
    if (!section) {
      throw new NotFoundException('Section not found');
    }
    return section.courseId;
  }

  private async getActiveStudents(
    sectionId: string,
    tenantId: string,
  ): Promise<StudentRef[]> {
    const enrollments = await this.enrollmentRepo.find({
      where: {
        sectionId,
        tenantId,
        role: EnrollmentRole.STUDENT,
        status: EnrollmentStatus.ACTIVE,
      },
      relations: ['user'],
    });
    return enrollments
      .filter((e) => !!e.user)
      .map((e) => ({
        id: e.userId,
        name: `${e.user.firstName} ${e.user.lastName}`.trim(),
      }));
  }

  private async assertAiBudget(tenantId: string, userId: string) {
    const [rateOk, dailyOk, monthlyOk] = await Promise.all([
      this.governanceService.checkRateLimit(tenantId, userId),
      this.governanceService.checkDailyTokenBudget(tenantId),
      this.governanceService.checkMonthlyBudget(tenantId),
    ]);
    if (!rateOk || !dailyOk || !monthlyOk) {
      throw new HttpException(
        'AI usage limit reached for now. Try again later.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  private buildGapPrompt(): string {
    return [
      'You help a teacher see where their class is struggling, from what students asked an AI tutor.',
      'Students are labelled S1, S2, and so on. Group students who share the same misunderstanding or gap.',
      `Return at most ${this.GAP_MAX_GROUPS} groups, biggest first. Only include a gap if a student message shows it.`,
      'Also list up to 3 things the class seems to understand well.',
      'Reply with JSON only, no prose, in exactly this shape:',
      '{"groups":[{"topic":"short gap name","summary":"one sentence on what they misunderstand","students":["S1","S3"]}],"strengths":["..."]}',
    ].join('\n');
  }

  private parseGapJson(raw: string): {
    groups: RawGapGroup[];
    strengths: string[];
  } {
    let text = raw.trim();
    if (text.startsWith('```')) {
      text = text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
    }
    try {
      const data = JSON.parse(text) as {
        groups?: unknown;
        strengths?: unknown;
      };
      return {
        groups: Array.isArray(data.groups)
          ? (data.groups as RawGapGroup[])
          : [],
        strengths: Array.isArray(data.strengths)
          ? data.strengths
              .filter((s): s is string => typeof s === 'string')
              .slice(0, 3)
          : [],
      };
    } catch {
      this.logger.error(
        `Gap analysis JSON parse failed: ${text.slice(0, 200)}`,
      );
      throw new HttpException(
        'The AI returned an unreadable answer. Try again.',
        HttpStatus.BAD_GATEWAY,
      );
    }
  }

  private truncate(text: string, max: number): string {
    const clean = text.trim();
    return clean.length > max ? `${clean.slice(0, max - 1)}…` : clean;
  }

  private times(n: number): string {
    return n === 1 ? 'once' : `${n} times`;
  }
}
