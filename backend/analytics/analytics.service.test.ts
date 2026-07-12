/**
 * src/features/analytics/__tests__/analytics.service.test.ts
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import * as repo from '../analytics.repository';
import * as service from '../analytics.service';
import type { DailyProductMetricRow, DailySearchTermMetricRow } from '../../../lib/supabase/database.types';

vi.mock('../analytics.repository');

function makeProductMetricRow(overrides: Partial<DailyProductMetricRow> = {}): DailyProductMetricRow {
  return {
    id: 'm-1',
    product_id: 'prod-1',
    metric_date: '2026-01-01',
    view_count: 0,
    wishlist_add_count: 0,
    cart_add_count: 0,
    purchase_count: 0,
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

function makeSearchTermRow(overrides: Partial<DailySearchTermMetricRow> = {}): DailySearchTermMetricRow {
  return {
    id: 's-1',
    query_text_normalized: 'lehenga',
    metric_date: '2026-01-01',
    search_count: 0,
    avg_results_count: '0',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

describe('analytics.service', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('getProductMetricsSummary', () => {
    it('sums counts across multiple days and computes conversion rate', async () => {
      vi.mocked(repo.findDailyProductMetrics).mockResolvedValue([
        makeProductMetricRow({ view_count: 100, purchase_count: 5 }),
        makeProductMetricRow({ metric_date: '2026-01-02', view_count: 50, purchase_count: 5 }),
      ]);

      const result = await service.getProductMetricsSummary('prod-1', { from: '2026-01-01', to: '2026-01-02' });

      expect(result.totalViews).toBe(150);
      expect(result.totalPurchases).toBe(10);
      expect(result.conversionRate).toBeCloseTo(10 / 150);
    });

    it('returns conversionRate 0 (not NaN) when there were no views', async () => {
      vi.mocked(repo.findDailyProductMetrics).mockResolvedValue([]);

      const result = await service.getProductMetricsSummary('prod-1', { from: '2026-01-01', to: '2026-01-02' });

      expect(result.conversionRate).toBe(0);
      expect(Number.isNaN(result.conversionRate)).toBe(false);
    });
  });

  describe('getTopProducts (ranking)', () => {
    it('aggregates per product across days and ranks by the chosen metric', async () => {
      vi.mocked(repo.findDailyProductMetricsForDateRange).mockResolvedValue([
        makeProductMetricRow({ product_id: 'prod-A', view_count: 10 }),
        makeProductMetricRow({ product_id: 'prod-A', metric_date: '2026-01-02', view_count: 40 }),
        makeProductMetricRow({ product_id: 'prod-B', view_count: 100 }),
      ]);

      const result = await service.getTopProducts({ from: '2026-01-01', to: '2026-01-02' }, 'totalViews', 10);

      expect(result[0].productId).toBe('prod-B');
      expect(result[0].totalViews).toBe(100);
      expect(result[1].productId).toBe('prod-A');
      expect(result[1].totalViews).toBe(50);
    });

    it('respects the limit parameter', async () => {
      vi.mocked(repo.findDailyProductMetricsForDateRange).mockResolvedValue([
        makeProductMetricRow({ product_id: 'prod-A', view_count: 30 }),
        makeProductMetricRow({ product_id: 'prod-B', view_count: 20 }),
        makeProductMetricRow({ product_id: 'prod-C', view_count: 10 }),
      ]);

      const result = await service.getTopProducts({ from: '2026-01-01', to: '2026-01-02' }, 'totalViews', 2);

      expect(result).toHaveLength(2);
    });
  });

  describe('getUnmetDemandTerms', () => {
    it('surfaces high-search-volume, low-result terms, weighted by daily search volume', async () => {
      vi.mocked(repo.findDailySearchTermMetricsForDateRange).mockResolvedValue([
        makeSearchTermRow({ query_text_normalized: 'sherwani xl', search_count: 50, avg_results_count: '0' }),
        makeSearchTermRow({
          query_text_normalized: 'sherwani xl',
          metric_date: '2026-01-02',
          search_count: 30,
          avg_results_count: '1',
        }),
        makeSearchTermRow({ query_text_normalized: 'lehenga', search_count: 20, avg_results_count: '15' }),
      ]);

      const result = await service.getUnmetDemandTerms({ from: '2026-01-01', to: '2026-01-02' }, 3, 20);

      expect(result).toHaveLength(1);
      expect(result[0].queryTextNormalized).toBe('sherwani xl');
      expect(result[0].totalSearchCount).toBe(80);
      expect(result[0].avgResultsCount).toBeCloseTo(0.375);
    });

    it('excludes terms above the maxAvgResults threshold', async () => {
      vi.mocked(repo.findDailySearchTermMetricsForDateRange).mockResolvedValue([
        makeSearchTermRow({ query_text_normalized: 'lehenga', search_count: 100, avg_results_count: '25' }),
      ]);

      const result = await service.getUnmetDemandTerms({ from: '2026-01-01', to: '2026-01-02' }, 3, 20);

      expect(result).toHaveLength(0);
    });
  });
});
