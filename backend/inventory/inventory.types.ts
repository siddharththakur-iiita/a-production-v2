/**
 * src/features/inventory/inventory.types.ts
 *
 * Domain types for the Inventory module (warehouse, product_variant,
 * inventory_item, stock_movement — 006_inventory.sql). This module
 * owns variant/stock CRUD; the Product module separately consumes the
 * read-only v_product_variant_availability projection for storefront
 * display (see product.types.ts VariantAvailability) — the two are
 * intentionally not merged, since they serve different audiences
 * (storefront display vs. admin stock management) and different RLS
 * boundaries (public read vs. staff-only).
 */
import type {
  WarehouseRow,
  ProductVariantRow,
  InventoryItemRow,
  StockMovementRow,
  VStaffLowStockRow,
} from '../../lib/supabase/database.types';

export interface Warehouse {
  id: string;
  name: string;
  address: string | null;
  isDefault: boolean;
  isActive: boolean;
}

export function mapWarehouseRow(row: WarehouseRow): Warehouse {
  return {
    id: row.id,
    name: row.name,
    address: row.address,
    isDefault: row.is_default,
    isActive: row.is_active,
  };
}

export type ProductVariantStatus = ProductVariantRow['status'];

export interface ProductVariant {
  id: string;
  productId: string;
  size: string | null;
  color: string | null;
  sku: string;
  barcode: string | null;
  priceOverride: number | null;
  status: ProductVariantStatus;
}

export function mapProductVariantRow(row: ProductVariantRow): ProductVariant {
  return {
    id: row.id,
    productId: row.product_id,
    size: row.size,
    color: row.color,
    sku: row.sku,
    barcode: row.barcode,
    priceOverride: row.price_override !== null ? Number(row.price_override) : null,
    status: row.status,
  };
}

export interface InventoryItem {
  id: string;
  warehouseId: string;
  variantId: string;
  onHandQty: number;
  reservedQty: number;
  availableQty: number;
  reorderLevel: number;
  isLowStock: boolean;
}

export function mapInventoryItemRow(row: InventoryItemRow): InventoryItem {
  const availableQty = row.on_hand_qty - row.reserved_qty;
  return {
    id: row.id,
    warehouseId: row.warehouse_id,
    variantId: row.variant_id,
    onHandQty: row.on_hand_qty,
    reservedQty: row.reserved_qty,
    availableQty,
    reorderLevel: row.reorder_level,
    isLowStock: row.on_hand_qty <= row.reorder_level,
  };
}

export type StockMovementType = StockMovementRow['movement_type'];

export interface StockMovement {
  id: string;
  inventoryItemId: string;
  movementType: StockMovementType;
  qty: number;
  referenceType: string | null;
  referenceId: string | null;
  createdAt: string;
  createdBy: string | null;
}

export function mapStockMovementRow(row: StockMovementRow): StockMovement {
  return {
    id: row.id,
    inventoryItemId: row.inventory_item_id,
    movementType: row.movement_type,
    qty: row.qty,
    referenceType: row.reference_type,
    referenceId: row.reference_id,
    createdAt: row.created_at,
    createdBy: row.created_by,
  };
}

export interface LowStockAlert {
  inventoryItemId: string;
  warehouseName: string;
  productName: string;
  sku: string;
  size: string | null;
  color: string | null;
  onHandQty: number;
  reservedQty: number;
  reorderLevel: number;
}

export function mapLowStockRow(row: VStaffLowStockRow): LowStockAlert {
  return {
    inventoryItemId: row.inventory_item_id,
    warehouseName: row.warehouse_name,
    productName: row.product_name,
    sku: row.sku,
    size: row.size,
    color: row.color,
    onHandQty: row.on_hand_qty,
    reservedQty: row.reserved_qty,
    reorderLevel: row.reorder_level,
  };
}

// ---------------------------------------------------------------------
// Inputs
// ---------------------------------------------------------------------

export interface CreateWarehouseInput {
  name: string;
  address?: string;
  isDefault?: boolean;
}

export interface UpdateWarehouseInput {
  name?: string;
  address?: string | null;
}

export interface CreateProductVariantInput {
  productId: string;
  sku: string;
  size?: string;
  color?: string;
  barcode?: string;
  priceOverride?: number;
}

export interface UpdateProductVariantInput {
  size?: string | null;
  color?: string | null;
  barcode?: string | null;
  priceOverride?: number | null;
}

export interface CreateInventoryItemInput {
  warehouseId: string;
  variantId: string;
  onHandQty?: number;
  reorderLevel?: number;
}

export interface AdjustStockInput {
  inventoryItemId: string;
  /** Signed: positive increases on_hand_qty, negative decreases it. */
  delta: number;
  movementType: StockMovementType;
  referenceType?: string;
  referenceId?: string;
}

export interface AdjustReservationInput {
  inventoryItemId: string;
  /** Signed: positive reserves more, negative releases a reservation. */
  delta: number;
}
