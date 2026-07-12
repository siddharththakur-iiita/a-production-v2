/**
 * src/features/inventory/inventory.service.ts
 */
import * as repo from './inventory.repository';
import {
  mapWarehouseRow,
  mapProductVariantRow,
  mapInventoryItemRow,
  mapStockMovementRow,
  mapLowStockRow,
  type Warehouse,
  type ProductVariant,
  type InventoryItem,
  type StockMovement,
  type LowStockAlert,
  type CreateWarehouseInput,
  type UpdateWarehouseInput,
  type CreateProductVariantInput,
  type UpdateProductVariantInput,
  type CreateInventoryItemInput,
  type AdjustStockInput,
  type AdjustReservationInput,
} from './inventory.types';
import {
  createWarehouseSchema,
  updateWarehouseSchema,
  createProductVariantSchema,
  updateProductVariantSchema,
  createInventoryItemSchema,
  adjustStockSchema,
  adjustReservationSchema,
} from './inventory.validation';
import {
  InventoryError,
  mapInventoryPostgrestError,
  mapInventoryZodError,
  insufficientStockError,
} from './inventory.errors';

// ---------------------------------------------------------------------
// Warehouse
// ---------------------------------------------------------------------

export async function listWarehouses(includeInactive = false): Promise<Warehouse[]> {
  try {
    const rows = await repo.findWarehouses(includeInactive);
    return rows.map(mapWarehouseRow);
  } catch (err) {
    throw mapInventoryPostgrestError(err as never);
  }
}

export async function getWarehouseById(id: string): Promise<Warehouse | null> {
  try {
    const row = await repo.findWarehouseById(id);
    return row ? mapWarehouseRow(row) : null;
  } catch (err) {
    throw mapInventoryPostgrestError(err as never);
  }
}

export async function createWarehouse(input: CreateWarehouseInput): Promise<Warehouse> {
  const parsed = createWarehouseSchema.safeParse(input);
  if (!parsed.success) throw mapInventoryZodError(parsed.error);

  try {
    const row = await repo.insertWarehouse({
      name: parsed.data.name,
      address: parsed.data.address,
      is_default: parsed.data.isDefault,
    });
    return mapWarehouseRow(row);
  } catch (err) {
    throw mapInventoryPostgrestError(err as never);
  }
}

export async function updateWarehouse(id: string, input: UpdateWarehouseInput): Promise<Warehouse> {
  const parsed = updateWarehouseSchema.safeParse(input);
  if (!parsed.success) throw mapInventoryZodError(parsed.error);

  try {
    const row = await repo.updateWarehouseRow(id, { name: parsed.data.name, address: parsed.data.address });
    return mapWarehouseRow(row);
  } catch (err) {
    throw mapInventoryPostgrestError(err as never);
  }
}

export async function setDefaultWarehouse(id: string): Promise<Warehouse> {
  try {
    const row = await repo.setWarehouseDefault(id);
    return mapWarehouseRow(row);
  } catch (err) {
    throw mapInventoryPostgrestError(err as never);
  }
}

export async function deactivateWarehouse(id: string): Promise<Warehouse> {
  try {
    const row = await repo.setWarehouseActive(id, false);
    return mapWarehouseRow(row);
  } catch (err) {
    throw mapInventoryPostgrestError(err as never);
  }
}

export async function reactivateWarehouse(id: string): Promise<Warehouse> {
  try {
    const row = await repo.setWarehouseActive(id, true);
    return mapWarehouseRow(row);
  } catch (err) {
    throw mapInventoryPostgrestError(err as never);
  }
}

// ---------------------------------------------------------------------
// Product variant
// ---------------------------------------------------------------------

export async function listActiveVariants(productId: string): Promise<ProductVariant[]> {
  try {
    const rows = await repo.findActiveVariantsForProduct(productId);
    return rows.map(mapProductVariantRow);
  } catch (err) {
    throw mapInventoryPostgrestError(err as never);
  }
}

export async function listVariantsForStaff(productId: string): Promise<ProductVariant[]> {
  try {
    const rows = await repo.findAllVariantsForProductStaff(productId);
    return rows.map(mapProductVariantRow);
  } catch (err) {
    throw mapInventoryPostgrestError(err as never);
  }
}

