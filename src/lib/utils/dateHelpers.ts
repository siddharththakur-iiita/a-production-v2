/**
 * src/lib/utils/dateHelpers.ts
 *
 * Date helpers for the concrete needs this codebase actually has —
 * India-locale display formatting (used throughout the email
 * templates and will be used by admin UI), Indian financial-year
 * computation (matching app_financial_year()'s exact April-to-March
 * logic, 009_orders.sql — verified against the actual SQL function,
 * not assumed), and date-range helpers matching the DateRange type
 * the Analytics module's service functions already accept.
 */

export function formatDateIN(date: string | Date, options?: Intl.DateTimeFormatOptions): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-IN', options ?? { day: 'numeric', month: 'long', year: 'numeric' });
}

export function formatDateTimeIN(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Returns the Indian financial year label ("2026-27") for a given
 * date — April 1 to March 31. Mirrors app_financial_year()
 * (009_orders.sql) exactly: that SQL function checks
 * extract(month) >= 4 (1-indexed); this checks getMonth() >= 3
 * (0-indexed), the same boundary. Not a duplicate of that DB-side
 * logic in the sense of replacing it — invoice numbering still only
 * ever happens via the DB function — this exists for display/
 * reporting code that needs the same label without a round-trip.
 */
export function indianFinancialYear(date: string | Date = new Date()): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const year = d.getFullYear();
  const month = d.getMonth();

  const startYear = month >= 3 ? year : year - 1;
  const endYearShort = String((startYear + 1) % 100).padStart(2, '0');
  return `${startYear}-${endYearShort}`;
}

export function toISODateString(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toISOString().slice(0, 10);
}

export function lastNDaysRange(n: number): { from: string; to: string } {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - (n - 1));
  return { from: toISODateString(from), to: toISODateString(to) };
}

export function currentMonthRange(): { from: string; to: string } {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), 1);
  const to = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return { from: toISODateString(from), to: toISODateString(to) };
}

export function relativeTimeFromNow(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const diffMs = d.getTime() - Date.now();
  const diffSeconds = Math.round(diffMs / 1000);

  const divisions: [Intl.RelativeTimeFormatUnit, number][] = [
    ['year', 60 * 60 * 24 * 365],
    ['month', 60 * 60 * 24 * 30],
    ['day', 60 * 60 * 24],
    ['hour', 60 * 60],
    ['minute', 60],
  ];

  const rtf = new Intl.RelativeTimeFormat('en-IN', { numeric: 'auto' });

  for (const [unit, secondsInUnit] of divisions) {
    if (Math.abs(diffSeconds) >= secondsInUnit) {
      return rtf.format(Math.round(diffSeconds / secondsInUnit), unit);
    }
  }
  return rtf.format(diffSeconds, 'second');
}
