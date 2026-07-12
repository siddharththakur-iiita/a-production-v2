/**
 * src/lib/supabase/env.ts
 *
 * Centralized, typed access to the environment variables the
 * Authentication module (and every module built on top of it) needs.
 * Vite only exposes variables prefixed VITE_ to browser code by
 * design — this file is the single place that boundary is enforced
 * and validated at startup, rather than letting a missing/undefined
 * env var surface as a cryptic runtime error deep inside a Supabase
 * client call.
 */

interface PublicEnv {
  supabaseUrl: string;
  supabaseAnonKey: string;
}

function readEnv(key: string): string {
  const value = import.meta.env[key];
  if (!value || typeof value !== 'string' || value.length === 0) {
    throw new Error(
      `Missing required environment variable "${key}". ` +
        'Check your .env file (see .env.example) and ensure Vite-exposed ' +
        'variables are prefixed VITE_.'
    );
  }
  return value;
}

/**
 * Public, browser-safe environment. Only ever references the
 * Supabase anon key, which is safe to ship to the client because
 * every table's actual access control is enforced by RLS policies
 * (016_rls.sql), not by keeping this key secret.
 */
export const publicEnv: PublicEnv = {
  supabaseUrl: readEnv('VITE_SUPABASE_URL'),
  supabaseAnonKey: readEnv('VITE_SUPABASE_ANON_KEY'),
};
