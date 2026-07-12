/**
 * src/features/cart/cart.repository.ts
 *
 * RLS reminder (016_rls.sql):
 *   cart_owner_all:      authenticated ALL, WHERE customer_id = app_current_customer_id()
 *   cart_item_owner_all: authenticated ALL, via EXISTS join to cart.customer_id
 * Both require a real auth.uid() — including an anonymous-auth one
 * (023_guest_cart_support.sql) for guest carts. There is no anon-role
 * policy at all; every function here assumes an authenticated
 * (possibly anonymous) session already exists — see cart.types.ts
 * header and auth.service.ts ensureSession().
 *
 * Reuses lib/supabase/catalogQueries.ts's findCatalogProductsByIds
 * (already shared with Product/Collection) rather than duplicating
 * that query a third time — per the consistency-pass directive to
 * scan and reuse existing shared utilities before writing new ones.
 */
import { supabase } from '../../lib/supabase/client';
import { findCatalogProductsByIds } from '../../lib/supabase/catalogQueries';
import type { CartRow, CartItemRow, CartItemInsert } from '../../lib/supabase/database.types';

export { findCatalogProductsByIds };

/**
 * SELECT * FROM cart WHERE customer_id = :customerId LIMIT 1
 * At most one row can exist per the partial UNIQUE(customer_id) index
 * (008_cart.sql), so .maybeSingle() is the correct query shape.
 */
export async function findCartForCustomer(customerId: string): Promise<CartRow | null> {
  const { data, error } = await supabase
    .from('cart')
    .select('*')
    .eq('customer_id', customerId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function insertCart(customerId: string): Promise<CartRow> {
  const { data, error } = await supabase
    .from('cart')
    .insert({ customer_id: customerId })
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

export async function findCartItems(cartId: string): Promise<CartItemRow[]> {
  const { data, error } = await supabase
    .from('cart_item')
    .select('*')
    .eq('cart_id', cartId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data;
}

export async function findCartItemById(id: string): Promise<CartItemRow | null> {
  const { data, error } = await supabase.from('cart_item').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data;
}

/**
 * Finds an existing product-kind line for the same (cart, product,
 * variant) combination, used by the service layer to merge quantities
 * instead of creating a duplicate line item when a customer adds a
 * product they already have in their cart.
 */
export async function findExistingProductCartItem(params: {
  cartId: string;
  productId: string;
  variantId: string | null;
}): Promise<CartItemRow | null> {
  let query = supabase
    .from('cart_item')
    .select('*')
    .eq('cart_id', params.cartId)
    .eq('product_id', params.productId);

  query = params.variantId ? query.eq('variant_id', params.variantId) : query.is('variant_id', null);

  const { data, error } = await query.maybeSingle();
  if (error) throw error;
  return data;
}

export async function insertCartItem(input: CartItemInsert): Promise<CartItemRow> {
  const { data, error } = await supabase.from('cart_item').insert(input).select('*').single();
  if (error) throw error;
  return data;
}

export async function updateCartItemQtyRow(id: string, qty: number): Promise<CartItemRow> {
  const { data, error } = await supabase
    .from('cart_item')
    .update({ qty })
    .eq('id', id)
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

export async function deleteCartItem(id: string): Promise<void> {
  const { error } = await supabase.from('cart_item').delete().eq('id', id);
  if (error) throw error;
}

/**
 * DELETE FROM cart WHERE id = :id — a real hard delete, correctly so:
 * cart is Pattern B with no soft-delete column, and 008_cart.sql's own
 * documentation states a cart is deleted (not soft-deleted) once
 * converted into an order or explicitly cleared. ON DELETE CASCADE
 * from cart_item (008_cart.sql) removes its line items automatically.
 */
export async function deleteCart(id: string): Promise<void> {
  const { error } = await supabase.from('cart').delete().eq('id', id);
  if (error) throw error;
}
