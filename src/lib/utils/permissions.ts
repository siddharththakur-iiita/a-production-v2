/**
 * src/lib/utils/permissions.ts
 *
 * A thin, cached wrapper around the existing app_has_permission RPC
 * (already the sole source of truth for permission checks — every
 * RLS policy across all 26 migrations is gated on it). This does not
 * reimplement permission logic; it exists purely so UI code can ask
 * "should I show this button" without round-tripping to the database
 * on every render, while the actual authorization enforcement remains
 * exactly where it already is: RLS, checked again server-side
 * regardless of what this helper says.
 */
import { supabase } from '../supabase/client';

const cache = new Map<string, { value: boolean; expiresAt: number }>();
const CACHE_TTL_MS = 60_000;

export async function hasPermission(permissionKey: string): Promise<boolean> {
  const cached = cache.get(permissionKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value;
  }

  const { data, error } = await supabase.rpc('app_has_permission', { p_permission_key: permissionKey });
  if (error) throw error;

  cache.set(permissionKey, { value: data, expiresAt: Date.now() + CACHE_TTL_MS });
  return data;
}

export function clearPermissionCache(): void {
  cache.clear();
}
