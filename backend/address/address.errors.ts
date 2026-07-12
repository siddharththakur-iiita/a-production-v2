/**
 * src/features/address/address.errors.ts
 *
 * Constraint names referenced here come directly from
 * 007_customers.sql's address CREATE TABLE statement.
 */
import { AppError, classifyPostgrestError } from '../../lib/supabase/postgrestErrors';
import type { PostgrestError } from '@supabase/supabase-js';
import { z } from 'zod';

export type AddressErrorCode =
  | 'validation_failed'
  | 'address_not_found'
  | 'customer_not_found'
  | 'permission_denied'
  | 'unknown';

export class AddressError extends AppError {
  readonly code: AddressErrorCode;
  constructor(code: AddressErrorCode, message: string, cause?: unknown) {
    super(message, cause);
    this.name = 'AddressError';
    this.code = code;
  }
}

export function mapAddressZodError(error: z.ZodError): AddressError {
  const first = error.errors[0];
  return new AddressError('validation_failed', first?.message ?? 'Invalid address input.', error);
}

export function mapAddressPostgrestError(error: PostgrestError): AddressError {
  const classified = classifyPostgrestError(error);

  switch (classified.kind) {
    case 'not_found':
      return new AddressError('address_not_found', 'Address not found.', error);

    case 'foreign_key_violation':
      if (classified.constraintName === 'address_customer_id_fkey') {
        return new AddressError('customer_not_found', 'The specified customer does not exist.', error);
      }
      return new AddressError('unknown', error.message, error);

    case 'check_violation':
      return new AddressError('validation_failed', 'An address field failed validation.', error);

    case 'permission_denied':
      return new AddressError(
        'permission_denied',
        'You do not have permission to modify this address.',
        error
      );

    default:
      return new AddressError('unknown', error.message, error);
  }
}
