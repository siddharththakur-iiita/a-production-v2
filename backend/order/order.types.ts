/**
 * src/features/order/order.types.ts
 *
 * Domain types for the Orders module (009_orders.sql, 17 tables) plus
 * the checkout/cancellation workflow (024_checkout_and_order_lifecycle.sql).
 * This module models the complete commerce lifecycle, not CRUD — see
 * order.service.ts for the actual workflow logic (checkout, status
 * transitions, the return-to-refund pipeline, invoice generation).
 */
import type {
  OrderRow,
  OrderStatus,
  OrderType,
  OrderItemRow,
  PaymentRow,
  PaymentStatus,
  PaymentProvider,
  PaymentTransactionRow,
  ShipmentRow,
  ShipmentStatus,
  ShipmentTrackingEventRow,
  CouponRow,
  PromotionRow,
  TaxRuleRow,
  InvoiceRow,
  RefundRow,
  RefundStatus,
  RefundItemRow,
  OrderStatusHistoryRow,
  ReturnRequestRow,
  ReturnRequestStatus,
  VMyOrdersRow,
  VStaffOrderQueueRow,
} from '../../lib/supabase/database.types';

// ---------------------------------------------------------------------
// Order / Order Item
// ---------------------------------------------------------------------

export interface Order {
  id: string;
  customerId: string | null;
  orderNumber: string;
  orderType: OrderType;
  status: OrderStatus;
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  shippingTotal: number;
  grandTotal: number;
  currency: string;
  shippingAddressId: string | null;
  billingAddressId: string | null;
  placedAt: string;
}

export function mapOrderRow(row: OrderRow): Order {
  return {
    id: row.id,
    customerId: row.customer_id,
    orderNumber: row.order_number,
    orderType: row.order_type,
    status: row.status,
    subtotal: Number(row.subtotal),
    discountTotal: Number(row.discount_total),
    taxTotal: Number(row.tax_total),
    shippingTotal: Number(row.shipping_total),
    grandTotal: Number(row.grand_total),
    currency: row.currency,
    shippingAddressId: row.shipping_address_id,
    billingAddressId: row.billing_address_id,
    placedAt: row.placed_at,
  };
}

export interface OrderItem {
  id: string;
  orderId: string;
  productId: string | null;
  variantId: string | null;
  tailoringRequestId: string | null;
  descriptionSnapshot: string;
  qty: number;
  unitPrice: number;
  lineTotal: number;
}

export function mapOrderItemRow(row: OrderItemRow): OrderItem {
  return {
    id: row.id,
    orderId: row.order_id,
    productId: row.product_id,
    variantId: row.variant_id,
    tailoringRequestId: row.tailoring_request_id,
    descriptionSnapshot: row.description_snapshot,
    qty: row.qty,
    unitPrice: Number(row.unit_price),
    lineTotal: Number(row.line_total),
  };
}

export interface OrderSummary {
  id: string;
  orderNumber: string;
  orderType: OrderType;
  status: string;
  grandTotal: number;
  currency: string;
  placedAt: string;
  itemCount: number;
}

export function mapMyOrderRow(row: VMyOrdersRow): OrderSummary {
  return {
    id: row.id,
    orderNumber: row.order_number,
    orderType: row.order_type,
    status: row.status,
    grandTotal: Number(row.grand_total),
    currency: row.currency,
    placedAt: row.placed_at,
    itemCount: row.item_count,
  };
}

export interface StaffOrderSummary extends OrderSummary {
  customerDisplayName: string;
  customerEmail: string | null;
}

export function mapStaffOrderQueueRow(row: VStaffOrderQueueRow): StaffOrderSummary {
  return {
    ...mapMyOrderRow(row),
    customerDisplayName: row.customer_display_name,
    customerEmail: row.customer_email,
  };
}

export interface OrderDetail extends Order {
  items: OrderItem[];
  payments: Payment[];
  shipments: Shipment[];
  invoice: Invoice | null;
  refunds: Refund[];
}

