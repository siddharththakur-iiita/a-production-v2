/**
 * src/features/inventory/inventory.validation.ts
 *
 * Mirrors the CHECK constraints in 006_inventory.sql: on_hand_qty >=
 * 0, reserved_qty >= 0, reserved_qty <= on_hand_qty (the last one is a
 * cross-column, transaction-time invariant the database itself
 * enforces atomically via app_adjust_inventory_reservation — this
 * file validates the shape of a request, not that invariant, which
 * cannot be safely pre-checked client-side under concurrency).
 */
import { z } from 'zod';
import { requireAtLeastOneField } from '../../lib/validation/commonSchemas';

export const createWarehouseSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  address: z.string().max(1000).optional(),
  isDefault: z.boolean().optional(),
});

export const updateWarehouseSchema = requireAtLeastOneField(
  z.object({
    name: z.string().min(1).max(200).optional(),
    address: z.string().max(1000).nullable().optional(),
  })
);

// SKUs are free-text per the frozen schema, but require a non-empty
// value (product_variant.sku is NOT NULL UNIQUE).
const skuSchema = z.string().min(1, 'SKU is required').max(100);

export const createProductVariantSchema = z.object({
  productId: z.string().uuid(),
  sku: skuSchema,
  size: z.string().max(50).optional(),
  color: z.string().max(50).optional(),
  barcode: z.string().max(100).optional(),
  priceOverride: z.number().min(0).optional(),
});

export const updateProductVariantSchema = requireAtLeastOneField(
  z.object({
    size: z.string().max(50).nullable().optional(),
    color: z.string().max(50).nullable().optional(),
    barcode: z.string().max(100).nullable().optional(),
    priceOverride: z.number().min(0).nullable().optional(),
  })
);

export const createInventoryItemSchema = z.object({
  warehouseId: z.string().uuid(),
  variantId: z.string().uuid(),
  onHandQty: z.number().int().min(0).optional(),
  reorderLevel: z.number().int().min(0).optional(),
});

const movementTypeSchema = z.enum(['inbound', 'outbound', 'adjustment', 'return']);

export const adjustStockSchema = z
  .object({
    inventoryItemId: z.string().uuid(),
    delta: z.number().int().refine((v) => v !== 0, 'delta must not be zero'),
    movementType: movementTypeSchema,
    referenceType: z.string().max(50).optional(),
    referenceId: z.string().uuid().optional(),
  })
  .refine((data) => !(data.movementType === 'outbound' && data.delta > 0), {
    message: 'An outbound movement must use a negative delta',
    path: ['delta'],
  })
  .refine((data) => !(data.movementType === 'inbound' && data.delta < 0), {
    message: 'An inbound movement must use a positive delta',
    path: ['delta'],
  });

export const adjustReservationSchema = z.object({
  inventoryItemId: z.string().uuid(),
  delta: z.number().int().refine((v) => v !== 0, 'delta must not be zero'),
});

export type CreateWarehouseValidated = z.infer<typeof createWarehouseSchema>;
export type UpdateWarehouseValidated = z.infer<typeof updateWarehouseSchema>;
export type CreateProductVariantValidated = z.infer<typeof createProductVariantSchema>;
export type UpdateProductVariantValidated = z.infer<typeof updateProductVariantSchema>;
export type CreateInventoryItemValidated = z.infer<typeof createInventoryItemSchema>;
export type AdjustStockValidated = z.infer<typeof adjustStockSchema>;
export type AdjustReservationValidated = z.infer<typeof adjustReservationSchema>;
