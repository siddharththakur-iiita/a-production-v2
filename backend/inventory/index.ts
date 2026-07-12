/**
 * src/features/inventory/index.ts
 */
export {
  useWarehouses,
  useWarehouse,
  useCreateWarehouse,
  useUpdateWarehouse,
  useSetDefaultWarehouse,
  useDeactivateWarehouse,
  useReactivateWarehouse,
  useActiveVariants,
  useVariantsForStaff,
  useVariant,
  useVariantBySku,
  useCreateProductVariant,
  useUpdateProductVariant,
  useDiscontinueVariant,
  useReactivateVariant,
  useDeleteVariant,
  useInventoryForVariant,
  useInventoryItem,
  useCreateInventoryItem,
  useUpdateReorderLevel,
  useAdjustStock,
  useAdjustReservation,
  useReserveStockIfAvailable,
  useDeleteInventoryItem,
  useMovementsForInventoryItem,
  useMovementsByReference,
  useLowStockItems,
} from './inventory.hooks';

export {
  listWarehouses,
  getWarehouseById,
  createWarehouse,
  updateWarehouse,
  setDefaultWarehouse,
  deactivateWarehouse,
  reactivateWarehouse,
  listActiveVariants,
  listVariantsForStaff,
  getVariantById,
  getVariantBySku,
  createProductVariant,
  updateProductVariant,
  discontinueVariant,
  reactivateVariant,
  deleteVariant,
  listInventoryForVariant,
  getInventoryItem,
  createInventoryItem,
  updateReorderLevel,
  adjustStock,
  adjustReservation,
  reserveStockIfAvailable,
  deleteInventoryItem,
  listMovementsForInventoryItem,
  listMovementsByReference,
  listLowStockItems,
} from './inventory.service';

export { inventoryQueryKeys } from './inventory.queryKeys';

export type {
  Warehouse,
  ProductVariant,
  ProductVariantStatus,
  InventoryItem,
  StockMovement,
  StockMovementType,
  LowStockAlert,
  CreateWarehouseInput,
  UpdateWarehouseInput,
  CreateProductVariantInput,
  UpdateProductVariantInput,
  CreateInventoryItemInput,
  AdjustStockInput,
  AdjustReservationInput,
} from './inventory.types';

export { InventoryError } from './inventory.errors';
export type { InventoryErrorCode } from './inventory.errors';
