/**
 * src/features/tailoring/tailoring.errors.ts
 *
 * Constraint names referenced here come directly from
 * 010_tailoring.sql.
 */
import { AppError, classifyPostgrestError } from '../../lib/supabase/postgrestErrors';
import type { PostgrestError } from '@supabase/supabase-js';
import { z } from 'zod';

export type TailoringErrorCode =
  | 'validation_failed'
  | 'request_not_found'
  | 'measurement_profile_immutable'
  | 'measurement_profile_not_found'
  | 'garment_type_not_found'
  | 'no_current_stage'
  | 'no_next_stage'
  | 'quotation_not_found'
  | 'permission_denied'
  | 'unknown';

export class TailoringError extends AppError {
  readonly code: TailoringErrorCode;
  constructor(code: TailoringErrorCode, message: string, cause?: unknown) {
    super(message, cause);
    this.name = 'TailoringError';
    this.code = code;
  }
}

export function mapTailoringZodError(error: z.ZodError): TailoringError {
  const first = error.errors[0];
  return new TailoringError('validation_failed', first?.message ?? 'Invalid tailoring input.', error);
}

export function mapTailoringPostgrestError(error: PostgrestError): TailoringError {
  // measurement_profile's BEFORE UPDATE guard (010_tailoring.sql)
  // unconditionally raises 'measurement_profile rows are immutable; ...'
  // (SQLSTATE P0001) for any attempted update — checked first since
  // it is a message-content match, not a constraint-name classification.
  if (error.code === 'P0001' && error.message.toLowerCase().includes('immutable')) {
    return new TailoringError(
      'measurement_profile_immutable',
      'Measurement profiles cannot be edited — create a new one instead.',
      error
    );
  }

  const classified = classifyPostgrestError(error);

  switch (classified.kind) {
    case 'not_found':
      return new TailoringError('request_not_found', 'Tailoring request not found.', error);

    case 'foreign_key_violation':
      switch (classified.constraintName) {
        case 'design_brief_garment_type_id_fkey':
        case 'measurement_profile_garment_type_id_fkey':
          return new TailoringError('garment_type_not_found', 'The specified garment type does not exist.', error);
        case 'tailoring_request_measurement_profile_id_fkey':
          return new TailoringError(
            'measurement_profile_not_found',
            'The specified measurement profile does not exist.',
            error
          );
        default:
          return new TailoringError('unknown', error.message, error);
      }

    case 'check_violation':
      if (classified.constraintName === 'fabric_selection_description_present_check') {
        return new TailoringError(
          'validation_failed',
          'A fabric selection needs a type, material, or custom description.',
          error
        );
      }
      if (classified.constraintName === 'tailoring_order_stage_history_exited_after_entered_check') {
        return new TailoringError('validation_failed', 'A stage cannot exit before it was entered.', error);
      }
      return new TailoringError('validation_failed', 'A tailoring field failed validation.', error);

    case 'unique_violation':
      if (classified.constraintName === 'design_brief_tailoring_request_id_key') {
        return new TailoringError(
          'validation_failed',
          'This request already has a design brief — update it instead of creating a new one.',
          error
        );
      }
      return new TailoringError('unknown', error.message, error);

    case 'permission_denied':
      return new TailoringError(
        'permission_denied',
        'You do not have permission to perform this action.',
        error
      );

    default:
      return new TailoringError('unknown', error.message, error);
  }
}
