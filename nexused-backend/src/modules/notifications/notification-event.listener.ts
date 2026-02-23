import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { NexusEvents } from '../ai/events/ai-events';
import type {
  SubmissionGradedEvent,
  AssignmentCreatedEvent,
  EnrollmentCreatedEvent,
} from '../ai/events/ai-events';
import { EmailService } from './email.service';
import { EmailTemplatesService } from './email-templates.service';
import { User } from '../../database/entities/user.entity';
import { Submission } from '../../database/entities/submission.entity';
import { Assignment } from '../../database/entities/assignment.entity';
import { CourseSection } from '../../database/entities/course-section.entity';
import {
  Enrollment,
  EnrollmentStatus,
} from '../../database/entities/enrollment.entity';

type NotificationPreferences = {
  emailOnGrade?: boolean;
  emailOnAssignment?: boolean;
  emailOnEnrollment?: boolean;
  emailOnDueReminder?: boolean;
};

function prefs(user: User): NotificationPreferences {
  return (
    (user.preferences as { notifications?: NotificationPreferences })
      ?.notifications ?? {}
  );
}

function appUrl(configService: ConfigService, path: string): string {
  const base =
    configService.get<string>('app.frontendUrl') ?? 'http://localhost:3000';
  return `${base}${path}`;
}

/**
 * WHY event-driven: Email sending is decoupled from the domain action.
 * The AssignmentsService doesn't know or care who gets emailed — it just emits.
 * New notification channels (push, SMS) can be added here without touching
 * the source modules.
 *
 * TRADEOFF: Fire-and-forget. If Resend is down, the email is lost.
 * For critical notifications (grades), a retry queue (BullMQ) would be
 * more robust — acceptable technical debt for now, tracked as future work.
 */
@Injectable()
export class NotificationEventListener {
  private readonly logger = new Logger(NotificationEventListener.name);

  constructor(
    private emailService: EmailService,
    private templates: EmailTemplatesService,
    private configService: ConfigService,
    @InjectRepository(User)
    private userRepo: Repository<User>,
    @InjectRepository(Submission)
    private submissionRepo: Repository<Submission>,
    @InjectRepository(Assignment)
    private assignmentRepo: Repository<Assignment>,
    @InjectRepository(CourseSection)
    private sectionRepo: Repository<CourseSection>,
    @InjectRepository(Enrollment)
    private enrollmentRepo: Repository<Enrollment>,
  ) {}

  @OnEvent(NexusEvents.SUBMISSION_GRADED)
  async handleSubmissionGraded(event: Record<string, unknown>): Promise<void> {
    const e = event as unknown as SubmissionGradedEvent;
    try {
      const submission = await this.submissionRepo.findOne({
        where: { id: e.submissionId },
        relations: ['assignment'],
      });
      if (!submission) return;

      const [student, assignment] = await Promise.all([
        this.userRepo.findOne({ where: { id: submission.userId } }),
        this.assignmentRepo.findOne({
          where: { id: submission.assignmentId },
          relations: ['section', 'section.course'],
        }),
      ]);
      if (!student || !assignment) return;

      // Check preference — default true
      if (prefs(student).emailOnGrade === false) return;

      const { subject, html } = this.templates.submissionGraded({
        studentName: `${student.firstName} ${student.lastName}`,
        assignmentTitle: assignment.title,
        courseCode: assignment.section?.course?.code ?? '',
        score: submission.score ?? 0,
        pointsPossible: assignment.pointsPossible,
        feedback: submission.feedback ?? undefined,
        appUrl: appUrl(
          this.configService,
          `/courses/${assignment.section?.courseId}/section/${assignment.sectionId}/assignment/${assignment.id}`,
        ),
      });

      await this.emailService.sendEmail({ to: student.email, subject, html });
    } catch (err) {
      this.logger.error('Failed to send grade notification', err);
    }
  }

  @OnEvent(NexusEvents.ASSIGNMENT_CREATED)
  async handleAssignmentCreated(event: Record<string, unknown>): Promise<void> {
    const e = event as unknown as AssignmentCreatedEvent;
    try {
      const [assignment, enrollments] = await Promise.all([
        this.assignmentRepo.findOne({
          where: { id: e.assignmentId },
          relations: ['section', 'section.course'],
        }),
        this.enrollmentRepo.find({
          where: { sectionId: e.sectionId, status: EnrollmentStatus.ACTIVE },
        }),
      ]);
      if (!assignment || enrollments.length === 0) return;

      const studentIds = enrollments.map((en) => en.userId);
      const students = await this.userRepo.findBy({ id: In(studentIds) });

      // Filter by preference and collect emails
      const recipients = students
        .filter((s) => prefs(s).emailOnAssignment !== false)
        .map((s) => s.email);

      if (recipients.length === 0) return;

      // Send individually so each student gets their own "Hi {name}" — but
      // for large sections, batch into a single multi-recipient send to reduce
      // Resend API calls. The template currently doesn't personalise by name
      // for assignment notifications, so batching is safe.
      const { subject, html } = this.templates.assignmentCreated({
        studentName: '', // batch send — no individual name
        assignmentTitle: assignment.title,
        courseCode: assignment.section?.course?.code ?? '',
        courseTitle: assignment.section?.course?.title ?? '',
        dueAt: assignment.dueAt,
        pointsPossible: assignment.pointsPossible,
        appUrl: appUrl(
          this.configService,
          `/courses/${assignment.section?.courseId}/section/${assignment.sectionId}/assignment/${assignment.id}`,
        ),
      });

      // Resend supports up to 50 recipients per call. Chunk for large sections.
      const BATCH_SIZE = 50;
      for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
        const batch = recipients.slice(i, i + BATCH_SIZE);
        await this.emailService.sendEmail({ to: batch, subject, html });
      }
    } catch (err) {
      this.logger.error('Failed to send assignment notification', err);
    }
  }

  @OnEvent(NexusEvents.ENROLLMENT_CREATED)
  async handleEnrollmentCreated(event: Record<string, unknown>): Promise<void> {
    const e = event as unknown as EnrollmentCreatedEvent;
    try {
      const [student, section] = await Promise.all([
        this.userRepo.findOne({ where: { id: e.userId } }),
        this.sectionRepo.findOne({
          where: { id: e.sectionId },
          relations: ['course', 'instructor'],
        }),
      ]);
      if (!student || !section) return;

      if (prefs(student).emailOnEnrollment === false) return;

      const instructorName = section.instructor
        ? `${(section.instructor as User).firstName} ${(section.instructor as User).lastName}`
        : 'Your instructor';

      const { subject, html } = this.templates.enrollmentConfirmed({
        studentName: `${student.firstName} ${student.lastName}`,
        courseCode: section.course?.code ?? '',
        courseTitle: section.course?.title ?? '',
        instructorName,
        appUrl: appUrl(
          this.configService,
          `/courses/${section.courseId}/section/${section.id}`,
        ),
      });

      await this.emailService.sendEmail({ to: student.email, subject, html });
    } catch (err) {
      this.logger.error('Failed to send enrollment notification', err);
    }
  }
}
