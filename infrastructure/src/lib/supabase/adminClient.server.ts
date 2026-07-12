/**
 * src/lib/supabase/adminClient.server.ts
 *
 * SERVER-ONLY. Built with the service_role key, which bypasses every
 * RLS policy in 016_rls.sql. This file must never be imported from
 * any module that ends up in the Vite browser bundle — it is used
 * exclusively by trusted backend code (a Node/Edge Function
 * environment) for operations that legitimately need to act outside
 * RLS, such as:
 *   - provisioning a new admin_user via the Auth Admin API and
 *     tagging it with app_metadata.actor_type = 'admin' so the
 *     on_auth_user_created_admin trigger (019_auth_bootstrap.sql)
 *     fires correctly instead of the customer bootstrap trigger.
 *   - any other privileged operation this project's future modules
 *     explicitly call out as requiring service_role.
 *
 * The `.server.ts` suffix and the runtime guard below are both
 * intentional, defense-in-depth signals: a build misconfiguration
 * that somehow pulled this file into a browser bundle would throw
 * immediately at import time rather than silently shipping a
 * service_role key to every visitor.
 */
import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

if (typeof window !== 'undefined') {
  throw new Error(
    'adminClient.server.ts was imported into browser code. This file uses ' +
      'the Supabase service_role key and must only ever run in a trusted ' +
      'server/Edge Function environment. Aborting to avoid leaking the key.'
  );
}

function readServerEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(
      `Missing required server-side environment variable "${key}". ` +
        'This must be set in the server/Edge Function runtime, never ' +
        'exposed via a VITE_-prefixed variable.'
    );
  }
  return value;
}

export function createAdminClient() {
  const url = readServerEnv('SUPABASE_URL');
  const serviceRoleKey = readServerEnv('SUPABASE_SERVICE_ROLE_KEY');

  return createClient<Database>(url, serviceRoleKey, {
    auth: {
      // A service-role client never needs to persist or refresh a
      // browser session; it authenticates every request with the
      // service key itself.
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
