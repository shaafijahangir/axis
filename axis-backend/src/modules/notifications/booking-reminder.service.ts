import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { InAppNotificationService } from './in-app-notification.service';
import { WebPushService } from './web-push.service';
import { NotificationType } from './entities/notification.entity';
import {
  Booking,
  BookingStatus,
} from '../office-hours/entities/booking.entity';
import { OfficeHourLocationType } from '../office-hours/entities/office-hour-block.entity';
import { TenantService } from '../../tenant/tenant.service';
import {
  DEFAULT_TENANT_TIMEZONE,
  formatInZone,
  wallClockToInstant,
  zonedDateString,
} from '../../tenant/tenant-time';

function appUrl(configService: ConfigService, path: string): string {
  const base =
    configService.get<string>('app.frontendUrl') ?? 'http://localhost:3000';
  return `${base}${path}`;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** Booking wall-clock start, read in the tenant's campus timezone. */
function bookingStart(booking: Booking, tz: string): Date {
  return wallClockToInstant(booking.date, booking.startTime, tz);
}

function bookingLocation(booking: Booking): string {
  return booking.block?.locationType === OfficeHourLocationType.ZOOM
    ? 'Zoom'
    : (booking.block?.location ?? 'In person');
}

/**
 * FEAT-020: appointment reminders — 24h and 1h before the slot.
 *
 * WHY hourly cron windows instead of scheduled BullMQ jobs: each run scans
 * BOOKED bookings whose start falls in [now+1h, now+2h) or [now+24h, now+25h).
 * Windows are disjoint hour-buckets, so every booking hits each window exactly
 * once (no dedup bookkeeping), and cancellations need no job cleanup — a
 * cancelled booking simply stops matching `status = BOOKED`. Same pattern as
 * DueDateReminderService.
 */
@Injectable()
export class BookingReminderService {
  private readonly logger = new Logger(BookingReminderService.name);

  constructor(
    private inAppService: InAppNotificationService,
    private webPushService: WebPushService,
    private configService: ConfigService,
    private tenantService: TenantService,
    @InjectRepository(Booking)
    private bookingRepo: Repository<Booking>,
  ) {}

  /** Top of every hour. */
  @Cron('0 * * * *', { name: 'booking-reminders' })
  async sendReminders(): Promise<void> {
    try {
      const now = Date.now();
      await this.remindWindow(now, 1, 'in about an hour', true);
      await this.remindWindow(now, 24, 'tomorrow', false);
    } catch (err) {
      this.logger.error('Booking reminder cron failed', err);
    }
  }

  private async remindWindow(
    now: number,
    hoursAhead: number,
    whenText: string,
    remindInstructor: boolean,
  ): Promise<void> {
    const windowStart = now + hoursAhead * 60 * 60 * 1000;
    const windowEnd = windowStart + 60 * 60 * 1000;

    // Candidate rows by date, exact filter on start below. Tenants span
    // timezones (UTC-12..+14), so the campus date of the window can be the UTC
    // date ±1 — fetch all three, then filter on the real instant per tenant.
    const dates = [-DAY_MS, 0, DAY_MS].map((d) =>
      zonedDateString(windowStart + d, 'UTC'),
    );
    const candidates = await this.bookingRepo.find({
      where: { status: BookingStatus.BOOKED, date: In(dates) },
      relations: ['block', 'instructor', 'student'],
    });
    const tzByTenant = await this.tenantService.getTimezones(
      candidates.map((b) => b.tenantId),
    );

    const due = candidates.filter((b) => {
      const tz = tzByTenant.get(b.tenantId) ?? DEFAULT_TENANT_TIMEZONE;
      const t = bookingStart(b, tz).getTime();
      return t >= windowStart && t < windowEnd;
    });

    for (const booking of due) {
      const tz = tzByTenant.get(booking.tenantId) ?? DEFAULT_TENANT_TIMEZONE;
      const time = formatInZone(bookingStart(booking, tz), tz, {
        hour: 'numeric',
        minute: '2-digit',
      });
      const where = bookingLocation(booking);
      const prof = booking.instructor
        ? `Prof. ${booking.instructor.firstName} ${booking.instructor.lastName}`
        : 'your instructor';

      await this.inAppService.create({
        userId: booking.studentId,
        tenantId: booking.tenantId,
        type: NotificationType.BOOKING_REMINDER,
        title: `Office hours ${whenText}`,
        body: `${prof} · ${time} · ${where}`,
        data: { path: '/schedule', bookingId: booking.id },
      });
      void this.webPushService.sendToUser(booking.studentId, booking.tenantId, {
        title: `Office hours ${whenText}`,
        body: `${prof} · ${time} · ${where}`,
        url: appUrl(this.configService, '/schedule'),
        type: NotificationType.BOOKING_REMINDER,
      });

      if (remindInstructor) {
        const student = booking.student
          ? `${booking.student.firstName} ${booking.student.lastName}`
          : 'A student';
        await this.inAppService.create({
          userId: booking.instructorId,
          tenantId: booking.tenantId,
          type: NotificationType.BOOKING_REMINDER,
          title: `Appointment ${whenText}`,
          body: `${student} · ${time} · ${where}${booking.note ? ` · “${booking.note}”` : ''}`,
          data: { path: '/schedule', bookingId: booking.id },
        });
      }
    }

    if (due.length > 0) {
      this.logger.debug(
        `[BookingReminder ${hoursAhead}h] sent ${due.length} reminders`,
      );
    }
  }
}
