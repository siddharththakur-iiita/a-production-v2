/**
 * src/features/collection/collection.queryKeys.ts
 */
export const collectionQueryKeys = {
  all: ['collections'] as const,
  publishedList: () => [...collectionQueryKeys.all, 'published-list'] as const,
  staffList: () => [...collectionQueryKeys.all, 'staff-list'] as const,
  details: () => [...collectionQueryKeys.all, 'detail'] as const,
  detail: (id: string) => [...collectionQueryKeys.details(), id] as const,
  bySlug: (slug: string) => [...collectionQueryKeys.all, 'slug', slug] as const,
  products: (collectionId: string) => [...collectionQueryKeys.all, collectionId, 'products'] as const,
};