// ---------------------------------------------------------------------
// Payment
// ---------------------------------------------------------------------

export interface Payment {
  id: string;
  orderId: string;
  provider: PaymentProvider;
  status: PaymentStatus;
  amount: number;
  currency: string;
  providerReference: string | null;
}

export function mapPaymentRow(row: PaymentRow): Payment {
  return {
    id: row.id,
    orderId: row.order_id,
    provider: row.provider,
    status: row.status,
    amount: Number(row.amount),
    currency: row.currency,
    providerReference: row.provider_reference,
  };
}

export interface PaymentTransaction {
  id: string;
  paymentId: string;
  transactionType: PaymentTransactionRow['transaction_type'];
  amount: number | null;
  createdAt: string;
}

export function mapPaymentTransactionRow(row: PaymentTransactionRow): PaymentTransaction {
  return {
    id: row.id,
    paymentId: row.payment_id,
    transactionType: row.transaction_type,
    amount: row.amount !== null ? Number(row.amount) : null,
    createdAt: row.created_at,
  };
}

// ---------------------------------------------------------------------
// Shipment
// ---------------------------------------------------------------------

export interface Shipment {
  id: string;
  orderId: string;
  carrier: string | null;
  trackingNumber: string | null;
  status: ShipmentStatus;
  shippedAt: string | null;
  deliveredAt: string | null;
}

export function mapShipmentRow(row: ShipmentRow): Shipment {
  return {
    id: row.id,
    orderId: row.order_id,
    carrier: row.carrier,
    trackingNumber: row.tracking_number,
    status: row.status,
    shippedAt: row.shipped_at,
    deliveredAt: row.delivered_at,
  };
}

export interface ShipmentTrackingEvent {
  id: string;
  shipmentId: string;
  status: string;
  location: string | null;
  occurredAt: string;
}

export function mapShipmentTrackingEventRow(row: ShipmentTrackingEventRow): ShipmentTrackingEvent {
  return {
    id: row.id,
    shipmentId: row.shipment_id,
    status: row.status,
    location: row.location,
    occurredAt: row.occurred_at,
  };
}

// ---------------------------------------------------------------------
// Coupon / Promotion / Tax Rule
// ---------------------------------------------------------------------

export interface Coupon {
  id: string;
  code: string;
  discountType: CouponRow['discount_type'];
  value: number;
  minOrderValue: number | null;
  usageLimit: number | null;
  perCustomerLimit: number | null;
  startsAt: string | null;
  endsAt: string | null;
  status: CouponRow['status'];
}

export function mapCouponRow(row: CouponRow): Coupon {
  return {
    id: row.id,
    code: row.code,
    discountType: row.discount_type,
    value: Number(row.value),
    minOrderValue: row.min_order_value !== null ? Number(row.min_order_value) : null,
    usageLimit: row.usage_limit,
    perCustomerLimit: row.per_customer_limit,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    status: row.status,
  };
}

export interface CouponValidation {
  isValid: boolean;
  reason: string | null;
  couponId: string | null;
  discountType: string | null;
  value: number | null;
}

export interface Promotion {
  id: string;
  name: string;
  rule: Record<string, unknown>;
  startsAt: string | null;
  endsAt: string | null;
  status: PromotionRow['status'];
}

export function mapPromotionRow(row: PromotionRow): Promotion {
  return {
    id: row.id,
    name: row.name,
    rule: row.rule as Record<string, unknown>,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    status: row.status,
  };
}

export interface TaxRule {
  id: string;
  region: string;
  taxType: string;
  rate: number;
  appliesTo: Record<string, unknown> | null;
  isActive: boolean;
}

export function mapTaxRuleRow(row: TaxRuleRow): TaxRule {
  return {
    id: row.id,
    region: row.region,
    taxType: row.tax_type,
    rate: Number(row.rate),
    appliesTo: row.applies_to as Record<string, unknown> | null,
    isActive: row.is_active,
  };
}

