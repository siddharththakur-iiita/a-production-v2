/**
 * src/features/analytics/analytics.queryKeys.ts
 */
import type { DateRange } from './analytics.types';

export const analyticsQueryKeys = {
  all: ['analytics'] as const,
  events: (params: { eventType?: string; entityType?: string; entityId?: string; limit?: number }) =>
    [...analyticsQueryKeys.all, 'events', params] as const,
  productMetricsSummary: (productId: string, range: DateRange) =>
    [...analyticsQueryKeys.all, 'product-metrics', productId, range] as const,
  topProducts: (range: DateRange, rankBy: string, limit: number) =>
    [...analyticsQueryKeys.all, 'top-products', range, rankBy, limit] as const,
  unmetDemandTerms: (range: DateRange, maxAvgResults: number, limit: number) =>
    [...analyticsQueryKeys.all, 'unmet-demand', range, maxAvgResults, limit] as const,
};
