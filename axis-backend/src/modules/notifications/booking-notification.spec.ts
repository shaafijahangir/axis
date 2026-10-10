import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { BookingNotificationListener } from './booking-notification.listener';
import { BookingReminderService } from './booking-reminder.service';
import { InAppNotificationService } from './in-app-notification.service';
import { WebPushService } from './web-push.service';
import { NotificationType } from './entities/notification.entity';
import {
  Booking,
  BookingStatus,
} from '../office-hours/entities/booking.entity';
import {
  createMockRepository,
  MockRepository,
} from '../../test/mocks/repository.mock';
import { TenantService } from '../../tenant/tenant.service';
import { zonedNow } from '../../tenant/tenant-time';

const CAMPUS_TZ = 'America/Vancouver';

/** Campus wall-clock date/time `hoursAhead` hours from now. */
function localDateHoursAhead(hoursAhead: number): {
  date: string;
  time: string;
} {
  const { date, minutes } = zonedNow(
    CAMPUS_TZ,
    Date.now() + hoursAhead * 60 * 60 * 1000,
  );
  const hh = String(Math.floor(minutes / 60)).padStart(2, '0');
  const mm = String(minutes % 60).padStart(2, '0');
  return { date, time: `${hh}:${mm}:00` };
}

function makeBooking(overrides: Partial<Booking> = {}): Booking {
  return {
    id: 'booking-001',
    tenantId: 'tenant-001',
    studentId: 'student-001',
    instructorId: 'instructor-001',
    date: '2099-06-15',
    startTime: '11:00:00',
    endTime: '11:15:00',
    status: BookingStatus.BOOKED,
    note: null,
    instructor: { firstName: 'Sarah', lastName: 'Chen' },
    student: { firstName: 'Alex', lastName: 'Rivera' },
    block: { locationType: 'in_person', location: 'ECS 618' },
    ...overrides,
  } as unknown as Booking;
}

