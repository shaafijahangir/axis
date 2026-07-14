// FEAT-018: Shared office-hours formatting helpers.
// GraphQL enums arrive as their NAMES ("MON", "IN_PERSON"); Postgres `time`
// arrives as "HH:MM:SS" and `date` as "YYYY-MM-DD".

export type OfficeHourDay = 'MON' | 'TUE' | 'WED' | 'THU' | 'FRI';
export type OfficeHourLocationType = 'IN_PERSON' | 'ZOOM';

export const DAY_LABELS: Record<OfficeHourDay, string> = {
  MON: 'Monday',
  TUE: 'Tuesday',
  WED: 'Wednesday',
  THU: 'Thursday',
  FRI: 'Friday',
};

export const DAY_ORDER: OfficeHourDay[] = ['MON', 'TUE', 'WED', 'THU', 'FRI'];

/** Trim Postgres "HH:MM:SS" to "HH:MM". Safe on already-short values. */
export function normalizeTime(time: string): string {
  return time.slice(0, 5);
}

/** "14:30" or "14:30:00" → "2:30 PM" */
export function formatTime12h(time: string): string {
  const [h, m] = normalizeTime(time).split(':').map(Number);
  const suffix = h < 12 ? 'AM' : 'PM';
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, '0')} ${suffix}`;
}

/** "2026-07-20" → "Mon, Jul 20" (parsed as local date, not UTC-shifted). */
export function formatDateShort(date: string): string {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

/** "2026-07-20" → "Monday, July 20" */
export function formatDateLong(date: string): string {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}
