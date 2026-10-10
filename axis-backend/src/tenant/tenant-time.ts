/**
 * Tenant wall-clock ↔ instant conversion.
 *
 * WHY: schedule data (office-hour blocks, bookings, section times) is stored
 * as wall-clock `date` + `time` with no zone — "Mon 11:00" means 11:00 on
 * campus. The server (Render) runs in UTC, so parsing those values with
 * `new Date('YYYY-MM-DDTHH:MM')` or reading `getHours()` interprets them in the
 * *server's* zone and is off by the campus UTC offset (7–8h for Pacific).
 * Every "now"-relative check must go through these helpers with the tenant's
 * IANA zone instead.
 *
 * PATTERN: Intl.DateTimeFormat with an explicit `timeZone` — Node ships full
 * ICU (https://nodejs.org/api/intl.html#options-for-building-nodejs), so no
 * date library is needed for offset lookup.
 */

/** Default campus zone — the beachhead market is BC (GTM.md). */
export const DEFAULT_TENANT_TIMEZONE = 'America/Vancouver';

/** True when `tz` is an IANA zone ICU recognizes (Intl throws RangeError otherwise). */
export function isValidTimeZone(tz: unknown): tz is string {
  if (typeof tz !== 'string' || tz.length === 0) return false;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

const formatterCache = new Map<string, Intl.DateTimeFormat>();

function partsFormatter(tz: string): Intl.DateTimeFormat {
  let fmt = formatterCache.get(tz);
  if (!fmt) {
    fmt = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    formatterCache.set(tz, fmt);
  }
  return fmt;
}

interface ZonedFields {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

function zonedFields(instant: number, tz: string): ZonedFields {
  const parts = partsFormatter(tz).formatToParts(new Date(instant));
  const get = (type: Intl.DateTimeFormatPartTypes): number =>
    Number(parts.find((p) => p.type === type)?.value ?? 0);
  return {
    year: get('year'),
    month: get('month'),
    day: get('day'),
    hour: get('hour'),
    minute: get('minute'),
    second: get('second'),
  };
}

/** Offset (ms) of `tz` from UTC at `instant` — e.g. -7h for PDT. */
function offsetMs(instant: number, tz: string): number {
  const f = zonedFields(instant, tz);
  const asUtc = Date.UTC(
    f.year,
    f.month - 1,
    f.day,
    f.hour,
    f.minute,
    f.second,
  );
  return asUtc - Math.floor(instant / 1000) * 1000;
}

/**
 * "YYYY-MM-DD" + "HH:MM[:SS]" wall-clock in `tz` → the real instant.
 *
 * Two-pass offset lookup handles DST: the first guess uses the offset at the
 * naive-UTC instant, the second re-reads it at the corrected instant. For a
 * nonexistent spring-forward time (02:30 on DST day) this lands one hour
 * later, which is the conventional resolution.
 */
export function wallClockToInstant(
  date: string,
  time: string,
  tz: string,
): Date {
  const [y, mo, d] = date.split('-').map(Number);
  const [h, mi] = time.slice(0, 5).split(':').map(Number);
  const naive = Date.UTC(y, mo - 1, d, h, mi);
  const first = naive - offsetMs(naive, tz);
  const second = naive - offsetMs(first, tz);
  return new Date(second);
}

/** The wall-clock "now" in `tz`: calendar date and minutes since midnight. */
export function zonedNow(
  tz: string,
  now: number = Date.now(),
): { date: string; minutes: number } {
  const f = zonedFields(now, tz);
  const date = `${f.year}-${String(f.month).padStart(2, '0')}-${String(f.day).padStart(2, '0')}`;
  return { date, minutes: f.hour * 60 + f.minute };
}

/** Format an instant as campus wall-clock text (e.g. "Wed, Oct 14, 11:00 AM"). */
export function formatInZone(
  instant: Date,
  tz: string,
  options: Intl.DateTimeFormatOptions,
): string {
  return instant.toLocaleString('en-US', { ...options, timeZone: tz });
}

/** Calendar date ("YYYY-MM-DD") of `instant` on the campus clock. */
export function zonedDateString(instant: number, tz: string): string {
  return zonedNow(tz, instant).date;
}
