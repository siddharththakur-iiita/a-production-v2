/**
 * src/features/cart/cart.queryKeys.ts
 */
export const cartQueryKeys = {
  all: ['cart'] as const,
  forCustomer: (customerId: string) => [...cartQueryKeys.all, customerId] as const,
  summary: (customerId: string) => [...cartQueryKeys.forCustomer(customerId), 'summary'] as const,
};
