/**
 * src/features/inventory/inventory.hooks.ts
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as service from './inventory.service';
import { inventoryQueryKeys } from './inventory.queryKeys';
import type {
  AdjustReservationInput,
  AdjustStockInput,
  CreateInventoryItemInput,
  CreateProductVariantInput,
  CreateWarehouseInput,
  UpdateProductVariantInput,
  UpdateWarehouseInput,
} from './inventory.types';

export function useWarehouses(includeInactive = false) {
  return useQuery({
    queryKey: inventoryQueryKeys.warehouseList(includeInactive),
    queryFn: () => service.listWarehouses(includeInactive),
  });
}

export function useWarehouse(id: string | undefined) {
  return useQuery({
    queryKey: inventoryQueryKeys.warehouseDetail(id ?? ''),
    queryFn: () => service.getWarehouseById(id as string),
    enabled: Boolean(id),
  });
}

export function useCreateWarehouse() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateWarehouseInput) => service.createWarehouse(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: inventoryQueryKeys.warehouses() }),
  });
}

export function useUpdateWarehouse() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateWarehouseInput }) =>
      service.updateWarehouse(id, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: inventoryQueryKeys.warehouses() }),
  });
}

export function useSetDefaultWarehouse() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => service.setDefaultWarehouse(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: inventoryQueryKeys.warehouses() }),
  });
}

export function useDeactivateWarehouse() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => service.deactivateWarehouse(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: inventoryQueryKeys.warehouses() }),
  });
}

export function useReactivateWarehouse() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => service.reactivateWarehouse(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: inventoryQueryKeys.warehouses() }),
  });
}

export function useActiveVariants(productId: string | undefined) {
  return useQuery({
    queryKey: inventoryQueryKeys.variantsForProduct(productId ?? '', false),
    queryFn: () => service.listActiveVariants(productId as string),
    enabled: Boolean(productId),
  });
}

export function useVariantsForStaff(productId: string | undefined) {
  return useQuery({
    queryKey: inventoryQueryKeys.variantsForProduct(productId ?? '', true),
    queryFn: () => service.listVariantsForStaff(productId as string),
    enabled: Boolean(productId),
  });
}

export function useVariant(id: string | undefined) {
  return useQuery({
    queryKey: inventoryQueryKeys.variantDetail(id ?? ''),
    queryFn: () => service.getVariantById(id as string),
    enabled: Boolean(id),
  });
}

export function useVariantBySku(sku: string | undefined) {
  return useQuery({
    queryKey: inventoryQueryKeys.variantBySku(sku ?? ''),
    queryFn: () => service.getVariantBySku(sku as string),
    enabled: Boolean(sku),
  });
}

export function useCreateProductVariant() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateProductVariantInput) => service.createProductVariant(input),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: inventoryQueryKeys.variantsForProduct(variables.productId, true),
      });
      queryClient.invalidateQueries({
        queryKey: inventoryQueryKeys.variantsForProduct(variables.productId, false),
      });
    },
  });
}

export function useUpdateProductVariant() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateProductVariantInput }) =>
      service.updateProductVariant(id, input),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: inventoryQueryKeys.variantDetail(updated.id) });
      queryClient.invalidateQueries({ queryKey: inventoryQueryKeys.variants() });
    },
  });
}

export function useDiscontinueVariant() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => service.discontinueVariant(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: inventoryQueryKeys.variants() }),
  });
}

export function useReactivateVariant() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => service.reactivateVariant(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: inventoryQueryKeys.variants() }),
  });
}

export function useDeleteVariant() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => service.deleteVariant(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: inventoryQueryKeys.variants() }),
  });
}

export function useInventoryForVariant(variantId: string | undefined) {
  return useQuery({
    queryKey: inventoryQueryKeys.itemsForVariant(variantId ?? ''),
    queryFn: () => service.listInventoryForVariant(variantId as string),
    enabled: Boolean(variantId),
  });
}

export function useInventoryItem(warehouseId: string | undefined, variantId: string | undefined) {
  return useQuery({
    queryKey: inventoryQueryKeys.item(warehouseId ?? '', variantId ?? ''),
    queryFn: () => service.getInventoryItem(warehouseId as string, variantId as string),
    enabled: Boolean(warehouseId && variantId),
  });
}

export function useCreateInventoryItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateInventoryItemInput) => service.createInventoryItem(input),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: inventoryQueryKeys.itemsForVariant(variables.variantId) });
    },
  });
}

export function useUpdateReorderLevel() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reorderLevel }: { id: string; reorderLevel: number }) =>
      service.updateReorderLevel(id, reorderLevel),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: inventoryQueryKeys.items() }),
  });
}

export function useAdjustStock() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: AdjustStockInput) => service.adjustStock(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: inventoryQueryKeys.items() });
      queryClient.invalidateQueries({ queryKey: inventoryQueryKeys.movements() });
      queryClient.invalidateQueries({ queryKey: inventoryQueryKeys.lowStock() });
    },
  });
}

export function useAdjustReservation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: AdjustReservationInput) => service.adjustReservation(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: inventoryQueryKeys.items() }),
  });
}

export function useReserveStockIfAvailable() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: { inventoryItemId: string; qty: number }) =>
      service.reserveStockIfAvailable(params),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: inventoryQueryKeys.items() }),
  });
}

export function useDeleteInventoryItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => service.deleteInventoryItem(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: inventoryQueryKeys.items() }),
  });
}

export function useMovementsForInventoryItem(inventoryItemId: string | undefined) {
  return useQuery({
    queryKey: inventoryQueryKeys.movementsForItem(inventoryItemId ?? ''),
    queryFn: () => service.listMovementsForInventoryItem(inventoryItemId as string),
    enabled: Boolean(inventoryItemId),
  });
}

export function useMovementsByReference(referenceType: string | undefined, referenceId: string | undefined) {
  return useQuery({
    queryKey: inventoryQueryKeys.movementsByReference(referenceType ?? '', referenceId ?? ''),
    queryFn: () => service.listMovementsByReference(referenceType as string, referenceId as string),
    enabled: Boolean(referenceType && referenceId),
  });
}

export function useLowStockItems() {
  return useQuery({
    queryKey: inventoryQueryKeys.lowStock(),
    queryFn: () => service.listLowStockItems(),
  });
}
