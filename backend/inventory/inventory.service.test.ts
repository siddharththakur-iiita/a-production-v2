/**
 * src/features/inventory/__tests__/inventory.service.test.ts
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import * as repo from '../inventory.repository';
import * as service from '../inventory.service';
import { InventoryError } from '../inventory.errors';
import type { InventoryItemRow, ProductVariantRow } from '../../../lib/supabase/database.types';

vi.mock('../inventory.repository');

function makeInventoryItemRow(overrides: Partial<InventoryItemRow> = {}): InventoryItemRow {
  return {
    id: 'inv-1',
    warehouse_id: 'wh-1',
    variant_id: 'var-1',
    on_hand_qty: 10,
    reserved_qty: 2,
    reorder_level: 3,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    deleted_at: null,
    created_by: null,
    updated_by: null,
    version: 1,
    ...overrides,
  };
}

function makeVariantRow(overrides: Partial<ProductVariantRow> = {}): ProductVariantRow {
  return {
    id: 'var-1',
    product_id: 'prod-1',
    size: 'M',
    color: 'Ivory',
    sku: 'AP-IZS-M-IVR',
    barcode: null,
    price_override: null,
    status: 'active',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    deleted_at: null,
    created_by: null,
    updated_by: null,
    version: 1,
    ...overrides,
  };
}

describe('inventory.service', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('mapInventoryItemRow (via getInventoryItem)', () => {
    it('computes availableQty and isLowStock correctly', async () => {
      vi.mocked(repo.findInventoryItem).mockResolvedValue(
        makeInventoryItemRow({ on_hand_qty: 10, reserved_qty: 2, reorder_level: 5 })
      );

      const result = await service.getInventoryItem('wh-1', 'var-1');

      expect(result?.availableQty).toBe(8);
      expect(result?.isLowStock).toBe(false); // 10 > 5
    });

    it('flags isLowStock when on_hand_qty <= reorder_level', async () => {
      vi.mocked(repo.findInventoryItem).mockResolvedValue(
        makeInventoryItemRow({ on_hand_qty: 3, reserved_qty: 0, reorder_level: 5 })
      );

      const result = await service.getInventoryItem('wh-1', 'var-1');

      expect(result?.isLowStock).toBe(true);
    });
  });

  describe('adjustStock', () => {
    it('rejects a positive delta on an outbound movement before calling the RPC', async () => {
      await expect(
        service.adjustStock({ inventoryItemId: 'inv-1', delta: 5, movementType: 'outbound' })
      ).rejects.toThrow(InventoryError);

      expect(repo.adjustStockRpc).not.toHaveBeenCalled();
    });

    it('rejects a negative delta on an inbound movement before calling the RPC', async () => {
      await expect(
        service.adjustStock({ inventoryItemId: 'inv-1', delta: -5, movementType: 'inbound' })
      ).rejects.toThrow(InventoryError);

      expect(repo.adjustStockRpc).not.toHaveBeenCalled();
    });

    it('rejects a zero delta before calling the RPC', async () => {
      await expect(
        service.adjustStock({ inventoryItemId: 'inv-1', delta: 0, movementType: 'adjustment' })
      ).rejects.toThrow(InventoryError);

      expect(repo.adjustStockRpc).not.toHaveBeenCalled();
    });

    it('calls the RPC with the full movement context on valid input', async () => {
      vi.mocked(repo.adjustStockRpc).mockResolvedValue(makeInventoryItemRow({ on_hand_qty: 8 }));

      const result = await service.adjustStock({
        inventoryItemId: 'inv-1',
        delta: -2,
        movementType: 'outbound',
        referenceType: 'order',
        referenceId: '11111111-1111-1111-1111-111111111111',
      });

      expect(repo.adjustStockRpc).toHaveBeenCalledWith({
        inventoryItemId: 'inv-1',
        delta: -2,
        movementType: 'outbound',
        referenceType: 'order',
        referenceId: '11111111-1111-1111-1111-111111111111',
      });
      expect(result.onHandQty).toBe(8);
    });
  });

  describe('reserveStockIfAvailable', () => {
    it('throws insufficient_stock without calling the RPC when available quantity is too low', async () => {
      vi.mocked(repo.findInventoryItemById).mockResolvedValue(
        makeInventoryItemRow({ on_hand_qty: 5, reserved_qty: 4 }) // available = 1
      );
      vi.mocked(repo.findVariantById).mockResolvedValue(makeVariantRow({ sku: 'AP-TEST-SKU' }));

      const error: InventoryError = await service
        .reserveStockIfAvailable({ inventoryItemId: 'inv-1', qty: 2 })
        .catch((e) => e);

      expect(error).toBeInstanceOf(InventoryError);
      expect(error.code).toBe('insufficient_stock');
      expect(error.message).toContain('AP-TEST-SKU');
      expect(repo.adjustReservationRpc).not.toHaveBeenCalled();
    });

    it('reserves stock via the RPC when available quantity is sufficient', async () => {
      vi.mocked(repo.findInventoryItemById).mockResolvedValue(
        makeInventoryItemRow({ on_hand_qty: 10, reserved_qty: 2 }) // available = 8
      );
      vi.mocked(repo.adjustReservationRpc).mockResolvedValue(
        makeInventoryItemRow({ on_hand_qty: 10, reserved_qty: 4 })
      );

      const result = await service.reserveStockIfAvailable({ inventoryItemId: 'inv-1', qty: 2 });

      expect(repo.adjustReservationRpc).toHaveBeenCalledWith({ inventoryItemId: 'inv-1', delta: 2 });
      expect(result.reservedQty).toBe(4);
    });

    it('throws inventory_item_not_found when the item does not exist', async () => {
      vi.mocked(repo.findInventoryItemById).mockResolvedValue(null);

      const error: InventoryError = await service
        .reserveStockIfAvailable({ inventoryItemId: 'missing', qty: 1 })
        .catch((e) => e);

      expect(error).toBeInstanceOf(InventoryError);
      expect(error.code).toBe('inventory_item_not_found');
    });
  });

  describe('createProductVariant', () => {
    it('rejects an empty SKU before calling the repository', async () => {
      await expect(
        service.createProductVariant({
          productId: '11111111-1111-1111-1111-111111111111',
          sku: '',
        })
      ).rejects.toThrow(InventoryError);

      expect(repo.insertVariant).not.toHaveBeenCalled();
    });
  });
});
