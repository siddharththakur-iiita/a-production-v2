/**
 * src/lib/utils/index.ts
 *
 * Pagination is deliberately NOT re-exported here — it already lives
 * in src/lib/supabase/queryHelpers.ts (toRange, toPaginatedResult,
 * applySort) and is imported directly from there by every module that
 * needs it, exactly as it always has been.
 */
export { formatCurrency, formatAmount, parseNumeric } from './currency';
export { successResponse, errorResponse, statusCodeForError } from './apiResponse';
export type { ApiResponse, ApiSuccessResponse, ApiErrorResponse } from './apiResponse';
export { retry } from './retry';
export type { RetryOptions } from './retry';
export { safeAsync, bestEffort } from './asyncWrapper';
export type { SafeResult } from './asyncWrapper';
export {
  formatDateIN,
  formatDateTimeIN,
  indianFinancialYear,
  toISODateString,
  lastNDaysRange,
  currentMonthRange,
  relativeTimeFromNow,
} from './dateHelpers';
export { hasPermission, clearPermissionCache } from './permissions';
