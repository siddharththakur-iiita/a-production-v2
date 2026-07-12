/**
 * src/features/auth/auth.errors.ts
 *
 * Maps Supabase's AuthError (and raw PostgREST/Postgres errors
 * surfaced through this module's own queries, e.g. the
 * customer_email_or_phone_check CHECK constraint) into a small,
 * stable set of typed application errors. Callers (React components)
 * should never need to inspect Supabase's raw error shapes or
 * Postgres error codes directly.
 */
import type { AuthError as SupabaseAuthError, PostgrestError } from '@supabase/supabase-js';

export type AuthErrorCode =
  | 'invalid_credentials'
  | 'email_already_registered'
  | 'weak_password'
  | 'invalid_otp'
  | 'otp_expired'
  | 'rate_limited'
  | 'session_missing'
  | 'profile_not_found'
  | 'network_error'
  | 'unknown';

export class AppAuthError extends Error {
  readonly code: AuthErrorCode;
  readonly cause?: unknown;

  constructor(code: AuthErrorCode, message: string, cause?: unknown) {
    super(message);
    this.name = 'AppAuthError';
    this.code = code;
    this.cause = cause;
  }
}

/**
 * Translates a Supabase Auth SDK error into an AppAuthError. Supabase
 * does not expose a stable machine-readable error code across all
 * versions/providers, so this necessarily does some message-pattern
 * matching — kept in exactly one place so it never needs to be
 * duplicated at call sites.
 */
export function mapSupabaseAuthError(error: SupabaseAuthError): AppAuthError {
  const message = error.message.toLowerCase();

  if (message.includes('invalid login credentials')) {
    return new AppAuthError('invalid_credentials', 'Incorrect email or password.', error);
  }
  if (message.includes('already registered') || message.includes('already exists')) {
    return new AppAuthError('email_already_registered', 'An account with this email already exists.', error);
  }
  if (message.includes('password') && (message.includes('weak') || message.includes('at least'))) {
    return new AppAuthError('weak_password', 'Password does not meet the minimum requirements.', error);
  }
  if (message.includes('token has expired') || message.includes('otp_expired')) {
    return new AppAuthError('otp_expired', 'This verification code has expired. Please request a new one.', error);
  }
  if (message.includes('invalid') && message.includes('otp')) {
    return new AppAuthError('invalid_otp', 'The verification code entered is incorrect.', error);
  }
  if (message.includes('rate limit') || message.includes('too many requests')) {
    return new AppAuthError('rate_limited', 'Too many attempts. Please wait a moment and try again.', error);
  }

  return new AppAuthError('unknown', error.message, error);
}

/**
 * Translates a PostgrestError from a direct table query in this
 * module (e.g. fetching/updating the customer row) into an
 * AppAuthError. Distinguishes the one CHECK constraint a customer
 * could plausibly trip via this module's own update path.
 */
export function mapPostgrestError(error: PostgrestError): AppAuthError {
  if (error.code === '23514' && error.message.includes('customer_email_or_phone_check')) {
    return new AppAuthError(
      'invalid_credentials',
      'A customer account must have at least an email or a phone number.',
      error
    );
  }
  if (error.code === 'PGRST116') {
    // PostgREST's "no rows" code for a .single() query with zero matches
    return new AppAuthError('profile_not_found', 'No customer profile was found for this account.', error);
  }
  return new AppAuthError('unknown', error.message, error);
}
