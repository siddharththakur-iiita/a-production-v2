/**
 * src/features/cart/cart.types.ts
 *
 * Domain types for the Cart module (public.cart / cart_item,
 * 008_cart.sql). Every cart in this module belongs to a real
 * customer_id — including guest visitors, via Supabase anonymous
 * auth (023_guest_cart_support.sql, auth.service.ts signInAnonymously/
 * ensureSession). This module never operates on cart.session_id as a
 * security boundary; callers are expected to have already resolved a
 * customerId (real or anonymous) via the Authentication module before
 * calling anything here — consistent with every other module in this
 * codebase taking customerId as an explicit parameter (Address,
 * Customer) rather than resolving it internally.
 */
import type { CartRow, CartItemRow, VProductCatalogRow } from '../../lib/supabase/database.types';
import { getCatalogPublicUrl } from '../../lib/supabase/storage';

export interface Cart {
  id: string;
  customerId: string | null;
  updatedAt: string;
}

export function mapCartRow(row: CartRow): Cart {
  return { id: row.id, customerId: row.customer_id, updatedAt: row.updated_at };
}

export interface CartLineItem {
  id: string;
  cartId: string;
  kind: 'product' | 'tailoring';
  productId: string | null;
  variantId: string | null;
  tailoringRequestId: string | null;
  qty: number;
  unitPriceSnapshot: number;
  lineTotal: number;
}

export function mapCartItemRow(row: CartItemRow): CartLineItem {
  const unitPriceSnapshot = Number(row.unit_price_snapshot);
  return {
    id: row.id,
    cartId: row.cart_id,
    kind: row.tailoring_request_id ? 'tailoring' : 'product',
    productId: row.product_id,
    variantId: row.variant_id,
    tailoringRequestId: row.tailoring_request_id,
    qty: row.qty,
    unitPriceSnapshot,
    lineTotal: unitPriceSnapshot * row.qty,
  };
}

/**
 * A product-kind line item enriched with display information from
 * v_product_catalog (017_views.sql) — name, image, current slug.
 * Tailoring-kind items are NOT enriched here; a future Tailoring
 * module owns resolving tailoring_request display details, and this
 * module does not anticipate or duplicate that lookup.
 */
export interface EnrichedCartLineItem extends CartLineItem {
  productName: string | null;
  productSlug: string | null;
  productImageUrl: string | null;
}

export function mapEnrichedCartItem(
  item: CartLineItem,
  catalogRow: VProductCatalogRow | undefined
): EnrichedCartLineItem {
  return {
    ...item,
    productName: catalogRow?.name ?? null,
    productSlug: catalogRow?.slug ?? null,
    productImageUrl: catalogRow?.primary_image_storage_path
      ? getCatalogPublicUrl(catalogRow.primary_image_storage_path)
      : null,
  };
}

export interface CartSummary {
  cart: Cart;
  items: EnrichedCartLineItem[];
  itemCount: number;
  subtotal: number;
}

// ---------------------------------------------------------------------
// Inputs
// ---------------------------------------------------------------------

export interface AddProductToCartInput {
  customerId: string;
  productId: string;
  variantId?: string;
  qty?: number;
  unitPriceSnapshot: number;
}

export interface AddTailoringRequestToCartInput {
  customerId: string;
  tailoringRequestId: string;
  unitPriceSnapshot: number;
}

export interface UpdateCartItemQtyInput {
  cartItemId: string;
  qty: number;
}
