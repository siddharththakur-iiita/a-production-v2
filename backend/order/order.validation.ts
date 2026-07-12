/**
 * src/features/order/order.validation.ts
 *
 * Mirrors the CHECK constraints and business rules in 009_orders.sql
 * and 024_checkout_and_order_lifecycle.sql.
 */
import { z } from 'zod';

export const checkoutSchema = z.object({
  customerId: z.string().uuid(),
  cartId: z.string().uuid(),
  shippingAddressId: z.string().uuid(),
  billingAddressId: z.string().uuid().optional(),
  couponCode: z.string().min(1).max(50).optional(),
  shippingTotal: z.number().min(0).optional(),
  warehouseId: z.string().uuid().optional(),
});

export const cancelOrderSchema = z.object({
  orderId: z.string().uuid(),
  reason: z.string().max(500).optional(),
});

const shipmentStatusSchema = z.enum([
  'pending',
  'picked_up',
  'in_transit',
  'out_for_delivery',
  'delivered',
  'failed_delivery',
]);

export const createShipmentSchema = z.object({
  orderId: z.string().uuid(),
  carrier: z.string().max(100).optional(),
  trackingNumber: z.string().max(100).optional(),
});

export const updateShipmentStatusSchema = z.object({
  shipmentId: z.string().uuid(),
  status: shipmentStatusSchema,
});

export const requestReturnSchema = z.object({
  orderItemId: z.string().uuid(),
  customerId: z.string().uuid(),
  reason: z.string().min(1, 'A return reason is required').max(1000),
});

export const issueRefundSchema = z.object({
  orderId: z.string().uuid(),
  paymentId: z.string().uuid(),
  returnRequestId: z.string().uuid().optional(),
  reason: z.string().min(1, 'A refund reason is required').max(500),
  lineItems: z
    .array(
      z.object({
        orderItemId: z.string().uuid(),
        qty: z.number().int().min(1),
        amount: z.number().min(0),
      })
    )
    .min(1, 'At least one line item must be included in the refund'),
});

export const createCouponSchema = z
  .object({
    code: z.string().min(1, 'Code is required').max(50),
    discountType: z.enum(['percent', 'fixed']),
    value: z.number().positive('Value must be greater than 0'),
    minOrderValue: z.number().min(0).optional(),
    usageLimit: z.number().int().positive().optional(),
    perCustomerLimit: z.number().int().positive().optional(),
    startsAt: z.string().datetime().optional(),
    endsAt: z.string().datetime().optional(),
  })
  .refine((data) => data.discountType !== 'percent' || data.value <= 100, {
    message: 'A percent-type coupon value cannot exceed 100',
    path: ['value'],
  })
  .refine(
    (data) => !data.startsAt || !data.endsAt || new Date(data.endsAt) >= new Date(data.startsAt),
    { message: 'endsAt must be on or after startsAt', path: ['endsAt'] }
  );

export const createPromotionSchema = z
  .object({
    name: z.string().min(1, 'Name is required').max(200),
    rule: z.record(z.unknown()),
    startsAt: z.string().datetime().optional(),
    endsAt: z.string().datetime().optional(),
  })
  .refine(
    (data) => !data.startsAt || !data.endsAt || new Date(data.endsAt) >= new Date(data.startsAt),
    { message: 'endsAt must be on or after startsAt', path: ['endsAt'] }
  );

export const validateCouponSchema = z.object({
  code: z.string().min(1),
  orderSubtotal: z.number().min(0),
});

export type CheckoutValidated = z.infer<typeof checkoutSchema>;
export type CancelOrderValidated = z.infer<typeof cancelOrderSchema>;
export type IssueRefundValidated = z.infer<typeof issueRefundSchema>;
export type CreateCouponValidated = z.infer<typeof createCouponSchema>;
export type CreatePromotionValidated = z.infer<typeof createPromotionSchema>;
