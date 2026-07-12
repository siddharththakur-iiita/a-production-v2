/**
 * src/features/order/order.service.ts
 *
 * The commerce lifecycle workflows: checkout, cancellation, staff
 * fulfillment progression, shipment tracking, the return-to-refund
 * pipeline, coupon/promotion/tax-rule management, and invoicing.
 *
 * Status-transition state machines below are application-layer
 * business rules — the frozen schema's own CHECK constraints only
 * restrict status to a fixed *set* of values, not valid *transitions*
 * between them (a known, deliberately deferred gap — see Architecture
 * Review Notes Section 4.3 / this project's Production Readiness
 * Review). Enforcing transitions here, rather than adding a new
 * SQL-level state-transition table, is the correct scope for this
 * pass: it is real business-workflow logic, not a database redesign,
 * and matches the "avoid over-engineering" principle already applied
 * throughout this schema.
 */
import * as repo from './order.repository';
import {
  mapOrderRow,
  mapOrderItemRow,
  mapMyOrderRow,
  mapStaffOrderQueueRow,
  mapPaymentRow,
  mapPaymentTransactionRow,
  mapShipmentRow,
  mapShipmentTrackingEventRow,
  mapCouponRow,
  mapPromotionRow,
  mapTaxRuleRow,
  mapInvoiceRow,
  mapRefundRow,
  mapRefundItemRow,
  mapOrderStatusHistoryRow,
  mapReturnRequestRow,
  type Order,
  type OrderDetail,
  type OrderSummary,
  type StaffOrderSummary,
  type Payment,
  type PaymentTransaction,
  type Shipment,
  type ShipmentTrackingEvent,
  type Coupon,
  type CouponValidation,
  type Promotion,
  type TaxRule,
  type Invoice,
  type Refund,
  type RefundItem,
  type OrderStatusHistoryEntry,
  type ReturnRequest,
  type CheckoutInput,
  type CancelOrderInput,
  type CreateShipmentInput,
  type UpdateShipmentStatusInput,
  type RequestReturnInput,
  type IssueRefundInput,
  type CreateCouponInput,
  type CreatePromotionInput,
} from './order.types';
import {
  checkoutSchema,
  cancelOrderSchema,
  createShipmentSchema,
  updateShipmentStatusSchema,
  requestReturnSchema,
  issueRefundSchema,
  createCouponSchema,
  createPromotionSchema,
  validateCouponSchema,
} from './order.validation';
import { OrderError, mapOrderPostgrestError, mapOrderZodError } from './order.errors';
import { toPaginatedResult, type PaginatedResult, type PaginationParams } from '../../lib/supabase/queryHelpers';
import type { OrderStatus, ShipmentStatus, ReturnRequestStatus } from '../../lib/supabase/database.types';

// =======================================================================
// Checkout / Cancellation
// =======================================================================

export async function checkout(input: CheckoutInput): Promise<Order> {
  const parsed = checkoutSchema.safeParse(input);
  if (!parsed.success) throw mapOrderZodError(parsed.error);

  try {
    const row = await repo.checkoutCartRpc({
      p_customer_id: parsed.data.customerId,
      p_cart_id: parsed.data.cartId,
      p_shipping_address_id: parsed.data.shippingAddressId,
      p_billing_address_id: parsed.data.billingAddressId,
      p_coupon_code: parsed.data.couponCode,
      p_shipping_total: parsed.data.shippingTotal,
      p_warehouse_id: parsed.data.warehouseId,
    });
    return mapOrderRow(row);
  } catch (err) {
    throw mapOrderPostgrestError(err as never);
  }
}

/** Cancellation always goes through the RPC (inventory restoration) — never a direct status update. */
export async function cancelOrder(input: CancelOrderInput): Promise<Order> {
  const parsed = cancelOrderSchema.safeParse(input);
  if (!parsed.success) throw mapOrderZodError(parsed.error);

  try {
    const row = await repo.cancelOrderRpc(parsed.data.orderId, parsed.data.reason);
    return mapOrderRow(row);
  } catch (err) {
    throw mapOrderPostgrestError(err as never);
  }
}

