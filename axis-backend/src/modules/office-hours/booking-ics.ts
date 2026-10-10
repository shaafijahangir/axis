/**
 * FEAT-024: RFC 5545 (iCalendar) generator for office-hours bookings.
 *
 * WHY hand-rolled (no `ics` / `ical-generator` dependency): one VEVENT with
 * eight properties is ~100 lines. The parts that are easy to get wrong —
 * CRLF, 75-octet folding, TEXT escaping — are each a few lines and are pinned
 * by unit tests, so a dependency would add supply-chain surface for no gain.
 *
 * PATTERN: pure function. No Date.now(), no DB — the caller resolves the
 * tenant timezone and passes real instants, which keeps this trivially
 * testable and keeps the timezone rule in one place (tenant-time.ts).
 *
 * Spec references (RFC 5545, https://www.rfc-editor.org/rfc/rfc5545):
 * - §3.1   content lines end in CRLF; lines SHOULD NOT exceed 75 octets and are
 *          folded with CRLF + one space (folding may not split a UTF-8 char).
 * - §3.3.5 DATE-TIME in UTC form is `YYYYMMDDTHHMMSSZ`.
 * - §3.3.11 TEXT escapes: backslash, semicolon, comma, newline (`\n`).
 * - §3.6.1 VEVENT requires UID and DTSTAMP when METHOD is present.
 * - §3.7.2 METHOD; §3.8.1.11 STATUS (CONFIRMED | CANCELLED for VEVENT);
 *   §3.8.7.4 SEQUENCE — bumped on cancel so clients replace the earlier copy.
 */

import { wallClockToInstant } from '../../tenant/tenant-time';
import { User } from '../../database/entities/user.entity';
import { BookingStatus } from './entities/booking.entity';
import {
  OfficeHourBlock,
  OfficeHourLocationType,
} from './entities/office-hour-block.entity';

const CRLF = '\r\n';
const MAX_LINE_OCTETS = 75;
const PRODID = '-//Axis//Office Hours//EN';

export type IcsEventStatus = 'CONFIRMED' | 'CANCELLED';

export interface IcsEventInput {
  /** Globally unique, stable across re-exports of the same booking. */
  uid: string;
  /** When this calendar object was generated. */
  dtStamp: Date;
  start: Date;
  end: Date;
  summary: string;
  description?: string | null;
  location?: string | null;
  /** Meeting URL (e.g. Zoom). Emitted as the URL property. */
  url?: string | null;
  status: IcsEventStatus;
  /** Revision counter; higher replaces lower for the same UID. */
  sequence?: number;
}

/** Date → `YYYYMMDDTHHMMSSZ` (UTC, RFC 5545 §3.3.5 form #2). */
export function formatIcsUtc(date: Date): string {
  return date
    .toISOString()
    .replace(/\.\d{3}Z$/, 'Z')
    .replace(/[-:]/g, '');
}

/**
 * Remove control characters TEXT/URI values may not contain (RFC 5545 §3.3.11
 * allows HTAB only; CR/LF are handled by the escaper before this runs).
 */
function stripControls(value: string): string {
  // eslint-disable-next-line no-control-regex
  return value.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
}

/** Escape a TEXT value (RFC 5545 §3.3.11). Order matters: backslash first. */
export function escapeIcsText(value: string): string {
  return stripControls(
    value
      .replace(/\\/g, '\\\\')
      .replace(/;/g, '\\;')
      .replace(/,/g, '\\,')
      .replace(/\r\n|\r|\n/g, '\\n'),
  );
}

/**
 * Fold a content line to ≤75 octets per physical line (RFC 5545 §3.1).
 * Measured in UTF-8 bytes and split on code-point boundaries so a multi-byte
 * character (é, emoji) is never cut in half. Continuation lines start with a
 * single space, which counts toward their 75 octets.
 */
export function foldIcsLine(line: string): string {
  const encoder = new TextEncoder();
  const out: string[] = [];
  let current = '';
  let currentOctets = 0;
  let limit = MAX_LINE_OCTETS;
  for (const char of line) {
    const octets = encoder.encode(char).length;
    if (currentOctets + octets > limit) {
      out.push(current);
      current = '';
      currentOctets = 0;
      limit = MAX_LINE_OCTETS - 1; // leading space on continuation lines
    }
    current += char;
    currentOctets += octets;
  }
  out.push(current);
  return out.join(`${CRLF} `);
}

