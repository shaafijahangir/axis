import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  ForbiddenException,
  HttpException,
  NotFoundException,
} from '@nestjs/common';
import { TutorInsightsService } from './tutor-insights.service';
import { CourseSection } from '../../database/entities/course-section.entity';
import {
  Enrollment,
  EnrollmentRole,
  EnrollmentStatus,
} from '../../database/entities/enrollment.entity';
import { AiConversation } from '../ai/entities/ai-conversation.entity';
import { AiMessage, MessageRole } from '../ai/entities/ai-message.entity';
import { AI_PROVIDER } from '../ai/providers/ai-provider.interface';
import { GovernanceService } from '../ai/governance.service';
import { UsageTrackingService } from '../ai/usage-tracking.service';
import {
  AccessControlService,
  Actor,
} from '../access-control/access-control.service';
import { UserRole } from '../../database/entities/user.entity';
import {
  createMockRepository,
  createMockQueryBuilder,
  MockRepository,
} from '../../test/mocks/repository.mock';

/** Shape of the `where` TypeORM receives; `In([...])` exposes `.value`. */
type InValue = { value: string[] };
type FindWhere<T> = { where: T };

describe('TutorInsightsService', () => {
  let service: TutorInsightsService;
  let sectionRepo: MockRepository<CourseSection>;
  let enrollmentRepo: MockRepository<Enrollment>;
  let conversationRepo: MockRepository<AiConversation>;
  let messageRepo: MockRepository<AiMessage>;
  let aiProvider: { sendMessage: jest.Mock };
  let governance: {
    checkRateLimit: jest.Mock;
    checkDailyTokenBudget: jest.Mock;
    checkMonthlyBudget: jest.Mock;
  };
  let usageTracking: { logUsage: jest.Mock };
  let accessControl: { assertSectionStaff: jest.Mock };

  const tenantId = 'tenant-1';
  const sectionId = 'section-1';
  const courseId = 'course-1';
  const instructor: Actor = { id: 'instr-1', roles: [UserRole.INSTRUCTOR] };

  const now = Date.now();
  const hoursAgo = (h: number) => new Date(now - h * 60 * 60 * 1000);

  const enrollments = [
    {
      userId: 'stud-ada',
      user: { firstName: 'Ada', lastName: 'Lovelace' },
    },
    {
      userId: 'stud-bob',
      user: { firstName: 'Bob', lastName: 'Builder' },
    },
    {
      userId: 'stud-cy',
      user: { firstName: 'Cy', lastName: 'Quiet' },
    },
  ];

  const conversations = [
    { id: 'conv-ada-1', userId: 'stud-ada', courseId },
    { id: 'conv-bob-1', userId: 'stud-bob', courseId },
  ];

  const studentMessages = [
    {
      id: 'm1',
      conversationId: 'conv-ada-1',
      role: MessageRole.USER,
      content: 'How do props work?',
      createdAt: hoursAgo(5),
    },
    {
      id: 'm2',
      conversationId: 'conv-bob-1',
      role: MessageRole.USER,
      content: "I'm so confused about useState",
      createdAt: hoursAgo(3),
    },
    {
      id: 'm3',
      conversationId: 'conv-bob-1',
      role: MessageRole.USER,
      content: 'just give me the answer please',
      createdAt: hoursAgo(2),
    },
  ];

  beforeEach(async () => {
    sectionRepo = createMockRepository<CourseSection>();
    enrollmentRepo = createMockRepository<Enrollment>();
    conversationRepo = createMockRepository<AiConversation>();
    messageRepo = createMockRepository<AiMessage>();
    aiProvider = { sendMessage: jest.fn() };
    governance = {
      checkRateLimit: jest.fn().mockResolvedValue(true),
      checkDailyTokenBudget: jest.fn().mockResolvedValue(true),
      checkMonthlyBudget: jest.fn().mockResolvedValue(true),
    };
    usageTracking = { logUsage: jest.fn().mockResolvedValue(undefined) };
    accessControl = {
      assertSectionStaff: jest.fn().mockResolvedValue(undefined),
    };

    const qb = createMockQueryBuilder<CourseSection>();
    qb.getOne!.mockResolvedValue({ id: sectionId, courseId });
    sectionRepo.createQueryBuilder!.mockReturnValue(qb as never);

    enrollmentRepo.find!.mockResolvedValue(enrollments);
    conversationRepo.find!.mockResolvedValue(conversations);
    messageRepo.find!.mockResolvedValue(studentMessages);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TutorInsightsService,
        { provide: getRepositoryToken(CourseSection), useValue: sectionRepo },
        { provide: getRepositoryToken(Enrollment), useValue: enrollmentRepo },
        {
          provide: getRepositoryToken(AiConversation),
          useValue: conversationRepo,
        },
        { provide: getRepositoryToken(AiMessage), useValue: messageRepo },
        { provide: AI_PROVIDER, useValue: aiProvider },
        { provide: GovernanceService, useValue: governance },
        { provide: UsageTrackingService, useValue: usageTracking },
        { provide: AccessControlService, useValue: accessControl },
      ],
    }).compile();

    service = module.get(TutorInsightsService);
  });

  // ─── getSectionActivity ───────────────────────────────────────────────

  describe('getSectionActivity', () => {
    it('rejects callers who are not staff of the section', async () => {
      accessControl.assertSectionStaff.mockRejectedValue(
        new ForbiddenException(),
      );
      await expect(
        service.getSectionActivity(instructor, sectionId, tenantId),
      ).rejects.toThrow(ForbiddenException);
      expect(conversationRepo.find).not.toHaveBeenCalled();
    });

    it('only queries active students of the section, scoped to its course and tenant', async () => {
      await service.getSectionActivity(instructor, sectionId, tenantId);

      expect(enrollmentRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            sectionId,
            tenantId,
            role: EnrollmentRole.STUDENT,
            status: EnrollmentStatus.ACTIVE,
          },
        }),
      );
      const [{ where }] = conversationRepo.find!.mock.calls[0] as [
        FindWhere<{ tenantId: string; courseId: string; userId: InValue }>,
      ];
      expect(where.tenantId).toBe(tenantId);
      expect(where.courseId).toBe(courseId);
      expect(where.userId.value).toEqual(['stud-ada', 'stud-bob', 'stud-cy']);
    });

    it('flags confused and answer seeking students first, inactive last', async () => {
      const result = await service.getSectionActivity(
        instructor,
        sectionId,
        tenantId,
      );

      expect(result.map((r) => r.studentName)).toEqual([
        'Bob Builder',
        'Ada Lovelace',
        'Cy Quiet',
      ]);

      const bob = result[0];
      expect(bob.needsAttention).toBe(true);
      expect(bob.attentionReasons).toEqual([
        'Said they were stuck or confused once this week',
        'Asked the tutor for the answer once this week',
      ]);
      expect(bob.studentMessageCount).toBe(2);
      expect(bob.conversations[0].title).toBe("I'm so confused about useState");

      const ada = result[1];
      expect(ada.needsAttention).toBe(false);
      expect(ada.conversationCount).toBe(1);

      const cy = result[2];
      expect(cy.conversationCount).toBe(0);
      expect(cy.lastActiveAt).toBeUndefined();
    });

    it('ignores confusion older than 7 days', async () => {
      messageRepo.find!.mockResolvedValue([
        {
          id: 'old',
          conversationId: 'conv-bob-1',
          role: MessageRole.USER,
          content: "I don't understand this",
          createdAt: hoursAgo(24 * 10),
        },
      ]);
      const result = await service.getSectionActivity(
        instructor,
        sectionId,
        tenantId,
      );
      const bob = result.find((r) => r.studentId === 'stud-bob')!;
      expect(bob.needsAttention).toBe(false);
      expect(bob.studentMessageCount).toBe(1);
    });

    it('returns an empty list for a section with no students', async () => {
      enrollmentRepo.find!.mockResolvedValue([]);
      await expect(
        service.getSectionActivity(instructor, sectionId, tenantId),
      ).resolves.toEqual([]);
      expect(conversationRepo.find).not.toHaveBeenCalled();
    });

    it('throws NotFound when the section is not in the tenant', async () => {
      const qb = createMockQueryBuilder<CourseSection>();
      qb.getOne!.mockResolvedValue(null);
      sectionRepo.createQueryBuilder!.mockReturnValue(qb as never);
      await expect(
        service.getSectionActivity(instructor, sectionId, tenantId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ─── getTranscript ────────────────────────────────────────────────────

  describe('getTranscript', () => {
    it('returns student and tutor turns only, never tool traffic', async () => {
      conversationRepo.findOne!.mockResolvedValue(conversations[1]);
      enrollmentRepo.findOne!.mockResolvedValue({ id: 'enr-bob' });
      messageRepo.find!.mockResolvedValue([
        {
          id: 'a',
          role: MessageRole.USER,
          content: 'help',
          createdAt: hoursAgo(2),
        },
        {
          id: 'b',
          role: MessageRole.ASSISTANT,
          content: 'What have you tried?',
          createdAt: hoursAgo(1),
        },
        {
          id: 'c',
          role: MessageRole.ASSISTANT,
          content: '   ',
          createdAt: hoursAgo(1),
        },
      ]);

      const result = await service.getTranscript(
        instructor,
        sectionId,
        'conv-bob-1',
        tenantId,
      );

      expect(result.map((m) => m.speaker)).toEqual(['student', 'tutor']);
      const [{ where }] = messageRepo.find!.mock.calls[0] as [
        FindWhere<{ role: InValue }>,
      ];
      expect(where.role.value).toEqual([
        MessageRole.USER,
        MessageRole.ASSISTANT,
      ]);
    });

    it('hides conversations tagged to a different course', async () => {
      conversationRepo.findOne!.mockResolvedValue({
        ...conversations[1],
        courseId: 'other-course',
      });
      await expect(
        service.getTranscript(instructor, sectionId, 'conv-bob-1', tenantId),
      ).rejects.toThrow(NotFoundException);
      expect(messageRepo.find).not.toHaveBeenCalled();
    });

    it('hides conversations of students outside the section', async () => {
      conversationRepo.findOne!.mockResolvedValue(conversations[1]);
      enrollmentRepo.findOne!.mockResolvedValue(null);
      await expect(
        service.getTranscript(instructor, sectionId, 'conv-bob-1', tenantId),
      ).rejects.toThrow(NotFoundException);
      expect(messageRepo.find).not.toHaveBeenCalled();
    });

    it('scopes the conversation lookup by tenant', async () => {
      conversationRepo.findOne!.mockResolvedValue(null);
      await expect(
        service.getTranscript(instructor, sectionId, 'conv-x', tenantId),
      ).rejects.toThrow(NotFoundException);
      expect(conversationRepo.findOne).toHaveBeenCalledWith({
        where: { id: 'conv-x', tenantId },
      });
    });
  });

  // ─── analyzeGaps ──────────────────────────────────────────────────────

  describe('analyzeGaps', () => {
    const aiReply = (text: string) => ({
      content: [{ type: 'text', text }],
      usage: { inputTokens: 900, outputTokens: 120 },
      model: 'claude-haiku-4-5-20251001',
      stopReason: 'end_turn',
    });

    beforeEach(() => {
      // analyzeGaps reads newest first
      messageRepo.find!.mockResolvedValue([...studentMessages].reverse());
    });

    it('sends pseudonyms, never names, and maps groups back to students', async () => {
      aiProvider.sendMessage.mockResolvedValue(
        aiReply(
          '```json\n{"groups":[{"topic":"State","summary":"Mixes up state and props","students":["S2","S9"]}],"strengths":["Props basics"]}\n```',
        ),
      );

      const result = await service.analyzeGaps(instructor, sectionId, tenantId);

      const [request] = aiProvider.sendMessage.mock.calls[0] as [
        { messages: Array<{ content: string }> },
      ];
      const prompt = request.messages[0].content;
      expect(prompt).not.toMatch(/Ada|Lovelace|Bob|Builder/);
      // Oldest message first, so Ada (m1) is S1 and Bob is S2.
      expect(prompt).toContain('S1: How do props work?');
      expect(prompt).toContain("S2: I'm so confused about useState");

      expect(result.groups).toEqual([
        {
          topic: 'State',
          summary: 'Mixes up state and props',
          studentIds: ['stud-bob'],
          studentNames: ['Bob Builder'],
        },
      ]);
      expect(result.strengths).toEqual(['Props basics']);
      expect(result.analyzedMessageCount).toBe(3);
      expect(usageTracking.logUsage).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId,
          userId: instructor.id,
          agentType: 'tutor-insights',
          inputTokens: 900,
          outputTokens: 120,
        }),
      );
    });

    it('drops groups whose students are all unknown aliases', async () => {
      aiProvider.sendMessage.mockResolvedValue(
        aiReply(
          '{"groups":[{"topic":"Ghost","summary":"x","students":["S7"]}]}',
        ),
      );
      const result = await service.analyzeGaps(instructor, sectionId, tenantId);
      expect(result.groups).toEqual([]);
    });

    it('does not call the model when there is nothing to analyze', async () => {
      messageRepo.find!.mockResolvedValue([]);
      const result = await service.analyzeGaps(instructor, sectionId, tenantId);
      expect(result.analyzedMessageCount).toBe(0);
      expect(aiProvider.sendMessage).not.toHaveBeenCalled();
    });

    it('refuses with 429 when the tenant AI budget is spent', async () => {
      governance.checkDailyTokenBudget.mockResolvedValue(false);
      await expect(
        service.analyzeGaps(instructor, sectionId, tenantId),
      ).rejects.toMatchObject({ status: 429 });
      expect(aiProvider.sendMessage).not.toHaveBeenCalled();
    });

    it('turns unparseable model output into a clear error', async () => {
      aiProvider.sendMessage.mockResolvedValue(aiReply('Sure! Here are...'));
      await expect(
        service.analyzeGaps(instructor, sectionId, tenantId),
      ).rejects.toThrow(HttpException);
    });

    it('hides raw provider errors behind a plain 503 and logs no usage', async () => {
      aiProvider.sendMessage.mockRejectedValue(
        new Error('400 {"error":{"message":"Your credit balance is too low"}}'),
      );
      await expect(
        service.analyzeGaps(instructor, sectionId, tenantId),
      ).rejects.toMatchObject({
        status: 503,
        message: 'The AI is unavailable right now. Try again later.',
      });
      expect(usageTracking.logUsage).not.toHaveBeenCalled();
    });
  });
});