// =======================================================================
// Order status lifecycle (staff-driven manual fulfillment progression)
// =======================================================================

const ORDER_STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending_payment: ['paid', 'cancelled'],
  paid: ['in_fulfillment', 'cancelled'],
  in_fulfillment: ['shipped'],
  shipped: ['delivered'],
  delivered: ['closed', 'returned'],
  closed: [],
  returned: ['refunded'],
  refunded: [],
  cancelled: [],
};

/**
 * Advances an order's status through the manual fulfillment steps
 * (paid -> in_fulfillment -> shipped -> delivered -> closed) that have
 * no dedicated RPC — shipment reaching 'delivered' already advances
 * order.status automatically via trg_shipment_status_change
 * (009_orders.sql), so this function is primarily for the
 * paid -> in_fulfillment step and manual corrections. Rejects
 * 'cancelled' as a target — use cancelOrder() instead, which also
 * restores inventory atomically.
 */
export async function advanceOrderStatus(orderId: string, targetStatus: OrderStatus): Promise<Order> {
  if (targetStatus === 'cancelled') {
    throw new OrderError(
      'validation_failed',
      'Use cancelOrder() to cancel an order — it also restores any reserved inventory.'
    );
  }

  const current = await repo.findOrderById(orderId);
  if (!current) {
    throw new OrderError('order_not_found', 'Order not found.');
  }

  const allowedNext = ORDER_STATUS_TRANSITIONS[current.status];
  if (!allowedNext.includes(targetStatus)) {
    throw new OrderError(
      'validation_failed',
      `Cannot move an order from "${current.status}" to "${targetStatus}".`
    );
  }

  try {
    const row = await repo.updateOrderStatusRow(orderId, targetStatus);
    return mapOrderRow(row);
  } catch (err) {
    throw mapOrderPostgrestError(err as never);
  }
}

// =======================================================================
// Order listing / detail
// =======================================================================

export async function listMyOrders(pagination: PaginationParams = {}): Promise<PaginatedResult<OrderSummary>> {
  try {
    const { rows, count } = await repo.findMyOrders(pagination);
    return toPaginatedResult(rows.map(mapMyOrderRow), count, pagination);
  } catch (err) {
    throw mapOrderPostgrestError(err as never);
  }
}

export async function listOrdersForStaff(
  pagination: PaginationParams = {}
): Promise<PaginatedResult<StaffOrderSummary>> {
  try {
    const { rows, count } = await repo.findOrdersForStaff(pagination);
    return toPaginatedResult(rows.map(mapStaffOrderQueueRow), count, pagination);
  } catch (err) {
    throw mapOrderPostgrestError(err as never);
  }
}

export async function getOrderDetail(orderId: string): Promise<OrderDetail | null> {
  try {
    const orderRow = await repo.findOrderById(orderId);
    if (!orderRow) return null;

    const [itemRows, paymentRows, shipmentRows, invoiceRow, refundRows] = await Promise.all([
      repo.findOrderItems(orderId),
      repo.findPaymentsForOrder(orderId),
      repo.findShipmentsForOrder(orderId),
      repo.findInvoiceForOrder(orderId),
      repo.findRefundsForOrder(orderId),
    ]);

    return {
      ...mapOrderRow(orderRow),
      items: itemRows.map(mapOrderItemRow),
      payments: paymentRows.map(mapPaymentRow),
      shipments: shipmentRows.map(mapShipmentRow),
      invoice: invoiceRow ? mapInvoiceRow(invoiceRow) : null,
      refunds: refundRows.map(mapRefundRow),
    };
  } catch (err) {
    throw mapOrderPostgrestError(err as never);
  }
}

export async function listOrderStatusHistory(orderId: string): Promise<OrderStatusHistoryEntry[]> {
  try {
    const rows = await repo.findOrderStatusHistory(orderId);
    return rows.map(mapOrderStatusHistoryRow);
  } catch (err) {
    throw mapOrderPostgrestError(err as never);
  }
}

