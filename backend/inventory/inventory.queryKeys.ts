/**
 * src/features/inventory/inventory.queryKeys.ts
 */
export const inventoryQueryKeys = {
  all: ['inventory'] as const,

  warehouses: () => [...inventoryQueryKeys.all, 'warehouses'] as const,
  warehouseList: (includeInactive: boolean) =>
    [...inventoryQueryKeys.warehouses(), 'list', includeInactive] as const,
  warehouseDetail: (id: string) => [...inventoryQueryKeys.warehouses(), 'detail', id] as const,

  variants: () => [...inventoryQueryKeys.all, 'variants'] as const,
  variantsForProduct: (productId: string, staff: boolean) =>
    [...inventoryQueryKeys.variants(), productId, staff ? 'staff' : 'public'] as const,
  variantDetail: (id: string) => [...inventoryQueryKeys.variants(), 'detail', id] as const,
  variantBySku: (sku: string) => [...inventoryQueryKeys.variants(), 'sku', sku] as const,

  items: () => [...inventoryQueryKeys.all, 'items'] as const,
  itemsForVariant: (variantId: string) => [...inventoryQueryKeys.items(), 'variant', variantId] as const,
  item: (warehouseId: string, variantId: string) =>
    [...inventoryQueryKeys.items(), warehouseId, variantId] as const,

  movements: () => [...inventoryQueryKeys.all, 'movements'] as const,
  movementsForItem: (inventoryItemId: string) =>
    [...inventoryQueryKeys.movements(), 'item', inventoryItemId] as const,
  movementsByReference: (referenceType: string, referenceId: string) =>
    [...inventoryQueryKeys.movements(), 'reference', referenceType, referenceId] as const,

  lowStock: () => [...inventoryQueryKeys.all, 'low-stock'] as const,
};
