/**
 * src/lib/resend/resend.errors.ts
 */
import { AppError } from '../supabase/postgrestErrors';

export type ResendErrorCode = 'validation_failed' | 'send_failed' | 'rate_limited' | 'unknown';

export class ResendError extends AppError {
  readonly code: ResendErrorCode;
  constructor(code: ResendErrorCode, message: string, cause?: unknown) {
    super(message, cause);
    this.name = 'ResendError';
    this.code = code;
  }
}

export function mapResendError(error: unknown): ResendError {
  if (error instanceof ResendError) return error;

  const message = error instanceof Error ? error.message : String(error);
  const lower = message.toLowerCase();

  if (lower.includes('rate limit')) {
    return new ResendError('rate_limited', 'Too many emails sent recently. Please try again shortly.', error);
  }

  return new ResendError('send_failed', message, error);
}
