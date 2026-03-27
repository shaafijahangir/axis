import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NexusEvents } from './ai-events';
import type {
  EnrollmentCreatedEvent,
  SubmissionCreatedEvent,
  GradeUpdatedEvent,
  AssignmentCreatedEvent,
  AiConversationStartedEvent,
  AiToolInvokedEvent,
} from './ai-events';
import { AgentExecutorService } from '../agent-executor.service';
import { CourseSection } from '../../../database/entities/course-section.entity';
import { Assignment } from '../../../database/entities/assignment.entity';
import { Submission } from '../../../database/entities/submission.entity';
import { Enrollment } from '../../../database/entities/enrollment.entity';

/**
 * Listens for system events and triggers AI reactions.
 *
 * WHY: This is how AI becomes infrastructure instead of a feature.
 * When a student submits an assignment, an event fires here and
 * queues AI feedback generation. When a student enrolls, the study coach
 * proactively sends a welcome message.
 *
 * PATTERN: Event-driven architecture. Listeners are decoupled from emitters.
 * The CourseService doesn't know or care that an AI agent reacts to enrollments.
 *
 * TRADEOFF: Reactions run asynchronously (fire-and-forget) so they don't
 * block the main request. Errors are logged but don't affect the user's action.
 */
@Injectable()
export class AiEventListener {
  private readonly logger = new Logger(AiEventListener.name);

  /** Score threshold below which we offer support (as percentage, e.g., 0.6 = 60%) */
  private readonly SUPPORT_THRESHOLD = 0.6;

  constructor(
    private agentExecutor: AgentExecutorService,
    @InjectRepository(CourseSection)
    private sectionRepo: Repository<CourseSection>,
    @InjectRepository(Assignment)
    private assignmentRepo: Repository<Assignment>,
    @InjectRepository(Submission)
    private submissionRepo: Repository<Submission>,
    @InjectRepository(Enrollment)
    private enrollmentRepo: Repository<Enrollment>,
  ) {}

