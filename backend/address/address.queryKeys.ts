/**
 * src/features/address/address.queryKeys.ts
 */
export const addressQueryKeys = {
  all: ['addresses'] as const,
  forCustomer: (customerId: string) => [...addressQueryKeys.all, 'customer', customerId] as const,
  detail: (id: string) => [...addressQueryKeys.all, 'detail', id] as const,
};
