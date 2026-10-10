import {
  DEFAULT_TENANT_TIMEZONE,
  formatInZone,
  isValidTimeZone,
  wallClockToInstant,
  zonedNow,
} from './tenant-time';

describe('tenant-time', () => {
  describe('isValidTimeZone', () => {
    it('accepts IANA zones and rejects junk', () => {
      expect(isValidTimeZone('America/Vancouver')).toBe(true);
      expect(isValidTimeZone('UTC')).toBe(true);
      expect(isValidTimeZone('Mars/Olympus')).toBe(false);
      expect(isValidTimeZone('')).toBe(false);
      expect(isValidTimeZone(42)).toBe(false);
    });
  });

  describe('wallClockToInstant', () => {
    it('reads wall-clock in PDT (UTC-7) during summer time', () => {
      expect(
        wallClockToInstant('2026-10-14', '11:00:00', 'America/Vancouver'),
      ).toEqual(new Date('2026-10-14T18:00:00Z'));
    });

    // DST cases use America/New_York, not Vancouver: BC stopped switching
    // clocks in 2026 (permanent UTC-7 after March 8, no fall-back on Nov 1;
    // tzdata 2026b+). Results for Vancouver after Nov 1 depend on the
    // runtime's tzdata, which is exactly why we never hardcode offsets.
    it('reads wall-clock in standard time after DST ends', () => {
      expect(
        wallClockToInstant('2026-11-20', '11:00', 'America/New_York'),
      ).toEqual(new Date('2026-11-20T16:00:00Z'));
    });

    it('resolves across the fall-back boundary (2026-11-01)', () => {
      // 23:30 the night before DST ends is still EDT (UTC-4).
      expect(
        wallClockToInstant('2026-10-31', '23:30', 'America/New_York'),
      ).toEqual(new Date('2026-11-01T03:30:00Z'));
      // Noon the same day is EST (UTC-5).
      expect(
        wallClockToInstant('2026-11-01', '12:00', 'America/New_York'),
      ).toEqual(new Date('2026-11-01T17:00:00Z'));
    });

    it('is independent of the server timezone (UTC zone is identity)', () => {
      expect(wallClockToInstant('2026-10-14', '11:00', 'UTC')).toEqual(
        new Date('2026-10-14T11:00:00Z'),
      );
    });
  });

  describe('zonedNow', () => {
    it('gives the campus date, which lags UTC near midnight', () => {
      // 03:30 UTC Oct 15 = 20:30 PDT Oct 14.
      expect(
        zonedNow('America/Vancouver', Date.parse('2026-10-15T03:30:00Z')),
      ).toEqual({ date: '2026-10-14', minutes: 20 * 60 + 30 });
    });
  });

  describe('formatInZone', () => {
    it('formats on the campus clock', () => {
      expect(
        formatInZone(
          new Date('2026-10-14T18:00:00Z'),
          DEFAULT_TENANT_TIMEZONE,
          {
            hour: 'numeric',
            minute: '2-digit',
          },
        ),
      ).toBe('11:00 AM');
    });
  });
});
