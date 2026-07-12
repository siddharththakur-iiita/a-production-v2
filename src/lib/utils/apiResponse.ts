/**
 * src/lib/utils/apiResponse.ts
 *
 * A single, consistent success/error envelope for any HTTP-facing
 * boundary this backend exposes (Edge Functions, webhook handlers).
 * Not used by the 15 feature modules' own service/hooks layer — those
 * intentionally return/throw plain typed values and {Module}Error
 * instances, which is the correct shape for React Query. This
 * envelope exists for the boundary where a plain HTTP response body
 * is actually needed.
 */
import { AppError } from '../supabase/postgrestErrors';

export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
  };
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

export function successResponse<T>(data: T): ApiSuccessResponse<T> {
  return { success: true, data };
}

export function errorResponse(error: unknown): ApiErrorResponse {
  if (error instanceof AppError && 'code' in error) {
    return {
      success: false,
      error: { code: String((error as AppError & { code: unknown }).code), message: error.message },
    };
  }
  if (error instanceof Error) {
    return { success: false, error: { code: 'unknown', message: error.message } };
  }
  return { success: false, error: { code: 'unknown', message: 'An unexpected error occurred.' } };
}

export function statusCodeForError(error: unknown): number {
  if (error instanceof AppError && 'code' in error) {
    const code = String((error as AppError & { code: unknown }).code);
    if (code.includes('not_found')) return 404;
    if (code.includes('permission_denied')) return 403;
    if (code.includes('validation_failed') || code.includes('invalid')) return 400;
    if (code.includes('rate_limited')) return 429;
    if (code.includes('already') || code.includes('conflict')) return 409;
  }
  return 500;
}
