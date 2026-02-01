import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { NexusEvents } from './ai-events';
import type {
  EnrollmentCreatedEvent,
  SubmissionCreatedEvent,
  GradeUpdatedEvent,
  AssignmentCreatedEvent,
  AiConversationStartedEvent,
  AiToolInvokedEvent,
} from './ai-events';

/**
 * Listens for system events and triggers AI reactions.
 *
 * WHY: This is how AI becomes infrastructure instead of a feature.
 * When a student submits an assignment, an event fires here and can
 * queue AI feedback generation. When a student enrolls, the study coach
 * can proactively send a welcome message.
 *
 * PATTERN: Event-driven architecture. Listeners are decoupled from emitters.
 * The CourseService doesn't know or care that an AI agent reacts to enrollments.
 *
 * TRADEOFF: For v1, reactions are logged but not executed. The actual agent
 * invocations require the AgentExecutor, which we'll wire up in Phase 1 Month 2
 * when the first agents (StudyCoach, FeedbackCopilot) are fully built.
 * This listener is the hook point — the wiring is ready for when agents are.
 */
@Injectable()
export class AiEventListener {
  private readonly logger = new Logger(AiEventListener.name);

  /**
   * When a student enrolls, queue a StudyCoach welcome message.
   * Phase 1 Month 2: Will invoke StudyCoach agent with welcome context.
   */
  @OnEvent(NexusEvents.ENROLLMENT_CREATED)
  handleEnrollmentCreated(event: Record<string, unknown>): void {
    const e = event as unknown as EnrollmentCreatedEvent;
    this.logger.log(
      `[AI Reaction] Enrollment created: user=${e.userId} section=${e.sectionId} — StudyCoach welcome queued`,
    );
  }

  /**
   * When a submission is created, queue FeedbackCopilot draft feedback.
   * Phase 1 Month 2: Will invoke FeedbackCopilot agent.
   */
  @OnEvent(NexusEvents.SUBMISSION_CREATED)
  handleSubmissionCreated(event: Record<string, unknown>): void {
    const e = event as unknown as SubmissionCreatedEvent;
    this.logger.log(
      `[AI Reaction] Submission created: submission=${e.submissionId} — FeedbackCopilot draft queued`,
    );
  }

  /**
   * When a grade is updated with a low score, queue StudyCoach support.
   * Phase 1 Month 2: Will check score threshold and offer resources.
   */
  @OnEvent(NexusEvents.GRADE_UPDATED)
  handleGradeUpdated(event: Record<string, unknown>): void {
    const e = event as unknown as GradeUpdatedEvent;
    this.logger.log(
      `[AI Reaction] Grade updated: submission=${e.submissionId} score=${e.newScore} — checking threshold`,
    );
  }

  /**
   * When an assignment is created, suggest rubric improvements.
   * Phase 1 Month 2: Will invoke CourseBuilder agent.
   */
  @OnEvent(NexusEvents.ASSIGNMENT_CREATED)
  handleAssignmentCreated(event: Record<string, unknown>): void {
    const e = event as unknown as AssignmentCreatedEvent;
    this.logger.log(
      `[AI Reaction] Assignment created: "${e.title}" — CourseBuilder rubric suggestion queued`,
    );
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
