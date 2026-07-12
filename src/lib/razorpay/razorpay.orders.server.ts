/**
 * src/lib/razorpay/razorpay.orders.server.ts
 *
 * SERVER-ONLY. Creates a Razorpay Order — the object the client-side
 * Razorpay Checkout widget needs to open its payment sheet. This is
 * distinct from, and created for, our own public."order" row
 * (009_orders.sql); the two are linked via razorpay's own `receipt`
 * field, set to our order.id.
 */
import { z } from 'zod';
import { getRazorpayClient } from './razorpay.client.server';
import { toPaise } from './razorpay.utils';
import { mapRazorpayError, RazorpayError } from './razorpay.errors';
import type { CreatePaymentOrderInput, RazorpayOrderResult } from './razorpay.types';

const createPaymentOrderSchema = z.object({
  amount: z.number().positive('amount must be greater than 0'),
  currency: z.string().length(3),
  orderId: z.string().uuid(),
  notes: z.record(z.string()).optional(),
});

export async function createPaymentOrder(input: CreatePaymentOrderInput): Promise<RazorpayOrderResult> {
  const parsed = createPaymentOrderSchema.safeParse(input);
  if (!parsed.success) {
    const first = parsed.error.errors[0];
    throw new RazorpayError('validation_failed', first?.message ?? 'Invalid payment order input.', parsed.error);
  }

  try {
    const client = getRazorpayClient();
    const amountInPaise = toPaise(parsed.data.amount);

    const razorpayOrder = await client.orders.create({
      amount: amountInPaise,
      currency: parsed.data.currency,
      receipt: parsed.data.orderId,
      notes: parsed.data.notes,
    });

    return {
      razorpayOrderId: razorpayOrder.id,
      amount: parsed.data.amount,
      amountInPaise,
      currency: razorpayOrder.currency,
      receipt: razorpayOrder.receipt ?? null,
      status: razorpayOrder.status,
    };
  } catch (err) {
    throw mapRazorpayError(err);
  }
}
