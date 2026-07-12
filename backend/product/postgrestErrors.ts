/**
 * src/lib/supabase/postgrestErrors.ts
 *
 * Generic PostgreSQL/PostgREST error classification shared by every
 * feature module's own error-mapping file (product.errors.ts,
 * category.errors.ts, collection.errors.ts, ...). This file knows
 * nothing about any specific table or constraint name — it only
 * recognizes the *shape* of a Postgres error (SQLSTATE code) and
 * extracts the offending constraint name from the message, which
 * each module then maps to a domain-specific meaning (see e.g.
 * product.errors.ts mapping `product_slug_key` to a
 * "slug already in use" message).
 */
import type { PostgrestError } from '@supabase/supabase-js';

/** Postgres SQLSTATE codes this codebase's modules actually need to distinguish. */
export const PG_ERROR_CODE = {
  UNIQUE_VIOLATION: '23505',
  FOREIGN_KEY_VIOLATION: '23503',
  CHECK_VIOLATION: '23514',
  NOT_NULL_VIOLATION: '23502',
} as const;

/** PostgREST's own code for a `.single()`/`.maybeSingle()` query that matched zero or >1 rows. */
export const POSTGREST_NO_ROWS_CODE = 'PGRST116';

export type PostgrestErrorKind =
  | 'unique_violation'
  | 'foreign_key_violation'
  | 'check_violation'
  | 'not_null_violation'
  | 'not_found'
  | 'permission_denied'
  | 'unknown';

export interface ClassifiedPostgrestError {
  kind: PostgrestErrorKind;
  /** The constraint name Postgres reported, when the error shape includes one (e.g. "product_slug_key"). */
  constraintName: string | null;
  original: PostgrestError;
}

const CONSTRAINT_NAME_PATTERN = /"([a-zA-Z0-9_]+)"/;

/**
 * Classifies a raw PostgrestError into a stable kind + extracted
 * constraint name, so each module's own error mapper can pattern-match
 * on `constraintName === 'product_slug_key'` etc. without re-parsing
 * Postgres' error message format itself.
 */
export function classifyPostgrestError(error: PostgrestError): ClassifiedPostgrestError {
  const constraintMatch = error.message.match(CONSTRAINT_NAME_PATTERN);
  const constraintName = constraintMatch ? constraintMatch[1] : null;

  if (error.code === POSTGREST_NO_ROWS_CODE) {
    return { kind: 'not_found', constraintName: null, original: error };
  }
  if (error.code === PG_ERROR_CODE.UNIQUE_VIOLATION) {
    return { kind: 'unique_violation', constraintName, original: error };
  }
  if (error.code === PG_ERROR_CODE.FOREIGN_KEY_VIOLATION) {
    return { kind: 'foreign_key_violation', constraintName, original: error };
  }
  if (error.code === PG_ERROR_CODE.CHECK_VIOLATION) {
    return { kind: 'check_violation', constraintName, original: error };
  }
  if (error.code === PG_ERROR_CODE.NOT_NULL_VIOLATION) {
    return { kind: 'not_null_violation', constraintName, original: error };
  }
  // RLS policies do not raise a distinct SQLSTATE — a write blocked by
  // RLS surfaces as either 0 rows affected (silently) or, for INSERT
  // with a failing WITH CHECK, as a generic 42501 (insufficient_privilege)
  // in some Postgres versions/configurations.
  if (error.code === '42501') {
    return { kind: 'permission_denied', constraintName: null, original: error };
  }

  return { kind: 'unknown', constraintName, original: error };
}

/** Base class every module's own {Module}Error extends, so `instanceof AppError` works across the whole app. */
export class AppError extends Error {
  readonly cause?: unknown;
  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = 'AppError';
    this.cause = cause;
  }
}
