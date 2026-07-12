/**
 * src/features/contact/contact.errors.ts
 */
import { AppError, classifyPostgrestError } from '../../lib/supabase/postgrestErrors';
import type { PostgrestError } from '@supabase/supabase-js';
import { z } from 'zod';

export type ContactErrorCode =
  | 'validation_failed'
  | 'rate_limited'
  | 'inquiry_not_found'
  | 'permission_denied'
  | 'unknown';

export class ContactError extends AppError {
  readonly code: ContactErrorCode;
  constructor(code: ContactErrorCode, message: string, cause?: unknown) {
    super(message, cause);
    this.name = 'ContactError';
    this.code = code;
  }
}

export function mapContactZodError(error: z.ZodError): ContactError {
  const first = error.errors[0];
  return new ContactError('validation_failed', first?.message ?? 'Invalid contact input.', error);
}

export function mapContactPostgrestError(error: PostgrestError): ContactError {
  if (error.code === 'P0001') {
    if (error.message.includes('too many inquiries')) {
      return new ContactError(
        'rate_limited',
        'Too many inquiries submitted recently. Please try again later.',
        error
      );
    }
    return new ContactError('validation_failed', error.message, error);
  }

  const classified = classifyPostgrestError(error);

  switch (classified.kind) {
    case 'not_found':
      return new ContactError('inquiry_not_found', 'Inquiry not found.', error);

    case 'permission_denied':
      return new ContactError('permission_denied', 'You do not have permission to perform this action.', error);

    default:
      return new ContactError('unknown', error.message, error);
  }
}
