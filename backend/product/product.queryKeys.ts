/**
 * src/features/product/product.queryKeys.ts
 */
import type { ListProductsParams, SearchProductsParams } from './product.types';

export const productQueryKeys = {
  all: ['products'] as const,
  lists: () => [...productQueryKeys.all, 'list'] as const,
  list: (params: ListProductsParams) => [...productQueryKeys.lists(), params] as const,
  searches: () => [...productQueryKeys.all, 'search'] as const,
  search: (params: SearchProductsParams) => [...productQueryKeys.searches(), params] as const,
  details: () => [...productQueryKeys.all, 'detail'] as const,
  bySlug: (slug: string) => [...productQueryKeys.details(), 'slug', slug] as const,
  byIdStaff: (id: string) => [...productQueryKeys.details(), 'staff-id', id] as const,
  taxonomy: (productId: string, taxonomy: string) =>
    [...productQueryKeys.all, productId, 'taxonomy', taxonomy] as const,
};
