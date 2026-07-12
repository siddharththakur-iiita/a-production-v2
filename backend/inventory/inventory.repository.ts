/**
 * src/features/inventory/inventory.repository.ts
 *
 * RLS reminder (016_rls.sql):
 *   warehouse:            staff-only ALL, gated on inventory.manage
 *   product_variant_read: anon/authenticated SELECT WHERE status='active' AND deleted_at IS NULL
 *   product_variant_staff_read/write: staff, gated on catalog.write OR inventory.manage
 *   inventory_item:       staff-only, read gated on inventory.view OR inventory.manage,
 *                         write gated on inventory.manage
 *   stock_movement:       staff-only SELECT (inventory.view OR inventory.manage); NO client
 *                         write policy at all — every row is written by
 *                         trg_inventory_item_log_movement via the two RPCs below
 *   v_staff_low_stock:    security_invoker view, inherits inventory_item's staff-only RLS
 */
import { supabase } from '../../lib/supabase/client';
import type {
  WarehouseRow,
  WarehouseInsert,
  WarehouseUpdate,
  ProductVariantRow,
  ProductVariantInsert,
  ProductVariantUpdate,
  ProductVariantStatus,
  InventoryItemRow,
  InventoryItemInsert,
  StockMovementRow,
  VStaffLowStockRow,
} from '../../lib/supabase/database.types';

// ---------------------------------------------------------------------
// Warehouse
// ---------------------------------------------------------------------

export async function findWarehouses(includeInactive: boolean): Promise<WarehouseRow[]> {
  let query = supabase.from('warehouse').select('*').order('name', { ascending: true });
  if (!includeInactive) query = query.eq('is_active', true);

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function findWarehouseById(id: string): Promise<WarehouseRow | null> {
  const { data, error } = await supabase.from('warehouse').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data;
}

export async function insertWarehouse(input: WarehouseInsert): Promise<WarehouseRow> {
  const { data, error } = await supabase.from('warehouse').insert(input).select('*').single();
  if (error) throw error;
  return data;
}

export async function updateWarehouseRow(id: string, patch: WarehouseUpdate): Promise<WarehouseRow> {
  const { data, error } = await supabase.from('warehouse').update(patch).eq('id', id).select('*').single();
  if (error) throw error;
  return data;
}

export async function setWarehouseDefault(id: string): Promise<WarehouseRow> {
  const { data, error } = await supabase
    .from('warehouse')
    .update({ is_default: true })
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

export async function setWarehouseActive(id: string, isActive: boolean): Promise<WarehouseRow> {
  const { data, error } = await supabase
    .from('warehouse')
    .update({ is_active: isActive })
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

// ---------------------------------------------------------------------
// Product variant
// ---------------------------------------------------------------------

export async function findActiveVariantsForProduct(productId: string): Promise<ProductVariantRow[]> {
  const { data, error } = await supabase
    .from('product_variant')
    .select('*')
    .eq('product_id', productId)
    .eq('status', 'active')
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data;
}

export async function findAllVariantsForProductStaff(productId: string): Promise<ProductVariantRow[]> {
  const { data, error } = await supabase
    .from('product_variant')
    .select('*')
    .eq('product_id', productId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data;
}

export async function findVariantById(id: string): Promise<ProductVariantRow | null> {
  const { data, error } = await supabase.from('product_variant').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data;
}

export async function findVariantBySku(sku: string): Promise<ProductVariantRow | null> {
  const { data, error } = await supabase.from('product_variant').select('*').eq('sku', sku).maybeSingle();
  if (error) throw error;
  return data;
}

export async function insertVariant(input: ProductVariantInsert): Promise<ProductVariantRow> {
  const { data, error } = await supabase.from('product_variant').insert(input).select('*').single();
  if (error) throw error;
  return data;
}

export async function updateVariantRow(id: string, patch: ProductVariantUpdate): Promise<ProductVariantRow> {
  const { data, error } = await supabase
    .from('product_variant')
    .update(patch)
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

export async function setVariantStatus(id: string, status: ProductVariantStatus): Promise<ProductVariantRow> {
  return updateVariantRow(id, { status });
}

export async function softDeleteVariant(id: string): Promise<void> {
  const { error } = await supabase.from('product_variant').delete().eq('id', id);
  if (error) throw error;
}

// ---------------------------------------------------------------------
// Inventory item
// ---------------------------------------------------------------------

export async function findInventoryForVariant(variantId: string): Promise<InventoryItemRow[]> {
  const { data, error } = await supabase.from('inventory_item').select('*').eq('variant_id', variantId);
  if (error) throw error;
  return data;
}

export async function findInventoryItem(
  warehouseId: string,
  variantId: string
): Promise<InventoryItemRow | null> {
  const { data, error } = await supabase
    .from('inventory_item')
    .select('*')
    .eq('warehouse_id', warehouseId)
    .eq('variant_id', variantId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function findInventoryItemById(id: string): Promise<InventoryItemRow | null> {
  const { data, error } = await supabase.from('inventory_item').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data;
}

export async function insertInventoryItem(input: InventoryItemInsert): Promise<InventoryItemRow> {
  const { data, error } = await supabase.from('inventory_item').insert(input).select('*').single();
  if (error) throw error;
  return data;
}

export async function updateReorderLevel(id: string, reorderLevel: number): Promise<InventoryItemRow> {
  const { data, error } = await supabase
    .from('inventory_item')
    .update({ reorder_level: reorderLevel })
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

export async function adjustStockRpc(params: {
  inventoryItemId: string;
  delta: number;
  movementType: 'inbound' | 'outbound' | 'adjustment' | 'return';
  referenceType?: string;
  referenceId?: string;
}): Promise<InventoryItemRow> {
  const { data, error } = await supabase.rpc('app_adjust_inventory_stock', {
    p_inventory_item_id: params.inventoryItemId,
    p_delta: params.delta,
    p_movement_type: params.movementType,
    p_reference_type: params.referenceType ?? null,
    p_reference_id: params.referenceId ?? null,
  });

  if (error) throw error;
  return data;
}

export async function adjustReservationRpc(params: {
  inventoryItemId: string;
  delta: number;
}): Promise<InventoryItemRow> {
  const { data, error } = await supabase.rpc('app_adjust_inventory_reservation', {
    p_inventory_item_id: params.inventoryItemId,
    p_delta: params.delta,
  });

  if (error) throw error;
  return data;
}

export async function softDeleteInventoryItem(id: string): Promise<void> {
  const { error } = await supabase.from('inventory_item').delete().eq('id', id);
  if (error) throw error;
}

// ---------------------------------------------------------------------
// Stock movement (read-only — see file header)
// ---------------------------------------------------------------------

export async function findMovementsForInventoryItem(inventoryItemId: string): Promise<StockMovementRow[]> {
  const { data, error } = await supabase
    .from('stock_movement')
    .select('*')
    .eq('inventory_item_id', inventoryItemId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

export async function findMovementsByReference(
  referenceType: string,
  referenceId: string
): Promise<StockMovementRow[]> {
  const { data, error } = await supabase
    .from('stock_movement')
    .select('*')
    .eq('reference_type', referenceType)
    .eq('reference_id', referenceId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

// ---------------------------------------------------------------------
// Low stock alert (v_staff_low_stock, 017_views.sql)
// ---------------------------------------------------------------------

export async function findLowStockItems(): Promise<VStaffLowStockRow[]> {
  const { data, error } = await supabase.from('v_staff_low_stock').select('*');
  if (error) throw error;
  return data;
}