// =======================================================================
// Payment (staff-assisted recording; real gateway confirmation is a
// server-side/webhook concern outside this browser-client module —
// see auth's adminClient.server.ts precedent)
// =======================================================================

export async function listPaymentsForOrder(orderId: string): Promise<Payment[]> {
  try {
    const rows = await repo.findPaymentsForOrder(orderId);
    return rows.map(mapPaymentRow);
  } catch (err) {
    throw mapOrderPostgrestError(err as never);
  }
}

export async function listPaymentTransactions(paymentId: string): Promise<PaymentTransaction[]> {
  try {
    const rows = await repo.findPaymentTransactions(paymentId);
    return rows.map(mapPaymentTransactionRow);
  } catch (err) {
    throw mapOrderPostgrestError(err as never);
  }
}

// =======================================================================
// Shipment
// =======================================================================

const SHIPMENT_STATUS_TRANSITIONS: Record<ShipmentStatus, ShipmentStatus[]> = {
  pending: ['picked_up', 'failed_delivery'],
  picked_up: ['in_transit', 'failed_delivery'],
  in_transit: ['out_for_delivery', 'failed_delivery'],
  out_for_delivery: ['delivered', 'failed_delivery'],
  delivered: [],
  failed_delivery: ['picked_up', 'in_transit'], // reattempt after a failed delivery
};

export async function listShipmentsForOrder(orderId: string): Promise<Shipment[]> {
  try {
    const rows = await repo.findShipmentsForOrder(orderId);
    return rows.map(mapShipmentRow);
  } catch (err) {
    throw mapOrderPostgrestError(err as never);
  }
}

export async function createShipment(input: CreateShipmentInput): Promise<Shipment> {
  const parsed = createShipmentSchema.safeParse(input);
  if (!parsed.success) throw mapOrderZodError(parsed.error);

  try {
    const row = await repo.insertShipment({
      order_id: parsed.data.orderId,
      carrier: parsed.data.carrier,
      tracking_number: parsed.data.trackingNumber,
    });
    return mapShipmentRow(row);
  } catch (err) {
    throw mapOrderPostgrestError(err as never);
  }
}

/**
 * Advances a shipment's status, validated against
 * SHIPMENT_STATUS_TRANSITIONS. Reaching 'delivered' additionally
 * updates the parent order.status automatically via
 * trg_shipment_status_change (009_orders.sql) — this function only
 * writes shipment.status and does not duplicate that.
 */
export async function updateShipmentStatus(input: UpdateShipmentStatusInput): Promise<Shipment> {
  const parsed = updateShipmentStatusSchema.safeParse(input);
  if (!parsed.success) throw mapOrderZodError(parsed.error);

  const current = await repo.findShipmentById(parsed.data.shipmentId);
  if (!current) {
    throw new OrderError('order_not_found', 'Shipment not found.');
  }

  const allowedNext = SHIPMENT_STATUS_TRANSITIONS[current.status];
  if (!allowedNext.includes(parsed.data.status)) {
    throw new OrderError(
      'validation_failed',
      `Cannot move a shipment from "${current.status}" to "${parsed.data.status}".`
    );
  }

  try {
    const row = await repo.updateShipmentRow(parsed.data.shipmentId, { status: parsed.data.status });
    return mapShipmentRow(row);
  } catch (err) {
    throw mapOrderPostgrestError(err as never);
  }
}

export async function listShipmentTrackingEvents(shipmentId: string): Promise<ShipmentTrackingEvent[]> {
  try {
    const rows = await repo.findShipmentTrackingEvents(shipmentId);
    return rows.map(mapShipmentTrackingEventRow);
  } catch (err) {
    throw mapOrderPostgrestError(err as never);
  }
}

// =======================================================================
// Coupon / Promotion / Tax Rule (staff management)
// =======================================================================

export async function listCoupons(): Promise<Coupon[]> {
  try {
    const rows = await repo.findCoupons();
    return rows.map(mapCouponRow);
  } catch (err) {
    throw mapOrderPostgrestError(err as never);
  }
}

