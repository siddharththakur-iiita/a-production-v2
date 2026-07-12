/**
 * src/features/cart/index.ts
 */
export {
  useCartSummary,
  useAddProductToCart,
  useAddTailoringRequestToCart,
  useUpdateCartItemQty,
  useRemoveCartItem,
  useClearCart,
} from './cart.hooks';

export {
  getOrCreateCart,
  getCartSummary,
  addProductToCart,
  addTailoringRequestToCart,
  updateCartItemQty,
  removeCartItem,
  clearCart,
} from './cart.service';

export { cartQueryKeys } from './cart.queryKeys';

export type {
  Cart,
  CartLineItem,
  EnrichedCartLineItem,
  CartSummary,
  AddProductToCartInput,
  AddTailoringRequestToCartInput,
  UpdateCartItemQtyInput,
} from './cart.types';

export { CartError } from './cart.errors';
export type { CartErrorCode } from './cart.errors';
