'use client';

import { Fragment } from 'react';
import { useQuery } from '@apollo/client/react';
import Link from 'next/link';
import {
  MY_ENROLLMENTS_QUERY,
  MY_SECTIONS_QUERY,
} from '@/lib/graphql/queries/courses';
import {
  MY_OFFICE_HOUR_BLOCKS_QUERY,
  MY_BUSY_BLOCKS_QUERY,
  INSTRUCTOR_BOOKINGS_QUERY,
} from '@/lib/graphql/queries/office-hours';
import { useAuthStore } from '@/stores/auth.store';
import { UserRole } from '@/types/auth';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { CalendarOff } from 'lucide-react';
import { UpcomingBookings } from '@/components/office-hours/upcoming-bookings';
import { OfficeHoursManager } from '@/components/office-hours/office-hours-manager';
import { BusyBlocksManager } from '@/components/office-hours/busy-blocks-manager';
import {
  formatTime12h,
  normalizeTime,
  type OfficeHourDay,
} from '@/lib/office-hours';

// ─── Types ───────────────────────────────────────────────────────────────────

interface LegacyScheduleBlob {
  meetingDays?: string[];
  startTime?: string;
  endTime?: string;
}

interface ScheduleSection {
  id: string;
  location: string | null;
  /** @deprecated SPRINT-1: legacy JSONB; prefer typed fields below */
  schedule: string | null;
  meetingDays: string[] | null;
  startTime: string | null;
  endTime: string | null;
  room: string | null;
  course: { id: string; code: string; title: string };
  instructor: { firstName: string; lastName: string };
}

interface EnrollmentItem {
  id: string;
  status: string;
  section: ScheduleSection;
}

interface OfficeHourBlockItem {
  id: string;
  dayOfWeek: OfficeHourDay;
  startTime: string;
  endTime: string;
  locationType: 'IN_PERSON' | 'ZOOM';
  location: string | null;
  active: boolean;
}

interface BusyBlockItem {
  id: string;
  dayOfWeek: OfficeHourDay;
  startTime: string;
  endTime: string;
  label: string | null;
}

interface BookingItem {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  status: string;
  student: { firstName: string; lastName: string };
}

// ─── Constants ───────────────────────────────────────────────────────────────

const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI'] as const;
type GridDay = (typeof DAYS)[number];
const DAY_LABELS: Record<string, string> = {
  MON: 'Monday',
  TUE: 'Tuesday',
  WED: 'Wednesday',
  THU: 'Thursday',
  FRI: 'Friday',
};

// Schedule grid: 7:00 → 18:00, 30-min slots = 22 slots
const GRID_START_HOUR = 7;
const GRID_END_HOUR = 18;
const SLOT_MINUTES = 30;
const TOTAL_SLOTS = ((GRID_END_HOUR - GRID_START_HOUR) * 60) / SLOT_MINUTES;

// Slot labels every full hour
const SLOT_LABELS: { slot: number; label: string }[] = [];
for (let h = GRID_START_HOUR; h < GRID_END_HOUR; h++) {
  const slot = ((h - GRID_START_HOUR) * 60) / SLOT_MINUTES;
  const label =
    h < 12 ? `${h}:00 AM` : h === 12 ? '12:00 PM' : `${h - 12}:00 PM`;
  SLOT_LABELS.push({ slot, label });
}

// Colour palette — one per course (cycles)
const COLOURS = [
  'bg-blue-100 text-blue-800 border-blue-200',
  'bg-green-100 text-green-800 border-green-200',
  'bg-purple-100 text-purple-800 border-purple-200',
  'bg-amber-100 text-amber-800 border-amber-200',
  'bg-rose-100 text-rose-800 border-rose-200',
  'bg-teal-100 text-teal-800 border-teal-200',
  'bg-indigo-100 text-indigo-800 border-indigo-200',
];

// FEAT-019: non-lecture block styles
const OFFICE_HOURS_STYLE =
  'bg-emerald-50 text-emerald-800 border-emerald-300 border-dashed';
const BUSY_STYLE =
  'bg-muted/90 text-muted-foreground border-border border-dashed z-10';
const BOOKING_STYLE = 'bg-emerald-600 text-white border-emerald-700 z-20';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function timeToSlot(time: string): number {
  const [h, m] = normalizeTime(time).split(':').map(Number);
  return ((h - GRID_START_HOUR) * 60 + m) / SLOT_MINUTES;
}

/**
 * Normalize a section meetingDay string to a grid day. Seed/import data
 * carries mixed casing ("Mon", "MONDAY") — comparing raw strings against the
 * uppercase DAYS constants silently dropped blocks into the wrong column.
 */
