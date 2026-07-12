/**
 * src/lib/monitoring/auditLog.ts
 *
 * Read-only query access to audit_log (004_auth.sql) — an immutable,
 * platform-wide record already populated automatically by
 * trg_audit_log()/trg_audit_log_composite() triggers across every
 * audited table. This file only ever reads; there is no insert/update
 * function here because none should exist — the table's own Insert/
 * Update types (database.types.ts) are both `never` for exactly that
 * reason. Reuses the existing pagination helpers (queryHelpers.ts)
 * rather than reimplementing range/page-size math.
 */
import { supabase } from '../supabase/client';
import { toRange, toPaginatedResult, type PaginationParams, type PaginatedResult } from '../supabase/queryHelpers';
import type { AuditLogRow } from '../supabase/database.types';

export interface AuditLogEntry {
  id: string;
  adminUserId: string | null;
  action: string;
  entityType: string;
  entityId: string;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  createdAt: string;
}

function mapAuditLogRow(row: AuditLogRow): AuditLogEntry {
  return {
    id: row.id,
    adminUserId: row.admin_user_id,
    action: row.action,
    entityType: row.entity_type,
    entityId: row.entity_id,
    before: row.before as Record<string, unknown> | null,
    after: row.after as Record<string, unknown> | null,
    createdAt: row.created_at,
  };
}

export async function listAuditLogForEntity(
  entityType: string,
  entityId: string,
  pagination: PaginationParams = {}
): Promise<PaginatedResult<AuditLogEntry>> {
  const [from, to] = toRange(pagination);
  const { data, error, count } = await supabase
    .from('audit_log')
    .select('*', { count: 'exact' })
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)
    .order('created_at', { ascending: false })
    .range(from, to);

  if (error) throw error;
  return toPaginatedResult(data.map(mapAuditLogRow), count, pagination);
}

export async function listAuditLogForAdminUser(
  adminUserId: string,
  pagination: PaginationParams = {}
): Promise<PaginatedResult<AuditLogEntry>> {
  const [from, to] = toRange(pagination);
  const { data, error, count } = await supabase
    .from('audit_log')
    .select('*', { count: 'exact' })
    .eq('admin_user_id', adminUserId)
    .order('created_at', { ascending: false })
    .range(from, to);

  if (error) throw error;
  return toPaginatedResult(data.map(mapAuditLogRow), count, pagination);
}
