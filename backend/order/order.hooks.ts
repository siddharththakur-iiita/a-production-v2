/**
 * src/features/order/order.hooks.ts
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as service from './order.service';
import { orderQueryKeys } from './order.queryKeys';
import type { PaginationParams } from '../../lib/supabase/queryHelpers';
import type { OrderStatus, ReturnRequestStatus } from '../../lib/supabase/database.types';
import type {
  CancelOrderInput,
  CheckoutInput,
  CreateCouponInput,
  CreatePromotionInput,
  CreateShipmentInput,
  IssueRefundInput,
  RequestReturnInput,
  UpdateShipmentStatusInput,
} from './order.types';

export function useCheckout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CheckoutInput) => service.checkout(input),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: orderQueryKeys.myLists() });
      queryClient.invalidateQueries({ queryKey: ['cart', variables.customerId] });
    },
  });
}

export function useCancelOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CancelOrderInput) => service.cancelOrder(input),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: orderQueryKeys.detail(updated.id) });
      queryClient.invalidateQueries({ queryKey: orderQueryKeys.all });
    },
  });
}

export function useAdvanceOrderStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ orderId, targetStatus }: { orderId: string; targetStatus: OrderStatus }) =>
      service.advanceOrderStatus(orderId, targetStatus),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: orderQueryKeys.detail(updated.id) });
      queryClient.invalidateQueries({ queryKey: orderQueryKeys.staffLists() });
    },
  });
}

export function useMyOrders(pagination: PaginationParams = {}) {
  return useQuery({
    queryKey: orderQueryKeys.myList(pagination),
    queryFn: () => service.listMyOrders(pagination),
  });
}

export function useOrdersForStaff(pagination: PaginationParams = {}) {
  return useQuery({
    queryKey: orderQueryKeys.staffList(pagination),
    queryFn: () => service.listOrdersForStaff(pagination),
  });
}

export function useOrderDetail(orderId: string | undefined) {
  return useQuery({
    queryKey: orderQueryKeys.detail(orderId ?? ''),
    queryFn: () => service.getOrderDetail(orderId as string),
    enabled: Boolean(orderId),
  });
}

export function useOrderStatusHistory(orderId: string | undefined) {
  return useQuery({
    queryKey: orderQueryKeys.statusHistory(orderId ?? ''),
    queryFn: () => service.listOrderStatusHistory(orderId as string),
    enabled: Boolean(orderId),
  });
}

export function usePaymentsForOrder(orderId: string | undefined) {
  return useQuery({
    queryKey: orderQueryKeys.payments(orderId ?? ''),
    queryFn: () => service.listPaymentsForOrder(orderId as string),
    enabled: Boolean(orderId),
  });
}

export function usePaymentTransactions(paymentId: string | undefined) {
  return useQuery({
    queryKey: orderQueryKeys.paymentTransactions(paymentId ?? ''),
    queryFn: () => service.listPaymentTransactions(paymentId as string),
    enabled: Boolean(paymentId),
  });
}

export function useShipmentsForOrder(orderId: string | undefined) {
  return useQuery({
    queryKey: orderQueryKeys.shipments(orderId ?? ''),
    queryFn: () => service.listShipmentsForOrder(orderId as string),
    enabled: Boolean(orderId),
  });
}

export function useCreateShipment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateShipmentInput) => service.createShipment(input),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: orderQueryKeys.shipments(variables.orderId) });
    },
  });
}

export function useUpdateShipmentStatus(orderId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateShipmentStatusInput) => service.updateShipmentStatus(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orderQueryKeys.shipments(orderId) });
      queryClient.invalidateQueries({ queryKey: orderQueryKeys.detail(orderId) });
    },
  });
}

export function useShipmentTrackingEvents(shipmentId: string | undefined) {
  return useQuery({
    queryKey: orderQueryKeys.shipmentTracking(shipmentId ?? ''),
    queryFn: () => service.listShipmentTrackingEvents(shipmentId as string),
    enabled: Boolean(shipmentId),
  });
}

export function useCoupons() {
  return useQuery({ queryKey: orderQueryKeys.coupons(), queryFn: () => service.listCoupons() });
}

export function useCreateCoupon() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateCouponInput) => service.createCoupon(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: orderQueryKeys.coupons() }),
  });
}

export function useDeactivateCoupon() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => service.deactivateCoupon(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: orderQueryKeys.coupons() }),
  });
}

export function useValidateCoupon(code: string, orderSubtotal: number) {
  return useQuery({
    queryKey: orderQueryKeys.couponValidation(code, orderSubtotal),
    queryFn: () => service.validateCoupon(code, orderSubtotal),
    enabled: code.trim().length > 0,
  });
}

export function usePromotions() {
  return useQuery({ queryKey: orderQueryKeys.promotions(), queryFn: () => service.listPromotions() });
}

export function useCreatePromotion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreatePromotionInput) => service.createPromotion(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: orderQueryKeys.promotions() }),
  });
}

export function useActiveTaxRules() {
  return useQuery({ queryKey: orderQueryKeys.taxRules(), queryFn: () => service.listActiveTaxRules() });
}

export function useInvoiceForOrder(orderId: string | undefined) {
  return useQuery({
    queryKey: orderQueryKeys.invoice(orderId ?? ''),
    queryFn: () => service.getInvoiceForOrder(orderId as string),
    enabled: Boolean(orderId),
  });
}

export function useGenerateInvoice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (orderId: string) => service.generateInvoiceForOrder(orderId),
    onSuccess: (_data, orderId) => {
      queryClient.invalidateQueries({ queryKey: orderQueryKeys.invoice(orderId) });
    },
  });
}

export function useMyReturnRequests(customerId: string | undefined) {
  return useQuery({
    queryKey: orderQueryKeys.myReturnRequests(customerId ?? ''),
    queryFn: () => service.listMyReturnRequests(customerId as string),
    enabled: Boolean(customerId),
  });
}

export function useRequestReturn() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: RequestReturnInput) => service.requestReturn(input),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: orderQueryKeys.myReturnRequests(variables.customerId) });
    },
  });
}

export function useAdvanceReturnRequestStatus(customerId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      returnRequestId,
      targetStatus,
    }: {
      returnRequestId: string;
      targetStatus: ReturnRequestStatus;
    }) => service.advanceReturnRequestStatus(returnRequestId, targetStatus),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orderQueryKeys.myReturnRequests(customerId) });
    },
  });
}

export function useIssueRefund(orderId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: IssueRefundInput) => service.issueRefund(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orderQueryKeys.detail(orderId) });
    },
  });
}

export function useMarkRefundProcessed(orderId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (refundId: string) => service.markRefundProcessed(refundId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orderQueryKeys.detail(orderId) });
      queryClient.invalidateQueries({ queryKey: orderQueryKeys.payments(orderId) });
    },
  });
}
