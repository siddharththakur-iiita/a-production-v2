/**
 * src/lib/razorpay/razorpay.refund.server.ts
 *
 * SERVER-ONLY. Issues a refund on Razorpay's side. Called AFTER the
 * Orders module's own app_issue_refund RPC (025_refund_atomicity.sql)
 * has already created the authoritative refund/refund_item rows —
 * this function pushes that decision to the payment gateway, it does
 * not decide the refund amount itself. The gateway's own confirmation
 * arrives later via the refund.processed webhook
 * (razorpay.webhookHandlers.server.ts's handleRefundProcessed).
 */
import { z } from 'zod';
import { getRazorpayClient } from './razorpay.client.server';
import { toPaise, fromPaise } from './razorpay.utils';
import { mapRazorpayError, RazorpayError } from './razorpay.errors';
import type { CreateRefundInput, RazorpayRefundResult } from './razorpay.types';

const createRefundSchema = z.object({
  razorpayPaymentId: z.string().min(1),
  amount: z.number().positive().optional(),
  notes: z.record(z.string()).optional(),
});

export async function createRazorpayRefund(input: CreateRefundInput): Promise<RazorpayRefundResult> {
  const parsed = createRefundSchema.safeParse(input);
  if (!parsed.success) {
    const first = parsed.error.errors[0];
    throw new RazorpayError('validation_failed', first?.message ?? 'Invalid refund input.', parsed.error);
  }

  try {
    const client = getRazorpayClient();
    const amountInPaise = parsed.data.amount !== undefined ? toPaise(parsed.data.amount) : undefined;

    const refund = await client.payments.refund(parsed.data.razorpayPaymentId, {
      amount: amountInPaise,
      notes: parsed.data.notes,
    });

    return {
      razorpayRefundId: refund.id,
      amount: fromPaise(Number(refund.amount)),
      amountInPaise: Number(refund.amount),
      status: refund.status,
    };
  } catch (err) {
    throw mapRazorpayError(err);
  }
}
