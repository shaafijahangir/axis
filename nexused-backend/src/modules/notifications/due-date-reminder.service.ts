import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, Not, MoreThan, LessThan, In } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { EmailService } from './email.service';
import { EmailTemplatesService } from './email-templates.service';
import { Assignment } from '../../database/entities/assignment.entity';
import { Submission } from '../../database/entities/submission.entity';
import {
  Enrollment,
  EnrollmentStatus,
} from '../../database/entities/enrollment.entity';
import { User } from '../../database/entities/user.entity';

type NotificationPreferences = { emailOnDueReminder?: boolean };

function appUrl(configService: ConfigService, path: string): string {
  const base =
    configService.get<string>('app.frontendUrl') ?? 'http://localhost:3000';
  return `${base}${path}`;
}

/**
 * WHY twice daily (8am and 6pm UTC): Covers both the "morning check" and
 * "evening reminder" patterns. Students on UTC±12 will always get at least
 * one reminder at a reasonable hour.
 *
 * WHY check for existing submissions before sending: Don't remind students
 * who already submitted — that's noise and erodes trust in notifications.
 */
@Injectable()
export class DueDateReminderService {
  private readonly logger = new Logger(DueDateReminderService.name);

  constructor(
    private emailService: EmailService,
    private templates: EmailTemplatesService,
    private configService: ConfigService,
    @InjectRepository(Assignment)
    private assignmentRepo: Repository<Assignment>,
    @InjectRepository(Submission)
    private submissionRepo: Repository<Submission>,
    @InjectRepository(Enrollment)
    private enrollmentRepo: Repository<Enrollment>,
    @InjectRepository(User)
    private userRepo: Repository<User>,
  ) {}

  /** Runs at 8:00 AM UTC daily — sends 24-hour reminders */
  @Cron('0 8 * * *', { name: 'due-reminder-24h' })
  async sendTwentyFourHourReminders(): Promise<void> {
    await this.sendReminders(24);
  }

  /** Runs at 6:00 PM UTC daily — sends 2-hour reminders for same-day deadlines */
  @Cron('0 18 * * *', { name: 'due-reminder-2h' })
  async sendTwoHourReminders(): Promise<void> {
    await this.sendReminders(2);
  }

  private async sendReminders(hoursAhead: number): Promise<void> {
    try {
      const now = new Date();
      const windowStart = new Date(now.getTime() + hoursAhead * 60 * 60 * 1000);
      const windowEnd = new Date(
        windowStart.getTime() + 60 * 60 * 1000, // 1-hour window
      );

      // Find assignments due within the window that have no lock
      const assignments = await this.assignmentRepo.find({
        where: {
          dueAt: MoreThan(windowStart) && LessThan(windowEnd),
        },
        relations: ['section', 'section.course'],
      });

      if (assignments.length === 0) return;

      this.logger.debug(
        `[DueReminder ${hoursAhead}h] Found ${assignments.length} assignments`,
      );

      for (const assignment of assignments) {
        if (!assignment.dueAt) continue;
        await this.processAssignmentReminder(assignment, hoursAhead);
      }
    } catch (err) {
      this.logger.error(`Due date reminder cron (${hoursAhead}h) failed`, err);
    }
  }

  private async processAssignmentReminder(
    assignment: Assignment,
    hoursAhead: number,
  ): Promise<void> {
    // Get all active enrollments for the section
    const enrollments = await this.enrollmentRepo.find({
      where: {
        sectionId: assignment.sectionId,
        status: EnrollmentStatus.ACTIVE,
      },
    });
    if (enrollments.length === 0) return;

    const enrolledUserIds = enrollments.map((e) => e.userId);

    // Find who has NOT already submitted
    const submissions = await this.submissionRepo.find({
      where: {
        assignmentId: assignment.id,
        userId: In(enrolledUserIds),
      },
      select: ['userId'],
    });
    const submittedUserIds = new Set(submissions.map((s) => s.userId));
    const unsubmittedUserIds = enrolledUserIds.filter(
      (id) => !submittedUserIds.has(id),
    );

    if (unsubmittedUserIds.length === 0) return;

    // Load students and check preferences
    const students = await this.userRepo.findBy({
      id: In(unsubmittedUserIds),
    });

    for (const student of students) {
      const notifPrefs = (
        student.preferences as { notifications?: NotificationPreferences }
      )?.notifications;
      if (notifPrefs?.emailOnDueReminder === false) continue;

      const { subject, html } = this.templates.dueDateReminder({
        studentName: `${student.firstName} ${student.lastName}`,
        assignmentTitle: assignment.title,
        courseCode: assignment.section?.course?.code ?? '',
        dueAt: assignment.dueAt!,
        hoursUntilDue: hoursAhead,
        appUrl: appUrl(
          this.configService,
          `/courses/${assignment.section?.courseId}/section/${assignment.sectionId}/assignment/${assignment.id}`,
        ),
      });

      await this.emailService.sendEmail({ to: student.email, subject, html });
    }
  }
}
