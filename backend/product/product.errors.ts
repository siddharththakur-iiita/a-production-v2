/**
 * src/features/product/product.errors.ts
 *
 * Constraint/trigger names referenced here come directly from
 * 005_catalog.sql's product table and its associated triggers.
 */
import { AppError, classifyPostgrestError } from '../../lib/supabase/postgrestErrors';
import type { PostgrestError } from '@supabase/supabase-js';
import { z } from 'zod';

export type ProductErrorCode =
  | 'validation_failed'
  | 'slug_already_in_use'
  | 'department_not_found'
  | 'category_not_found'
  | 'brand_not_found'
  | 'gender_tag_not_found'
  | 'age_group_not_found'
  | 'product_type_not_found'
  | 'price_required_unless_bespoke'
  | 'product_not_found'
  | 'permission_denied'
  | 'unknown';

export class ProductError extends AppError {
  readonly code: ProductErrorCode;
  constructor(code: ProductErrorCode, message: string, cause?: unknown) {
    super(message, cause);
    this.name = 'ProductError';
    this.code = code;
  }
}

export function mapProductZodError(error: z.ZodError): ProductError {
  const first = error.errors[0];
  return new ProductError('validation_failed', first?.message ?? 'Invalid product input.', error);
}

export function mapProductPostgrestError(error: PostgrestError): ProductError {
  // trg_product_validate_price (005_catalog.sql) raises a plain
  // RAISE EXCEPTION, not a standard constraint violation — Postgres
  // surfaces this as SQLSTATE P0001 (raise_exception), which
  // classifyPostgrestError does not specifically recognize since it
  // is a custom application-level rule, not a generic constraint
  // shape. Matched here by message content instead.
  if (error.code === 'P0001' && error.message.includes('price is required unless product_type is bespoke_template')) {
    return new ProductError(
      'price_required_unless_bespoke',
      'A price is required unless this product is a bespoke (consultation-priced) item.',
      error
    );
  }

  const classified = classifyPostgrestError(error);

  switch (classified.kind) {
    case 'not_found':
      return new ProductError('product_not_found', 'Product not found.', error);

    case 'unique_violation':
      if (classified.constraintName === 'product_slug_key') {
        return new ProductError('slug_already_in_use', 'This product slug is already in use.', error);
      }
      return new ProductError('unknown', error.message, error);

    case 'foreign_key_violation':
      switch (classified.constraintName) {
        case 'product_department_id_fkey':
          return new ProductError('department_not_found', 'The specified department does not exist.', error);
        case 'product_category_id_fkey':
          return new ProductError('category_not_found', 'The specified category does not exist.', error);
        case 'product_brand_id_fkey':
          return new ProductError('brand_not_found', 'The specified brand does not exist.', error);
        case 'product_gender_id_fkey':
          return new ProductError('gender_tag_not_found', 'The specified gender tag does not exist.', error);
        case 'product_age_group_id_fkey':
          return new ProductError('age_group_not_found', 'The specified age group does not exist.', error);
        case 'product_product_type_id_fkey':
          return new ProductError('product_type_not_found', 'The specified product type does not exist.', error);
        default:
          return new ProductError('unknown', error.message, error);
      }

    case 'check_violation':
      if (classified.constraintName === 'product_compare_at_price_check') {
        return new ProductError(
          'validation_failed',
          'compareAtPrice must be greater than or equal to price.',
          error
        );
      }
      if (classified.constraintName === 'product_lead_time_range_check') {
        return new ProductError(
          'validation_failed',
          'leadTimeDaysMax must be greater than or equal to leadTimeDaysMin.',
          error
        );
      }
      return new ProductError('validation_failed', 'A product field failed validation.', error);

    case 'permission_denied':
      return new ProductError('permission_denied', 'You do not have permission to modify products.', error);

    default:
      return new ProductError('unknown', error.message, error);
  }
}
