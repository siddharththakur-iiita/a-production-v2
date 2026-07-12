/**
 * src/features/order/order.repository.ts
 *
 * RLS reminder (016_rls.sql), RLS-5 unless noted:
 *   order/order_item:        owner SELECT only; no client INSERT/UPDATE at all —
 *                             every write happens via app_checkout_cart/app_cancel_order
 *   payment:                 owner SELECT via join; staff write (orders.manage)
 *   payment_transaction:     staff-only SELECT (orders.view_payment_details); no client write
 *   shipment:                owner SELECT via join; staff ALL (orders.fulfill)
 *   shipment_tracking_event: owner SELECT via join; staff ALL (orders.fulfill)
 *   coupon:                  staff-only ALL (marketing.manage); public validation via RPC only
 *   promotion:                staff-only ALL (marketing.manage)
 *   tax_rule:                 staff-only ALL (finance.manage_tax_rules)
 *   invoice:                  owner SELECT via join; staff ALL (orders.manage)
 *   return_request:           owner SELECT/INSERT own; staff ALL (orders.manage_returns)
 *   refund/refund_item:       owner SELECT via join; staff ALL (orders.refund)
 *   order_status_history:     owner/staff SELECT only; no client INSERT (trigger-populated)
 *
 * Note: 'order' is a SQL reserved word but is used here only as a
 * plain string argument to .from('order') — PostgREST addresses
 * tables by name in a URL path, so this is not affected by SQL
 * reserved-word rules the way a bare identifier in a .sql file would be.
 */
import { supabase } from '../../lib/supabase/client';
import { toRange, type PaginationParams } from '../../lib/supabase/queryHelpers';
import type {
  OrderRow,
  OrderItemRow,
  PaymentRow,
  PaymentInsert,
  PaymentTransactionRow,
  ShipmentRow,
  ShipmentInsert,
  ShipmentUpdate,
  ShipmentTrackingEventRow,
  CouponRow,
  CouponInsert,
  CouponUpdate,
  PromotionRow,
  PromotionInsert,
  PromotionUpdate,
  TaxRuleRow,
  TaxRuleInsert,
  InvoiceRow,
  RefundRow,
  RefundItemRow,
  OrderStatusHistoryRow,
  ReturnRequestRow,
  ReturnRequestInsert,
  VMyOrdersRow,
  VStaffOrderQueueRow,
  CheckoutCartArgs,
  ValidateCouponResult,
} from '../../lib/supabase/database.types';

// ---------------------------------------------------------------------
// Checkout / cancellation RPCs (024_checkout_and_order_lifecycle.sql)
// ---------------------------------------------------------------------

export async function checkoutCartRpc(args: CheckoutCartArgs): Promise<OrderRow> {
  const { data, error } = await supabase.rpc('app_checkout_cart', args);
  if (error) throw error;
  return data;
}

export async function cancelOrderRpc(orderId: string, reason?: string): Promise<OrderRow> {
  const { data, error } = await supabase.rpc('app_cancel_order', {
    p_order_id: orderId,
    p_reason: reason ?? null,
  });
  if (error) throw error;
  return data;
}

export async function validateCouponRpc(code: string, orderSubtotal: number): Promise<ValidateCouponResult> {
  const { data, error } = await supabase.rpc('app_validate_coupon', {
    p_code: code,
    p_order_subtotal: orderSubtotal,
  });
  if (error) throw error;
  return data[0];
}

// ---------------------------------------------------------------------
// Order listing / detail
// ---------------------------------------------------------------------

export async function findMyOrders(
  pagination: PaginationParams
): Promise<{ rows: VMyOrdersRow[]; count: number | null }> {
  const [from, to] = toRange(pagination);
  const { data, error, count } = await supabase
    .from('v_my_orders')
    .select('*', { count: 'exact' })
    .order('placed_at', { ascending: false })
    .range(from, to);

  if (error) throw error;
  return { rows: data, count };
}

export async function findOrdersForStaff(
  pagination: PaginationParams
): Promise<{ rows: VStaffOrderQueueRow[]; count: number | null }> {
  const [from, to] = toRange(pagination);
  const { data, error, count } = await supabase
    .from('v_staff_order_queue')
    .select('*', { count: 'exact' })
    .range(from, to);

  if (error) throw error;
  return { rows: data, count };
}

