import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmailService } from './email.service';
import { EmailTemplatesService } from './email-templates.service';
import { NotificationEventListener } from './notification-event.listener';
import { DueDateReminderService } from './due-date-reminder.service';
import { NotificationsResolver } from './notifications.resolver';
import { InAppNotificationService } from './in-app-notification.service';
import { WebPushService } from './web-push.service';
import { Notification } from './entities/notification.entity';
import { DeviceToken } from './entities/device-token.entity';
import { User } from '../../database/entities/user.entity';
import { Submission } from '../../database/entities/submission.entity';
import { Assignment } from '../../database/entities/assignment.entity';
import { CourseSection } from '../../database/entities/course-section.entity';
import { Enrollment } from '../../database/entities/enrollment.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      Submission,
      Assignment,
      CourseSection,
      Enrollment,
      Notification,
      DeviceToken,
    ]),
  ],
  providers: [
    EmailService,
    EmailTemplatesService,
    InAppNotificationService,
    WebPushService,
    NotificationEventListener,
    DueDateReminderService,
    NotificationsResolver,
  ],
  exports: [
    EmailService,
    EmailTemplatesService,
    InAppNotificationService,
    WebPushService,
  ],
})
export class NotificationsModule {}
