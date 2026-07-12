/**
 * src/lib/imagekit/imagekit.client.server.ts
 *
 * SERVER-ONLY. Holds the ImageKit private key — must never be
 * imported into browser code. Mirrors the exact guard pattern already
 * established by supabase/adminClient.server.ts. Reads its config via
 * getServerEnv() (process.env), never clientEnv/import.meta.env,
 * since this file may run in a plain Node context (webhook handler,
 * scheduled job) with no Vite build step at all.
 */
import ImageKit from 'imagekit';
import { getServerEnv } from '../env/env';

if (typeof window !== 'undefined') {
  throw new Error(
    'imagekit.client.server.ts was imported into browser code. This file uses the ImageKit private ' +
      'key and must only ever run in a trusted server/Edge Function environment. Aborting to avoid ' +
      'leaking the key.'
  );
}

let _client: ImageKit | undefined;

export function getImageKitClient(): ImageKit {
  if (_client) return _client;

  const env = getServerEnv();
  _client = new ImageKit({
    publicKey: env.IMAGEKIT_PUBLIC_KEY,
    privateKey: env.IMAGEKIT_PRIVATE_KEY,
    urlEndpoint: env.IMAGEKIT_URL_ENDPOINT,
  });
  return _client;
}
