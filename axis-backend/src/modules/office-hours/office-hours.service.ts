import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Repository,
  DataSource,
  Between,
  In,
  LessThan,
  MoreThanOrEqual,
} from 'typeorm';
import { Cron } from '@nestjs/schedule';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  OfficeHourBlock,
  OfficeHourDay,
  OfficeHourLocationType,
} from './entities/office-hour-block.entity';
import { Booking, BookingStatus } from './entities/booking.entity';
import { BusyBlock } from './entities/busy-block.entity';
import {
  CreateOfficeHourBlockInput,
  UpdateOfficeHourBlockInput,
  AvailableSlotsInput,
  BookSlotInput,
  AvailableSlot,
  CreateBusyBlockInput,
  BookingOutcome,
  OfficeHourBlockUtilization,
} from './dto/office-hours.types';
import {
  CourseSection,
  SectionStatus,
} from '../../database/entities/course-section.entity';
import { NexusEvents } from '../ai/events/ai-events';
import { TenantService } from '../../tenant/tenant.service';
import { zonedNow } from '../../tenant/tenant-time';

/** Campus wall-clock "now": calendar date + minutes since midnight. */
interface CampusNow {
  date: string;
  minutes: number;
}

/** Maps an office-hours day enum to JS `getUTCDay()` (0=Sun … 6=Sat). */
const DAY_INDEX: Record<OfficeHourDay, number> = {
  [OfficeHourDay.MON]: 1,
  [OfficeHourDay.TUE]: 2,
  [OfficeHourDay.WED]: 3,
  [OfficeHourDay.THU]: 4,
  [OfficeHourDay.FRI]: 5,
};

const MAX_RANGE_DAYS = 60; // guard against a caller asking for a year of slots

/** FEAT-022: how far back the instructor's "recent meetings" list looks. */
const RECENT_BOOKING_DAYS = 14;

/**
 * FEAT-022: grace period before a past BOOKED meeting auto-completes. Gives the
 * instructor a few days to mark a no-show before the default outcome lands.
 */
const AUTO_COMPLETE_AFTER_DAYS = 3;

/**
 * FEAT-019: Section `meetingDays` is a free text[] seeded/imported with mixed
 * casing ("Mon", "MON", "Monday"). Normalize on the first three letters so
 * conflict checks don't silently miss a lecture over a casing mismatch.
 */
const DAY_FROM_STRING: Record<string, OfficeHourDay> = {
  mon: OfficeHourDay.MON,
  tue: OfficeHourDay.TUE,
  wed: OfficeHourDay.WED,
  thu: OfficeHourDay.THU,
  fri: OfficeHourDay.FRI,
};

function toOfficeHourDay(day: string): OfficeHourDay | null {
  return DAY_FROM_STRING[day.trim().slice(0, 3).toLowerCase()] ?? null;
}

const DAY_DISPLAY: Record<OfficeHourDay, string> = {
  [OfficeHourDay.MON]: 'Mon',
  [OfficeHourDay.TUE]: 'Tue',
  [OfficeHourDay.WED]: 'Wed',
  [OfficeHourDay.THU]: 'Thu',
  [OfficeHourDay.FRI]: 'Fri',
};

// ─── Time / date helpers ─────────────────────────────────────────────────────

/** Postgres `time` comes back as "HH:MM:SS"; app-side we compare on "HH:MM". */
function normalizeTime(t: string): string {
  return t.slice(0, 5);
}

function timeToMinutes(t: string): number {
  const [h, m] = normalizeTime(t).split(':').map(Number);
  return h * 60 + m;
}

function minutesToTime(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/** Parse "YYYY-MM-DD" as a UTC date so weekday math is timezone-stable. */
function parseDate(d: string): Date {
  const [y, m, day] = d.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, day));
}

function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function addDays(d: Date, n: number): Date {
  const copy = new Date(d);
  copy.setUTCDate(copy.getUTCDate() + n);
  return copy;
}

/** True once a booking's end time has passed on the campus clock. */
function hasEnded(
  booking: Pick<Booking, 'date' | 'endTime'>,
  now: { date: string; minutes: number },
): boolean {
  return (
    booking.date < now.date ||
    (booking.date === now.date && timeToMinutes(booking.endTime) <= now.minutes)
  );
}

