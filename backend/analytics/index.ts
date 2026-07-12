/**
 * src/features/analytics/index.ts
 */
export {
  useTrackEvent,
  useRecentEvents,
  useLogSearchQuery,
  useProductMetricsSummary,
  useTopProducts,
  useUnmetDemandTerms,
} from './analytics.hooks';

export {
  trackEvent,
  listRecentEvents,
  logSearchQuery,
  getProductMetricsSummary,
  getTopProducts,
  getUnmetDemandTerms,
} from './analytics.service';
export type { ProductMetricRankingKey } from './analytics.service';

export { analyticsQueryKeys } from './analytics.queryKeys';

export type {
  AnalyticsEvent,
  TrackEventInput,
  SearchQueryLogEntry,
  LogSearchQueryInput,
  DailyProductMetric,
  ProductMetricsSummary,
  DailySearchTermMetric,
  UnmetDemandTerm,
  DateRange,
} from './analytics.types';

export { AnalyticsError } from './analytics.errors';
export type { AnalyticsErrorCode } from './analytics.errors';