export async function findOrderById(id: string): Promise<OrderRow | null> {
  const { data, error } = await supabase.from('order').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data;
}

/**
 * Staff-only direct status update (order_staff_all RLS, requires
 * orders.manage) — used for the manual fulfillment steps
 * (paid -> in_fulfillment -> shipped) that have no dedicated RPC.
 * Cancellation goes through cancelOrderRpc instead, since that path
 * also needs to restore inventory atomically.
 */
export async function updateOrderStatusRow(id: string, status: OrderRow['status']): Promise<OrderRow> {
  const { data, error } = await supabase.from('order').update({ status }).eq('id', id).select('*').single();
  if (error) throw error;
  return data;
}

export async function findOrderItems(orderId: string): Promise<OrderItemRow[]> {
  const { data, error } = await supabase.from('order_item').select('*').eq('order_id', orderId);
  if (error) throw error;
  return data;
}

export async function findOrderStatusHistory(orderId: string): Promise<OrderStatusHistoryRow[]> {
  const { data, error } = await supabase
    .from('order_status_history')
    .select('*')
    .eq('order_id', orderId)
    .order('changed_at', { ascending: false });
  if (error) throw error;
  return data;
}

// ---------------------------------------------------------------------
// Payment
// ---------------------------------------------------------------------

export async function findPaymentsForOrder(orderId: string): Promise<PaymentRow[]> {
  const { data, error } = await supabase.from('payment').select('*').eq('order_id', orderId);
  if (error) throw error;
  return data;
}

export async function insertPayment(input: PaymentInsert): Promise<PaymentRow> {
  const { data, error } = await supabase.from('payment').insert(input).select('*').single();
  if (error) throw error;
  return data;
}

export async function updatePaymentStatusRow(id: string, status: PaymentRow['status']): Promise<PaymentRow> {
  const { data, error } = await supabase.from('payment').update({ status }).eq('id', id).select('*').single();
  if (error) throw error;
  return data;
}

