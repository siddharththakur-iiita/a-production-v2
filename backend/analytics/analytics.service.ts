/**
 * src/features/analytics/analytics.service.ts
 *
 * Beyond simple event/search tracking, this module's real logic is in
 * aggregating daily_product_metric/daily_search_term_metric rows
 * across a date range client-side — summing counts, computing
 * conversion rate, ranking top products, and surfacing the "unmet
 * catalog demand" signal (high search volume, low average results)
 * that daily_product_metric's own SQL comment calls out as the point
 * of collecting this data at all.
 */
import * as repo from './analytics.repository';
import {
  mapAnalyticsEventRow,
  mapSearchQueryLogRow,
  type AnalyticsEvent,
  type SearchQueryLogEntry,
  type ProductMetricsSummary,
  type UnmetDemandTerm,
  type TrackEventInput,
  type LogSearchQueryInput,
  type DateRange,
} from './analytics.types';
import { trackEventSchema, logSearchQuerySchema, dateRangeSchema } from './analytics.validation';
import { mapAnalyticsPostgrestError, mapAnalyticsZodError } from './analytics.errors';

export async function trackEvent(input: TrackEventInput): Promise<AnalyticsEvent> {
  const parsed = trackEventSchema.safeParse(input);
  if (!parsed.success) throw mapAnalyticsZodError(parsed.error);

  try {
    const row = await repo.insertAnalyticsEvent({
      event_type: parsed.data.eventType,
      entity_type: parsed.data.entityType,
      entity_id: parsed.data.entityId,
      customer_id: parsed.data.customerId,
      session_id: parsed.data.sessionId,
      metadata: parsed.data.metadata,
    });
    return mapAnalyticsEventRow(row);
  } catch (err) {
    throw mapAnalyticsPostgrestError(err as never);
  }
}

export async function listRecentEvents(params: {
  eventType?: string;
  entityType?: string;
  entityId?: string;
  limit?: number;
}): Promise<AnalyticsEvent[]> {
  try {
    const rows = await repo.findAnalyticsEvents(params);
    return rows.map(mapAnalyticsEventRow);
  } catch (err) {
    throw mapAnalyticsPostgrestError(err as never);
  }
}

export async function logSearchQuery(input: LogSearchQueryInput): Promise<SearchQueryLogEntry> {
  const parsed = logSearchQuerySchema.safeParse(input);
  if (!parsed.success) throw mapAnalyticsZodError(parsed.error);

  try {
    const row = await repo.insertSearchQueryLog({
      query_text: parsed.data.queryText,
      results_count: parsed.data.resultsCount,
      customer_id: parsed.data.customerId,
      session_id: parsed.data.sessionId,
    });
    return mapSearchQueryLogRow(row);
  } catch (err) {
    throw mapAnalyticsPostgrestError(err as never);
  }
}

export async function getProductMetricsSummary(
  productId: string,
  range: DateRange
): Promise<ProductMetricsSummary> {
  const parsed = dateRangeSchema.safeParse(range);
  if (!parsed.success) throw mapAnalyticsZodError(parsed.error);

  try {
    const rows = await repo.findDailyProductMetrics(productId, parsed.data.from, parsed.data.to);

    const totals = rows.reduce(
      (acc, r) => ({
        totalViews: acc.totalViews + r.view_count,
        totalWishlistAdds: acc.totalWishlistAdds + r.wishlist_add_count,
        totalCartAdds: acc.totalCartAdds + r.cart_add_count,
        totalPurchases: acc.totalPurchases + r.purchase_count,
      }),
      { totalViews: 0, totalWishlistAdds: 0, totalCartAdds: 0, totalPurchases: 0 }
    );

    return {
      productId,
      ...totals,
      conversionRate: totals.totalViews > 0 ? totals.totalPurchases / totals.totalViews : 0,
    };
  } catch (err) {
    throw mapAnalyticsPostgrestError(err as never);
  }
}

export type ProductMetricRankingKey = 'totalViews' | 'totalWishlistAdds' | 'totalCartAdds' | 'totalPurchases';

export async function getTopProducts(
  range: DateRange,
  rankBy: ProductMetricRankingKey = 'totalViews',
  limit = 10
): Promise<ProductMetricsSummary[]> {
  const parsed = dateRangeSchema.safeParse(range);
  if (!parsed.success) throw mapAnalyticsZodError(parsed.error);

  try {
    const rows = await repo.findDailyProductMetricsForDateRange(parsed.data.from, parsed.data.to);

    const byProduct = new Map<string, ProductMetricsSummary>();
    for (const r of rows) {
      const existing = byProduct.get(r.product_id) ?? {
        productId: r.product_id,
        totalViews: 0,
        totalWishlistAdds: 0,
        totalCartAdds: 0,
        totalPurchases: 0,
        conversionRate: 0,
      };
      existing.totalViews += r.view_count;
      existing.totalWishlistAdds += r.wishlist_add_count;
      existing.totalCartAdds += r.cart_add_count;
      existing.totalPurchases += r.purchase_count;
      byProduct.set(r.product_id, existing);
    }

    const summaries = Array.from(byProduct.values()).map((s) => ({
      ...s,
      conversionRate: s.totalViews > 0 ? s.totalPurchases / s.totalViews : 0,
    }));

    return summaries.sort((a, b) => b[rankBy] - a[rankBy]).slice(0, limit);
  } catch (err) {
    throw mapAnalyticsPostgrestError(err as never);
  }
}

/**
 * Surfaces the "unmet catalog demand" signal daily_product_metric's
 * own SQL comment (016_rls.sql) calls out: search terms with high
 * total search_count but low avg_results_count, aggregated across a
 * date range and ranked by search volume.
 */
export async function getUnmetDemandTerms(
  range: DateRange,
  maxAvgResults = 3,
  limit = 20
): Promise<UnmetDemandTerm[]> {
  const parsed = dateRangeSchema.safeParse(range);
  if (!parsed.success) throw mapAnalyticsZodError(parsed.error);

  try {
    const rows = await repo.findDailySearchTermMetricsForDateRange(parsed.data.from, parsed.data.to);

    const byTerm = new Map<string, { totalSearchCount: number; weightedResultsSum: number }>();
    for (const r of rows) {
      const existing = byTerm.get(r.query_text_normalized) ?? { totalSearchCount: 0, weightedResultsSum: 0 };
      existing.totalSearchCount += r.search_count;
      // Weight each day's avg_results_count by that day's search
      // volume so a single low-traffic day with a stray 0-result
      // search doesn't skew the aggregate as much as a high-traffic day.
      existing.weightedResultsSum += Number(r.avg_results_count) * r.search_count;
      byTerm.set(r.query_text_normalized, existing);
    }

    return Array.from(byTerm.entries())
      .map(([term, agg]) => ({
        queryTextNormalized: term,
        totalSearchCount: agg.totalSearchCount,
        avgResultsCount: agg.totalSearchCount > 0 ? agg.weightedResultsSum / agg.totalSearchCount : 0,
      }))
      .filter((t) => t.avgResultsCount <= maxAvgResults)
      .sort((a, b) => b.totalSearchCount - a.totalSearchCount)
      .slice(0, limit);
  } catch (err) {
    throw mapAnalyticsPostgrestError(err as never);
  }
}