function toGridDay(day: string): GridDay | null {
  const key = day.trim().slice(0, 3).toUpperCase();
  return (DAYS as readonly string[]).includes(key) ? (key as GridDay) : null;
}

// ─── Grid blocks ─────────────────────────────────────────────────────────────

interface GridBlock {
  key: string;
  day: GridDay;
  /** Integer grid slots — fractional spans are invalid CSS and get dropped. */
  startSlot: number;
  endSlot: number;
  className: string;
  /** Display lines, most important first; later lines hide on short blocks. */
  lines: string[];
  tooltip: string;
  href?: string;
}

/** Clamp + round a time window to renderable integer slots, or null if off-grid. */
function toSlotRange(
  startTime: string,
  endTime: string,
): { startSlot: number; endSlot: number } | null {
  const startSlot = Math.floor(timeToSlot(startTime));
  const endSlot = Math.ceil(timeToSlot(endTime));
  if (startSlot < 0 || endSlot > TOTAL_SLOTS || startSlot >= endSlot)
    return null;
  return { startSlot, endSlot };
}

/**
 * SPRINT-1: Read the typed schedule columns; fall back to the legacy
 * `schedule` JSONB blob if the section was created before Sprint 1.
 */
function readSchedule(section: ScheduleSection): {
  meetingDays: string[];
  startTime: string | null;
  endTime: string | null;
} {
  if (section.meetingDays?.length && section.startTime && section.endTime) {
    return {
      meetingDays: section.meetingDays,
      startTime: normalizeTime(section.startTime),
      endTime: normalizeTime(section.endTime),
    };
  }
  if (section.schedule) {
    try {
      const parsed = JSON.parse(section.schedule) as LegacyScheduleBlob;
      if (parsed.meetingDays?.length && parsed.startTime && parsed.endTime) {
        return {
          meetingDays: parsed.meetingDays,
          startTime: parsed.startTime,
          endTime: parsed.endTime,
        };
      }
    } catch {
      // ignore — falls through to empty
    }
  }
  return { meetingDays: [], startTime: null, endTime: null };
}

function buildLectureBlocks(sections: ScheduleSection[]): GridBlock[] {
  const blocks: GridBlock[] = [];
  sections.forEach((section, idx) => {
    const { meetingDays, startTime, endTime } = readSchedule(section);
    if (!meetingDays.length || !startTime || !endTime) return;

    const range = toSlotRange(startTime, endTime);
    if (!range) return;

    const colour = COLOURS[idx % COLOURS.length];
    const displayLocation = section.room ?? section.location;
    const timeLabel = `${formatTime12h(startTime)}–${formatTime12h(endTime)}`;
    for (const day of meetingDays) {
      const gridDay = toGridDay(day);
      if (!gridDay) continue;
      blocks.push({
        key: `lecture-${section.id}-${gridDay}`,
        day: gridDay,
        ...range,
        className: colour,
        lines: [
          section.course.code,
          section.course.title,
          displayLocation ?? '',
          timeLabel,
        ],
        tooltip: `${section.course.code} — ${section.course.title}\n${timeLabel}${displayLocation ? `\n${displayLocation}` : ''}`,
        href: `/courses/${section.course.id}/section/${section.id}`,
      });
    }
  });
  return blocks;
}

function buildOfficeHourBlocks(blocks: OfficeHourBlockItem[]): GridBlock[] {
  return blocks
    .filter((b) => b.active)
    .flatMap((b) => {
      const range = toSlotRange(b.startTime, b.endTime);
      if (!range) return [];
      const timeLabel = `${formatTime12h(b.startTime)}–${formatTime12h(b.endTime)}`;
      const where =
        b.locationType === 'ZOOM' ? 'Zoom' : (b.location ?? 'In person');
      return [
        {
          key: `oh-${b.id}`,
          day: b.dayOfWeek as GridDay,
          ...range,
          className: OFFICE_HOURS_STYLE,
          lines: ['Office hours', where, timeLabel],
          tooltip: `Office hours — ${where}\n${timeLabel}`,
        },
      ];
    });
}

function buildBusyBlocks(blocks: BusyBlockItem[]): GridBlock[] {
  return blocks.flatMap((b) => {
    const range = toSlotRange(b.startTime, b.endTime);
    if (!range) return [];
    const timeLabel = `${formatTime12h(b.startTime)}–${formatTime12h(b.endTime)}`;
    return [
      {
        key: `busy-${b.id}`,
        day: b.dayOfWeek as GridDay,
        ...range,
        className: BUSY_STYLE,
        lines: [b.label ?? 'Busy', timeLabel],
        tooltip: `${b.label ?? 'Busy'} (unavailable)\n${timeLabel}`,
      },
    ];
  });
}

