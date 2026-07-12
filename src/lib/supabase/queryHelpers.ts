/**
 * src/lib/supabase/queryHelpers.ts
 *
 * Generic, schema-agnostic helpers for building PostgREST queries via
 * Supabase JS v2. Nothing in this file references a specific table —
 * it is pure plumbing shared by every feature module's repository
 * layer (Product, Category, Collection, and every module built after
 * them).
 */
import type { PostgrestFilterBuilder } from '@supabase/postgrest-js';

export interface PaginationParams {
  /** 1-indexed page number. */
  page?: number;
  /** Rows per page. */
  pageSize?: number;
}

export interface PaginatedResult<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

export const DEFAULT_PAGE_SIZE = 24; // matches the site_setting 'default_page_size' seed value

/** Converts 1-indexed page/pageSize into the [from, to] range PostgREST's .range() expects. */
export function toRange(params: PaginationParams): [number, number] {
  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.max(1, params.pageSize ?? DEFAULT_PAGE_SIZE);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  return [from, to];
}

/** Wraps a Supabase `{ data, count }` response into a PaginatedResult, given the requested page params. */
export function toPaginatedResult<T>(
  data: T[],
  count: number | null,
  params: PaginationParams
): PaginatedResult<T> {
  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.max(1, params.pageSize ?? DEFAULT_PAGE_SIZE);
  const totalCount = count ?? data.length;
  return {
    items: data,
    page,
    pageSize,
    totalCount,
    totalPages: Math.max(1, Math.ceil(totalCount / pageSize)),
  };
}

export type SortDirection = 'asc' | 'desc';

export interface SortParam<TColumn extends string = string> {
  column: TColumn;
  direction?: SortDirection;
}

/**
 * Applies a typed sort to any PostgREST query builder without weakening its generic type.
 * TSchema is deliberately `any` here — this function only ever calls
 * .order(), which doesn't depend on the schema type at all, so there
 * is nothing to constrain; postgrest-js's own GenericSchema constraint
 * type isn't part of its public API surface to import against.
 */
export function applySort<
  TRow extends Record<string, unknown>,
  TResult,
  TRelationships,
  TColumn extends string
>(
  query: PostgrestFilterBuilder<any, TRow, TResult, TRelationships>,
  sort: SortParam<TColumn> | undefined,
  fallback: SortParam<TColumn>
): PostgrestFilterBuilder<any, TRow, TResult, TRelationships> {
  const resolved = sort ?? fallback;
  return query.order(resolved.column, {
    ascending: (resolved.direction ?? 'asc') === 'asc',
  }) as PostgrestFilterBuilder<any, TRow, TResult, TRelationships>;
}
