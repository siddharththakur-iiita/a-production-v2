/**
 * src/features/order/order.queryKeys.ts
 */
import type { PaginationParams } from '../../lib/supabase/queryHelpers';

export const orderQueryKeys = {
  all: ['orders'] as const,

  myLists: () => [...orderQueryKeys.all, 'my-list'] as const,
  myList: (pagination: PaginationParams) => [...orderQueryKeys.myLists(), pagination] as const,

  staffLists: () => [...orderQueryKeys.all, 'staff-list'] as const,
  staffList: (pagination: PaginationParams) => [...orderQueryKeys.staffLists(), pagination] as const,

  details: () => [...orderQueryKeys.all, 'detail'] as const,
  detail: (id: string) => [...orderQueryKeys.details(), id] as const,
  statusHistory: (id: string) => [...orderQueryKeys.details(), id, 'status-history'] as const,

  payments: (orderId: string) => [...orderQueryKeys.details(), orderId, 'payments'] as const,
  paymentTransactions: (paymentId: string) => [...orderQueryKeys.all, 'payment-transactions', paymentId] as const,

  shipments: (orderId: string) => [...orderQueryKeys.details(), orderId, 'shipments'] as const,
  shipmentTracking: (shipmentId: string) => [...orderQueryKeys.all, 'shipment-tracking', shipmentId] as const,

  coupons: () => [...orderQueryKeys.all, 'coupons'] as const,
  couponValidation: (code: string, subtotal: number) =>
    [...orderQueryKeys.all, 'coupon-validation', code, subtotal] as const,
  promotions: () => [...orderQueryKeys.all, 'promotions'] as const,
  taxRules: () => [...orderQueryKeys.all, 'tax-rules'] as const,

  invoice: (orderId: string) => [...orderQueryKeys.details(), orderId, 'invoice'] as const,

  myReturnRequests: (customerId: string) => [...orderQueryKeys.all, 'return-requests', customerId] as const,
};