/** Monday (local) of the week containing `d`. */
function mondayOfWeek(d: Date): Date {
  const monday = new Date(d);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  return monday;
}

/**
 * Booked appointments land on the grid only for the *current* week — the grid
 * is a generic weekly view, bookings are dated one-offs.
 */
function buildBookingBlocks(bookings: BookingItem[]): GridBlock[] {
  const monday = mondayOfWeek(new Date());
  const friday = new Date(monday);
  friday.setDate(friday.getDate() + 4);

  return bookings.flatMap((b) => {
    if (b.status !== 'BOOKED') return [];
    const [y, m, day] = b.date.split('-').map(Number);
    const date = new Date(y, m - 1, day);
    if (date < monday || date > friday) return [];
    const gridDay = DAYS[(date.getDay() + 6) % 7];
    if (!gridDay) return [];

    const range = toSlotRange(b.startTime, b.endTime);
    if (!range) return [];
    const student = `${b.student.firstName} ${b.student.lastName}`;
    const timeLabel = `${formatTime12h(b.startTime)}–${formatTime12h(b.endTime)}`;
    return [
      {
        key: `booking-${b.id}`,
        day: gridDay,
        ...range,
        className: BOOKING_STYLE,
        lines: [student, timeLabel],
        tooltip: `Booked: ${student}\n${timeLabel}`,
      },
    ];
  });
}

// ─── Main grid ───────────────────────────────────────────────────────────────