@Injectable()
export class OfficeHoursService {
  constructor(
    @InjectRepository(OfficeHourBlock)
    private readonly blockRepo: Repository<OfficeHourBlock>,
    @InjectRepository(Booking)
    private readonly bookingRepo: Repository<Booking>,
    @InjectRepository(BusyBlock)
    private readonly busyRepo: Repository<BusyBlock>,
    @InjectRepository(CourseSection)
    private readonly sectionRepo: Repository<CourseSection>,
    private readonly dataSource: DataSource,
    private readonly eventEmitter: EventEmitter2,
    private readonly tenantService: TenantService,
  ) {}

  /**
   * "Now" on the tenant's campus clock. Schedule times are wall-clock in the
   * tenant's timezone, so past/future checks must compare against campus
   * time — not the server's (Render runs UTC, 7–8h ahead of Pacific).
   */
  private async campusNow(tenantId: string): Promise<CampusNow> {
    return zonedNow(await this.tenantService.getTimezone(tenantId));
  }

  // ─── Blocks: instructor management ─────────────────────────────────────────

  async createBlock(
    tenantId: string,
    instructorId: string,
    input: CreateOfficeHourBlockInput,
  ): Promise<OfficeHourBlock> {
    const slotMinutes = input.slotMinutes ?? 15;
    this.validateWindow(input.startTime, input.endTime, slotMinutes);
    this.validateLocation(input.locationType, input.location, input.meetingUrl);
    await this.assertNoScheduleConflict(
      tenantId,
      instructorId,
      input.dayOfWeek,
      input.startTime,
      input.endTime,
    );

    const block = this.blockRepo.create({
      tenantId,
      instructorId,
      dayOfWeek: input.dayOfWeek,
      startTime: input.startTime,
      endTime: input.endTime,
      slotMinutes,
      locationType: input.locationType,
      location: input.location ?? null,
      meetingUrl: input.meetingUrl ?? null,
      active: true,
    });
    return this.blockRepo.save(block);
  }

  async updateBlock(
    tenantId: string,
    instructorId: string,
    input: UpdateOfficeHourBlockInput,
  ): Promise<OfficeHourBlock> {
    const block = await this.findOwnedBlock(input.id, tenantId, instructorId);

    const startTime = input.startTime ?? normalizeTime(block.startTime);
    const endTime = input.endTime ?? normalizeTime(block.endTime);
    const slotMinutes = input.slotMinutes ?? block.slotMinutes;
    this.validateWindow(startTime, endTime, slotMinutes);

    const locationType = input.locationType ?? block.locationType;
    const location =
      input.location !== undefined ? input.location : block.location;
    const meetingUrl =
      input.meetingUrl !== undefined ? input.meetingUrl : block.meetingUrl;
    this.validateLocation(locationType, location, meetingUrl);

    const dayOfWeek = input.dayOfWeek ?? block.dayOfWeek;
    // Re-check conflicts against the block's *final* day/time; exclude the
    // block itself so an unrelated field edit doesn't self-collide.
    const willBeActive = input.active ?? block.active;
    if (willBeActive) {
      await this.assertNoScheduleConflict(
        tenantId,
        instructorId,
        dayOfWeek,
        startTime,
        endTime,
        block.id,
      );
    }

    Object.assign(block, {
      dayOfWeek,
      startTime,
      endTime,
      slotMinutes,
      locationType,
      location,
      meetingUrl,
      active: input.active ?? block.active,
    });
    return this.blockRepo.save(block);
  }

  async deactivateBlock(
    tenantId: string,
    instructorId: string,
    blockId: string,
  ): Promise<OfficeHourBlock> {
    const block = await this.findOwnedBlock(blockId, tenantId, instructorId);
    block.active = false;
    return this.blockRepo.save(block);
  }

  /** Blocks owned by the calling instructor (management view — includes inactive). */
  async listMyBlocks(
    tenantId: string,
    instructorId: string,
  ): Promise<OfficeHourBlock[]> {
    return this.blockRepo.find({
      where: { tenantId, instructorId },
      order: { dayOfWeek: 'ASC', startTime: 'ASC' },
    });
  }

