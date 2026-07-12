/**
 * src/features/cart/cart.service.ts
 */
import * as repo from './cart.repository';
import {
  mapCartRow,
  mapCartItemRow,
  mapEnrichedCartItem,
  type Cart,
  type CartLineItem,
  type CartSummary,
  type AddProductToCartInput,
  type AddTailoringRequestToCartInput,
  type UpdateCartItemQtyInput,
} from './cart.types';
import {
  addProductToCartSchema,
  addTailoringRequestToCartSchema,
  updateCartItemQtySchema,
} from './cart.validation';
import { CartError, mapCartPostgrestError, mapCartZodError } from './cart.errors';

/** Finds the customer's cart, creating one if none exists yet. */
export async function getOrCreateCart(customerId: string): Promise<Cart> {
  try {
    const existing = await repo.findCartForCustomer(customerId);
    if (existing) return mapCartRow(existing);

    const created = await repo.insertCart(customerId);
    return mapCartRow(created);
  } catch (err) {
    throw mapCartPostgrestError(err as never);
  }
}

/**
 * Fetches the full cart for display: the cart row, every line item,
 * enriched with product display info (name/slug/image) for
 * product-kind lines via the shared v_product_catalog lookup —
 * tailoring-kind lines are returned unenriched (see cart.types.ts) —
 * plus computed itemCount/subtotal.
 */
export async function getCartSummary(customerId: string): Promise<CartSummary> {
  try {
    const cart = await getOrCreateCart(customerId);
    const itemRows = await repo.findCartItems(cart.id);
    const items: CartLineItem[] = itemRows.map(mapCartItemRow);

    const productIds = items
      .filter((i) => i.kind === 'product' && i.productId)
      .map((i) => i.productId as string);
    const catalogRows = productIds.length > 0 ? await repo.findCatalogProductsByIds(productIds) : [];
    const catalogById = new Map(catalogRows.map((r) => [r.id, r]));

    const enrichedItems = items.map((item) =>
      mapEnrichedCartItem(item, item.productId ? catalogById.get(item.productId) : undefined)
    );

    return {
      cart,
      items: enrichedItems,
      itemCount: items.reduce((sum, i) => sum + i.qty, 0),
      subtotal: items.reduce((sum, i) => sum + i.lineTotal, 0),
    };
  } catch (err) {
    throw mapCartPostgrestError(err as never);
  }
}

/**
 * Adds a product+variant to the cart. If an identical (product,
 * variant) line already exists, its quantity is increased rather than
 * creating a duplicate row — a standard cart UX expectation this
 * service enforces since the database itself has no uniqueness
 * constraint preventing duplicate product lines (unlike wishlist_item,
 * which does).
 */
export async function addProductToCart(input: AddProductToCartInput): Promise<CartLineItem> {
  const parsed = addProductToCartSchema.safeParse(input);
  if (!parsed.success) throw mapCartZodError(parsed.error);

  try {
    const cart = await getOrCreateCart(parsed.data.customerId);
    const qtyToAdd = parsed.data.qty ?? 1;

    const existing = await repo.findExistingProductCartItem({
      cartId: cart.id,
      productId: parsed.data.productId,
      variantId: parsed.data.variantId ?? null,
    });

    if (existing) {
      const updated = await repo.updateCartItemQtyRow(existing.id, existing.qty + qtyToAdd);
      return mapCartItemRow(updated);
    }

    const inserted = await repo.insertCartItem({
      cart_id: cart.id,
      product_id: parsed.data.productId,
      variant_id: parsed.data.variantId,
      qty: qtyToAdd,
      unit_price_snapshot: parsed.data.unitPriceSnapshot.toFixed(2),
    });
    return mapCartItemRow(inserted);
  } catch (err) {
    throw mapCartPostgrestError(err as never);
  }
}

/**
 * Adds an accepted bespoke commission to the cart (BRS v2.0 Section
 * 9/5.2 — the mechanism by which a TailoringRequest formally enters
 * checkout alongside ready-made items). Always qty 1, per
 * cart_item_tailoring_qty_one_check (008_cart.sql). Not merged/
 * quantity-bumped like product lines — a tailoring_request is a
 * unique commission, not a stackable SKU.
 */
export async function addTailoringRequestToCart(
  input: AddTailoringRequestToCartInput
): Promise<CartLineItem> {
  const parsed = addTailoringRequestToCartSchema.safeParse(input);
  if (!parsed.success) throw mapCartZodError(parsed.error);

  try {
    const cart = await getOrCreateCart(parsed.data.customerId);

    const inserted = await repo.insertCartItem({
      cart_id: cart.id,
      tailoring_request_id: parsed.data.tailoringRequestId,
      qty: 1,
      unit_price_snapshot: parsed.data.unitPriceSnapshot.toFixed(2),
    });
    return mapCartItemRow(inserted);
  } catch (err) {
    throw mapCartPostgrestError(err as never);
  }
}

/**
 * Updates a line item's quantity. Rejects any attempt to set qty != 1
 * on a tailoring-kind line before it ever reaches the database — this
 * requires a lookup of the existing row first (to know its kind),
 * which is why it is checked here rather than in cart.validation.ts
 * (a pure schema has no database access). Mirrors
 * cart_item_tailoring_qty_one_check (008_cart.sql), which remains the
 * actual enforced invariant regardless of this pre-check.
 */
export async function updateCartItemQty(input: UpdateCartItemQtyInput): Promise<CartLineItem> {
  const parsed = updateCartItemQtySchema.safeParse(input);
  if (!parsed.success) throw mapCartZodError(parsed.error);

  const existing = await repo.findCartItemById(parsed.data.cartItemId);
  if (!existing) {
    throw new CartError('cart_item_not_found', 'Cart item not found.');
  }
  if (existing.tailoring_request_id && parsed.data.qty !== 1) {
    throw new CartError(
      'validation_failed',
      'A bespoke tailoring commission can only be added to the cart with quantity 1.'
    );
  }

  try {
    const updated = await repo.updateCartItemQtyRow(parsed.data.cartItemId, parsed.data.qty);
    return mapCartItemRow(updated);
  } catch (err) {
    throw mapCartPostgrestError(err as never);
  }
}

export async function removeCartItem(cartItemId: string): Promise<void> {
  try {
    await repo.deleteCartItem(cartItemId);
  } catch (err) {
    throw mapCartPostgrestError(err as never);
  }
}

/** Empties a customer's cart (removes every line item, keeps the cart row itself). */
export async function clearCart(customerId: string): Promise<void> {
  try {
    const cart = await repo.findCartForCustomer(customerId);
    if (!cart) return;

    const items = await repo.findCartItems(cart.id);
    await Promise.all(items.map((item) => repo.deleteCartItem(item.id)));
  } catch (err) {
    throw mapCartPostgrestError(err as never);
  }
}
