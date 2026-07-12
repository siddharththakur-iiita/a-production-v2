/**
 * src/lib/razorpay/razorpay.webhook.server.ts
 *
 * SERVER-ONLY. Verifies the X-Razorpay-Signature header against the
 * raw webhook request body using the webhook secret (distinct from
 * the API key secret — configured separately in the Razorpay
 * dashboard when the webhook endpoint is registered). Must be run
 * against the exact raw request body bytes/string, before any JSON
 * parsing — signing is computed over the literal payload Razorpay
 * sent, not a re-serialized version of it.
 */
import { createHmac, timingSafeEqual } from 'node:crypto';
import { getServerEnv } from '../env/env';
import { RazorpayError } from './razorpay.errors';
import type { RazorpayWebhookEvent } from './razorpay.types';

export function verifyWebhookSignature(rawBody: string, signatureHeader: string | null): boolean {
  if (!signatureHeader) return false;

  const env = getServerEnv();
  const expectedSignature = createHmac('sha256', env.RAZORPAY_WEBHOOK_SECRET).update(rawBody).digest('hex');

  const expectedBuffer = Buffer.from(expectedSignature, 'utf8');
  const actualBuffer = Buffer.from(signatureHeader, 'utf8');

  if (expectedBuffer.length !== actualBuffer.length) {
    return false;
  }
  return timingSafeEqual(expectedBuffer, actualBuffer);
}

export function verifyAndParseWebhook(rawBody: string, signatureHeader: string | null): RazorpayWebhookEvent {
  if (!verifyWebhookSignature(rawBody, signatureHeader)) {
    throw new RazorpayError('webhook_verification_failed', 'Webhook signature verification failed.');
  }

  try {
    return JSON.parse(rawBody) as RazorpayWebhookEvent;
  } catch (err) {
    throw new RazorpayError('validation_failed', 'Webhook payload is not valid JSON.', err);
  }
}
