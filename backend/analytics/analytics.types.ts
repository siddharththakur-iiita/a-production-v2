/**
 * src/features/analytics/analytics.types.ts
 *
 * Domain types for the Analytics module (analytics_event,
 * search_query_log, daily_product_metric, daily_search_term_metric —
 * added directly in 016_rls.sql, see that file's Section A). Two of
 * these four tables are write-capable from this module
 * (analytics_event, search_query_log — public INSERT, staff-only
 * SELECT); the other two are READ-ONLY here by design —
 * daily_product_metric/daily_search_term_metric are documented as
 * "populated exclusively by a scheduled job (e.g. pg_cron), not by
 * application-request-path code," so this module never attempts to
 * write them.
 */
import type {
  AnalyticsEventRow,
  SearchQueryLogRow,
  DailyProductMetricRow,
  DailySearchTermMetricRow,
} from '../../lib/supabase/database.types';

export interface AnalyticsEvent {
  id: string;
  eventType: string;
  entityType: string | null;
  entityId: string | null;
  customerId: string | null;
  sessionId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export function mapAnalyticsEventRow(row: AnalyticsEventRow): AnalyticsEvent {
  return {
    id: row.id,
    eventType: row.event_type,
    entityType: row.entity_type,
    entityId: row.entity_id,
    customerId: row.customer_id,
    sessionId: row.session_id,
    metadata: row.metadata as Record<string, unknown> | null,
    createdAt: row.created_at,
  };
}

export interface TrackEventInput {
  eventType: string;
  entityType?: string;
  entityId?: string;
  customerId?: string;
  sessionId?: string;
  metadata?: Record<string, unknown>;
}

export interface SearchQueryLogEntry {
  id: string;
  queryText: string;
  resultsCount: number;
  customerId: string | null;
  sessionId: string | null;
  createdAt: string;
}

export function mapSearchQueryLogRow(row: SearchQueryLogRow): SearchQueryLogEntry {
  return {
    id: row.id,
    queryText: row.query_text,
    resultsCount: row.results_count,
    customerId: row.customer_id,
    sessionId: row.session_id,
    createdAt: row.created_at,
  };
}

export interface LogSearchQueryInput {
  queryText: string;
  resultsCount: number;
  customerId?: string;
  sessionId?: string;
}

export interface DailyProductMetric {
  id: string;
  productId: string;
  metricDate: string;
  viewCount: number;
  wishlistAddCount: number;
  cartAddCount: number;
  purchaseCount: number;
}

export function mapDailyProductMetricRow(row: DailyProductMetricRow): DailyProductMetric {
  return {
    id: row.id,
    productId: row.product_id,
    metricDate: row.metric_date,
    viewCount: row.view_count,
    wishlistAddCount: row.wishlist_add_count,
    cartAddCount: row.cart_add_count,
    purchaseCount: row.purchase_count,
  };
}

export interface ProductMetricsSummary {
  productId: string;
  totalViews: number;
  totalWishlistAdds: number;
  totalCartAdds: number;
  totalPurchases: number;
  conversionRate: number;
}

export interface DailySearchTermMetric {
  id: string;
  queryTextNormalized: string;
  metricDate: string;
  searchCount: number;
  avgResultsCount: number;
}

export function mapDailySearchTermMetricRow(row: DailySearchTermMetricRow): DailySearchTermMetric {
  return {
    id: row.id,
    queryTextNormalized: row.query_text_normalized,
    metricDate: row.metric_date,
    searchCount: row.search_count,
    avgResultsCount: Number(row.avg_results_count),
  };
}

export interface UnmetDemandTerm {
  queryTextNormalized: string;
  totalSearchCount: number;
  avgResultsCount: number;
}

export interface DateRange {
  from: string;
  to: string;
}