export async function getVariantById(id: string): Promise<ProductVariant | null> {
  try {
    const row = await repo.findVariantById(id);
    return row ? mapProductVariantRow(row) : null;
  } catch (err) {
    throw mapInventoryPostgrestError(err as never);
  }
}

export async function getVariantBySku(sku: string): Promise<ProductVariant | null> {
  try {
    const row = await repo.findVariantBySku(sku);
    return row ? mapProductVariantRow(row) : null;
  } catch (err) {
    throw mapInventoryPostgrestError(err as never);
  }
}

export async function createProductVariant(input: CreateProductVariantInput): Promise<ProductVariant> {
  const parsed = createProductVariantSchema.safeParse(input);
  if (!parsed.success) throw mapInventoryZodError(parsed.error);

  try {
    const row = await repo.insertVariant({
      product_id: parsed.data.productId,
      sku: parsed.data.sku,
      size: parsed.data.size,
      color: parsed.data.color,
      barcode: parsed.data.barcode,
      price_override: parsed.data.priceOverride?.toFixed(2),
    });
    return mapProductVariantRow(row);
  } catch (err) {
    throw mapInventoryPostgrestError(err as never);
  }
}

export async function updateProductVariant(
  id: string,
  input: UpdateProductVariantInput
): Promise<ProductVariant> {
  const parsed = updateProductVariantSchema.safeParse(input);
  if (!parsed.success) throw mapInventoryZodError(parsed.error);

  try {
    const row = await repo.updateVariantRow(id, {
      size: parsed.data.size,
      color: parsed.data.color,
      barcode: parsed.data.barcode,
      price_override:
        parsed.data.priceOverride === null ? null : parsed.data.priceOverride?.toFixed(2),
    });
    return mapProductVariantRow(row);
  } catch (err) {
    throw mapInventoryPostgrestError(err as never);
  }
}

export async function discontinueVariant(id: string): Promise<ProductVariant> {
  try {
    const row = await repo.setVariantStatus(id, 'discontinued');
    return mapProductVariantRow(row);
  } catch (err) {
    throw mapInventoryPostgrestError(err as never);
  }
}

export async function reactivateVariant(id: string): Promise<ProductVariant> {
  try {
    const row = await repo.setVariantStatus(id, 'active');
    return mapProductVariantRow(row);
  } catch (err) {
    throw mapInventoryPostgrestError(err as never);
  }
}

export async function deleteVariant(id: string): Promise<void> {
  try {
    await repo.softDeleteVariant(id);
  } catch (err) {
    throw mapInventoryPostgrestError(err as never);
  }
}

// ---------------------------------------------------------------------
// Inventory item
// ---------------------------------------------------------------------

export async function listInventoryForVariant(variantId: string): Promise<InventoryItem[]> {
  try {
    const rows = await repo.findInventoryForVariant(variantId);
    return rows.map(mapInventoryItemRow);
  } catch (err) {
    throw mapInventoryPostgrestError(err as never);
  }
}

export async function getInventoryItem(warehouseId: string, variantId: string): Promise<InventoryItem | null> {
  try {
    const row = await repo.findInventoryItem(warehouseId, variantId);
    return row ? mapInventoryItemRow(row) : null;
  } catch (err) {
    throw mapInventoryPostgrestError(err as never);
  }
}

export async function createInventoryItem(input: CreateInventoryItemInput): Promise<InventoryItem> {
  const parsed = createInventoryItemSchema.safeParse(input);
  if (!parsed.success) throw mapInventoryZodError(parsed.error);

  try {
    const row = await repo.insertInventoryItem({
      warehouse_id: parsed.data.warehouseId,
      variant_id: parsed.data.variantId,
      on_hand_qty: parsed.data.onHandQty,
      reorder_level: parsed.data.reorderLevel,
    });
    return mapInventoryItemRow(row);
  } catch (err) {
    throw mapInventoryPostgrestError(err as never);
  }
}

export async function updateReorderLevel(id: string, reorderLevel: number): Promise<InventoryItem> {
  try {
    const row = await repo.updateReorderLevel(id, reorderLevel);
    return mapInventoryItemRow(row);
  } catch (err) {
    throw mapInventoryPostgrestError(err as never);
  }
}

