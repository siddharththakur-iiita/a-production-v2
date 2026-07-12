/**
 * src/lib/razorpay/razorpay.verify.server.ts
 *
 * SERVER-ONLY. Verifies the signature Razorpay Checkout returns to
 * the client on successful payment (razorpay_order_id +
 * razorpay_payment_id + razorpay_signature) — this must be verified
 * server-side using the key secret; trusting the client-reported
 * "success" callback without this check would let anyone claim any
 * order was paid.
 */
import { createHmac, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';
import { getServerEnv } from '../env/env';
import { RazorpayError } from './razorpay.errors';
import type { VerifyPaymentSignatureInput } from './razorpay.types';

const verifyPaymentSignatureSchema = z.object({
  razorpayOrderId: z.string().min(1),
  razorpayPaymentId: z.string().min(1),
  razorpaySignature: z.string().min(1),
});

export function verifyPaymentSignature(input: VerifyPaymentSignatureInput): boolean {
  const parsed = verifyPaymentSignatureSchema.safeParse(input);
  if (!parsed.success) {
    const first = parsed.error.errors[0];
    throw new RazorpayError(
      'validation_failed',
      first?.message ?? 'Invalid signature verification input.',
      parsed.error
    );
  }

  const env = getServerEnv();
  const payload = `${parsed.data.razorpayOrderId}|${parsed.data.razorpayPaymentId}`;
  const expectedSignature = createHmac('sha256', env.RAZORPAY_KEY_SECRET).update(payload).digest('hex');

  const expectedBuffer = Buffer.from(expectedSignature, 'utf8');
  const actualBuffer = Buffer.from(parsed.data.razorpaySignature, 'utf8');

  if (expectedBuffer.length !== actualBuffer.length) {
    return false;
  }
  return timingSafeEqual(expectedBuffer, actualBuffer);
}

export function assertValidPaymentSignature(input: VerifyPaymentSignatureInput): void {
  if (!verifyPaymentSignature(input)) {
    throw new RazorpayError('invalid_signature', 'Payment signature verification failed.');
  }
}
