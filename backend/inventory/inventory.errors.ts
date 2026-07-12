/**
 * src/features/inventory/inventory.errors.ts
 *
 * Constraint/RPC names referenced here come directly from
 * 006_inventory.sql and 020_inventory_rpc.sql.
 */
import { AppError, classifyPostgrestError } from '../../lib/supabase/postgrestErrors';
import type { PostgrestError } from '@supabase/supabase-js';
import { z } from 'zod';

export type InventoryErrorCode =
  | 'validation_failed'
  | 'sku_already_in_use'
  | 'warehouse_variant_pair_already_exists'
  | 'warehouse_not_found'
  | 'variant_not_found'
  | 'product_not_found'
  | 'inventory_item_not_found'
  | 'insufficient_stock'
  | 'over_reservation'
  | 'negative_quantity_not_allowed'
  | 'permission_denied'
  | 'unknown';

export class InventoryError extends AppError {
  readonly code: InventoryErrorCode;
  constructor(code: InventoryErrorCode, message: string, cause?: unknown) {
    super(message, cause);
    this.name = 'InventoryError';
    this.code = code;
  }
}

export function mapInventoryZodError(error: z.ZodError): InventoryError {
  const first = error.errors[0];
  return new InventoryError('validation_failed', first?.message ?? 'Invalid inventory input.', error);
}

export function mapInventoryPostgrestError(error: PostgrestError): InventoryError {
  // The two adjustment RPCs (020_inventory_rpc.sql) raise plain
  // RAISE EXCEPTION for "not found", surfaced as SQLSTATE P0001, not a
  // standard constraint violation.
  if (error.code === 'P0001') {
    if (error.message.includes('not found')) {
      return new InventoryError('inventory_item_not_found', 'Inventory item not found.', error);
    }
    if (error.message.includes('invalid movement_type')) {
      return new InventoryError('validation_failed', 'Invalid stock movement type.', error);
    }
  }

  const classified = classifyPostgrestError(error);

  switch (classified.kind) {
    case 'not_found':
      return new InventoryError('inventory_item_not_found', 'Inventory item not found.', error);

    case 'unique_violation':
      if (classified.constraintName === 'product_variant_sku_key') {
        return new InventoryError('sku_already_in_use', 'This SKU is already in use.', error);
      }
      if (classified.constraintName === 'uq_product_variant_product_size_color') {
        return new InventoryError(
          'sku_already_in_use',
          'A variant with this size/color combination already exists for this product.',
          error
        );
      }
      if (
        classified.constraintName === 'inventory_item_warehouse_variant_key' ||
        classified.constraintName === 'uq_inventory_item_warehouse_variant'
      ) {
        return new InventoryError(
          'warehouse_variant_pair_already_exists',
          'This variant already has a stock record at this warehouse.',
          error
        );
      }
      return new InventoryError('unknown', error.message, error);

    case 'foreign_key_violation':
      if (classified.constraintName === 'product_variant_product_id_fkey') {
        return new InventoryError('product_not_found', 'The specified product does not exist.', error);
      }
      if (classified.constraintName === 'inventory_item_warehouse_id_fkey') {
        return new InventoryError('warehouse_not_found', 'The specified warehouse does not exist.', error);
      }
      if (classified.constraintName === 'inventory_item_variant_id_fkey') {
        return new InventoryError('variant_not_found', 'The specified variant does not exist.', error);
      }
      return new InventoryError('unknown', error.message, error);

    case 'check_violation':
      if (
        classified.constraintName === 'inventory_item_on_hand_nonneg_check' ||
        classified.constraintName === 'inventory_item_reserved_nonneg_check'
      ) {
        return new InventoryError(
          'negative_quantity_not_allowed',
          'This adjustment would result in a negative quantity.',
          error
        );
      }
      if (classified.constraintName === 'inventory_item_reserved_le_on_hand_check') {
        return new InventoryError(
          'over_reservation',
          'This would reserve more stock than is currently on hand.',
          error
        );
      }
      return new InventoryError('validation_failed', 'An inventory field failed validation.', error);

    case 'permission_denied':
      return new InventoryError('permission_denied', 'You do not have permission to modify inventory.', error);

    default:
      return new InventoryError('unknown', error.message, error);
  }
}

/**
 * Convenience helper for the common checkout-time concern of
 * "there wasn't enough available stock" — not a distinct Postgres
 * error shape, but a business-level classification the service layer
 * applies when an adjustment's resulting on_hand_qty would go
 * negative for an outbound movement specifically.
 */
export function insufficientStockError(sku: string): InventoryError {
  return new InventoryError('insufficient_stock', `Insufficient stock available for SKU ${sku}.`);
}
