const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ['year', 365 * 24 * 60 * 60 * 1000],
  ['month', 30 * 24 * 60 * 60 * 1000],
  ['week', 7 * 24 * 60 * 60 * 1000],
  ['day', 24 * 60 * 60 * 1000],
  ['hour', 60 * 60 * 1000],
  ['minute', 60 * 1000],
];

const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

/**
 * Returns a human-readable relative time string like "in 2 days" or "3 hours ago".
 * Uses `Intl.RelativeTimeFormat` for proper localisation support.
 */
export function formatRelativeTime(date: Date | string): string {
  const target = typeof date === 'string' ? new Date(date) : date;
  const diff = target.getTime() - Date.now();

  for (const [unit, ms] of UNITS) {
    if (Math.abs(diff) >= ms) {
      const value = Math.round(diff / ms);
      return rtf.format(value, unit);
    }
  }

  return rtf.format(0, 'second');
}