function ScheduleGrid({ blocks }: { blocks: GridBlock[] }) {
  if (blocks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-16 text-center">
        <CalendarOff
          className="h-10 w-10 text-muted-foreground mb-4"
          aria-hidden="true"
        />
        <h3 className="text-lg font-medium">No schedule set yet</h3>
        <p className="mt-1 text-sm text-muted-foreground max-w-xs">
          Your classes will appear here once an admin or instructor sets meeting
          times for your sections. In the meantime, visit{' '}
          <Link href="/courses" className="underline">
            My Courses
          </Link>
          .
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <div
        className="grid min-w-[640px]"
        style={{
          gridTemplateColumns: `56px repeat(5, 1fr)`,
          gridTemplateRows: `32px repeat(${TOTAL_SLOTS}, 28px)`,
        }}
      >
        {/* Header row */}
        <div /> {/* empty time-label corner */}
        {DAYS.map((day) => (
          <div
            key={day}
            className="flex items-center justify-center text-xs font-semibold text-muted-foreground border-b pb-1"
          >
            <span className="hidden sm:inline">{DAY_LABELS[day]}</span>
            <span className="sm:hidden">{day}</span>
          </div>
        ))}
        {/* Time labels + slot lines */}
        {Array.from({ length: TOTAL_SLOTS }).map((_, slot) => {
          const isHour = slot % 2 === 0;
          const labelEntry = SLOT_LABELS.find((l) => l.slot === slot);
          return (
            <Fragment key={`row-${slot}`}>
              <div
                className="text-right pr-2 text-[10px] text-muted-foreground leading-none"
                style={{ gridRow: slot + 2, gridColumn: 1, paddingTop: 1 }}
              >
                {labelEntry?.label}
              </div>
              {DAYS.map((_, dIdx) => (
                <div
                  key={`cell-${slot}-${dIdx}`}
                  className={`border-t ${isHour ? 'border-border/60' : 'border-border/20'}`}
                  style={{ gridRow: slot + 2, gridColumn: dIdx + 2 }}
                />
              ))}
            </Fragment>
          );
        })}
        {/* Blocks */}
        {blocks.map((block) => {
          const dayCol = DAYS.indexOf(block.day) + 2;
          const rowStart = block.startSlot + 2;
          const rowSpan = block.endSlot - block.startSlot;
          const style = {
            gridRow: `${rowStart} / span ${rowSpan}`,
            gridColumn: dayCol,
          };
          const className = `m-0.5 rounded border overflow-hidden flex flex-col p-1 text-xs transition-opacity ${block.className}`;
          // Later lines only fit on taller blocks.
          const visibleLines = block.lines
            .filter(Boolean)
            .slice(0, Math.max(1, rowSpan - 1));
          const content = (
            <>
              <span className="font-semibold truncate">{visibleLines[0]}</span>
              {visibleLines.slice(1).map((line, i) => (
                <span
                  key={i}
                  className="truncate opacity-80 leading-tight text-[10px]"
                >
                  {line}
                </span>
              ))}
            </>
          );

          return block.href ? (
            <Link
              key={block.key}
              href={block.href}
              className={`${className} hover:opacity-80`}
              style={style}
              title={block.tooltip}
            >
              {content}
            </Link>
          ) : (
            <div
              key={block.key}
              className={className}
              style={style}
              title={block.tooltip}
            >
              {content}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Legend ──────────────────────────────────────────────────────────────────

function ScheduleLegend({
  sections,
  showInstructorKinds,
}: {
  sections: ScheduleSection[];
  showInstructorKinds?: boolean;
}) {
  const withSchedule = sections.filter((s) => {
    const { meetingDays, startTime, endTime } = readSchedule(s);
    return meetingDays.length > 0 && startTime && endTime;
  });

  return (
    <div className="flex flex-wrap gap-2 mt-4">
      {withSchedule.map((section, idx) => (
        <Badge
          key={section.id}
          variant="outline"
          className={`text-xs ${COLOURS[idx % COLOURS.length]}`}
        >
          {section.course.code} — {section.course.title}
        </Badge>
      ))}
      {showInstructorKinds && (
        <>
          <Badge variant="outline" className={`text-xs ${OFFICE_HOURS_STYLE}`}>
            Office hours
          </Badge>
          <Badge variant="outline" className={`text-xs ${BOOKING_STYLE}`}>
            Booked appointment (this week)
          </Badge>
          <Badge variant="outline" className={`text-xs ${BUSY_STYLE}`}>
            Busy
          </Badge>
        </>
      )}
    </div>
  );
}

// ─── Student view ─────────────────────────────────────────────────────────────

function StudentSchedule() {
  const { data, loading } = useQuery<{ myEnrollments: EnrollmentItem[] }>(
    MY_ENROLLMENTS_QUERY,
  );
  const sections =
    data?.myEnrollments
      .filter((e) => (e.status ?? '').toUpperCase() === 'ACTIVE')
      .map((e) => e.section) ?? [];

  if (loading) return <Skeleton className="h-64 w-full rounded-lg" />;
  return (
    <>
      <ScheduleGrid blocks={buildLectureBlocks(sections)} />
      <ScheduleLegend sections={sections} />
      <UpcomingBookings viewer="student" />
    </>
  );
}

// ─── Instructor view ──────────────────────────────────────────────────────────

/**
 * FEAT-019: The instructor's *whole* week in one grid — lectures, office-hour
 * blocks, this week's booked appointments, and busy windows — plus management
 * cards for office hours and busy times.
 */
function InstructorSchedule() {
  const { data: sectionsData, loading: sectionsLoading } = useQuery<{
    mySections: ScheduleSection[];
  }>(MY_SECTIONS_QUERY);
  const { data: ohData, loading: ohLoading } = useQuery<{
    myOfficeHourBlocks: OfficeHourBlockItem[];
  }>(MY_OFFICE_HOUR_BLOCKS_QUERY);
  const { data: busyData, loading: busyLoading } = useQuery<{
    myBusyBlocks: BusyBlockItem[];
  }>(MY_BUSY_BLOCKS_QUERY);
  const { data: bookingsData, loading: bookingsLoading } = useQuery<{
    instructorBookings: BookingItem[];
  }>(INSTRUCTOR_BOOKINGS_QUERY);

  const loading =
    sectionsLoading || ohLoading || busyLoading || bookingsLoading;
  if (loading) return <Skeleton className="h-64 w-full rounded-lg" />;

  const sections = sectionsData?.mySections ?? [];
  const blocks = [
    ...buildLectureBlocks(sections),
    ...buildOfficeHourBlocks(ohData?.myOfficeHourBlocks ?? []),
    ...buildBusyBlocks(busyData?.myBusyBlocks ?? []),
    ...buildBookingBlocks(bookingsData?.instructorBookings ?? []),
  ];

  return (
    <>
      <ScheduleGrid blocks={blocks} />
      <ScheduleLegend sections={sections} showInstructorKinds />
      <div className="grid gap-6 lg:grid-cols-2">
        <OfficeHoursManager />
        <BusyBlocksManager />
      </div>
      <UpcomingBookings viewer="instructor" />
    </>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SchedulePage() {
  const { user } = useAuthStore();
  const isStudent = !user?.roles.some(
    (r) => r === UserRole.INSTRUCTOR || r === UserRole.ADMIN,
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Schedule</h1>
        <p className="text-muted-foreground">
          {isStudent
            ? 'Your weekly class timetable.'
            : 'Your whole week — lectures, office hours, bookings, and busy time.'}
        </p>
      </div>
      {isStudent ? <StudentSchedule /> : <InstructorSchedule />}
    </div>
  );
}