export async function createCoupon(input: CreateCouponInput): Promise<Coupon> {
  const parsed = createCouponSchema.safeParse(input);
  if (!parsed.success) throw mapOrderZodError(parsed.error);

  try {
    const row = await repo.insertCoupon({
      code: parsed.data.code,
      discount_type: parsed.data.discountType,
      value: parsed.data.value.toString(),
      min_order_value: parsed.data.minOrderValue?.toString(),
      usage_limit: parsed.data.usageLimit,
      per_customer_limit: parsed.data.perCustomerLimit,
      starts_at: parsed.data.startsAt,
      ends_at: parsed.data.endsAt,
    });
    return mapCouponRow(row);
  } catch (err) {
    throw mapOrderPostgrestError(err as never);
  }
}

export async function deactivateCoupon(id: string): Promise<Coupon> {
  try {
    const row = await repo.updateCouponRow(id, { status: 'paused' });
    return mapCouponRow(row);
  } catch (err) {
    throw mapOrderPostgrestError(err as never);
  }
}

/** Public-facing coupon validation, via app_validate_coupon RPC (009_orders.sql) — no direct table read. */
export async function validateCoupon(code: string, orderSubtotal: number): Promise<CouponValidation> {
  const parsed = validateCouponSchema.safeParse({ code, orderSubtotal });
  if (!parsed.success) throw mapOrderZodError(parsed.error);

  try {
    const result = await repo.validateCouponRpc(parsed.data.code, parsed.data.orderSubtotal);
    return {
      isValid: result.is_valid,
      reason: result.reason,
      couponId: result.coupon_id,
      discountType: result.discount_type,
      value: result.value,
    };
  } catch (err) {
    throw mapOrderPostgrestError(err as never);
  }
}

export async function listPromotions(): Promise<Promotion[]> {
  try {
    const rows = await repo.findPromotions();
    return rows.map(mapPromotionRow);
  } catch (err) {
    throw mapOrderPostgrestError(err as never);
  }
}

export async function createPromotion(input: CreatePromotionInput): Promise<Promotion> {
  const parsed = createPromotionSchema.safeParse(input);
  if (!parsed.success) throw mapOrderZodError(parsed.error);

  try {
    const row = await repo.insertPromotion({
      name: parsed.data.name,
      rule: parsed.data.rule,
      starts_at: parsed.data.startsAt,
      ends_at: parsed.data.endsAt,
    });
    return mapPromotionRow(row);
  } catch (err) {
    throw mapOrderPostgrestError(err as never);
  }
}

export async function listActiveTaxRules(): Promise<TaxRule[]> {
  try {
    const rows = await repo.findTaxRules();
    return rows.map(mapTaxRuleRow);
  } catch (err) {
    throw mapOrderPostgrestError(err as never);
  }
}

// =======================================================================
// Invoice
// =======================================================================

export async function getInvoiceForOrder(orderId: string): Promise<Invoice | null> {
  try {
    const row = await repo.findInvoiceForOrder(orderId);
    return row ? mapInvoiceRow(row) : null;
  } catch (err) {
    throw mapOrderPostgrestError(err as never);
  }
}

/**
 * Generates the invoice for an order. Idempotent from the caller's
 * perspective — if an invoice already exists (invoice_order_id_key
 * UNIQUE, 009_orders.sql), the existing one is returned rather than
 * attempting (and failing) a duplicate insert.
 */
export async function generateInvoiceForOrder(orderId: string): Promise<Invoice> {
  const existing = await getInvoiceForOrder(orderId);
  if (existing) return existing;

  try {
    const row = await repo.insertInvoiceForOrder(orderId);
    return mapInvoiceRow(row);
  } catch (err) {
    throw mapOrderPostgrestError(err as never);
  }
}

// =======================================================================
// Return / Refund pipeline
// =======================================================================

const RETURN_REQUEST_STATUS_TRANSITIONS: Record<ReturnRequestStatus, ReturnRequestStatus[]> = {
  requested: ['approved', 'rejected'],
  approved: ['item_received'],
  item_received: ['inspected'],
  inspected: ['refund_issued', 'exchanged'],
  rejected: [],
  refund_issued: [],
  exchanged: [],
};

