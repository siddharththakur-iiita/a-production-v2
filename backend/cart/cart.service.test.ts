/**
 * src/features/cart/__tests__/cart.service.test.ts
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import * as repo from '../cart.repository';
import * as service from '../cart.service';
import { CartError } from '../cart.errors';
import type { CartItemRow, CartRow, VProductCatalogRow } from '../../../lib/supabase/database.types';

vi.mock('../cart.repository');

const CUSTOMER_ID = '11111111-1111-1111-1111-111111111111';
const PRODUCT_ID = '22222222-2222-2222-2222-222222222222';
const VARIANT_ID = '33333333-3333-3333-3333-333333333333';

function makeCartRow(overrides: Partial<CartRow> = {}): CartRow {
  return {
    id: 'cart-1',
    customer_id: CUSTOMER_ID,
    session_id: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

function makeCartItemRow(overrides: Partial<CartItemRow> = {}): CartItemRow {
  return {
    id: 'item-1',
    cart_id: 'cart-1',
    product_id: PRODUCT_ID,
    variant_id: VARIANT_ID,
    tailoring_request_id: null,
    qty: 1,
    unit_price_snapshot: '45000.00',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

function makeCatalogRow(overrides: Partial<VProductCatalogRow> = {}): VProductCatalogRow {
  return {
    id: PRODUCT_ID,
    slug: 'ivory-zardosi-sherwani',
    name: 'The Ivory Zardosi Sherwani',
    description: null,
    product_type_code: 'made_to_order',
    department_slug: 'men',
    department_name: 'Men',
    category_slug: null,
    category_name: null,
    price: '45000.00',
    compare_at_price: null,
    currency: 'INR',
    lead_time_days_min: 42,
    lead_time_days_max: 56,
    is_featured: false,
    is_trending: false,
    is_new_arrival: false,
    average_rating: null,
    review_count: 0,
    primary_image_storage_path: 'products/sherwani-1.jpg',
    primary_image_alt_text: 'Front view',
    ...overrides,
  };
}

describe('cart.service', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('getOrCreateCart', () => {
    it('returns the existing cart without creating a new one', async () => {
      vi.mocked(repo.findCartForCustomer).mockResolvedValue(makeCartRow());

      const result = await service.getOrCreateCart(CUSTOMER_ID);

      expect(result.id).toBe('cart-1');
      expect(repo.insertCart).not.toHaveBeenCalled();
    });

    it('creates a new cart when none exists', async () => {
      vi.mocked(repo.findCartForCustomer).mockResolvedValue(null);
      vi.mocked(repo.insertCart).mockResolvedValue(makeCartRow({ id: 'cart-new' }));

      const result = await service.getOrCreateCart(CUSTOMER_ID);

      expect(repo.insertCart).toHaveBeenCalledWith(CUSTOMER_ID);
      expect(result.id).toBe('cart-new');
    });
  });

  describe('addProductToCart', () => {
    it('merges quantity into an existing matching line instead of creating a duplicate', async () => {
      vi.mocked(repo.findCartForCustomer).mockResolvedValue(makeCartRow());
      vi.mocked(repo.findExistingProductCartItem).mockResolvedValue(makeCartItemRow({ qty: 2 }));
      vi.mocked(repo.updateCartItemQtyRow).mockResolvedValue(makeCartItemRow({ qty: 3 }));

      const result = await service.addProductToCart({
        customerId: CUSTOMER_ID,
        productId: PRODUCT_ID,
        variantId: VARIANT_ID,
        qty: 1,
        unitPriceSnapshot: 45000,
      });

      expect(repo.updateCartItemQtyRow).toHaveBeenCalledWith('item-1', 3);
      expect(repo.insertCartItem).not.toHaveBeenCalled();
      expect(result.qty).toBe(3);
    });

    it('inserts a new line when no matching item exists', async () => {
      vi.mocked(repo.findCartForCustomer).mockResolvedValue(makeCartRow());
      vi.mocked(repo.findExistingProductCartItem).mockResolvedValue(null);
      vi.mocked(repo.insertCartItem).mockResolvedValue(makeCartItemRow());

      await service.addProductToCart({
        customerId: CUSTOMER_ID,
        productId: PRODUCT_ID,
        unitPriceSnapshot: 45000,
      });

      expect(repo.insertCartItem).toHaveBeenCalledWith(
        expect.objectContaining({ product_id: PRODUCT_ID, qty: 1, unit_price_snapshot: '45000.00' })
      );
    });
  });

  describe('updateCartItemQty', () => {
    it('rejects qty != 1 on a tailoring-kind line without calling the repository update', async () => {
      vi.mocked(repo.findCartItemById).mockResolvedValue(
        makeCartItemRow({ product_id: null, variant_id: null, tailoring_request_id: 'tr-1', qty: 1 })
      );

      const error: CartError = await service
        .updateCartItemQty({ cartItemId: 'item-1', qty: 2 })
        .catch((e) => e);

      expect(error).toBeInstanceOf(CartError);
      expect(error.code).toBe('validation_failed');
      expect(repo.updateCartItemQtyRow).not.toHaveBeenCalled();
    });

    it('allows qty changes on a product-kind line', async () => {
      vi.mocked(repo.findCartItemById).mockResolvedValue(makeCartItemRow());
      vi.mocked(repo.updateCartItemQtyRow).mockResolvedValue(makeCartItemRow({ qty: 5 }));

      const result = await service.updateCartItemQty({ cartItemId: 'item-1', qty: 5 });

      expect(result.qty).toBe(5);
    });

    it('throws cart_item_not_found when the item does not exist', async () => {
      vi.mocked(repo.findCartItemById).mockResolvedValue(null);

      const error: CartError = await service
        .updateCartItemQty({ cartItemId: 'missing', qty: 1 })
        .catch((e) => e);

      expect(error).toBeInstanceOf(CartError);
      expect(error.code).toBe('cart_item_not_found');
    });
  });

  describe('getCartSummary', () => {
    it('computes itemCount and subtotal correctly across multiple lines', async () => {
      vi.mocked(repo.findCartForCustomer).mockResolvedValue(makeCartRow());
      vi.mocked(repo.findCartItems).mockResolvedValue([
        makeCartItemRow({ id: 'item-1', qty: 2, unit_price_snapshot: '1000.00' }),
        makeCartItemRow({ id: 'item-2', qty: 1, unit_price_snapshot: '500.00', product_id: 'other-prod' }),
      ]);
      vi.mocked(repo.findCatalogProductsByIds).mockResolvedValue([
        makeCatalogRow({ id: PRODUCT_ID }),
        makeCatalogRow({ id: 'other-prod', slug: 'other-product' }),
      ]);

      const summary = await service.getCartSummary(CUSTOMER_ID);

      expect(summary.itemCount).toBe(3); // 2 + 1
      expect(summary.subtotal).toBe(2500); // (2*1000) + (1*500)
      expect(summary.items).toHaveLength(2);
      expect(summary.items[0].productName).toBe('The Ivory Zardosi Sherwani');
    });

    it('does not query the catalog when the cart has no product-kind items', async () => {
      vi.mocked(repo.findCartForCustomer).mockResolvedValue(makeCartRow());
      vi.mocked(repo.findCartItems).mockResolvedValue([
        makeCartItemRow({ product_id: null, variant_id: null, tailoring_request_id: 'tr-1' }),
      ]);

      await service.getCartSummary(CUSTOMER_ID);

      expect(repo.findCatalogProductsByIds).not.toHaveBeenCalled();
    });
  });
});