  /** Active blocks for a given instructor (student-facing). */
  async listActiveBlocks(
    tenantId: string,
    instructorId: string,
  ): Promise<OfficeHourBlock[]> {
    return this.blockRepo.find({
      where: { tenantId, instructorId, active: true },
      order: { dayOfWeek: 'ASC', startTime: 'ASC' },
    });
  }

  // ─── Availability ──────────────────────────────────────────────────────────

  /**
   * Generate every still-open slot for an instructor across a date range:
   * expand each active block into slots, then subtract slots that already have
   * a BOOKED booking. Past slots are excluded.
   */
  async computeAvailableSlots(
    tenantId: string,
    input: AvailableSlotsInput,
  ): Promise<AvailableSlot[]> {
    const now = await this.campusNow(tenantId);
    const todayStr = now.date;
    const startStr = input.startDate ?? todayStr;
    let endStr = input.endDate ?? formatDate(addDays(parseDate(todayStr), 14));

    const startDate = parseDate(startStr);
    let endDate = parseDate(endStr);
    if (endDate < startDate) {
      throw new BadRequestException('endDate must be on or after startDate');
    }
    // Clamp the window so a hostile/huge range can't explode slot generation.
    const maxEnd = addDays(startDate, MAX_RANGE_DAYS);
    if (endDate > maxEnd) {
      endDate = maxEnd;
      endStr = formatDate(maxEnd);
    }

    const blocks = await this.blockRepo.find({
      where: { tenantId, instructorId: input.instructorId, active: true },
    });
    if (blocks.length === 0) return [];

    // FEAT-019: busy windows (recurring weekly unavailability) suppress any
    // overlapping slot without the instructor editing their blocks.
    const busyBlocks = await this.busyRepo.find({
      where: { tenantId, instructorId: input.instructorId },
    });
    const busyByDay = new Map<
      OfficeHourDay,
      { start: number; end: number }[]
    >();
    for (const busy of busyBlocks) {
      const windows = busyByDay.get(busy.dayOfWeek) ?? [];
      windows.push({
        start: timeToMinutes(busy.startTime),
        end: timeToMinutes(busy.endTime),
      });
      busyByDay.set(busy.dayOfWeek, windows);
    }

    // All BOOKED bookings for this instructor in the window → set of taken keys.
    const bookings = await this.bookingRepo.find({
      where: {
        tenantId,
        instructorId: input.instructorId,
        status: BookingStatus.BOOKED,
        date: Between(startStr, endStr),
      },
    });
    const taken = new Set(
      bookings.map(
        (b) => `${b.blockId}|${b.date}|${normalizeTime(b.startTime)}`,
      ),
    );

    // "Now" as a campus wall-clock minute count, to hide slots already past today.
    const nowMinutes = now.minutes;

    const slots: AvailableSlot[] = [];
    for (
      let cursor = startDate;
      cursor <= endDate;
      cursor = addDays(cursor, 1)
    ) {
      const dateStr = formatDate(cursor);
      const weekday = cursor.getUTCDay();

      for (const block of blocks) {
        if (DAY_INDEX[block.dayOfWeek] !== weekday) continue;

        const windowStart = timeToMinutes(block.startTime);
        const windowEnd = timeToMinutes(block.endTime);

        for (
          let start = windowStart;
          start + block.slotMinutes <= windowEnd;
          start += block.slotMinutes
        ) {
          // Skip past slots (whole past days, and earlier slots today).
          if (dateStr < todayStr) continue;
          if (dateStr === todayStr && start <= nowMinutes) continue;

          // Skip slots inside a busy window (FEAT-019).
          const slotEnd = start + block.slotMinutes;
          const busyWindows = busyByDay.get(block.dayOfWeek);
          if (busyWindows?.some((w) => start < w.end && w.start < slotEnd)) {
            continue;
          }

          const startTime = minutesToTime(start);
          if (taken.has(`${block.id}|${dateStr}|${startTime}`)) continue;

          slots.push({
            blockId: block.id,
            instructorId: block.instructorId,
            date: dateStr,
            startTime,
            endTime: minutesToTime(start + block.slotMinutes),
            locationType: block.locationType,
            location: block.location,
            meetingUrl: block.meetingUrl,
          });
        }
      }
    }

    slots.sort((a, b) =>
      a.date === b.date
        ? a.startTime.localeCompare(b.startTime)
        : a.date.localeCompare(b.date),
    );
    return slots;
  }

