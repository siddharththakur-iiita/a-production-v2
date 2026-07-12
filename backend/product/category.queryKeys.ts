/**
 * src/features/category/category.queryKeys.ts
 *
 * Centralized React Query key factory. Every hook in
 * category.hooks.ts builds its key exclusively from this factory so
 * cache invalidation after a mutation (create/update/deactivate) can
 * target exactly the right queries without guessing key shapes at
 * call sites.
 */
export const categoryQueryKeys = {
  all: ['categories'] as const,
  lists: () => [...categoryQueryKeys.all, 'list'] as const,
  list: (params: { departmentId?: string; parentCategoryId?: string | null }) =>
    [...categoryQueryKeys.lists(), params] as const,
  tree: (departmentId: string) => [...categoryQueryKeys.all, 'tree', departmentId] as const,
  details: () => [...categoryQueryKeys.all, 'detail'] as const,
  detail: (id: string) => [...categoryQueryKeys.details(), id] as const,
  bySlug: (departmentSlug: string, categorySlug: string) =>
    [...categoryQueryKeys.all, 'slug', departmentSlug, categorySlug] as const,
};