/** Build a complete VCALENDAR with one VEVENT. Output uses CRLF throughout. */
export function buildIcsCalendar(event: IcsEventInput): string {
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    `PRODID:${PRODID}`,
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${stripControls(event.uid)}`,
    `DTSTAMP:${formatIcsUtc(event.dtStamp)}`,
    `DTSTART:${formatIcsUtc(event.start)}`,
    `DTEND:${formatIcsUtc(event.end)}`,
    `SUMMARY:${escapeIcsText(event.summary)}`,
  ];
  if (event.description) {
    lines.push(`DESCRIPTION:${escapeIcsText(event.description)}`);
  }
  if (event.location) {
    lines.push(`LOCATION:${escapeIcsText(event.location)}`);
  }
  if (event.url) {
    // URI value type — not TEXT-escaped (§3.3.13), only control-stripped.
    lines.push(`URL:${stripControls(event.url)}`);
  }
  lines.push(
    `STATUS:${event.status}`,
    `SEQUENCE:${event.sequence ?? 0}`,
    'TRANSP:OPAQUE',
    'END:VEVENT',
    'END:VCALENDAR',
  );
  return lines.map(foldIcsLine).join(CRLF) + CRLF;
}

// ─── Booking → event mapping ─────────────────────────────────────────────────

/** The booking fields the invite needs (relations loaded by the caller). */
export interface BookingForInvite {
  id: string;
  date: string; // "YYYY-MM-DD", tenant wall-clock
  startTime: string; // "HH:MM[:SS]", tenant wall-clock
  endTime: string;
  status: BookingStatus;
  note: string | null;
  block: Pick<OfficeHourBlock, 'locationType' | 'location' | 'meetingUrl'>;
  instructor: Pick<User, 'firstName' | 'lastName'>;
  student: Pick<User, 'firstName' | 'lastName'>;
}

export type InviteViewer = 'student' | 'instructor';

const fullName = (u: Pick<User, 'firstName' | 'lastName'>): string =>
  `${u.firstName} ${u.lastName}`.trim();

/**
 * Map a booking to an ICS event for one side of the meeting.
 *
 * Times: booking date/start/end are campus wall-clock, so they are converted
 * with the tenant's IANA zone and emitted as UTC — the importing calendar
 * then renders them in the viewer's own zone. No VTIMEZONE block is needed.
 *
 * Cancelled bookings still export (STATUS:CANCELLED, SEQUENCE:1) rather than
 * erroring: someone who imported the invite earlier can re-import it and the
 * client updates the event with the same UID. Completed and no-show bookings
 * are past meetings → CONFIRMED.
 */
export function bookingToIcsEvent(
  booking: BookingForInvite,
  viewer: InviteViewer,
  timeZone: string,
  now: Date,
): IcsEventInput {
  const instructorName = fullName(booking.instructor);
  const studentName = fullName(booking.student);
  const isZoom = booking.block.locationType === OfficeHourLocationType.ZOOM;
  const meetingUrl = isZoom ? booking.block.meetingUrl : null;
  const cancelled = booking.status === BookingStatus.CANCELLED;

  const summary =
    viewer === 'student'
      ? `Office hours with ${instructorName}`
      : `Office hours: ${studentName}`;

  const descriptionLines = [
    `Office hours with ${instructorName} and ${studentName}.`,
  ];
  if (booking.note) descriptionLines.push(`Topic: ${booking.note}`);
  if (meetingUrl) descriptionLines.push(`Join on Zoom: ${meetingUrl}`);
  if (cancelled) descriptionLines.push('This booking was cancelled.');

  const location = isZoom
    ? (meetingUrl ?? 'Zoom')
    : (booking.block.location ?? 'In person');

  return {
    uid: `booking-${booking.id}@axis`,
    dtStamp: now,
    start: wallClockToInstant(booking.date, booking.startTime, timeZone),
    end: wallClockToInstant(booking.date, booking.endTime, timeZone),
    summary: cancelled ? `Cancelled: ${summary}` : summary,
    description: descriptionLines.join('\n'),
    location,
    url: meetingUrl,
    status: cancelled ? 'CANCELLED' : 'CONFIRMED',
    sequence: cancelled ? 1 : 0,
  };
}
