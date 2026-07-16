import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { OfficeHoursService } from './office-hours.service';
import {
  OfficeHourBlock,
  OfficeHourDay,
  OfficeHourLocationType,
} from './entities/office-hour-block.entity';
import { Booking, BookingStatus } from './entities/booking.entity';
import { NexusEvents } from '../ai/events/ai-events';
import {
  createMockRepository,
  MockRepository,
} from '../../test/mocks/repository.mock';

// ─── Deterministic future-date helpers (avoid "past slot" filtering) ──────────

const DAY_INDEX: Record<OfficeHourDay, number> = {
  [OfficeHourDay.MON]: 1,
  [OfficeHourDay.TUE]: 2,
  [OfficeHourDay.WED]: 3,
  [OfficeHourDay.THU]: 4,
  [OfficeHourDay.FRI]: 5,
};

/** First date on/after `fromISO` whose weekday matches `day`. */
function nextDateForDay(fromISO: string, day: OfficeHourDay): string {
  const d = new Date(`${fromISO}T00:00:00Z`);
  while (d.getUTCDay() !== DAY_INDEX[day]) {
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return d.toISOString().slice(0, 10);
}

const FUTURE_BASE = '2099-06-15';

function makeBlock(overrides: Partial<OfficeHourBlock> = {}): OfficeHourBlock {
  return {
    id: 'block-001',
    tenantId: 'tenant-001',
    instructorId: 'instructor-001',
    dayOfWeek: OfficeHourDay.MON,
    startTime: '09:00:00',
    endTime: '10:00:00',
    slotMinutes: 15,
    locationType: OfficeHourLocationType.IN_PERSON,
    location: 'ECS 618',
    meetingUrl: null,
    active: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    tenant: null,
    instructor: null,
    ...overrides,
  } as unknown as OfficeHourBlock;
}

describe('OfficeHoursService', () => {
  let service: OfficeHoursService;
  let blockRepo: MockRepository<OfficeHourBlock>;
  let bookingRepo: MockRepository<Booking>;
  let txManager: {
    findOne: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
  };
  let dataSource: { manager: { transaction: jest.Mock } };
  let eventEmitter: { emit: jest.Mock };

  const tenantId = 'tenant-001';
  const instructorId = 'instructor-001';
  const studentId = 'student-001';

  beforeEach(async () => {
    blockRepo = createMockRepository<OfficeHourBlock>();
    bookingRepo = createMockRepository<Booking>();

    txManager = {
      findOne: jest.fn(),
      create: jest.fn((_entity: unknown, value: unknown) => value),
      save: jest.fn((_entity: unknown, value: Record<string, unknown>) => ({
        id: 'booking-001',
        ...value,
      })),
    };
    dataSource = {
      manager: {
        transaction: jest.fn((cb: (m: typeof txManager) => unknown) =>
          Promise.resolve(cb(txManager)),
        ),
      },
    };
    eventEmitter = { emit: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OfficeHoursService,
        { provide: getRepositoryToken(OfficeHourBlock), useValue: blockRepo },
        { provide: getRepositoryToken(Booking), useValue: bookingRepo },
        { provide: DataSource, useValue: dataSource },
        { provide: EventEmitter2, useValue: eventEmitter },
      ],
    }).compile();

    service = module.get<OfficeHoursService>(OfficeHoursService);
  });

  // ─── computeAvailableSlots ───────────────────────────────────────────────

  describe('computeAvailableSlots', () => {
    it('generates block slots minus existing BOOKED bookings', async () => {
      const date = nextDateForDay(FUTURE_BASE, OfficeHourDay.MON);
      const block = makeBlock(); // MON 09:00–10:00, 15-min → 4 slots
      blockRepo.find!.mockResolvedValue([block]);
      // 09:15 is already booked → should be excluded.
      bookingRepo.find!.mockResolvedValue([
        {
          blockId: block.id,
          date,
          startTime: '09:15:00',
          status: BookingStatus.BOOKED,
        },
      ]);

      const slots = await service.computeAvailableSlots(tenantId, {
        instructorId,
        startDate: date,
        endDate: date,
      });

      const times = slots.map((s) => s.startTime);
      expect(times).toEqual(['09:00', '09:30', '09:45']);
      expect(times).not.toContain('09:15');
      // Slot metadata carries the block's location for the confirmation screen.
      expect(slots[0]).toMatchObject({
        blockId: block.id,
        instructorId,
        date,
        endTime: '09:15',
        location: 'ECS 618',
      });
    });

    it('scopes the block + booking lookups to the tenant', async () => {
      blockRepo.find!.mockResolvedValue([]);
      await service.computeAvailableSlots(tenantId, { instructorId });
      expect(blockRepo.find).toHaveBeenCalledWith({
        where: { tenantId, instructorId, active: true },
      });
    });

    it('returns nothing when the instructor has no active blocks', async () => {
      blockRepo.find!.mockResolvedValue([]);
      const slots = await service.computeAvailableSlots(tenantId, {
        instructorId,
      });
      expect(slots).toEqual([]);
      expect(bookingRepo.find).not.toHaveBeenCalled();
    });
  });

  // ─── bookSlot ─────────────────────────────────────────────────────────────

  describe('bookSlot', () => {
    const bookableDate = nextDateForDay(FUTURE_BASE, OfficeHourDay.MON);

    it('books an open slot and emits BOOKING_CREATED', async () => {
      const block = makeBlock();
      txManager.findOne.mockImplementation((entity: unknown) =>
        entity === OfficeHourBlock ? block : null,
      );
      bookingRepo.findOne!.mockResolvedValue({
        id: 'booking-001',
        status: BookingStatus.BOOKED,
        date: bookableDate,
        startTime: '09:00:00',
        endTime: '09:15:00',
        block,
      });

      const result = await service.bookSlot(tenantId, studentId, {
        blockId: block.id,
        date: bookableDate,
        startTime: '09:00',
      });

      expect(txManager.save).toHaveBeenCalled();
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        NexusEvents.BOOKING_CREATED,
        expect.objectContaining({
          studentId,
          instructorId,
          date: bookableDate,
          startTime: '09:00',
        }),
      );
      expect(result.id).toBe('booking-001');
    });

    it('rejects a double-booking when the slot is already taken (race re-check)', async () => {
      const block = makeBlock();
      txManager.findOne.mockImplementation((entity: unknown) =>
        entity === OfficeHourBlock
          ? block
          : { id: 'existing', status: BookingStatus.BOOKED },
      );

      await expect(
        service.bookSlot(tenantId, studentId, {
          blockId: block.id,
          date: bookableDate,
          startTime: '09:00',
        }),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(txManager.save).not.toHaveBeenCalled();
      expect(eventEmitter.emit).not.toHaveBeenCalled();
    });

    it('takes a pessimistic write lock on the parent block', async () => {
      const block = makeBlock();
      txManager.findOne.mockImplementation((entity: unknown) =>
        entity === OfficeHourBlock ? block : null,
      );
      bookingRepo.findOne!.mockResolvedValue({ id: 'booking-001', block });

      await service.bookSlot(tenantId, studentId, {
        blockId: block.id,
        date: bookableDate,
        startTime: '09:00',
      });

      expect(txManager.findOne).toHaveBeenCalledWith(
        OfficeHourBlock,
        expect.objectContaining({
          where: { id: block.id, tenantId },
          lock: { mode: 'pessimistic_write' },
        }),
      );
    });

    it('fails when the block belongs to another tenant', async () => {
      txManager.findOne.mockResolvedValue(null); // tenant-scoped lookup misses
      await expect(
        service.bookSlot(tenantId, studentId, {
          blockId: 'block-001',
          date: bookableDate,
          startTime: '09:00',
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('rejects a slot that is not on a block boundary', async () => {
      const block = makeBlock();
      txManager.findOne.mockImplementation((entity: unknown) =>
        entity === OfficeHourBlock ? block : null,
      );
      await expect(
        service.bookSlot(tenantId, studentId, {
          blockId: block.id,
          date: bookableDate,
          startTime: '09:07', // not a 15-min boundary
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects a slot on the wrong weekday', async () => {
      const block = makeBlock({ dayOfWeek: OfficeHourDay.TUE });
      txManager.findOne.mockImplementation((entity: unknown) =>
        entity === OfficeHourBlock ? block : null,
      );
      await expect(
        service.bookSlot(tenantId, studentId, {
          blockId: block.id,
          date: bookableDate, // a Monday, block is Tuesday
          startTime: '09:00',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  // ─── cancelBooking ─────────────────────────────────────────────────────────

  describe('cancelBooking', () => {
    it('lets the owning student cancel and emits BOOKING_CANCELLED', async () => {
      const booking = {
        id: 'booking-001',
        tenantId,
        studentId,
        instructorId,
        status: BookingStatus.BOOKED,
      };
      bookingRepo
        .findOne!.mockResolvedValueOnce(booking)
        .mockResolvedValueOnce({
          ...booking,
          status: BookingStatus.CANCELLED,
        });
      bookingRepo.save!.mockResolvedValue(booking);

      await service.cancelBooking(tenantId, studentId, 'booking-001');

      expect(bookingRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: BookingStatus.CANCELLED }),
      );
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        NexusEvents.BOOKING_CANCELLED,
        expect.objectContaining({ cancelledBy: studentId }),
      );
    });

    it('lets the owning instructor cancel', async () => {
      const booking = {
        id: 'booking-001',
        tenantId,
        studentId,
        instructorId,
        status: BookingStatus.BOOKED,
      };
      bookingRepo.findOne!.mockResolvedValue(booking);
      bookingRepo.save!.mockResolvedValue(booking);

      await expect(
        service.cancelBooking(tenantId, instructorId, 'booking-001'),
      ).resolves.toBeDefined();
    });

    it('forbids a stranger from cancelling', async () => {
      bookingRepo.findOne!.mockResolvedValue({
        id: 'booking-001',
        tenantId,
        studentId,
        instructorId,
        status: BookingStatus.BOOKED,
      });
      await expect(
        service.cancelBooking(tenantId, 'someone-else', 'booking-001'),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(eventEmitter.emit).not.toHaveBeenCalled();
    });

    it('404s a booking from another tenant', async () => {
      bookingRepo.findOne!.mockResolvedValue(null); // tenant-scoped miss
      await expect(
        service.cancelBooking(tenantId, studentId, 'booking-001'),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(bookingRepo.findOne).toHaveBeenCalledWith({
        where: { id: 'booking-001', tenantId },
      });
    });
  });

  // ─── block management + tenant scoping ─────────────────────────────────────

  describe('block management', () => {
    it('creates a block owned by the calling instructor', async () => {
      blockRepo.create!.mockImplementation((v: unknown) => v);
      blockRepo.save!.mockImplementation((v: unknown) => ({
        id: 'block-001',
        ...(v as object),
      }));

      await service.createBlock(tenantId, instructorId, {
        dayOfWeek: OfficeHourDay.MON,
        startTime: '09:00',
        endTime: '10:00',
        locationType: OfficeHourLocationType.IN_PERSON,
        location: 'ECS 618',
      });

      expect(blockRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ tenantId, instructorId }),
      );
    });

    it('rejects an in-person block with no location', async () => {
      await expect(
        service.createBlock(tenantId, instructorId, {
          dayOfWeek: OfficeHourDay.MON,
          startTime: '09:00',
          endTime: '10:00',
          locationType: OfficeHourLocationType.IN_PERSON,
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects a window whose end is before its start', async () => {
      await expect(
        service.createBlock(tenantId, instructorId, {
          dayOfWeek: OfficeHourDay.MON,
          startTime: '11:00',
          endTime: '10:00',
          locationType: OfficeHourLocationType.ZOOM,
          meetingUrl: 'https://zoom.us/j/1',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('forbids updating a block owned by another instructor', async () => {
      blockRepo.findOne!.mockResolvedValue(
        makeBlock({ instructorId: 'other-instructor' }),
      );
      await expect(
        service.updateBlock(tenantId, instructorId, {
          id: 'block-001',
          active: false,
        }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('404s (tenant-scoped) when updating a block from another tenant', async () => {
      blockRepo.findOne!.mockResolvedValue(null);
      await expect(
        service.updateBlock(tenantId, instructorId, {
          id: 'block-001',
          active: false,
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(blockRepo.findOne).toHaveBeenCalledWith({
        where: { id: 'block-001', tenantId },
      });
    });
  });
});
