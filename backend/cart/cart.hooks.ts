/**
 * src/features/cart/cart.hooks.ts
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as service from './cart.service';
import { cartQueryKeys } from './cart.queryKeys';
import type {
  AddProductToCartInput,
  AddTailoringRequestToCartInput,
  UpdateCartItemQtyInput,
} from './cart.types';

export function useCartSummary(customerId: string | undefined) {
  return useQuery({
    queryKey: cartQueryKeys.summary(customerId ?? ''),
    queryFn: () => service.getCartSummary(customerId as string),
    enabled: Boolean(customerId),
  });
}

export function useAddProductToCart() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: AddProductToCartInput) => service.addProductToCart(input),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: cartQueryKeys.forCustomer(variables.customerId) });
    },
  });
}

export function useAddTailoringRequestToCart() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: AddTailoringRequestToCartInput) => service.addTailoringRequestToCart(input),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: cartQueryKeys.forCustomer(variables.customerId) });
    },
  });
}

export function useUpdateCartItemQty(customerId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateCartItemQtyInput) => service.updateCartItemQty(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cartQueryKeys.forCustomer(customerId) });
    },
  });
}

export function useRemoveCartItem(customerId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (cartItemId: string) => service.removeCartItem(cartItemId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cartQueryKeys.forCustomer(customerId) });
    },
  });
}

export function useClearCart() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (customerId: string) => service.clearCart(customerId),
    onSuccess: (_data, customerId) => {
      queryClient.invalidateQueries({ queryKey: cartQueryKeys.forCustomer(customerId) });
    },
  });
}
