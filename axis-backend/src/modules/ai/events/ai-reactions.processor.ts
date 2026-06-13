import { Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Job } from 'bullmq';
import { AgentExecutorService } from '../agent-executor.service';
import { CourseSection } from '../../../database/entities/course-section.entity';
import { Assignment } from '../../../database/entities/assignment.entity';
import { Submission } from '../../../database/entities/submission.entity';
import {
  AI_REACTIONS_QUEUE,
  AiReactionJob,
  EnrollmentWelcomeJob,
  SubmissionFeedbackJob,
  GradeSupportJob,
} from './ai-reactions.queue';

/**
 * Executes proactive AI reactions off the BullMQ queue.
 *
 * WHY a processor (not the listener): the work here is slow and fallible — DB
 * lookups plus an agent loop that calls the Anthropic API. By living in a
 * WorkerHost, each reaction gets BullMQ's retry/backoff for free, so a
 * transient API blip is retried instead of silently dropped.
 *
 * Throwing from `process()` signals BullMQ to retry per the job's attempts
 * policy. We only swallow (return without throwing) for permanent conditions —
 * a deleted section, a missing instructor — where retrying can never succeed.
 */
@Processor(AI_REACTIONS_QUEUE)
export class AiReactionsProcessor extends WorkerHost {
  private readonly logger = new Logger(AiReactionsProcessor.name);

  /** Score threshold below which we offer support (0.6 = 60%). */
  private readonly SUPPORT_THRESHOLD = 0.6;

  constructor(
    private readonly agentExecutor: AgentExecutorService,
    @InjectRepository(CourseSection)
    private readonly sectionRepo: Repository<CourseSection>,
    @InjectRepository(Assignment)
    private readonly assignmentRepo: Repository<Assignment>,
    @InjectRepository(Submission)
    private readonly submissionRepo: Repository<Submission>,
  ) {
    super();
  }

  async process(job: Job): Promise<void> {
    // job.name is a plain string off the wire; narrow to the job enum.
    switch (job.name as AiReactionJob) {
      case AiReactionJob.ENROLLMENT_WELCOME:
        return this.handleEnrollmentWelcome(job.data as EnrollmentWelcomeJob);
      case AiReactionJob.SUBMISSION_FEEDBACK:
        return this.handleSubmissionFeedback(job.data as SubmissionFeedbackJob);
      case AiReactionJob.GRADE_SUPPORT:
        return this.handleGradeSupport(job.data as GradeSupportJob);
      default:
        this.logger.warn(`Unknown AI reaction job: ${job.name}`);
    }
  }

  private async handleEnrollmentWelcome(
    data: EnrollmentWelcomeJob,
  ): Promise<void> {
    const section = await this.sectionRepo.findOne({
      where: { id: data.sectionId },
      relations: ['course'],
    });

    if (!section || !section.course) {
      // Permanent — section/course gone. Don't retry.
      this.logger.warn(
        `[AI Reaction] Cannot send welcome — section or course not found: ${data.sectionId}`,
      );
      return;
    }

    const welcomePrompt = `I just enrolled in ${section.course.title} (${section.course.code}). Can you introduce yourself and tell me how you can help me succeed in this course?`;

    await this.agentExecutor.startConversation({
      tenantId: data.tenantId,
      userId: data.userId,
      roles: ['student'],
      agentType: 'study-coach',
      userMessage: welcomePrompt,
      courseId: section.course.id,
      sectionId: data.sectionId,
    });

    this.logger.log(
      `[AI Reaction] StudyCoach welcome started for user=${data.userId} course=${section.course.code}`,
    );
  }

  private async handleSubmissionFeedback(
    data: SubmissionFeedbackJob,
  ): Promise<void> {
    const assignment = await this.assignmentRepo.findOne({
      where: { id: data.assignmentId },
      relations: ['section', 'section.instructor'],
    });

    if (!assignment || !assignment.section || !assignment.section.instructor) {
      this.logger.warn(
        `[AI Reaction] Cannot draft feedback — assignment/section/instructor not found: ${data.assignmentId}`,
      );
      return;
    }

    const instructor = assignment.section.instructor;
    const feedbackPrompt = `A new submission has been received for "${assignment.title}". Please analyze submission ${data.submissionId} against the assignment rubric and draft detailed feedback.`;

    await this.agentExecutor.startConversation({
      tenantId: data.tenantId,
      userId: instructor.id,
      roles: ['instructor'],
      agentType: 'feedback-copilot',
      userMessage: feedbackPrompt,
      assignmentId: data.assignmentId,
      submissionId: data.submissionId,
      sectionId: assignment.section.id,
    });

    this.logger.log(
      `[AI Reaction] FeedbackCopilot draft started for instructor=${instructor.id} submission=${data.submissionId}`,
    );
  }

  private async handleGradeSupport(data: GradeSupportJob): Promise<void> {
    const submission = await this.submissionRepo.findOne({
      where: { id: data.submissionId },
      relations: ['assignment', 'assignment.section', 'user'],
    });

    if (!submission || !submission.assignment || !submission.user) {
      this.logger.warn(
        `[AI Reaction] Cannot check threshold — submission not found: ${data.submissionId}`,
      );
      return;
    }

    const assignment = submission.assignment;
    const pointsPossible = Number(assignment.pointsPossible);
    const scorePercentage =
      pointsPossible > 0 ? data.newScore / pointsPossible : 0;

    if (scorePercentage >= this.SUPPORT_THRESHOLD) {
      this.logger.log(
        `[AI Reaction] Score ${(scorePercentage * 100).toFixed(1)}% is above threshold — no support needed`,
      );
      return;
    }

    const supportPrompt = `I just received my grade for "${assignment.title}" and got ${data.newScore} out of ${pointsPossible} points (${(scorePercentage * 100).toFixed(1)}%). I'm feeling discouraged. Can you help me understand what I can do better and suggest some resources?`;

    await this.agentExecutor.startConversation({
      tenantId: data.tenantId,
      userId: submission.user.id,
      roles: ['student'],
      agentType: 'study-coach',
      userMessage: supportPrompt,
      assignmentId: assignment.id,
      submissionId: data.submissionId,
      sectionId: assignment.sectionId,
    });

    this.logger.log(
      `[AI Reaction] StudyCoach support started for user=${submission.user.id} score=${(scorePercentage * 100).toFixed(1)}%`,
    );
  }
}
