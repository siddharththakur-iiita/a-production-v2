/**
 * src/features/category/category.errors.ts
 *
 * Maps classified Postgres errors (postgrestErrors.ts) into
 * Category-domain-specific error types. Constraint names referenced
 * here come directly from 005_catalog.sql's CREATE TABLE category
 * statement.
 */
import { AppError, classifyPostgrestError } from '../../lib/supabase/postgrestErrors';
import type { PostgrestError } from '@supabase/supabase-js';
import { z } from 'zod';

export type CategoryErrorCode =
  | 'validation_failed'
  | 'slug_already_in_use'
  | 'department_not_found'
  | 'parent_category_not_found'
  | 'self_parent_not_allowed'
  | 'category_not_found'
  | 'permission_denied'
  | 'unknown';

export class CategoryError extends AppError {
  readonly code: CategoryErrorCode;
  constructor(code: CategoryErrorCode, message: string, cause?: unknown) {
    super(message, cause);
    this.name = 'CategoryError';
    this.code = code;
  }
}

export function mapCategoryZodError(error: z.ZodError): CategoryError {
  const first = error.errors[0];
  return new CategoryError('validation_failed', first?.message ?? 'Invalid category input.', error);
}

export function mapCategoryPostgrestError(error: PostgrestError): CategoryError {
  const classified = classifyPostgrestError(error);

  switch (classified.kind) {
    case 'not_found':
      return new CategoryError('category_not_found', 'Category not found.', error);

    case 'unique_violation':
      if (classified.constraintName === 'category_dept_parent_slug_key') {
        return new CategoryError(
          'slug_already_in_use',
          'A category with this slug already exists under the selected department and parent.',
          error
        );
      }
      return new CategoryError('slug_already_in_use', 'This category slug is already in use.', error);

    case 'foreign_key_violation':
      if (classified.constraintName === 'category_department_id_fkey') {
        return new CategoryError('department_not_found', 'The specified department does not exist.', error);
      }
      if (classified.constraintName === 'category_parent_category_id_fkey') {
        return new CategoryError(
          'parent_category_not_found',
          'The specified parent category does not exist.',
          error
        );
      }
      return new CategoryError('unknown', error.message, error);

    case 'check_violation':
      if (classified.constraintName === 'category_no_self_parent_check') {
        return new CategoryError(
          'self_parent_not_allowed',
          'A category cannot be its own parent.',
          error
        );
      }
      return new CategoryError('unknown', error.message, error);

    case 'permission_denied':
      return new CategoryError(
        'permission_denied',
        'You do not have permission to modify categories.',
        error
      );

    default:
      return new CategoryError('unknown', error.message, error);
  }
}
