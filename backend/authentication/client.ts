/**
 * src/lib/supabase/client.ts
 *
 * The ONLY Supabase client that should ever be imported into
 * frontend/browser code. Built with the anon key, which is safe to
 * ship to the client — actual authorization is enforced entirely by
 * the RLS policies defined in 016_rls.sql, not by keeping this key
 * secret. This client must never be constructed with the
 * service_role key; see adminClient.server.ts for that boundary.
 */
import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';
import { publicEnv } from './env';

export const supabase = createClient<Database>(
  publicEnv.supabaseUrl,
  publicEnv.supabaseAnonKey,
  {
    auth: {
      // Persist the session in localStorage and auto-refresh the
      // access token before it expires — standard SPA behavior for a
      // Vite frontend with no server-side session store.
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
);
