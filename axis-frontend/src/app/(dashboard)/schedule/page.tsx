'use client';

import { useQuery } from '@apollo/client/react';
import Link from 'next/link';
import {
  MY_ENROLLMENTS_QUERY,
  MY_SECTIONS_QUERY,
} from '@/lib/graphql/queries/courses';
import { useAuthStore } from '@/stores/auth.store';
import { UserRole } from '@/types/auth';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { CalendarOff } from 'lucide-react';

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

// ─── Constants ───────────────────────────────────────────────────────────────

const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI'] as const;
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

// ─── Helpers ─────────────────────────────────────────────────────────────────

function timeToSlot(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return ((h - GRID_START_HOUR) * 60 + m) / SLOT_MINUTES;
}

function formatTime(time: string): string {
  const [h, m] = time.split(':').map(Number);
  const suffix = h < 12 ? 'AM' : 'PM';
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, '0')} ${suffix}`;
}

// ─── Timetable ───────────────────────────────────────────────────────────────

interface TimetableBlock {
  sectionId: string;
  courseId: string;
  courseCode: string;
  courseTitle: string;
  day: string;
  startSlot: number;
  endSlot: number;
  location: string | null;
  instructor: string;
  colourClass: string;
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
    // Postgres `time` is returned as "HH:MM:SS"; trim to "HH:MM" for slot math
    return {
      meetingDays: section.meetingDays,
      startTime: section.startTime.slice(0, 5),
      endTime: section.endTime.slice(0, 5),
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

function buildBlocks(sections: ScheduleSection[]): TimetableBlock[] {
  const blocks: TimetableBlock[] = [];
  sections.forEach((section, idx) => {
    const { meetingDays, startTime, endTime } = readSchedule(section);
    if (!meetingDays.length || !startTime || !endTime) return;

    const startSlot = timeToSlot(startTime);
    const endSlot = timeToSlot(endTime);
    if (startSlot < 0 || endSlot > TOTAL_SLOTS || startSlot >= endSlot) return;

    const colour = COLOURS[idx % COLOURS.length];
    const displayLocation = section.room ?? section.location;
    for (const day of meetingDays) {
      blocks.push({
        sectionId: section.id,
        courseId: section.course.id,
        courseCode: section.course.code,
        courseTitle: section.course.title,
        day,
        startSlot,
        endSlot,
        location: displayLocation,
        instructor: `${section.instructor.firstName} ${section.instructor.lastName}`,
        colourClass: colour,
      });
    }
  });
  return blocks;
}

// ─── Main grid ───────────────────────────────────────────────────────────────

function ScheduleGrid({ sections }: { sections: ScheduleSection[] }) {
  const blocks = buildBlocks(sections);
  const hasSchedule = blocks.length > 0;

  if (!hasSchedule) {
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
            <>
              <div
                key={`label-${slot}`}
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
            </>
          );
        })}
        {/* Course blocks */}
        {blocks.map((block) => {
          const dayCol = DAYS.indexOf(block.day as (typeof DAYS)[number]) + 2;
          const rowStart = block.startSlot + 2;
          const rowSpan = block.endSlot - block.startSlot;
          const startTime = formatTime(
            `${GRID_START_HOUR + Math.floor(block.startSlot / 2)}:${block.startSlot % 2 === 0 ? '00' : '30'}`,
          );
          const endTime = formatTime(
            `${GRID_START_HOUR + Math.floor(block.endSlot / 2)}:${block.endSlot % 2 === 0 ? '00' : '30'}`,
          );

          return (
            <Link
              key={`${block.sectionId}-${block.day}`}
              href={`/courses/${block.courseId}/section/${block.sectionId}`}
              className={`m-0.5 rounded border overflow-hidden flex flex-col p-1 text-xs hover:opacity-80 transition-opacity ${block.colourClass}`}
              style={{
                gridRow: `${rowStart} / span ${rowSpan}`,
                gridColumn: dayCol,
              }}
              title={`${block.courseCode} — ${block.courseTitle}\n${startTime}–${endTime}${block.location ? `\n${block.location}` : ''}`}
            >
              <span className="font-semibold truncate">{block.courseCode}</span>
              {rowSpan >= 3 && (
                <span className="truncate opacity-80 leading-tight">
                  {block.courseTitle}
                </span>
              )}
              {rowSpan >= 4 && block.location && (
                <span className="truncate opacity-70 leading-tight">
                  {block.location}
                </span>
              )}
              {rowSpan >= 5 && (
                <span className="truncate opacity-60 leading-tight text-[10px]">
                  {startTime}–{endTime}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

// ─── Legend ──────────────────────────────────────────────────────────────────

function ScheduleLegend({ sections }: { sections: ScheduleSection[] }) {
  const withSchedule = sections.filter((s) => {
    const { meetingDays, startTime, endTime } = readSchedule(s);
    return meetingDays.length > 0 && startTime && endTime;
  });
  if (!withSchedule.length) return null;

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
      <ScheduleGrid sections={sections} />
      <ScheduleLegend sections={sections} />
    </>
  );
}

// ─── Instructor view ──────────────────────────────────────────────────────────

function InstructorSchedule() {
  const { data, loading } = useQuery<{ mySections: ScheduleSection[] }>(
    MY_SECTIONS_QUERY,
  );
  const sections = data?.mySections ?? [];

  if (loading) return <Skeleton className="h-64 w-full rounded-lg" />;
  return (
    <>
      <ScheduleGrid sections={sections} />
      <ScheduleLegend sections={sections} />
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
        <p className="text-muted-foreground">Your weekly class timetable.</p>
      </div>
      {isStudent ? <StudentSchedule /> : <InstructorSchedule />}
    </div>
  );
}
