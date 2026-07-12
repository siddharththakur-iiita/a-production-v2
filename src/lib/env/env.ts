/**
 * src/lib/env/env.ts
 *
 * Central runtime-validated environment configuration for every
 * third-party integration added in this infrastructure layer
 * (ImageKit, Razorpay, Resend) plus general app-level config.
 *
 * Deliberately does NOT re-validate the Supabase variables —
 * src/lib/supabase/env.ts already does that and is re-exported here
 * (`publicEnv`) so this file can be the single place other code
 * imports environment config from, without duplicating that
 * validation logic. Likewise, this file does not touch
 * adminClient.server.ts's own SUPABASE_SERVICE_ROLE_KEY reading —
 * that file's guard pattern is already correct and is left exactly
 * as it is; getServerEnv() below deliberately mirrors it (eager
 * window-check, thrown immediately) rather than a lazier pattern,
 * since eager validation is what actually guarantees a browser bundle
 * can never end up holding a secret.
 *
 * Two exports:
 *   - clientEnv: safe to bundle into browser code. Every value here
 *     is a public identifier (a key ID, a URL endpoint) never a
 *     secret — the corresponding secret half of each integration
 *     lives only in getServerEnv().
 *   - getServerEnv(): throws immediately if called in a browser
 *     context, exactly like adminClient.server.ts's own guard.
 *     Exposed as a function (not a bare object) so the browser-guard
 *     check runs every time it's called, not just once at module load
 *     — the same reasoning adminClient.server.ts's createAdminClient()
 *     function already uses.
 */
import { z } from 'zod';
import { publicEnv } from '../supabase/env';

export { publicEnv };

// ---------------------------------------------------------------------
// Client-safe environment
// ---------------------------------------------------------------------

const clientEnvSchema = z.object({
  VITE_APP_URL: z.string().url(),
  VITE_IMAGEKIT_URL_ENDPOINT: z.string().url(),
  VITE_IMAGEKIT_PUBLIC_KEY: z.string().min(1),
  VITE_RAZORPAY_KEY_ID: z.string().min(1),
});

function readClientEnv() {
  const raw = {
    VITE_APP_URL: import.meta.env.VITE_APP_URL,
    VITE_IMAGEKIT_URL_ENDPOINT: import.meta.env.VITE_IMAGEKIT_URL_ENDPOINT,
    VITE_IMAGEKIT_PUBLIC_KEY: import.meta.env.VITE_IMAGEKIT_PUBLIC_KEY,
    VITE_RAZORPAY_KEY_ID: import.meta.env.VITE_RAZORPAY_KEY_ID,
  };

  const result = clientEnvSchema.safeParse(raw);
  if (!result.success) {
    const missing = result.error.issues.map((i) => i.path.join('.')).join(', ');
    throw new Error(
      `Missing or invalid client environment variable(s): ${missing}. Check your .env file against .env.example.`
    );
  }
  return result.data;
}

export const clientEnv = readClientEnv();

// ---------------------------------------------------------------------
// Server-only environment
// ---------------------------------------------------------------------

const serverEnvSchema = z.object({
  APP_URL: z.string().url(),
  IMAGEKIT_PUBLIC_KEY: z.string().min(1),
  IMAGEKIT_PRIVATE_KEY: z.string().min(1),
  IMAGEKIT_URL_ENDPOINT: z.string().url(),
  RAZORPAY_KEY_ID: z.string().min(1),
  RAZORPAY_KEY_SECRET: z.string().min(1),
  RAZORPAY_WEBHOOK_SECRET: z.string().min(1),
  RESEND_API_KEY: z.string().min(1),
  RESEND_FROM_EMAIL: z.string().email(),
  RESEND_FROM_NAME: z.string().min(1),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

/**
 * Validates and returns the server-only environment. Called once per
 * server-side module (each integration's client.server.ts calls this
 * at its own point of use, not at this file's import time — importing
 * env.ts anywhere, including accidentally in a browser bundle, must
 * never itself throw; only actually calling getServerEnv() does).
 */
export function getServerEnv(): ServerEnv {
  if (typeof window !== 'undefined') {
    throw new Error(
      'getServerEnv() was called from browser code. This function reads third-party secret keys ' +
        '(ImageKit, Razorpay, Resend) and must only ever be called from a trusted server/Edge ' +
        'Function environment. Aborting to avoid leaking secrets — see adminClient.server.ts for the ' +
        'same guard pattern applied to the Supabase service role key.'
    );
  }

  const raw = {
    APP_URL: process.env.APP_URL,
    IMAGEKIT_PUBLIC_KEY: process.env.IMAGEKIT_PUBLIC_KEY,
    IMAGEKIT_PRIVATE_KEY: process.env.IMAGEKIT_PRIVATE_KEY,
    IMAGEKIT_URL_ENDPOINT: process.env.IMAGEKIT_URL_ENDPOINT,
    RAZORPAY_KEY_ID: process.env.RAZORPAY_KEY_ID,
    RAZORPAY_KEY_SECRET: process.env.RAZORPAY_KEY_SECRET,
    RAZORPAY_WEBHOOK_SECRET: process.env.RAZORPAY_WEBHOOK_SECRET,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    RESEND_FROM_EMAIL: process.env.RESEND_FROM_EMAIL,
    RESEND_FROM_NAME: process.env.RESEND_FROM_NAME,
  };

  const result = serverEnvSchema.safeParse(raw);
  if (!result.success) {
    const missing = result.error.issues.map((i) => i.path.join('.')).join(', ');
    throw new Error(
      `Missing or invalid server environment variable(s): ${missing}. Check your server runtime's ` +
        'environment configuration against .env.example — these must never be VITE_-prefixed.'
    );
  }
  return result.data;
}

// ---------------------------------------------------------------------
// General app-level helpers
// ---------------------------------------------------------------------

export function isProduction(): boolean {
  return import.meta.env.PROD === true;
}

export function isDevelopment(): boolean {
  return import.meta.env.DEV === true;
}
