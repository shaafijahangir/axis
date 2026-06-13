import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { NexusEvents } from './ai-events';
import type {
  EnrollmentCreatedEvent,
  SubmissionCreatedEvent,
  GradeUpdatedEvent,
  AssignmentCreatedEvent,
  AiConversationStartedEvent,
  AiToolInvokedEvent,
} from './ai-events';
import {
  AI_REACTIONS_QUEUE,
  AiReactionJob,
  AI_REACTION_JOB_OPTS,
  EnrollmentWelcomeJob,
  SubmissionFeedbackJob,
  GradeSupportJob,
} from './ai-reactions.queue';

/**
 * Listens for system events and enqueues AI reactions.
 *
 * WHY: This is how AI becomes infrastructure instead of a feature. When a
 * student submits an assignment, an event fires here; when a student enrolls,
 * the study coach proactively welcomes them.
 *
 * PATTERN: Event-driven + durable queue. The listener is the fast, synchronous
 * boundary — it does no DB work and no API calls, it only drops a job on the
 * BullMQ queue and returns. AiReactionsProcessor does the slow, fallible work
 * with automatic retry/backoff (see ai-reactions.queue.ts for the rationale).
 *
 * TRADEOFF: Reactions are still fire-and-forget from the user's perspective —
 * enqueuing never blocks or fails the originating action (enroll/submit/grade).
 * But unlike the old inline handlers, a transient Anthropic outage now retries
 * instead of vanishing.
 */
@Injectable()
export class AiEventListener {
  private readonly logger = new Logger(AiEventListener.name);

  constructor(
    @InjectQueue(AI_REACTIONS_QUEUE)
    private readonly reactionsQueue: Queue,
  ) {}

  @OnEvent(NexusEvents.ENROLLMENT_CREATED)
  async handleEnrollmentCreated(event: Record<string, unknown>): Promise<void> {
    const e = event as unknown as EnrollmentCreatedEvent;
    const data: EnrollmentWelcomeJob = {
      tenantId: e.tenantId,
      userId: e.userId,
      sectionId: e.sectionId,
    };
    await this.enqueue(AiReactionJob.ENROLLMENT_WELCOME, data);
    this.logger.log(
      `[AI Reaction] Queued enrollment welcome: user=${e.userId} section=${e.sectionId}`,
    );
  }

  @OnEvent(NexusEvents.SUBMISSION_CREATED)
  async handleSubmissionCreated(event: Record<string, unknown>): Promise<void> {
    const e = event as unknown as SubmissionCreatedEvent;
    const data: SubmissionFeedbackJob = {
      tenantId: e.tenantId,
      assignmentId: e.assignmentId,
      submissionId: e.submissionId,
    };
    await this.enqueue(AiReactionJob.SUBMISSION_FEEDBACK, data);
    this.logger.log(
      `[AI Reaction] Queued submission feedback: submission=${e.submissionId} assignment=${e.assignmentId}`,
    );
  }

  @OnEvent(NexusEvents.GRADE_UPDATED)
  async handleGradeUpdated(event: Record<string, unknown>): Promise<void> {
    const e = event as unknown as GradeUpdatedEvent;
    const data: GradeSupportJob = {
      tenantId: e.tenantId,
      submissionId: e.submissionId,
      newScore: e.newScore,
    };
    await this.enqueue(AiReactionJob.GRADE_SUPPORT, data);
    this.logger.log(
      `[AI Reaction] Queued grade support check: submission=${e.submissionId} score=${e.newScore}`,
    );
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

  /**
   * Enqueue helper. Even the enqueue is defensively wrapped: if Redis is down
   * we log and move on rather than failing the user's originating action.
   */
  private async enqueue(
    jobName: AiReactionJob,
    data: EnrollmentWelcomeJob | SubmissionFeedbackJob | GradeSupportJob,
  ): Promise<void> {
    try {
      await this.reactionsQueue.add(jobName, data, AI_REACTION_JOB_OPTS);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `[AI Reaction] Failed to enqueue ${jobName}: ${message}`,
      );
    }
  }
}
