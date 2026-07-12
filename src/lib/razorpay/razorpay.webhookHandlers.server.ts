/**
 * src/lib/razorpay/razorpay.webhookHandlers.server.ts
 *
 * SERVER-ONLY. The actual database side-effects of a verified
 * Razorpay webhook event. Deliberately does NOT call into the Orders
 * module's order.service.ts/order.repository.ts — those are built
 * around an authenticated BROWSER client under RLS (016_rls.sql's
 * payment_staff_write, gated on orders.manage), which is the wrong
 * trust model for a server-to-server webhook with no staff session at
 * all. Instead, this reuses the EXISTING createAdminClient()
 * (supabase/adminClient.server.ts) directly — the same pattern every
 * other privileged, non-interactive server operation in this codebase
 * already follows. This does not modify or duplicate the Orders
 * module; it is a legitimate, separate write path for a genuinely
 * different caller (a webhook, not a logged-in user).
 *
 * Verified against 009_orders.sql: trg_payment_propagate_order_status_trigger
 * fires `AFTER INSERT OR UPDATE OF status ON payment`, so every write
 * here that touches payment.status automatically propagates to
 * order.status (captured -> paid; failed -> a payment_failed
 * notification is enqueued) without this file needing to update
 * "order" directly or duplicate that logic.
 */
import { createAdminClient } from '../supabase/adminClient.server';
import { toPaise, fromPaise } from './razorpay.utils';
import { RazorpayError } from './razorpay.errors';
import type { RazorpayPaymentEntity, RazorpayRefundEntity } from './razorpay.types';

/**
 * Records the initial payment attempt at checkout time, before
 * redirecting to the Razorpay Checkout widget — provider_reference is
 * set to the Razorpay order id so the later webhook can look this row
 * back up by that id alone, without a second call to Razorpay's API.
 */
export async function recordInitiatedPayment(params: {
  orderId: string;
  razorpayOrderId: string;
  amount: number;
  currency: string;
}): Promise<{ paymentId: string }> {
  const admin = createAdminClient();

  const { data, error } = await admin
    .from('payment')
    .insert({
      order_id: params.orderId,
      provider: 'razorpay',
      status: 'initiated',
      amount: params.amount.toFixed(2),
      currency: params.currency,
      provider_reference: params.razorpayOrderId,
    })
    .select('id')
    .single();

  if (error) throw error;
  return { paymentId: data.id };
}

/**
 * Handles a payment.captured webhook event: finds the payment row by
 * its stored provider_reference (the Razorpay order id — stable for
 * this payment's entire lifecycle; see the idempotency note below),
 * verifies the captured amount matches what we expect (never trusts
 * Razorpay's reported amount blindly), updates payment.status, and
 * logs a payment_transaction row for audit.
 *
 * Idempotent against Razorpay's documented at-least-once webhook
 * delivery: if payment.status is already 'captured', this is a retry
 * of an already-processed event — returns early as a no-op rather
 * than re-inserting a duplicate payment_transaction row. Also
 * critically does NOT overwrite provider_reference with entity.id —
 * doing so would change the lookup key this same query depends on,
 * so a genuine retry of this exact event would fail to find the
 * payment row at all on its second delivery (a real bug caught while
 * writing this fix) instead of resolving as the no-op it should be.
 */
export async function handlePaymentCaptured(entity: RazorpayPaymentEntity, rawPayload: unknown): Promise<void> {
  const admin = createAdminClient();

  const { data: payment, error: findError } = await admin
    .from('payment')
    .select('id, order_id, amount, status')
    .eq('provider_reference', entity.order_id)
    .maybeSingle();

  if (findError) throw findError;
  if (!payment) {
    throw new RazorpayError(
      'validation_failed',
      `No payment row found for Razorpay order ${entity.order_id} — was recordInitiatedPayment ever called for this checkout?`
    );
  }

  if (payment.status === 'captured') {
    return; // already processed — a webhook retry, not an error
  }

  const expectedPaise = toPaise(Number(payment.amount));
  if (Math.abs(expectedPaise - entity.amount) > 1) {
    throw new RazorpayError(
      'amount_mismatch',
      `Captured amount (${entity.amount} paise) does not match expected amount (${expectedPaise} paise) for payment ${payment.id}.`
    );
  }

  const { error: updatePaymentError } = await admin.from('payment').update({ status: 'captured' }).eq('id', payment.id);
  if (updatePaymentError) throw updatePaymentError;

  const { error: transactionError } = await admin.from('payment_transaction').insert({
    payment_id: payment.id,
    transaction_type: 'webhook_event',
    amount: fromPaise(entity.amount).toFixed(2),
    provider_payload: rawPayload as never,
  });
  if (transactionError) throw transactionError;
}

/**
 * Same idempotency reasoning as handlePaymentCaptured — a retried
 * failed-payment webhook is a no-op, not a re-log.
 */
export async function handlePaymentFailed(entity: RazorpayPaymentEntity, rawPayload: unknown): Promise<void> {
  const admin = createAdminClient();

  const { data: payment, error: findError } = await admin
    .from('payment')
    .select('id, status')
    .eq('provider_reference', entity.order_id)
    .maybeSingle();

  if (findError) throw findError;
  if (!payment) {
    throw new RazorpayError('validation_failed', `No payment row found for Razorpay order ${entity.order_id}.`);
  }

  if (payment.status === 'failed') {
    return; // already processed — a webhook retry, not an error
  }

  const { error: updateError } = await admin.from('payment').update({ status: 'failed' }).eq('id', payment.id);
  if (updateError) throw updateError;

  const { error: transactionError } = await admin.from('payment_transaction').insert({
    payment_id: payment.id,
    transaction_type: 'webhook_event',
    amount: null,
    provider_payload: rawPayload as never,
  });
  if (transactionError) throw transactionError;
}

/**
 * Handles a refund.processed webhook event — records the gateway-side
 * confirmation as a payment_transaction row. The refund/refund_item
 * DB rows themselves are created by the Orders module's
 * app_issue_refund RPC (025_refund_atomicity.sql) at the point staff
 * *initiate* the refund, before Razorpay ever processes it; this
 * handler only logs the gateway's own confirmation for audit — it
 * does not create or duplicate refund rows.
 */
export async function handleRefundProcessed(entity: RazorpayRefundEntity, rawPayload: unknown): Promise<void> {
  const admin = createAdminClient();

  const { data: payment, error: findError } = await admin
    .from('payment')
    .select('id')
    .eq('provider_reference', entity.payment_id)
    .maybeSingle();

  if (findError) throw findError;
  if (!payment) {
    throw new RazorpayError('validation_failed', `No payment row found for Razorpay payment ${entity.payment_id}.`);
  }

  // Idempotency: payment_transaction has no status column to gate on
  // the way payment.status does for the other two handlers, so a
  // retried refund.processed webhook is instead detected via a JSONB
  // containment check against the refund entity's own unique id
  // already stored in a prior row's provider_payload.
  const { data: existing, error: existingError } = await admin
    .from('payment_transaction')
    .select('id')
    .eq('payment_id', payment.id)
    .eq('transaction_type', 'refund')
    .contains('provider_payload', { payload: { refund: { entity: { id: entity.id } } } })
    .maybeSingle();

  if (existingError) throw existingError;
  if (existing) {
    return; // already processed — a webhook retry, not an error
  }

  const { error: transactionError } = await admin.from('payment_transaction').insert({
    payment_id: payment.id,
    transaction_type: 'refund',
    amount: fromPaise(entity.amount).toFixed(2),
    provider_payload: rawPayload as never,
  });
  if (transactionError) throw transactionError;
}
