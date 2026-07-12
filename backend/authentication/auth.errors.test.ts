/**
 * src/features/auth/__tests__/auth.errors.test.ts
 *
 * Auth was the first module built, before the __tests__ requirement
 * was formalized starting with Category — this file closes that gap.
 * Scoped to auth.errors.ts's pure message-pattern-matching logic,
 * which is genuinely unit-testable without mocking the Supabase Auth
 * SDK itself; auth.service.ts's SDK-calling functions are thin
 * wrappers around supabase.auth.* with no independent branching logic
 * of their own to test beyond what's already covered here.
 */
import { describe, expect, it } from 'vitest';
import { mapSupabaseAuthError, mapPostgrestError, AppAuthError } from '../auth.errors';
import type { AuthError as SupabaseAuthError, PostgrestError } from '@supabase/supabase-js';

function makeSupabaseAuthError(message: string): SupabaseAuthError {
  return { name: 'AuthApiError', message, status: 400 } as SupabaseAuthError;
}

function makePostgrestError(overrides: Partial<PostgrestError> = {}): PostgrestError {
  return { message: '', details: '', hint: '', code: '', ...overrides };
}

describe('auth.errors', () => {
  describe('mapSupabaseAuthError', () => {
    it('maps "Invalid login credentials" to invalid_credentials', () => {
      const result = mapSupabaseAuthError(makeSupabaseAuthError('Invalid login credentials'));
      expect(result).toBeInstanceOf(AppAuthError);
      expect(result.code).toBe('invalid_credentials');
    });

    it('maps "User already registered" to email_already_registered', () => {
      const result = mapSupabaseAuthError(makeSupabaseAuthError('User already registered'));
      expect(result.code).toBe('email_already_registered');
    });

    it('maps a weak-password message to weak_password', () => {
      const result = mapSupabaseAuthError(makeSupabaseAuthError('Password should be at least 6 characters'));
      expect(result.code).toBe('weak_password');
    });

    it('does not misclassify a password-mentioning message that is not about weakness', () => {
      const result = mapSupabaseAuthError(makeSupabaseAuthError('Password reset link sent'));
      expect(result.code).toBe('unknown');
    });

    it('maps an expired-token message to otp_expired, checked before the generic invalid_otp case', () => {
      const result = mapSupabaseAuthError(makeSupabaseAuthError('Token has expired or is invalid'));
      expect(result.code).toBe('otp_expired');
    });

    it('maps an invalid OTP message (without "expired") to invalid_otp', () => {
      const result = mapSupabaseAuthError(makeSupabaseAuthError('Invalid OTP entered'));
      expect(result.code).toBe('invalid_otp');
    });

    it('maps a rate-limit message to rate_limited', () => {
      const result = mapSupabaseAuthError(makeSupabaseAuthError('Email rate limit exceeded'));
      expect(result.code).toBe('rate_limited');
    });

    it('falls back to unknown for an unrecognized message, preserving the original message text', () => {
      const result = mapSupabaseAuthError(makeSupabaseAuthError('Something entirely unexpected happened'));
      expect(result.code).toBe('unknown');
      expect(result.message).toBe('Something entirely unexpected happened');
    });

    it('is case-insensitive', () => {
      const result = mapSupabaseAuthError(makeSupabaseAuthError('INVALID LOGIN CREDENTIALS'));
      expect(result.code).toBe('invalid_credentials');
    });

    it('preserves the original error as cause', () => {
      const original = makeSupabaseAuthError('Invalid login credentials');
      const result = mapSupabaseAuthError(original);
      expect(result.cause).toBe(original);
    });
  });

  describe('mapPostgrestError', () => {
    it('maps the customer_email_or_phone_check violation to invalid_credentials with a specific message', () => {
      const result = mapPostgrestError(
        makePostgrestError({
          code: '23514',
          message: 'new row for relation "customer" violates check constraint "customer_email_or_phone_check"',
        })
      );
      expect(result.code).toBe('invalid_credentials');
      expect(result.message).toContain('at least an email or a phone number');
    });

    it('maps PGRST116 (no rows) to profile_not_found', () => {
      const result = mapPostgrestError(makePostgrestError({ code: 'PGRST116', message: 'no rows returned' }));
      expect(result.code).toBe('profile_not_found');
    });

    it('does not misclassify an unrelated 23514 check violation as invalid_credentials', () => {
      const result = mapPostgrestError(
        makePostgrestError({ code: '23514', message: 'violates check constraint "some_other_check"' })
      );
      expect(result.code).toBe('unknown');
    });

    it('falls back to unknown for an unrecognized error code', () => {
      const result = mapPostgrestError(makePostgrestError({ code: '42P01', message: 'relation does not exist' }));
      expect(result.code).toBe('unknown');
    });
  });
});
