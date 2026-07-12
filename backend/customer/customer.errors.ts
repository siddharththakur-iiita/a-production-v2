/**
 * src/features/customer/customer.errors.ts
 *
 * Constraint/RPC names referenced here come directly from
 * 007_customers.sql and 021_customer_security_fix.sql.
 */
import { AppError, classifyPostgrestError } from '../../lib/supabase/postgrestErrors';
import type { PostgrestError } from '@supabase/supabase-js';
import { z } from 'zod';

export type CustomerErrorCode =
  | 'validation_failed'
  | 'tier_name_already_in_use'
  | 'customer_not_found'
  | 'tier_not_found'
  | 'referral_code_already_in_use'
  | 'referral_code_not_found'
  | 'self_referral_not_allowed'
  | 'loyalty_account_not_found'
  | 'preference_not_found'
  | 'device_token_already_registered'
  | 'permission_denied'
  | 'not_authorized_for_customer'
  | 'unknown';

export class CustomerError extends AppError {
  readonly code: CustomerErrorCode;
  constructor(code: CustomerErrorCode, message: string, cause?: unknown) {
    super(message, cause);
    this.name = 'CustomerError';
    this.code = code;
  }
}

export function mapCustomerZodError(error: z.ZodError): CustomerError {
  const first = error.errors[0];
  return new CustomerError('validation_failed', first?.message ?? 'Invalid customer input.', error);
}

export function mapCustomerPostgrestError(error: PostgrestError): CustomerError {
  // app_anonymize_customer's in-function authorization check
  // (021_customer_security_fix.sql) raises with ERRCODE 42501, which
  // classifyPostgrestError already recognizes as 'permission_denied'.
  const classified = classifyPostgrestError(error);

  switch (classified.kind) {
    case 'not_found':
      return new CustomerError('customer_not_found', 'Customer not found.', error);

    case 'unique_violation':
      if (classified.constraintName === 'customer_tier_name_key') {
        return new CustomerError('tier_name_already_in_use', 'This tier name is already in use.', error);
      }
      if (classified.constraintName === 'referral_code_key') {
        return new CustomerError('referral_code_already_in_use', 'This referral code is already in use.', error);
      }
      if (classified.constraintName === 'communication_preference_customer_channel_key') {
        return new CustomerError(
          'validation_failed',
          'A preference for this channel already exists for this customer.',
          error
        );
      }
      if (classified.constraintName === 'customer_device_push_token_key') {
        return new CustomerError(
          'device_token_already_registered',
          'This device is already registered.',
          error
        );
      }
      return new CustomerError('unknown', error.message, error);

    case 'foreign_key_violation':
      if (classified.constraintName === 'customer_tier_id_fkey') {
        return new CustomerError('tier_not_found', 'The specified tier does not exist.', error);
      }
      if (
        classified.constraintName === 'referral_referrer_customer_id_fkey' ||
        classified.constraintName === 'referral_referred_customer_id_fkey' ||
        classified.constraintName === 'communication_preference_customer_id_fkey' ||
        classified.constraintName === 'customer_device_customer_id_fkey' ||
        classified.constraintName === 'loyalty_account_customer_id_fkey'
      ) {
        return new CustomerError('customer_not_found', 'The specified customer does not exist.', error);
      }
      return new CustomerError('unknown', error.message, error);

    case 'check_violation':
      if (classified.constraintName === 'referral_no_self_referral_check') {
        return new CustomerError(
          'self_referral_not_allowed',
          'A customer cannot refer themselves.',
          error
        );
      }
      return new CustomerError('validation_failed', 'A field failed validation.', error);

    case 'permission_denied':
      return new CustomerError(
        'not_authorized_for_customer',
        'You are not authorized to perform this action for this customer.',
        error
      );

    default:
      return new CustomerError('unknown', error.message, error);
  }
}
