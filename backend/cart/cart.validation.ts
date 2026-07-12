/**
 * src/features/cart/cart.validation.ts
 *
 * Mirrors the CHECK constraints on public.cart_item exactly
 * (008_cart.sql): qty > 0, unit_price_snapshot >= 0, and the XOR
 * between a product-kind and tailoring-kind line item, with qty
 * forced to 1 for a tailoring-kind item.
 */
import { z } from 'zod';

export const addProductToCartSchema = z.object({
  customerId: z.string().uuid(),
  productId: z.string().uuid(),
  variantId: z.string().uuid().optional(),
  qty: z.number().int().min(1).optional(),
  unitPriceSnapshot: z.number().min(0),
});

export const addTailoringRequestToCartSchema = z.object({
  customerId: z.string().uuid(),
  tailoringRequestId: z.string().uuid(),
  unitPriceSnapshot: z.number().min(0),
});

export const updateCartItemQtySchema = z.object({
  cartItemId: z.string().uuid(),
  qty: z.number().int().min(1, 'Quantity must be at least 1'),
});

export type AddProductToCartValidated = z.infer<typeof addProductToCartSchema>;
export type AddTailoringRequestToCartValidated = z.infer<typeof addTailoringRequestToCartSchema>;
export type UpdateCartItemQtyValidated = z.infer<typeof updateCartItemQtySchema>;
