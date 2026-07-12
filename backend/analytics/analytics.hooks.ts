/**
 * src/features/analytics/analytics.hooks.ts
 */
import { useMutation, useQuery } from '@tanstack/react-query';
import * as service from './analytics.service';
import { analyticsQueryKeys } from './analytics.queryKeys';
import type { DateRange, LogSearchQueryInput, TrackEventInput } from './analytics.types';
import type { ProductMetricRankingKey } from './analytics.service';

export function useTrackEvent() {
  return useMutation({ mutationFn: (input: TrackEventInput) => service.trackEvent(input) });
}

export function useRecentEvents(params: {
  eventType?: string;
  entityType?: string;
  entityId?: string;
  limit?: number;
}) {
  return useQuery({
    queryKey: analyticsQueryKeys.events(params),
    queryFn: () => service.listRecentEvents(params),
  });
}

export function useLogSearchQuery() {
  return useMutation({ mutationFn: (input: LogSearchQueryInput) => service.logSearchQuery(input) });
}

export function useProductMetricsSummary(productId: string | undefined, range: DateRange) {
  return useQuery({
    queryKey: analyticsQueryKeys.productMetricsSummary(productId ?? '', range),
    queryFn: () => service.getProductMetricsSummary(productId as string, range),
    enabled: Boolean(productId),
  });
}

export function useTopProducts(range: DateRange, rankBy: ProductMetricRankingKey = 'totalViews', limit = 10) {
  return useQuery({
    queryKey: analyticsQueryKeys.topProducts(range, rankBy, limit),
    queryFn: () => service.getTopProducts(range, rankBy, limit),
  });
}

export function useUnmetDemandTerms(range: DateRange, maxAvgResults = 3, limit = 20) {
  return useQuery({
    queryKey: analyticsQueryKeys.unmetDemandTerms(range, maxAvgResults, limit),
    queryFn: () => service.getUnmetDemandTerms(range, maxAvgResults, limit),
  });
}
