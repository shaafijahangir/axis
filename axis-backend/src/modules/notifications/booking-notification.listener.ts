import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { NexusEvents } from '../ai/events/ai-events';
import type {
  BookingCreatedEvent,
  BookingCancelledEvent,
} from '../ai/events/ai-events';
import { InAppNotificationService } from './in-app-notification.service';
import { WebPushService } from './web-push.service';
import { NotificationType } from './entities/notification.entity';
import { Booking } from '../office-hours/entities/booking.entity';
import { OfficeHourLocationType } from '../office-hours/entities/office-hour-block.entity';

function appUrl(configService: ConfigService, path: string): string {
  const base =
    configService.get<string>('app.frontendUrl') ?? 'http://localhost:3000';
  return `${base}${path}`;
}

/** "Wed, Jul 22 · 11:00 AM" from booking date + startTime (server-local). */
function formatBookingTime(booking: Booking): string {
  const start = new Date(`${booking.date}T${booking.startTime.slice(0, 5)}:00`);
  return start.toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function bookingLocation(booking: Booking): string {
  return booking.block?.locationType === OfficeHourLocationType.ZOOM
    ? 'Zoom'
    : (booking.block?.location ?? 'In person');
}

/**
 * FEAT-020: office-hours booking lifecycle notifications.
 * Mirrors NotificationEventListener's pattern: in-app always, web push
 * fire-and-forget. Email is deliberately out of scope for now — the deployed
 * environment has no email provider configured, and a confirmation nobody
 * receives is worse than none (tracked in BACKLOG FEAT-020 notes).
 */
@Injectable()
export class BookingNotificationListener {
  private readonly logger = new Logger(BookingNotificationListener.name);

  constructor(
    private inAppService: InAppNotificationService,
    private webPushService: WebPushService,
    private configService: ConfigService,
    @InjectRepository(Booking)
    private bookingRepo: Repository<Booking>,
  ) {}

  @OnEvent(NexusEvents.BOOKING_CREATED)
  async handleBookingCreated(event: Record<string, unknown>): Promise<void> {
    const e = event as unknown as BookingCreatedEvent;
    try {
      const booking = await this.bookingRepo.findOne({
        where: { id: e.bookingId, tenantId: e.tenantId },
        relations: ['block', 'instructor', 'student'],
      });
      if (!booking) return;

      const when = formatBookingTime(booking);
      const where = bookingLocation(booking);
      const prof = booking.instructor
        ? `Prof. ${booking.instructor.firstName} ${booking.instructor.lastName}`
        : 'your instructor';
      const student = booking.student
        ? `${booking.student.firstName} ${booking.student.lastName}`
        : 'A student';

      // Student: confirmation
      await this.inAppService.create({
        userId: booking.studentId,
        tenantId: booking.tenantId,
        type: NotificationType.BOOKING_CONFIRMED,
        title: `Booked: office hours with ${prof}`,
        body: `${when} · ${where}`,
        data: { path: '/schedule', bookingId: booking.id },
      });
      void this.webPushService.sendToUser(booking.studentId, booking.tenantId, {
        title: `Booked: office hours with ${prof}`,
        body: `${when} · ${where}`,
        url: appUrl(this.configService, '/schedule'),
        type: NotificationType.BOOKING_CONFIRMED,
      });

      // Instructor: new booking on their calendar
      await this.inAppService.create({
        userId: booking.instructorId,
        tenantId: booking.tenantId,
        type: NotificationType.BOOKING_CONFIRMED,
        title: `New booking: ${student}`,
        body: `${when} · ${where}${booking.note ? ` · “${booking.note}”` : ''}`,
        data: { path: '/schedule', bookingId: booking.id },
      });
      void this.webPushService.sendToUser(
        booking.instructorId,
        booking.tenantId,
        {
          title: `New booking: ${student}`,
          body: `${when} · ${where}`,
          url: appUrl(this.configService, '/schedule'),
          type: NotificationType.BOOKING_CONFIRMED,
        },
      );
    } catch (err) {
      this.logger.error('Failed to send booking-created notifications', err);
    }
  }

  @OnEvent(NexusEvents.BOOKING_CANCELLED)
  async handleBookingCancelled(event: Record<string, unknown>): Promise<void> {
    const e = event as unknown as BookingCancelledEvent;
    try {
      const booking = await this.bookingRepo.findOne({
        where: { id: e.bookingId, tenantId: e.tenantId },
        relations: ['block', 'instructor', 'student'],
      });
      if (!booking) return;

      const when = formatBookingTime(booking);

      // Notify the party who did NOT cancel — the canceller already knows.
      const recipients = [booking.studentId, booking.instructorId].filter(
        (id) => id !== e.cancelledBy,
      );
      const counterpart =
        e.cancelledBy === booking.studentId
          ? booking.student
            ? `${booking.student.firstName} ${booking.student.lastName}`
            : 'The student'
          : booking.instructor
            ? `Prof. ${booking.instructor.firstName} ${booking.instructor.lastName}`
            : 'The instructor';

      for (const userId of recipients) {
        await this.inAppService.create({
          userId,
          tenantId: booking.tenantId,
          type: NotificationType.BOOKING_CANCELLED,
          title: `Cancelled: office hours ${when}`,
          body: `${counterpart} cancelled this appointment. The slot is open again.`,
          data: { path: '/schedule', bookingId: booking.id },
        });
        void this.webPushService.sendToUser(userId, booking.tenantId, {
          title: `Cancelled: office hours ${when}`,
          body: `${counterpart} cancelled this appointment.`,
          url: appUrl(this.configService, '/schedule'),
          type: NotificationType.BOOKING_CANCELLED,
        });
      }
    } catch (err) {
      this.logger.error('Failed to send booking-cancelled notifications', err);
    }
  }
}
