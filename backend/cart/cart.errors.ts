/**
 * src/features/cart/cart.errors.ts
 *
 * Constraint names referenced here come directly from
 * 008_cart.sql's cart / cart_item CREATE TABLE statements.
 */
import { AppError, classifyPostgrestError } from '../../lib/supabase/postgrestErrors';
import type { PostgrestError } from '@supabase/supabase-js';
import { z } from 'zod';

export type CartErrorCode =
  | 'validation_failed'
  | 'cart_not_found'
  | 'cart_item_not_found'
  | 'product_not_found'
  | 'variant_not_found'
  | 'tailoring_request_not_found'
  | 'tailoring_request_already_in_a_cart'
  | 'permission_denied'
  | 'unknown';

export class CartError extends AppError {
  readonly code: CartErrorCode;
  constructor(code: CartErrorCode, message: string, cause?: unknown) {
    super(message, cause);
    this.name = 'CartError';
    this.code = code;
  }
}

export function mapCartZodError(error: z.ZodError): CartError {
  const first = error.errors[0];
  return new CartError('validation_failed', first?.message ?? 'Invalid cart input.', error);
}

export function mapCartPostgrestError(error: PostgrestError): CartError {
  const classified = classifyPostgrestError(error);

  switch (classified.kind) {
    case 'not_found':
      return new CartError('cart_item_not_found', 'Cart item not found.', error);

    case 'foreign_key_violation':
      if (classified.constraintName === 'cart_item_product_id_fkey') {
        return new CartError('product_not_found', 'The specified product does not exist.', error);
      }
      if (classified.constraintName === 'cart_item_variant_id_fkey') {
        return new CartError('variant_not_found', 'The specified variant does not exist.', error);
      }
      if (classified.constraintName === 'cart_item_tailoring_request_id_fkey') {
        return new CartError(
          'tailoring_request_not_found',
          'The specified tailoring request does not exist.',
          error
        );
      }
      if (classified.constraintName === 'cart_customer_id_fkey') {
        return new CartError('cart_not_found', 'The specified customer does not exist.', error);
      }
      return new CartError('unknown', error.message, error);

    case 'check_violation':
      if (classified.constraintName === 'cart_item_product_xor_tailoring_check') {
        return new CartError(
          'validation_failed',
          'A cart line must reference either a product or a tailoring request, not both or neither.',
          error
        );
      }
      if (classified.constraintName === 'cart_item_tailoring_qty_one_check') {
        return new CartError(
          'validation_failed',
          'A bespoke tailoring commission can only be added to the cart with quantity 1.',
          error
        );
      }
      return new CartError('validation_failed', 'A cart field failed validation.', error);

    case 'unique_violation':
      return new CartError(
        'tailoring_request_already_in_a_cart',
        'This tailoring request has already been added to a cart.',
        error
      );

    case 'permission_denied':
      return new CartError('permission_denied', 'You do not have permission to modify this cart.', error);

    default:
      return new CartError('unknown', error.message, error);
  }
}
