/**
 * src/lib/razorpay/razorpay.errors.ts
 */
import { AppError } from '../supabase/postgrestErrors';

export type RazorpayErrorCode =
  | 'validation_failed'
  | 'invalid_signature'
  | 'order_creation_failed'
  | 'refund_failed'
  | 'webhook_verification_failed'
  | 'amount_mismatch'
  | 'unknown';

export class RazorpayError extends AppError {
  readonly code: RazorpayErrorCode;
  constructor(code: RazorpayErrorCode, message: string, cause?: unknown) {
    super(message, cause);
    this.name = 'RazorpayError';
    this.code = code;
  }
}

export function mapRazorpayError(error: unknown): RazorpayError {
  if (error instanceof RazorpayError) return error;

  if (error && typeof error === 'object' && 'error' in error) {
    const inner = (error as { error?: { description?: string } }).error;
    if (inner?.description) {
      return new RazorpayError('order_creation_failed', inner.description, error);
    }
  }

  const message = error instanceof Error ? error.message : String(error);
  return new RazorpayError('unknown', message, error);
}
