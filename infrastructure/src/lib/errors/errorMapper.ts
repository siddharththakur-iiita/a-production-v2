/**
 * src/lib/errors/errorMapper.ts
 *
 * The single top-level classification function for infrastructure
 * code (Edge Functions, webhook handlers, scheduled jobs) that
 * catches an error of truly unknown origin — could already be one of
 * the 15 business modules' {Module}Error instances, one of the three
 * new integration errors (ImageKitError/RazorpayError/ResendError),
 * a ZodError, a native Error, or a non-Error thrown value. Always
 * returns an AppError instance so downstream code (logger.error,
 * apiResponse.ts's errorResponse) has one consistent shape to work
 * with regardless of where the error actually came from.
 *
 * Deliberately does NOT duplicate any {Module}Error's own mapping
 * logic (e.g. OrderError's specific P0001-message matching) — if the
 * error is already an AppError, it is returned completely unchanged;
 * this function only ever adds classification for errors that
 * reached this point WITHOUT already having been through one of
 * those domain-specific mappers.
 */
import { ZodError } from 'zod';
import { AppError } from '../supabase/postgrestErrors';
import { ValidationError, InternalError } from './globalErrors';

export function mapUnknownError(error: unknown): AppError {
  if (error instanceof AppError) {
    return error;
  }

  if (error instanceof ZodError) {
    const first = error.errors[0];
    return new ValidationError(first?.message ?? 'Invalid input.', error);
  }

  if (error instanceof Error) {
    return new InternalError(error.message, error);
  }

  return new InternalError(typeof error === 'string' ? error : 'An unexpected error occurred.', error);
}