  // ─── Booking ───────────────────────────────────────────────────────────────

  /**
   * Book a slot for a student. Runs inside a transaction that takes a
   * pessimistic write lock on the parent block, so two students racing for the
   * same slot serialize: the second sees the first's row in the re-check and is
   * rejected with a conflict. (No partial-unique index is used because the rest
   * of the schema has none — the lock + re-check is the uniqueness guarantee.)
   */
  async bookSlot(
    tenantId: string,
    studentId: string,
    input: BookSlotInput,
  ): Promise<Booking> {
    const now = await this.campusNow(tenantId);
    const saved = await this.dataSource.manager.transaction(async (manager) => {
      const block = await manager.findOne(OfficeHourBlock, {
        where: { id: input.blockId, tenantId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!block) throw new NotFoundException('Office-hour block not found');
      if (!block.active) {
        throw new BadRequestException(
          'These office hours are no longer available',
        );
      }

      const endTime = this.validateSlot(
        block,
        input.date,
        input.startTime,
        now,
      );

      const existing = await manager.findOne(Booking, {
        where: {
          blockId: block.id,
          date: input.date,
          startTime: input.startTime,
          status: BookingStatus.BOOKED,
        },
      });
      if (existing) {
        throw new ConflictException(
          'That slot was just booked — please choose another time',
        );
      }

      const booking = manager.create(Booking, {
        tenantId,
        blockId: block.id,
        studentId,
        instructorId: block.instructorId,
        date: input.date,
        startTime: input.startTime,
        endTime,
        status: BookingStatus.BOOKED,
        note: input.note ?? null,
      });
      return manager.save(Booking, booking);
    });

    this.eventEmitter.emit(NexusEvents.BOOKING_CREATED, {
      bookingId: saved.id,
      blockId: saved.blockId,
      studentId: saved.studentId,
      instructorId: saved.instructorId,
      tenantId,
      date: saved.date,
      startTime: normalizeTime(saved.startTime),
    });

    return this.findBookingById(saved.id, tenantId);
  }

  /**
   * Cancel a booking. A student may cancel their own; an instructor may cancel
   * any booking against a block they own. Nobody else can.
   */
  async cancelBooking(
    tenantId: string,
    userId: string,
    bookingId: string,
  ): Promise<Booking> {
    const booking = await this.bookingRepo.findOne({
      where: { id: bookingId, tenantId },
    });
    if (!booking) throw new NotFoundException('Booking not found');

    const isOwningStudent = booking.studentId === userId;
    const isOwningInstructor = booking.instructorId === userId;
    if (!isOwningStudent && !isOwningInstructor) {
      throw new ForbiddenException('You cannot cancel this booking');
    }
    if (booking.status !== BookingStatus.BOOKED) {
      throw new BadRequestException('Only active bookings can be cancelled');
    }

    booking.status = BookingStatus.CANCELLED;
    await this.bookingRepo.save(booking);

    this.eventEmitter.emit(NexusEvents.BOOKING_CANCELLED, {
      bookingId: booking.id,
      studentId: booking.studentId,
      instructorId: booking.instructorId,
      tenantId,
      cancelledBy: userId,
    });

    return this.findBookingById(booking.id, tenantId);
  }

  // ─── Booking queries ─────────────────────────────────────────────────────

  /** A student's upcoming (BOOKED, today-onward) bookings. */
  async listMyBookings(
    tenantId: string,
    studentId: string,
  ): Promise<Booking[]> {
    return this.bookingRepo.find({
      where: {
        tenantId,
        studentId,
        status: BookingStatus.BOOKED,
        date: MoreThanOrEqual((await this.campusNow(tenantId)).date),
      },
      relations: ['block', 'instructor'],
      order: { date: 'ASC', startTime: 'ASC' },
    });
  }

  /** An instructor's upcoming (BOOKED, today-onward) bookings. */
  async listInstructorBookings(
    tenantId: string,
    instructorId: string,
  ): Promise<Booking[]> {
    return this.bookingRepo.find({
      where: {
        tenantId,
        instructorId,
        status: BookingStatus.BOOKED,
        date: MoreThanOrEqual((await this.campusNow(tenantId)).date),
      },
      relations: ['block', 'student'],
      order: { date: 'ASC', startTime: 'ASC' },
    });
  }

  async findBookingById(id: string, tenantId: string): Promise<Booking> {
    const booking = await this.bookingRepo.findOne({
      where: { id, tenantId },
      relations: ['block', 'instructor', 'student'],
    });
    if (!booking) throw new NotFoundException('Booking not found');
    return booking;
  }

  // ─── Instructor booking ops (FEAT-022) ─────────────────────────────────────

  /**
   * Booked vs total slots per active block for the coming week (campus today
   * + 6 days). Total = still-open slots + booked slots that haven't started,
   * so busy-suppressed and already-past slots never count as capacity.
   */
  async blockUtilization(
    tenantId: string,
    instructorId: string,
  ): Promise<OfficeHourBlockUtilization[]> {
    const now = await this.campusNow(tenantId);
    const endDate = formatDate(addDays(parseDate(now.date), 6));

    const blocks = await this.blockRepo.find({
      where: { tenantId, instructorId, active: true },
      order: { dayOfWeek: 'ASC', startTime: 'ASC' },
    });
    const open = await this.computeAvailableSlots(tenantId, {
      instructorId,
      startDate: now.date,
      endDate,
    });
    const booked = await this.bookingRepo.find({
      where: {
        tenantId,
        instructorId,
        status: BookingStatus.BOOKED,
        date: Between(now.date, endDate),
      },
    });

    const openByBlock = new Map<string, number>();
    for (const slot of open) {
      openByBlock.set(slot.blockId, (openByBlock.get(slot.blockId) ?? 0) + 1);
    }
    const bookedByBlock = new Map<string, number>();
    for (const b of booked) {
      const started =
        b.date === now.date && timeToMinutes(b.startTime) <= now.minutes;
      if (started) continue;
      bookedByBlock.set(b.blockId, (bookedByBlock.get(b.blockId) ?? 0) + 1);
    }

    return blocks.map((block) => {
      const bookedSlots = bookedByBlock.get(block.id) ?? 0;
      return {
        blockId: block.id,
        bookedSlots,
        totalSlots: bookedSlots + (openByBlock.get(block.id) ?? 0),
      };
    });
  }

  /**
   * Meetings from the last RECENT_BOOKING_DAYS that have already ended — the
   * list an instructor marks completed / no-show from. Newest first.
   */
  async listRecentInstructorBookings(
    tenantId: string,
    instructorId: string,
  ): Promise<Booking[]> {
    const now = await this.campusNow(tenantId);
    const since = formatDate(
      addDays(parseDate(now.date), -RECENT_BOOKING_DAYS),
    );
    const bookings = await this.bookingRepo.find({
      where: {
        tenantId,
        instructorId,
        status: In([
          BookingStatus.BOOKED,
          BookingStatus.COMPLETED,
          BookingStatus.NO_SHOW,
        ]),
        date: Between(since, now.date),
      },
      relations: ['block', 'student'],
      order: { date: 'DESC', startTime: 'DESC' },
    });
    return bookings.filter((b) => hasEnded(b, now));
  }

  /**
   * Record how a past meeting went. Only the owning instructor, only once the
   * slot has ended, never on a cancelled booking. Re-marking (completed <->
   * no-show) is allowed so instructors can fix a mis-click.
   */
  async markBookingOutcome(
    tenantId: string,
    instructorId: string,
    bookingId: string,
    outcome: BookingOutcome,
  ): Promise<Booking> {
    const booking = await this.bookingRepo.findOne({
      where: { id: bookingId, tenantId },
    });
    if (!booking) throw new NotFoundException('Booking not found');
    if (booking.instructorId !== instructorId) {
      throw new ForbiddenException('You can only update your own meetings');
    }
    if (booking.status === BookingStatus.CANCELLED) {
      throw new BadRequestException('This booking was cancelled');
    }
    if (!hasEnded(booking, await this.campusNow(tenantId))) {
      throw new BadRequestException(
        'You can record the outcome once the meeting has ended',
      );
    }

    booking.status =
      outcome === BookingOutcome.NO_SHOW
        ? BookingStatus.NO_SHOW
        : BookingStatus.COMPLETED;
    await this.bookingRepo.save(booking);
    return this.findBookingById(booking.id, tenantId);
  }

  /**
   * Daily: past BOOKED meetings the instructor never marked roll to COMPLETED
   * after AUTO_COMPLETE_AFTER_DAYS.
   *
   * WHY cron, not lazy-on-read: reads stay side-effect free, and the status is
   * right for analytics (FEAT-023 feedback, utilization) whether or not anyone
   * opens the schedule page. One UPDATE a day is negligible.
   * Cross-tenant on purpose (system job, no user context). The cutoff uses the
   * UTC date; with a 3-day grace a +/-1 day zone difference doesn't matter.
   */
  @Cron('15 3 * * *', { name: 'booking-auto-complete' })
  async autoCompletePastBookings(today: Date = new Date()): Promise<number> {
    const cutoff = formatDate(addDays(today, -AUTO_COMPLETE_AFTER_DAYS));
    const result = await this.bookingRepo.update(
      { status: BookingStatus.BOOKED, date: LessThan(cutoff) },
      { status: BookingStatus.COMPLETED },
    );
    return result.affected ?? 0;
  }

  // ─── Busy blocks (FEAT-019) ────────────────────────────────────────────────

  /**
   * Recurring weekly unavailability. Not conflict-checked on purpose: a busy
   * block MAY overlap lectures or office hours — that is its job (it suppresses
   * bookable slots inside the overlap).
   */
  async createBusyBlock(
    tenantId: string,
    instructorId: string,
    input: CreateBusyBlockInput,
  ): Promise<BusyBlock> {
    if (timeToMinutes(input.startTime) >= timeToMinutes(input.endTime)) {
      throw new BadRequestException('startTime must be before endTime');
    }
    const busy = this.busyRepo.create({
      tenantId,
      instructorId,
      dayOfWeek: input.dayOfWeek,
      startTime: input.startTime,
      endTime: input.endTime,
      label: input.label?.trim() || null,
    });
    return this.busyRepo.save(busy);
  }

  async deleteBusyBlock(
    tenantId: string,
    instructorId: string,
    busyBlockId: string,
  ): Promise<BusyBlock> {
    const busy = await this.busyRepo.findOne({
      where: { id: busyBlockId, tenantId },
    });
    if (!busy) throw new NotFoundException('Busy block not found');
    // Resource-level authorization: instructors manage only their own blocks.
    if (busy.instructorId !== instructorId) {
      throw new ForbiddenException('You do not own this busy block');
    }
    await this.busyRepo.remove(busy);
    // remove() clears the id — restore it so the caller (and Apollo cache
    // eviction on the frontend) still sees which row was deleted.
    busy.id = busyBlockId;
    return busy;
  }

  async listMyBusyBlocks(
    tenantId: string,
    instructorId: string,
  ): Promise<BusyBlock[]> {
    return this.busyRepo.find({
      where: { tenantId, instructorId },
      order: { dayOfWeek: 'ASC', startTime: 'ASC' },
    });
  }

  // ─── Private helpers ─────────────────────────────────────────────────────

  /**
   * FEAT-019: Reject an office-hour block that overlaps the instructor's own
   * schedule — their lecture times (section meetingDays/startTime/endTime) or
   * another of their active office-hour blocks on the same day.
   *
   * WHY reject (not warn): the backlog allows either; a hard ConflictException
   * is the only option that keeps the API honest for non-UI callers (AI agent
   * tools create blocks too, and an agent can't render a warning dialog).
   */
  private async assertNoScheduleConflict(
    tenantId: string,
    instructorId: string,
    dayOfWeek: OfficeHourDay,
    startTime: string,
    endTime: string,
    excludeBlockId?: string,
  ): Promise<void> {
    const start = timeToMinutes(startTime);
    const end = timeToMinutes(endTime);
    const conflicts: string[] = [];

    // Lectures: sections this instructor teaches, in any non-finished status.
    // CourseSection has no tenantId column — tenant scope goes through course.
    const sections = await this.sectionRepo.find({
      where: {
        instructorId,
        status: In([SectionStatus.DRAFT, SectionStatus.ACTIVE]),
        course: { tenantId },
      },
      relations: ['course'],
    });
    for (const section of sections) {
      if (!section.startTime || !section.endTime) continue;
      const meetsToday = (section.meetingDays ?? []).some(
        (d) => toOfficeHourDay(d) === dayOfWeek,
      );
      if (!meetsToday) continue;

      const lectureStart = timeToMinutes(section.startTime);
      const lectureEnd = timeToMinutes(section.endTime);
      if (start < lectureEnd && lectureStart < end) {
        conflicts.push(
          `${section.course.code} lecture (${DAY_DISPLAY[dayOfWeek]} ` +
            `${normalizeTime(section.startTime)}–${normalizeTime(section.endTime)})`,
        );
      }
    }

    // Other active office-hour blocks on the same day.
    const blocks = await this.blockRepo.find({
      where: { tenantId, instructorId, dayOfWeek, active: true },
    });
    for (const other of blocks) {
      if (other.id === excludeBlockId) continue;
      const otherStart = timeToMinutes(other.startTime);
      const otherEnd = timeToMinutes(other.endTime);
      if (start < otherEnd && otherStart < end) {
        conflicts.push(
          `your existing office hours (${DAY_DISPLAY[dayOfWeek]} ` +
            `${normalizeTime(other.startTime)}–${normalizeTime(other.endTime)})`,
        );
      }
    }

    if (conflicts.length > 0) {
      throw new ConflictException(
        `This time conflicts with ${conflicts.join(' and ')}. ` +
          'Pick a different time, or adjust the conflicting block first.',
      );
    }
  }

  private async findOwnedBlock(
    blockId: string,
    tenantId: string,
    instructorId: string,
  ): Promise<OfficeHourBlock> {
    const block = await this.blockRepo.findOne({
      where: { id: blockId, tenantId },
    });
    if (!block) throw new NotFoundException('Office-hour block not found');
    // Resource-level authorization: instructors manage only their own blocks.
    if (block.instructorId !== instructorId) {
      throw new ForbiddenException('You do not own this office-hours block');
    }
    return block;
  }

  private validateWindow(
    startTime: string,
    endTime: string,
    slotMinutes: number,
  ): void {
    const start = timeToMinutes(startTime);
    const end = timeToMinutes(endTime);
    if (start >= end) {
      throw new BadRequestException('startTime must be before endTime');
    }
    if (end - start < slotMinutes) {
      throw new BadRequestException(
        'The window must be at least one slot long',
      );
    }
  }

  private validateLocation(
    locationType: OfficeHourLocationType,
    location: string | null | undefined,
    meetingUrl: string | null | undefined,
  ): void {
    if (locationType === OfficeHourLocationType.IN_PERSON && !location) {
      throw new BadRequestException(
        'In-person office hours need a location (e.g. "ECS 618")',
      );
    }
    if (locationType === OfficeHourLocationType.ZOOM && !meetingUrl) {
      throw new BadRequestException('Zoom office hours need a meeting URL');
    }
  }

  /**
   * Validate that (date, startTime) is a real, future, on-boundary slot of the
   * block, and return the computed end time. Throws BadRequestException otherwise.
   */
  private validateSlot(
    block: OfficeHourBlock,
    date: string,
    startTime: string,
    now: CampusNow,
  ): string {
    if (DAY_INDEX[block.dayOfWeek] !== parseDate(date).getUTCDay()) {
      throw new BadRequestException(
        'That date is not an office-hours day for this block',
      );
    }

    const start = timeToMinutes(startTime);
    const windowStart = timeToMinutes(block.startTime);
    const windowEnd = timeToMinutes(block.endTime);

    if (start < windowStart || start + block.slotMinutes > windowEnd) {
      throw new BadRequestException(
        'That time is outside the office-hours window',
      );
    }
    if ((start - windowStart) % block.slotMinutes !== 0) {
      throw new BadRequestException('That time is not a valid slot start');
    }

    if (date < now.date || (date === now.date && start <= now.minutes)) {
      throw new BadRequestException('That time is in the past');
    }

    return minutesToTime(start + block.slotMinutes);
  }
}
