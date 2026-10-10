import {
  buildIcsCalendar,
  bookingToIcsEvent,
  BookingForInvite,
  escapeIcsText,
  foldIcsLine,
  formatIcsUtc,
  IcsEventInput,
} from './booking-ics';
import { BookingStatus } from './entities/booking.entity';
import { OfficeHourLocationType } from './entities/office-hour-block.entity';

const octets = (s: string): number => Buffer.byteLength(s, 'utf8');

/** RFC 5545 §3.1 unfolding: remove every CRLF followed by one space. */
const unfold = (s: string): string => s.replace(/\r\n /g, '');

function makeBooking(
  overrides: Partial<BookingForInvite> = {},
): BookingForInvite {
  return {
    id: 'b-1',
    date: '2026-10-14',
    startTime: '11:00:00',
    endTime: '11:15:00',
    status: BookingStatus.BOOKED,
    note: null,
    block: {
      locationType: OfficeHourLocationType.IN_PERSON,
      location: 'ECS 618',
      meetingUrl: null,
    },
    instructor: { firstName: 'Sarah', lastName: 'Chen' },
    student: { firstName: 'Alex', lastName: 'Rivera' },
    ...overrides,
  };
}

const NOW = new Date('2026-10-10T12:34:56.789Z');

describe('booking-ics', () => {
  describe('formatIcsUtc', () => {
    it('emits the RFC 5545 UTC DATE-TIME form without millis', () => {
      expect(formatIcsUtc(NOW)).toBe('20261010T123456Z');
    });
  });

  describe('escapeIcsText', () => {
    it('escapes backslash, semicolon, comma and every newline form', () => {
      expect(escapeIcsText('a\\b;c,d\ne\r\nf\rg')).toBe(
        'a\\\\b\\;c\\,d\\ne\\nf\\ng',
      );
    });

    it('escapes backslash before the others (no double-escaping)', () => {
      expect(escapeIcsText('\\,')).toBe('\\\\\\,');
    });

    it('strips control characters but keeps tabs', () => {
      expect(escapeIcsText('a\u0000b\u0007c\td')).toBe('abc\td');
    });
  });

  describe('foldIcsLine', () => {
    it('leaves lines of ≤75 octets alone', () => {
      const line = 'X'.repeat(75);
      expect(foldIcsLine(line)).toBe(line);
    });

    it('folds long lines to ≤75 octets per physical line and unfolds losslessly', () => {
      const line = `DESCRIPTION:${'abcdefghij'.repeat(30)}`;
      const folded = foldIcsLine(line);
      const physical = folded.split('\r\n');
      expect(physical.length).toBeGreaterThan(1);
      physical.forEach((p, i) => {
        expect(octets(p)).toBeLessThanOrEqual(75);
        if (i > 0) expect(p.startsWith(' ')).toBe(true);
      });
      expect(unfold(folded)).toBe(line);
    });

    it('never splits a multi-byte UTF-8 character across lines', () => {
      // 'é' is 2 octets, '🎓' is 4 — mix them so boundaries fall mid-char.
      const line = `SUMMARY:${'é🎓x'.repeat(40)}`;
      const folded = foldIcsLine(line);
      for (const p of folded.split('\r\n')) {
        expect(octets(p)).toBeLessThanOrEqual(75);
        // A cut surrogate pair would show up as a lone surrogate.
        expect(p).not.toMatch(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])/);
        expect(p).not.toMatch(/(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/);
      }
      expect(unfold(folded)).toBe(line);
    });
  });

  describe('buildIcsCalendar', () => {
    const event: IcsEventInput = {
      uid: 'booking-b-1@axis',
      dtStamp: NOW,
      start: new Date('2026-10-14T18:00:00Z'),
      end: new Date('2026-10-14T18:15:00Z'),
      summary: 'Office hours with Sarah Chen',
      description: 'Topic: A2, Q3',
      location: 'ECS 618',
      status: 'CONFIRMED',
    };

    it('uses CRLF line endings exclusively and ends with CRLF', () => {
      const ics = buildIcsCalendar(event);
      expect(ics.endsWith('\r\n')).toBe(true);
      expect(ics.replace(/\r\n/g, '')).not.toMatch(/[\r\n]/);
    });

    it('emits the required calendar and event properties in order', () => {
      const lines = unfold(buildIcsCalendar(event)).split('\r\n');
      expect(lines.slice(0, 6)).toEqual([
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//Axis//Office Hours//EN',
        'CALSCALE:GREGORIAN',
        'METHOD:PUBLISH',
        'BEGIN:VEVENT',
      ]);
      expect(lines).toEqual(
        expect.arrayContaining([
          'UID:booking-b-1@axis',
          'DTSTAMP:20261010T123456Z',
          'DTSTART:20261014T180000Z',
          'DTEND:20261014T181500Z',
          'SUMMARY:Office hours with Sarah Chen',
          'DESCRIPTION:Topic: A2\\, Q3',
          'LOCATION:ECS 618',
          'STATUS:CONFIRMED',
          'SEQUENCE:0',
        ]),
      );
      expect(lines.slice(-3)).toEqual(['END:VEVENT', 'END:VCALENDAR', '']);
    });

    it('omits optional properties when absent', () => {
      const ics = buildIcsCalendar({
        ...event,
        description: null,
        location: null,
        url: null,
      });
      expect(ics).not.toMatch(/^(DESCRIPTION|LOCATION|URL):/m);
    });

    it('does not TEXT-escape the URL property', () => {
      const ics = buildIcsCalendar({
        ...event,
        url: 'https://zoom.us/j/123?pwd=a,b;c',
      });
      expect(unfold(ics)).toContain(
        '\r\nURL:https://zoom.us/j/123?pwd=a,b;c\r\n',
      );
    });
  });

  describe('bookingToIcsEvent', () => {
    it('converts tenant wall-clock to UTC (Vancouver, PDT −7)', () => {
      const ev = bookingToIcsEvent(
        makeBooking(),
        'student',
        'America/Vancouver',
        NOW,
      );
      expect(ev.start.toISOString()).toBe('2026-10-14T18:00:00.000Z');
      expect(ev.end.toISOString()).toBe('2026-10-14T18:15:00.000Z');
    });

    it('applies the right offset on each side of a DST change (New York)', () => {
      const winter = bookingToIcsEvent(
        makeBooking({
          date: '2026-03-06',
          startTime: '10:00',
          endTime: '10:30',
        }),
        'student',
        'America/New_York',
        NOW,
      );
      const summer = bookingToIcsEvent(
        makeBooking({
          date: '2026-03-09',
          startTime: '10:00',
          endTime: '10:30',
        }),
        'student',
        'America/New_York',
        NOW,
      );
      expect(formatIcsUtc(winter.start)).toBe('20260306T150000Z'); // EST −5
      expect(formatIcsUtc(summer.start)).toBe('20260309T140000Z'); // EDT −4
      expect(formatIcsUtc(summer.end)).toBe('20260309T143000Z');
    });

    it('uses a stable per-booking UID', () => {
      const a = bookingToIcsEvent(makeBooking(), 'student', 'UTC', NOW);
      const b = bookingToIcsEvent(
        makeBooking(),
        'instructor',
        'UTC',
        new Date('2027-01-01T00:00:00Z'),
      );
      expect(a.uid).toBe('booking-b-1@axis');
      expect(b.uid).toBe(a.uid);
    });

    it('titles the event from the viewer’s side', () => {
      expect(
        bookingToIcsEvent(makeBooking(), 'student', 'UTC', NOW).summary,
      ).toBe('Office hours with Sarah Chen');
      expect(
        bookingToIcsEvent(makeBooking(), 'instructor', 'UTC', NOW).summary,
      ).toBe('Office hours: Alex Rivera');
    });

    it('puts the room in LOCATION for in-person blocks', () => {
      const ev = bookingToIcsEvent(makeBooking(), 'student', 'UTC', NOW);
      expect(ev.location).toBe('ECS 618');
      expect(ev.url).toBeNull();
    });

    it('puts the Zoom link in LOCATION, URL and DESCRIPTION for Zoom blocks', () => {
      const url = 'https://zoom.us/j/9876543210';
      const ev = bookingToIcsEvent(
        makeBooking({
          block: {
            locationType: OfficeHourLocationType.ZOOM,
            location: null,
            meetingUrl: url,
          },
        }),
        'student',
        'UTC',
        NOW,
      );
      expect(ev.location).toBe(url);
      expect(ev.url).toBe(url);
      expect(ev.description).toContain(`Join on Zoom: ${url}`);
    });

    it('includes the topic note, escaped in the final ICS', () => {
      const ev = bookingToIcsEvent(
        makeBooking({ note: 'A2, Q3; recursion\nand \\ proofs' }),
        'student',
        'UTC',
        NOW,
      );
      const ics = unfold(buildIcsCalendar(ev));
      expect(ics).toContain('Topic: A2\\, Q3\\; recursion\\nand \\\\ proofs');
    });

    it('marks cancelled bookings STATUS:CANCELLED with a bumped SEQUENCE', () => {
      const ev = bookingToIcsEvent(
        makeBooking({ status: BookingStatus.CANCELLED }),
        'student',
        'UTC',
        NOW,
      );
      expect(ev.status).toBe('CANCELLED');
      expect(ev.sequence).toBe(1);
      const ics = buildIcsCalendar(ev);
      expect(ics).toContain('\r\nSTATUS:CANCELLED\r\n');
      expect(ics).toContain('\r\nSEQUENCE:1\r\n');
    });

    it('treats completed bookings as confirmed past events', () => {
      const ev = bookingToIcsEvent(
        makeBooking({ status: BookingStatus.COMPLETED }),
        'instructor',
        'UTC',
        NOW,
      );
      expect(ev.status).toBe('CONFIRMED');
      expect(ev.sequence).toBe(0);
    });
  });
});
