/**
 * src/lib/supabase/rpcHelpers.ts
 *
 * Generic RPC-calling helpers for infrastructure code (Razorpay
 * webhook handlers, scheduled jobs, etc.) that needs to call a
 * Postgres RPC but is NOT one of the 15 business modules under
 * src/features — those modules already call supabase.rpc(...)
 * directly inside their own repository.ts files and map errors
 * through their own domain-specific {Module}Error classes, which
 * this file does not replace or wrap. This file exists for
 * infrastructure code that has no such domain-specific error class of
 * its own and just wants a consistently-classified failure.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { classifyPostgrestError, type ClassifiedPostgrestError } from './postgrestErrors';

/**
 * Calls a Postgres RPC and returns its data, throwing the raw
 * PostgrestError on failure — the thinnest possible wrapper, for
 * callers that want to apply their own classification (e.g. a
 * business module's own error mapper).
 */
export async function callRpc<T>(
  client: SupabaseClient,
  functionName: string,
  args?: Record<string, unknown>
): Promise<T> {
  const { data, error } = await client.rpc(functionName, args);
  if (error) throw error;
  return data as T;
}

/**
 * Calls a Postgres RPC and throws an RpcCallError (classified via
 * postgrestErrors.ts's classifyPostgrestError) on failure — for
 * infrastructure code that wants a generically useful kind/
 * constraintName without writing its own {Module}Error class.
 */
export async function callRpcClassified<T>(
  client: SupabaseClient,
  functionName: string,
  args?: Record<string, unknown>
): Promise<T> {
  const { data, error } = await client.rpc(functionName, args);
  if (error) {
    const classified: ClassifiedPostgrestError = classifyPostgrestError(error);
    throw new RpcCallError(functionName, classified);
  }
  return data as T;
}

export class RpcCallError extends Error {
  readonly functionName: string;
  readonly classified: ClassifiedPostgrestError;

  constructor(functionName: string, classified: ClassifiedPostgrestError) {
    super(`RPC "${functionName}" failed (${classified.kind}): ${classified.original.message}`);
    this.name = 'RpcCallError';
    this.functionName = functionName;
    this.classified = classified;
  }
}
