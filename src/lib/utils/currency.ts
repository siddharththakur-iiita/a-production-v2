/**
 * src/lib/utils/currency.ts
 *
 * The frozen schema stores every money value as numeric(12,2) with a
 * separate ISO-4217 currency column (Data Dictionary conventions,
 * 00_Data-Dictionary-Conventions.md) — this module is the single
 * place that turns a (amount, currencyCode) pair into a
 * locale-correct display string, so it is never hand-rolled
 * differently in each module or email template.
 */

const CURRENCY_LOCALE: Record<string, string> = {
  INR: 'en-IN',
  USD: 'en-US',
  GBP: 'en-GB',
  EUR: 'en-IE',
};

export function formatCurrency(amount: number, currencyCode: string): string {
  const locale = CURRENCY_LOCALE[currencyCode] ?? 'en-US';
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currencyCode,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatAmount(amount: number, currencyCode: string): string {
  const locale = CURRENCY_LOCALE[currencyCode] ?? 'en-US';
  return new Intl.NumberFormat(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);
}

export function parseNumeric(value: string | number | null | undefined): number {
  if (value === null || value === undefined) return 0;
  const parsed = typeof value === 'number' ? value : Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}