/**
 * Adjusts on_hand_qty via the RPC (020_inventory_rpc.sql), so the
 * resulting stock_movement row carries the real movement_type and
 * reference rather than the trigger's generic fallback inference.
 * The outbound-must-be-negative / inbound-must-be-positive business
 * rule is enforced by adjustStockSchema itself (inventory.validation.ts),
 * not re-checked here.
 */
export async function adjustStock(input: AdjustStockInput): Promise<InventoryItem> {
  const parsed = adjustStockSchema.safeParse(input);
  if (!parsed.success) throw mapInventoryZodError(parsed.error);

  try {
    const row = await repo.adjustStockRpc({
      inventoryItemId: parsed.data.inventoryItemId,
      delta: parsed.data.delta,
      movementType: parsed.data.movementType,
      referenceType: parsed.data.referenceType,
      referenceId: parsed.data.referenceId,
    });
    return mapInventoryItemRow(row);
  } catch (err) {
    throw mapInventoryPostgrestError(err as never);
  }
}

export async function adjustReservation(input: AdjustReservationInput): Promise<InventoryItem> {
  const parsed = adjustReservationSchema.safeParse(input);
  if (!parsed.success) throw mapInventoryZodError(parsed.error);

  try {
    const row = await repo.adjustReservationRpc({
      inventoryItemId: parsed.data.inventoryItemId,
      delta: parsed.data.delta,
    });
    return mapInventoryItemRow(row);
  } catch (err) {
    throw mapInventoryPostgrestError(err as never);
  }
}

/**
 * Convenience wrapper for the common checkout-time need: "reserve
 * this quantity for this variant's inventory item if available."
 * Fetches the current item first purely to give a clear,
 * business-level insufficientStockError for the common case — the
 * database's inventory_item_reserved_le_on_hand_check CHECK
 * constraint remains the actual race-free guarantee under
 * concurrency; a concurrent adjustment could still occur between this
 * pre-check and the RPC call, in which case the CHECK constraint
 * itself (mapped to an 'over_reservation' InventoryError) is what
 * ultimately prevents over-reservation, not this convenience check.
 */
export async function reserveStockIfAvailable(params: {
  inventoryItemId: string;
  qty: number;
}): Promise<InventoryItem> {
  const current = await repo.findInventoryItemById(params.inventoryItemId);
  if (!current) {
    throw new InventoryError('inventory_item_not_found', 'Inventory item not found.');
  }
  if (current.on_hand_qty - current.reserved_qty < params.qty) {
    const variant = await repo.findVariantById(current.variant_id);
    throw insufficientStockError(variant?.sku ?? current.variant_id);
  }

  try {
    const row = await repo.adjustReservationRpc({
      inventoryItemId: params.inventoryItemId,
      delta: params.qty,
    });
    return mapInventoryItemRow(row);
  } catch (err) {
    throw mapInventoryPostgrestError(err as never);
  }
}

export async function deleteInventoryItem(id: string): Promise<void> {
  try {
    await repo.softDeleteInventoryItem(id);
  } catch (err) {
    throw mapInventoryPostgrestError(err as never);
  }
}

// ---------------------------------------------------------------------
// Stock movement history
// ---------------------------------------------------------------------

export async function listMovementsForInventoryItem(inventoryItemId: string): Promise<StockMovement[]> {
  try {
    const rows = await repo.findMovementsForInventoryItem(inventoryItemId);
    return rows.map(mapStockMovementRow);
  } catch (err) {
    throw mapInventoryPostgrestError(err as never);
  }
}

export async function listMovementsByReference(
  referenceType: string,
  referenceId: string
): Promise<StockMovement[]> {
  try {
    const rows = await repo.findMovementsByReference(referenceType, referenceId);
    return rows.map(mapStockMovementRow);
  } catch (err) {
    throw mapInventoryPostgrestError(err as never);
  }
}

// ---------------------------------------------------------------------
// Low stock alert
// ---------------------------------------------------------------------

export async function listLowStockItems(): Promise<LowStockAlert[]> {
  try {
    const rows = await repo.findLowStockItems();
    return rows.map(mapLowStockRow);
  } catch (err) {
    throw mapInventoryPostgrestError(err as never);
  }
}