export async function findPaymentTransactions(paymentId: string): Promise<PaymentTransactionRow[]> {
  const { data, error } = await supabase
    .from('payment_transaction')
    .select('*')
    .eq('payment_id', paymentId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

// ---------------------------------------------------------------------
// Shipment
// ---------------------------------------------------------------------

export async function findShipmentsForOrder(orderId: string): Promise<ShipmentRow[]> {
  const { data, error } = await supabase.from('shipment').select('*').eq('order_id', orderId);
  if (error) throw error;
  return data;
}

export async function findShipmentById(id: string): Promise<ShipmentRow | null> {
  const { data, error } = await supabase.from('shipment').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data;
}

export async function insertShipment(input: ShipmentInsert): Promise<ShipmentRow> {
  const { data, error } = await supabase.from('shipment').insert(input).select('*').single();
  if (error) throw error;
  return data;
}

export async function updateShipmentRow(id: string, patch: ShipmentUpdate): Promise<ShipmentRow> {
  const { data, error } = await supabase.from('shipment').update(patch).eq('id', id).select('*').single();
  if (error) throw error;
  return data;
}

export async function findShipmentTrackingEvents(shipmentId: string): Promise<ShipmentTrackingEventRow[]> {
  const { data, error } = await supabase
    .from('shipment_tracking_event')
    .select('*')
    .eq('shipment_id', shipmentId)
    .order('occurred_at', { ascending: true });
  if (error) throw error;
  return data;
}

// ---------------------------------------------------------------------
// Coupon (staff)
// ---------------------------------------------------------------------

export async function findCoupons(): Promise<CouponRow[]> {
  const { data, error } = await supabase.from('coupon').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function insertCoupon(input: CouponInsert): Promise<CouponRow> {
  const { data, error } = await supabase.from('coupon').insert(input).select('*').single();
  if (error) throw error;
  return data;
}

export async function updateCouponRow(id: string, patch: CouponUpdate): Promise<CouponRow> {
  const { data, error } = await supabase.from('coupon').update(patch).eq('id', id).select('*').single();
  if (error) throw error;
  return data;
}

// ---------------------------------------------------------------------
// Promotion (staff)
// ---------------------------------------------------------------------

export async function findPromotions(): Promise<PromotionRow[]> {
  const { data, error } = await supabase.from('promotion').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function insertPromotion(input: PromotionInsert): Promise<PromotionRow> {
  const { data, error } = await supabase.from('promotion').insert(input).select('*').single();
  if (error) throw error;
  return data;
}

export async function updatePromotionRow(id: string, patch: PromotionUpdate): Promise<PromotionRow> {
  const { data, error } = await supabase.from('promotion').update(patch).eq('id', id).select('*').single();
  if (error) throw error;
  return data;
}

// ---------------------------------------------------------------------
// Tax rule (staff)
// ---------------------------------------------------------------------

export async function findTaxRules(): Promise<TaxRuleRow[]> {
  const { data, error } = await supabase.from('tax_rule').select('*').eq('is_active', true);
  if (error) throw error;
  return data;
}

export async function insertTaxRule(input: TaxRuleInsert): Promise<TaxRuleRow> {
  const { data, error } = await supabase.from('tax_rule').insert(input).select('*').single();
  if (error) throw error;
  return data;
}

// ---------------------------------------------------------------------
// Invoice
// ---------------------------------------------------------------------

export async function findInvoiceForOrder(orderId: string): Promise<InvoiceRow | null> {
  const { data, error } = await supabase.from('invoice').select('*').eq('order_id', orderId).maybeSingle();
  if (error) throw error;
  return data;
}

export async function insertInvoiceForOrder(orderId: string): Promise<InvoiceRow> {
  const { data, error } = await supabase.from('invoice').insert({ order_id: orderId }).select('*').single();
  if (error) throw error;
  return data;
}

// ---------------------------------------------------------------------
// Return request
// ---------------------------------------------------------------------

export async function findReturnRequestsForCustomer(customerId: string): Promise<ReturnRequestRow[]> {
  const { data, error } = await supabase
    .from('return_request')
    .select('*')
    .eq('customer_id', customerId)
    .order('requested_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function findReturnRequestById(id: string): Promise<ReturnRequestRow | null> {
  const { data, error } = await supabase.from('return_request').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data;
}

export async function insertReturnRequest(input: ReturnRequestInsert): Promise<ReturnRequestRow> {
  const { data, error } = await supabase.from('return_request').insert(input).select('*').single();
  if (error) throw error;
  return data;
}

export async function updateReturnRequestStatusRow(
  id: string,
  status: ReturnRequestRow['status']
): Promise<ReturnRequestRow> {
  const { data, error } = await supabase
    .from('return_request')
    .update({ status })
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

// ---------------------------------------------------------------------
// Refund / refund item
// ---------------------------------------------------------------------

export async function findRefundsForOrder(orderId: string): Promise<RefundRow[]> {
  const { data, error } = await supabase.from('refund').select('*').eq('order_id', orderId);
  if (error) throw error;
  return data;
}

/**
 * RPC: app_issue_refund (025_refund_atomicity.sql). The only
 * sanctioned way to create a refund — atomically creates the refund
 * and its refund_item rows in one transaction, computing amount
 * server-side. Deliberately the sole write path for this table; no
 * separate insertRefund/insertRefundItems functions exist here, since
 * a two-call pattern has a real atomicity gap (see that migration's
 * header) this RPC exists specifically to close.
 */
export async function issueRefundRpc(params: {
  orderId: string;
  paymentId: string;
  reason: string;
  lineItems: Array<{ orderItemId: string; qty: number; amount: number }>;
  returnRequestId?: string;
}): Promise<RefundRow> {
  const { data, error } = await supabase.rpc('app_issue_refund', {
    p_order_id: params.orderId,
    p_payment_id: params.paymentId,
    p_reason: params.reason,
    p_line_items: params.lineItems.map((li) => ({
      order_item_id: li.orderItemId,
      qty: li.qty,
      amount: li.amount,
    })),
    p_return_request_id: params.returnRequestId ?? null,
  });
  if (error) throw error;
  return data;
}

export async function updateRefundStatusRow(
  id: string,
  status: RefundRow['status'],
  processedAt?: string
): Promise<RefundRow> {
  const { data, error } = await supabase
    .from('refund')
    .update({ status, processed_at: processedAt })
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

export async function findRefundItems(refundId: string): Promise<RefundItemRow[]> {
  const { data, error } = await supabase.from('refund_item').select('*').eq('refund_id', refundId);
  if (error) throw error;
  return data;
}
