/**
 * src/features/analytics/analytics.errors.ts
 */
import { AppError, classifyPostgrestError } from '../../lib/supabase/postgrestErrors';
import type { PostgrestError } from '@supabase/supabase-js';
import { z } from 'zod';

export type AnalyticsErrorCode = 'validation_failed' | 'permission_denied' | 'unknown';

export class AnalyticsError extends AppError {
  readonly code: AnalyticsErrorCode;
  constructor(code: AnalyticsErrorCode, message: string, cause?: unknown) {
    super(message, cause);
    this.name = 'AnalyticsError';
    this.code = code;
  }
}

export function mapAnalyticsZodError(error: z.ZodError): AnalyticsError {
  const first = error.errors[0];
  return new AnalyticsError('validation_failed', first?.message ?? 'Invalid analytics input.', error);
}

export function mapAnalyticsPostgrestError(error: PostgrestError): AnalyticsError {
  const classified = classifyPostgrestError(error);

  switch (classified.kind) {
    case 'check_violation':
      return new AnalyticsError('validation_failed', 'An analytics field failed validation.', error);

    case 'permission_denied':
      return new AnalyticsError('permission_denied', 'You do not have permission to view analytics.', error);

    default:
      return new AnalyticsError('unknown', error.message, error);
  }
}