export async function listMyReturnRequests(customerId: string): Promise<ReturnRequest[]> {
  try {
    const rows = await repo.findReturnRequestsForCustomer(customerId);
    return rows.map(mapReturnRequestRow);
  } catch (err) {
    throw mapOrderPostgrestError(err as never);
  }
}

export async function requestReturn(input: RequestReturnInput): Promise<ReturnRequest> {
  const parsed = requestReturnSchema.safeParse(input);
  if (!parsed.success) throw mapOrderZodError(parsed.error);

  try {
    const row = await repo.insertReturnRequest({
      order_item_id: parsed.data.orderItemId,
      customer_id: parsed.data.customerId,
      reason: parsed.data.reason,
    });
    return mapReturnRequestRow(row);
  } catch (err) {
    throw mapOrderPostgrestError(err as never);
  }
}

/**
 * Advances a return_request's status, validated against
 * RETURN_REQUEST_STATUS_TRANSITIONS — the same class of
 * application-layer state machine as ORDER_STATUS_TRANSITIONS /
 * SHIPMENT_STATUS_TRANSITIONS above, for the same reason (the schema
 * restricts the value set, not the transition graph).
 */
export async function advanceReturnRequestStatus(
  returnRequestId: string,
  targetStatus: ReturnRequestStatus
): Promise<ReturnRequest> {
  const current = await repo.findReturnRequestById(returnRequestId);
  if (!current) {
    throw new OrderError('order_not_found', 'Return request not found.');
  }

  const allowedNext = RETURN_REQUEST_STATUS_TRANSITIONS[current.status];
  if (!allowedNext.includes(targetStatus)) {
    throw new OrderError(
      'validation_failed',
      `Cannot move a return request from "${current.status}" to "${targetStatus}".`
    );
  }

  try {
    const row = await repo.updateReturnRequestStatusRow(returnRequestId, targetStatus);
    return mapReturnRequestRow(row);
  } catch (err) {
    throw mapOrderPostgrestError(err as never);
  }
}

/**
 * Issues a refund via the atomic app_issue_refund RPC
 * (025_refund_atomicity.sql) — never via separate refund/refund_item
 * inserts, which have a real atomicity gap (see that migration's
 * header and order.repository.ts's issueRefundRpc docstring). If
 * returnRequestId is provided, also advances that return request to
 * 'refund_issued' as a second, separate call — the return_request
 * status update is not itself financially sensitive enough to require
 * being in the same DB transaction as the refund creation, unlike
 * refund/refund_item.
 */
export async function issueRefund(input: IssueRefundInput): Promise<{ refund: Refund; items: RefundItem[] }> {
  const parsed = issueRefundSchema.safeParse(input);
  if (!parsed.success) throw mapOrderZodError(parsed.error);

  try {
    const refundRow = await repo.issueRefundRpc({
      orderId: parsed.data.orderId,
      paymentId: parsed.data.paymentId,
      reason: parsed.data.reason,
      lineItems: parsed.data.lineItems,
      returnRequestId: parsed.data.returnRequestId,
    });

    if (parsed.data.returnRequestId) {
      await advanceReturnRequestStatus(parsed.data.returnRequestId, 'refund_issued');
    }

    const itemRows = await repo.findRefundItems(refundRow.id);
    return { refund: mapRefundRow(refundRow), items: itemRows.map(mapRefundItemRow) };
  } catch (err) {
    if (err instanceof OrderError) throw err;
    throw mapOrderPostgrestError(err as never);
  }
}

/** Marks a refund as processed (e.g. once the gateway confirms) — trg_refund_status_change (009_orders.sql) then updates the parent payment.status automatically. */
export async function markRefundProcessed(refundId: string): Promise<Refund> {
  try {
    const row = await repo.updateRefundStatusRow(refundId, 'processed', new Date().toISOString());
    return mapRefundRow(row);
  } catch (err) {
    throw mapOrderPostgrestError(err as never);
  }
}