describe('Booking notifications (FEAT-020)', () => {
  let listener: BookingNotificationListener;
  let reminder: BookingReminderService;
  let bookingRepo: MockRepository<Booking>;
  let inApp: { create: jest.Mock };
  let webPush: { sendToUser: jest.Mock };

  beforeEach(async () => {
    bookingRepo = createMockRepository<Booking>();
    inApp = { create: jest.fn().mockResolvedValue(undefined) };
    webPush = { sendToUser: jest.fn().mockResolvedValue(undefined) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BookingNotificationListener,
        BookingReminderService,
        { provide: InAppNotificationService, useValue: inApp },
        { provide: WebPushService, useValue: webPush },
        { provide: ConfigService, useValue: { get: jest.fn() } },
        { provide: getRepositoryToken(Booking), useValue: bookingRepo },
        {
          provide: TenantService,
          useValue: {
            getTimezones: jest.fn((ids: string[]) =>
              Promise.resolve(new Map(ids.map((id) => [id, CAMPUS_TZ]))),
            ),
          },
        },
      ],
    }).compile();

    listener = module.get(BookingNotificationListener);
    reminder = module.get(BookingReminderService);
  });

  describe('BOOKING_CREATED', () => {
    it('notifies both the student (confirmation) and the instructor', async () => {
      bookingRepo.findOne!.mockResolvedValue(makeBooking());

      await listener.handleBookingCreated({
        bookingId: 'booking-001',
        tenantId: 'tenant-001',
      });

      expect(inApp.create).toHaveBeenCalledTimes(2);
      expect(inApp.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'student-001',
          type: NotificationType.BOOKING_CONFIRMED,
          title: 'Booked: office hours with Prof. Sarah Chen',
        }),
      );
      expect(inApp.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'instructor-001',
          title: 'New booking: Alex Rivera',
        }),
      );
    });

    it('does nothing when the booking is not found (tenant-scoped miss)', async () => {
      bookingRepo.findOne!.mockResolvedValue(null);
      await listener.handleBookingCreated({
        bookingId: 'booking-001',
        tenantId: 'other-tenant',
      });
      expect(inApp.create).not.toHaveBeenCalled();
    });
  });

  describe('BOOKING_CANCELLED', () => {
    it('notifies only the party who did not cancel', async () => {
      bookingRepo.findOne!.mockResolvedValue(makeBooking());

      await listener.handleBookingCancelled({
        bookingId: 'booking-001',
        tenantId: 'tenant-001',
        cancelledBy: 'student-001',
      });

      expect(inApp.create).toHaveBeenCalledTimes(1);
      expect(inApp.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'instructor-001',
          type: NotificationType.BOOKING_CANCELLED,
        }),
      );
    });
  });

  describe('reminders', () => {
    it('sends a 1h reminder to student and instructor for a booking in ~90 minutes', async () => {
      const { date, time } = localDateHoursAhead(1.5);
      bookingRepo.find!.mockResolvedValue([
        makeBooking({ date, startTime: time } as Partial<Booking>),
      ]);

      await reminder.sendReminders();

      // 1h window: student + instructor. 24h window scan finds the same row
      // via repo mock but filters it out by exact start time.
      const reminderCalls = inApp.create.mock.calls.filter(
        ([arg]: [{ type: NotificationType }]) =>
          arg.type === NotificationType.BOOKING_REMINDER,
      );
      expect(reminderCalls).toHaveLength(2);
      expect(
        reminderCalls.map(([a]: [{ userId: string }]) => a.userId),
      ).toEqual(expect.arrayContaining(['student-001', 'instructor-001']));
    });

    it('sends only a student reminder in the 24h window', async () => {
      const { date, time } = localDateHoursAhead(24.5);
      bookingRepo.find!.mockResolvedValue([
        makeBooking({ date, startTime: time } as Partial<Booking>),
      ]);

      await reminder.sendReminders();

      const calls = inApp.create.mock.calls as [
        { type: NotificationType; userId: string; title: string },
      ][];
      const reminderCalls = calls.filter(
        ([arg]) => arg.type === NotificationType.BOOKING_REMINDER,
      );
      expect(reminderCalls).toHaveLength(1);
      expect(reminderCalls[0][0].userId).toBe('student-001');
      expect(reminderCalls[0][0].title).toBe('Office hours tomorrow');
    });

    it('reads booking times on the campus clock, not the server clock', async () => {
      // 17:00 UTC = 10:00 PDT. An 11:00 PT booking is due in the 1h window
      // [18:00Z, 19:00Z). The old server-local parse put it at 11:00 UTC
      // (04:00 PT) on a UTC server, firing the reminder ~7h early.
      jest.useFakeTimers({ now: new Date('2026-10-14T17:00:00Z') });
      try {
        bookingRepo.find!.mockResolvedValue([
          makeBooking({
            date: '2026-10-14',
            startTime: '11:00:00',
          } as Partial<Booking>),
        ]);

        await reminder.sendReminders();

        const calls = inApp.create.mock.calls as [
          {
            type: NotificationType;
            userId: string;
            title: string;
            body: string;
          },
        ][];
        const student = calls.find(([a]) => a.userId === 'student-001');
        expect(student?.[0].title).toBe('Office hours in about an hour');
        expect(student?.[0].body).toContain('11:00 AM');
      } finally {
        jest.useRealTimers();
      }
    });

    it('does not remind at the server-clock time of a campus booking', async () => {
      // 10:00 UTC (03:00 PDT): naive parsing saw 11:00 as "in an hour".
      jest.useFakeTimers({ now: new Date('2026-10-14T10:00:00Z') });
      try {
        bookingRepo.find!.mockResolvedValue([
          makeBooking({
            date: '2026-10-14',
            startTime: '11:00:00',
          } as Partial<Booking>),
        ]);

        await reminder.sendReminders();
        expect(inApp.create).not.toHaveBeenCalled();
      } finally {
        jest.useRealTimers();
      }
    });

    it('sends nothing when no bookings fall in a window', async () => {
      const { date, time } = localDateHoursAhead(5); // between windows
      bookingRepo.find!.mockResolvedValue([
        makeBooking({ date, startTime: time } as Partial<Booking>),
      ]);

      await reminder.sendReminders();
      expect(inApp.create).not.toHaveBeenCalled();
    });
  });
});
