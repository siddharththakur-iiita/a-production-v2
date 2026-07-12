/**
 * src/features/order/order.errors.ts
 *
 * Maps both classified Postgres constraint errors AND the specific
 * RAISE EXCEPTION messages from app_checkout_cart / app_cancel_order
 * (024_checkout_and_order_lifecycle.sql) into typed OrderErrors. The
 * RPC message-matching here is intentionally tied to the exact
 * wording those functions raise — if either function's messages
 * change, this file must be updated alongside it (documented at each
 * match site).
 */
import { AppError, classifyPostgrestError } from '../../lib/supabase/postgrestErrors';
import type { PostgrestError } from '@supabase/supabase-js';
import { z } from 'zod';

export type OrderErrorCode =
  | 'validation_failed'
  | 'cart_not_found'
  | 'cart_empty'
  | 'address_not_found'
  | 'insufficient_stock'
  | 'coupon_invalid'
  | 'tailoring_request_not_ready'
  | 'order_not_found'
  | 'order_not_cancellable'
  | 'refund_exceeds_payment'
  | 'refund_items_mismatch'
  | 'coupon_code_already_in_use'
  | 'permission_denied'
  | 'unknown';

export class OrderError extends AppError {
  readonly code: OrderErrorCode;
  constructor(code: OrderErrorCode, message: string, cause?: unknown) {
    super(message, cause);
    this.name = 'OrderError';
    this.code = code;
  }
}

export function mapOrderZodError(error: z.ZodError): OrderError {
  const first = error.errors[0];
  return new OrderError('validation_failed', first?.message ?? 'Invalid order input.', error);
}

export function mapOrderPostgrestError(error: PostgrestError): OrderError {
  if (error.code === 'P0001') {
    const msg = error.message;
    if (msg.includes('not authorized')) {
      return new OrderError('permission_denied', 'You are not authorized to perform this action.', error);
    }
    if (msg.includes('cart') && msg.includes('not found')) {
      return new OrderError('cart_not_found', 'Your cart could not be found. Please try again.', error);
    }
    if (msg.includes('shipping address') && msg.includes('not found')) {
      return new OrderError('address_not_found', 'The selected shipping address could not be found.', error);
    }
    if (msg.includes('insufficient stock')) {
      return new OrderError(
        'insufficient_stock',
        'One or more items in your cart are no longer available in the requested quantity.',
        error
      );
    }
    if (msg.includes('has no accepted quotation')) {
      return new OrderError(
        'tailoring_request_not_ready',
        'A bespoke item in your cart does not yet have an accepted quotation.',
        error
      );
    }
    if (msg.includes('coupon') && msg.includes('not valid')) {
      return new OrderError('coupon_invalid', 'The coupon code entered is not valid for this order.', error);
    }
    if (msg.includes('has no priceable items')) {
      return new OrderError('cart_empty', 'Your cart has no items that can be checked out.', error);
    }
    if (msg.includes('order') && msg.includes('not found')) {
      return new OrderError('order_not_found', 'Order not found.', error);
    }
    if (msg.includes('cannot be cancelled from status')) {
      return new OrderError(
        'order_not_cancellable',
        'This order can no longer be cancelled — it has already entered fulfillment.',
        error
      );
    }
    if (msg.includes('would exceed payment amount')) {
      return new OrderError(
        'refund_exceeds_payment',
        'The requested refund amount exceeds what was actually paid.',
        error
      );
    }
    if (msg.includes('does not equal parent refund.amount')) {
      return new OrderError(
        'refund_items_mismatch',
        'The refund line items do not add up to the refund total.',
        error
      );
    }
    return new OrderError('unknown', error.message, error);
  }

  const classified = classifyPostgrestError(error);

  switch (classified.kind) {
    case 'not_found':
      return new OrderError('order_not_found', 'Order not found.', error);

    case 'unique_violation':
      if (classified.constraintName === 'coupon_code_key') {
        return new OrderError('coupon_code_already_in_use', 'This coupon code is already in use.', error);
      }
      return new OrderError('unknown', error.message, error);

    case 'foreign_key_violation':
    case 'check_violation':
      return new OrderError('validation_failed', 'An order field failed validation.', error);

    case 'permission_denied':
      return new OrderError('permission_denied', 'You do not have permission to perform this action.', error);

    default:
      return new OrderError('unknown', error.message, error);
  }
}
