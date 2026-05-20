'use client';

import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

/**
 * SPRINT-1: Shared form fields for setting a section's meeting schedule.
 * Used by both admin and instructor section dialogs to keep the editing
 * surface consistent.
 *
 * Validation is intentionally lightweight here (HTML5 type=time) — the
 * authoritative rules live on the backend (see CoursesService.validateSchedule):
 *   - all three (days, start, end) must be set together, or all unset
 *   - endTime > startTime
 */

export const MEETING_DAYS = [
  { code: 'MON', label: 'Mon' },
  { code: 'TUE', label: 'Tue' },
  { code: 'WED', label: 'Wed' },
  { code: 'THU', label: 'Thu' },
  { code: 'FRI', label: 'Fri' },
] as const;

export type MeetingDayCode = (typeof MEETING_DAYS)[number]['code'];

export interface ScheduleFieldsValue {
  meetingDays: string[];
  startTime: string;
  endTime: string;
  room: string;
}

export const EMPTY_SCHEDULE: ScheduleFieldsValue = {
  meetingDays: [],
  startTime: '',
  endTime: '',
  room: '',
};

interface Props {
  value: ScheduleFieldsValue;
  onChange: (value: ScheduleFieldsValue) => void;
  /** Optional inline error message — e.g. "End time must be after start time". */
  error?: string | null;
}

export function ScheduleFields({ value, onChange, error }: Props) {
  const toggleDay = (day: string) => {
    const next = value.meetingDays.includes(day)
      ? value.meetingDays.filter((d) => d !== day)
      : [...value.meetingDays, day];
    onChange({ ...value, meetingDays: next });
  };

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label>Meeting Days</Label>
        <div className="flex flex-wrap gap-2">
          {MEETING_DAYS.map((d) => {
            const checked = value.meetingDays.includes(d.code);
            return (
              <label
                key={d.code}
                className={`flex cursor-pointer items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-sm transition-colors ${
                  checked
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-input hover:bg-accent'
                }`}
              >
                <Checkbox
                  checked={checked}
                  onCheckedChange={() => toggleDay(d.code)}
                />
                {d.label}
              </label>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="schedule-start">Start Time</Label>
          <Input
            id="schedule-start"
            type="time"
            value={value.startTime}
            onChange={(e) => onChange({ ...value, startTime: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="schedule-end">End Time</Label>
          <Input
            id="schedule-end"
            type="time"
            value={value.endTime}
            onChange={(e) => onChange({ ...value, endTime: e.target.value })}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="schedule-room">Room</Label>
        <Input
          id="schedule-room"
          placeholder="e.g. Room 204, Online"
          value={value.room}
          onChange={(e) => onChange({ ...value, room: e.target.value })}
          maxLength={64}
        />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}

/**
 * SPRINT-1: Client-side validation matching the backend rules in
 * CoursesService.validateSchedule. Returns an error string or null.
 *
 * Kept as a free function so the same logic can be used in form submit
 * handlers without importing the component.
 */
export function validateScheduleFields(
  value: ScheduleFieldsValue,
): string | null {
  const hasDays = value.meetingDays.length > 0;
  const hasStart = !!value.startTime;
  const hasEnd = !!value.endTime;

  if (!hasDays && !hasStart && !hasEnd) return null;
  if (!hasDays || !hasStart || !hasEnd) {
    return 'Meeting days, start time, and end time must all be set together (or all left blank)';
  }
  if (value.startTime >= value.endTime) {
    return 'End time must be after start time';
  }
  return null;
}

/**
 * SPRINT-1: Convert the form value to the GraphQL input shape.
 * Returns `undefined` for fields the user did not set — preserves
 * "leave unchanged" semantics on update mutations.
 */
export function scheduleFieldsToInput(value: ScheduleFieldsValue): {
  meetingDays?: string[];
  startTime?: string;
  endTime?: string;
  room?: string;
} {
  return {
    meetingDays: value.meetingDays,
    startTime: value.startTime || undefined,
    endTime: value.endTime || undefined,
    room: value.room.trim() || undefined,
  };
}
