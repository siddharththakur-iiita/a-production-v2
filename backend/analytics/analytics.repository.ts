/**
 * src/features/analytics/analytics.repository.ts
 *
 * RLS reminder (016_rls.sql):
 *   analytics_event:          anon/authenticated INSERT WITH CHECK (true); staff-only SELECT (analytics.view)
 *   search_query_log:         anon/authenticated INSERT WITH CHECK (true); staff-only SELECT (analytics.view)
 *   daily_product_metric:      staff-only SELECT (analytics.view); no client write at all — see file header
 *   daily_search_term_metric:  staff-only SELECT (analytics.view); no client write at all — see file header
 */
import { supabase } from '../../lib/supabase/client';
import type {
  AnalyticsEventRow,
  AnalyticsEventInsert,
  SearchQueryLogRow,
  SearchQueryLogInsert,
  DailyProductMetricRow,
  DailySearchTermMetricRow,
} from '../../lib/supabase/database.types';

export async function insertAnalyticsEvent(input: AnalyticsEventInsert): Promise<AnalyticsEventRow> {
  const { data, error } = await supabase.from('analytics_event').insert(input).select('*').single();
  if (error) throw error;
  return data;
}

export async function findAnalyticsEvents(params: {
  eventType?: string;
  entityType?: string;
  entityId?: string;
  limit?: number;
}): Promise<AnalyticsEventRow[]> {
  let query = supabase.from('analytics_event').select('*').order('created_at', { ascending: false });
  if (params.eventType) query = query.eq('event_type', params.eventType);
  if (params.entityType) query = query.eq('entity_type', params.entityType);
  if (params.entityId) query = query.eq('entity_id', params.entityId);
  query = query.limit(params.limit ?? 100);

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function insertSearchQueryLog(input: SearchQueryLogInsert): Promise<SearchQueryLogRow> {
  const { data, error } = await supabase.from('search_query_log').insert(input).select('*').single();
  if (error) throw error;
  return data;
}

export async function findDailyProductMetrics(
  productId: string,
  dateFrom: string,
  dateTo: string
): Promise<DailyProductMetricRow[]> {
  const { data, error } = await supabase
    .from('daily_product_metric')
    .select('*')
    .eq('product_id', productId)
    .gte('metric_date', dateFrom)
    .lte('metric_date', dateTo)
    .order('metric_date', { ascending: true });
  if (error) throw error;
  return data;
}

export async function findDailyProductMetricsForDateRange(
  dateFrom: string,
  dateTo: string
): Promise<DailyProductMetricRow[]> {
  const { data, error } = await supabase
    .from('daily_product_metric')
    .select('*')
    .gte('metric_date', dateFrom)
    .lte('metric_date', dateTo);
  if (error) throw error;
  return data;
}

export async function findDailySearchTermMetricsForDateRange(
  dateFrom: string,
  dateTo: string
): Promise<DailySearchTermMetricRow[]> {
  const { data, error } = await supabase
    .from('daily_search_term_metric')
    .select('*')
    .gte('metric_date', dateFrom)
    .lte('metric_date', dateTo);
  if (error) throw error;
  return data;
}
