/**
 * src/lib/resend/resend.client.server.ts
 *
 * SERVER-ONLY. Mirrors the same guard pattern as every other
 * secret-holding client in this codebase.
 */
import { Resend } from 'resend';
import { getServerEnv } from '../env/env';

if (typeof window !== 'undefined') {
  throw new Error(
    'resend.client.server.ts was imported into browser code. This file uses the Resend API key and ' +
      'must only ever run in a trusted server/Edge Function environment. Aborting to avoid leaking the key.'
  );
}

let _client: Resend | undefined;

export function getResendClient(): Resend {
  if (_client) return _client;

  const env = getServerEnv();
  _client = new Resend(env.RESEND_API_KEY);
  return _client;
}