  /**
   * When a student enrolls, start a StudyCoach welcome conversation.
   * The AI greets them and offers to help with their new course.
   */
  @OnEvent(NexusEvents.ENROLLMENT_CREATED)
  async handleEnrollmentCreated(event: Record<string, unknown>): Promise<void> {
    const e = event as unknown as EnrollmentCreatedEvent;
    this.logger.log(
      `[AI Reaction] Enrollment created: user=${e.userId} section=${e.sectionId}`,
    );

    try {
      // Look up the section to get course context
      const section = await this.sectionRepo.findOne({
        where: { id: e.sectionId },
        relations: ['course'],
      });

      if (!section || !section.course) {
        this.logger.warn(
          `[AI Reaction] Cannot send welcome — section or course not found: ${e.sectionId}`,
        );
        return;
      }

      // Start a StudyCoach conversation with a welcome prompt
      // The agent will respond with a personalized welcome message
      const welcomePrompt = `I just enrolled in ${section.course.title} (${section.course.code}). Can you introduce yourself and tell me how you can help me succeed in this course?`;

      await this.agentExecutor.startConversation({
        tenantId: e.tenantId,
        userId: e.userId,
        roles: ['student'], // Enrollees are students
        agentType: 'study-coach',
        userMessage: welcomePrompt,
        courseId: section.course.id,
        sectionId: e.sectionId,
      });

      this.logger.log(
        `[AI Reaction] StudyCoach welcome conversation started for user=${e.userId} course=${section.course.code}`,
      );
    } catch (error) {
      // Log but don't throw — enrollment should succeed even if AI fails
      const message = error instanceof Error ? error.message : 'Unknown error';
      const stack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `[AI Reaction] Failed to start welcome conversation: ${message}`,
        stack,
      );
    }
  }

  /**
   * When a submission is created, start a FeedbackCopilot session for the instructor.
   * The AI drafts feedback that the instructor can review and approve.
   */
  @OnEvent(NexusEvents.SUBMISSION_CREATED)
  async handleSubmissionCreated(event: Record<string, unknown>): Promise<void> {
    const e = event as unknown as SubmissionCreatedEvent;
    this.logger.log(
      `[AI Reaction] Submission created: submission=${e.submissionId} assignment=${e.assignmentId}`,
    );

    try {
      // Look up the assignment and section to get instructor
      const assignment = await this.assignmentRepo.findOne({
        where: { id: e.assignmentId },
        relations: ['section', 'section.instructor'],
      });

      if (
        !assignment ||
        !assignment.section ||
        !assignment.section.instructor
      ) {
        this.logger.warn(
          `[AI Reaction] Cannot draft feedback — assignment/section/instructor not found: ${e.assignmentId}`,
        );
        return;
      }

      const instructor = assignment.section.instructor;

      // Start a FeedbackCopilot conversation for the instructor
      const feedbackPrompt = `A new submission has been received for "${assignment.title}". Please analyze submission ${e.submissionId} against the assignment rubric and draft detailed feedback.`;

      await this.agentExecutor.startConversation({
        tenantId: e.tenantId,
        userId: instructor.id,
        roles: ['instructor'],
        agentType: 'feedback-copilot',
        userMessage: feedbackPrompt,
        assignmentId: e.assignmentId,
        submissionId: e.submissionId,
        sectionId: assignment.section.id,
      });

      this.logger.log(
        `[AI Reaction] FeedbackCopilot draft started for instructor=${instructor.id} submission=${e.submissionId}`,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      const stack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `[AI Reaction] Failed to start feedback draft: ${message}`,
        stack,
      );
    }
  }

  /**
   * When a grade is updated with a low score, trigger StudyCoach support.
   * The AI reaches out to offer help and resources.
   */
  @OnEvent(NexusEvents.GRADE_UPDATED)
  async handleGradeUpdated(event: Record<string, unknown>): Promise<void> {
    const e = event as unknown as GradeUpdatedEvent;
    this.logger.log(
      `[AI Reaction] Grade updated: submission=${e.submissionId} score=${e.newScore}`,
    );

    try {
      // Look up the submission to get context
      const submission = await this.submissionRepo.findOne({
        where: { id: e.submissionId },
        relations: ['assignment', 'assignment.section', 'user'],
      });

      if (!submission || !submission.assignment || !submission.user) {
        this.logger.warn(
          `[AI Reaction] Cannot check threshold — submission not found: ${e.submissionId}`,
        );
        return;
      }

      const assignment = submission.assignment;
      const pointsPossible = Number(assignment.pointsPossible);
      const scorePercentage =
        pointsPossible > 0 ? e.newScore / pointsPossible : 0;

      // Only trigger support if below threshold
      if (scorePercentage >= this.SUPPORT_THRESHOLD) {
        this.logger.log(
          `[AI Reaction] Score ${(scorePercentage * 100).toFixed(1)}% is above threshold — no support needed`,
        );
        return;
      }

      // Start a StudyCoach support conversation for the student
      const supportPrompt = `I just received my grade for "${assignment.title}" and got ${e.newScore} out of ${pointsPossible} points (${(scorePercentage * 100).toFixed(1)}%). I'm feeling discouraged. Can you help me understand what I can do better and suggest some resources?`;

      await this.agentExecutor.startConversation({
        tenantId: e.tenantId,
        userId: submission.user.id,
        roles: ['student'],
        agentType: 'study-coach',
        userMessage: supportPrompt,
        assignmentId: assignment.id,
        submissionId: e.submissionId,
        sectionId: assignment.sectionId,
      });

      this.logger.log(
        `[AI Reaction] StudyCoach support started for user=${submission.user.id} score=${(scorePercentage * 100).toFixed(1)}%`,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      const stack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `[AI Reaction] Failed to start support conversation: ${message}`,
        stack,
      );
    }
  }

  /**
   * When an assignment is created, log it for future rubric suggestions.
   * CourseBuilder agent is not yet implemented — this is a placeholder.
   */
  @OnEvent(NexusEvents.ASSIGNMENT_CREATED)
  handleAssignmentCreated(event: Record<string, unknown>): void {
    const e = event as unknown as AssignmentCreatedEvent;
    this.logger.log(
      `[AI Reaction] Assignment created: "${e.title}" — CourseBuilder rubric suggestion queued (not yet implemented)`,
    );
    // TODO: When CourseBuilder agent exists, invoke it here to suggest rubric improvements
  }

  // ─── AI Audit Logging ───────────────────────────────────────────────

  @OnEvent(NexusEvents.AI_CONVERSATION_STARTED)
  handleConversationStarted(event: Record<string, unknown>): void {
    const e = event as unknown as AiConversationStartedEvent;
    this.logger.log(
      `[AI Audit] Conversation started: id=${e.conversationId} agent=${e.agentType} user=${e.userId}`,
    );
  }

  @OnEvent(NexusEvents.AI_TOOL_INVOKED)
  handleToolInvoked(event: Record<string, unknown>): void {
    const e = event as unknown as AiToolInvokedEvent;
    this.logger.log(
      `[AI Audit] Tool invoked: ${e.toolName} by ${e.agentType} — success=${e.success}`,
    );
  }
}
