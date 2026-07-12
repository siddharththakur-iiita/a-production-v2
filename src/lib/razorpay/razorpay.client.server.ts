/**
 * src/lib/razorpay/razorpay.client.server.ts
 *
 * SERVER-ONLY. Holds the Razorpay key secret — mirrors the exact
 * guard pattern already established by supabase/adminClient.server.ts
 * and imagekit.client.server.ts.
 */
import Razorpay from 'razorpay';
import { getServerEnv } from '../env/env';

if (typeof window !== 'undefined') {
  throw new Error(
    'razorpay.client.server.ts was imported into browser code. This file uses the Razorpay key ' +
      'secret and must only ever run in a trusted server/Edge Function environment. Aborting to ' +
      'avoid leaking the key.'
  );
}

let _client: Razorpay | undefined;

export function getRazorpayClient(): Razorpay {
  if (_client) return _client;

  const env = getServerEnv();
  _client = new Razorpay({
    key_id: env.RAZORPAY_KEY_ID,
    key_secret: env.RAZORPAY_KEY_SECRET,
  });
  return _client;
}
