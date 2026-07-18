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

/** Local "YYYY-MM-DD" for `hoursAhead` hours from now. */
function localDateHoursAhead(hoursAhead: number): {
  date: string;
  time: string;
} {
  const d = new Date(Date.now() + hoursAhead * 60 * 60 * 1000);
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return { date: `${d.getFullYear()}-${m}-${day}`, time: `${hh}:${mm}:00` };
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