// ---------------------------------------------------------------------
// Invoice
// ---------------------------------------------------------------------

export interface Invoice {
  id: string;
  orderId: string;
  invoiceNumber: string;
  issuedAt: string;
  pdfMediaAssetId: string | null;
}

export function mapInvoiceRow(row: InvoiceRow): Invoice {
  return {
    id: row.id,
    orderId: row.order_id,
    invoiceNumber: row.invoice_number,
    issuedAt: row.issued_at,
    pdfMediaAssetId: row.pdf_media_asset_id,
  };
}

// ---------------------------------------------------------------------
// Refund / Return Request
// ---------------------------------------------------------------------

export interface Refund {
  id: string;
  orderId: string;
  paymentId: string;
  returnRequestId: string | null;
  amount: number;
  reason: string;
  status: RefundStatus;
  processedAt: string | null;
}

export function mapRefundRow(row: RefundRow): Refund {
  return {
    id: row.id,
    orderId: row.order_id,
    paymentId: row.payment_id,
    returnRequestId: row.return_request_id,
    amount: Number(row.amount),
    reason: row.reason,
    status: row.status,
    processedAt: row.processed_at,
  };
}

export interface RefundItem {
  id: string;
  refundId: string;
  orderItemId: string;
  qty: number;
  amount: number;
}

export function mapRefundItemRow(row: RefundItemRow): RefundItem {
  return {
    id: row.id,
    refundId: row.refund_id,
    orderItemId: row.order_item_id,
    qty: row.qty,
    amount: Number(row.amount),
  };
}

export interface OrderStatusHistoryEntry {
  id: string;
  orderId: string;
  status: string;
  changedAt: string;
  changedBy: string | null;
  note: string | null;
}

export function mapOrderStatusHistoryRow(row: OrderStatusHistoryRow): OrderStatusHistoryEntry {
  return {
    id: row.id,
    orderId: row.order_id,
    status: row.status,
    changedAt: row.changed_at,
    changedBy: row.changed_by,
    note: row.note,
  };
}

export interface ReturnRequest {
  id: string;
  orderItemId: string;
  customerId: string;
  reason: string;
  status: ReturnRequestStatus;
  returnTrackingNumber: string | null;
  requestedAt: string;
}

export function mapReturnRequestRow(row: ReturnRequestRow): ReturnRequest {
  return {
    id: row.id,
    orderItemId: row.order_item_id,
    customerId: row.customer_id,
    reason: row.reason,
    status: row.status,
    returnTrackingNumber: row.return_tracking_number,
    requestedAt: row.requested_at,
  };
}

// ---------------------------------------------------------------------
// Workflow inputs
// ---------------------------------------------------------------------

export interface CheckoutInput {
  customerId: string;
  cartId: string;
  shippingAddressId: string;
  billingAddressId?: string;
  couponCode?: string;
  shippingTotal?: number;
  warehouseId?: string;
}

export interface CancelOrderInput {
  orderId: string;
  reason?: string;
}

export interface CreateShipmentInput {
  orderId: string;
  carrier?: string;
  trackingNumber?: string;
}

export interface UpdateShipmentStatusInput {
  shipmentId: string;
  status: ShipmentStatus;
}

export interface RequestReturnInput {
  orderItemId: string;
  customerId: string;
  reason: string;
}

export interface IssueRefundInput {
  orderId: string;
  paymentId: string;
  returnRequestId?: string;
  reason: string;
  lineItems: Array<{ orderItemId: string; qty: number; amount: number }>;
}

export interface CreateCouponInput {
  code: string;
  discountType: CouponRow['discount_type'];
  value: number;
  minOrderValue?: number;
  usageLimit?: number;
  perCustomerLimit?: number;
  startsAt?: string;
  endsAt?: string;
}

export interface CreatePromotionInput {
  name: string;
  rule: Record<string, unknown>;
  startsAt?: string;
  endsAt?: string;
}
