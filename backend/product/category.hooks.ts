/**
 * src/features/category/category.hooks.ts
 *
 * React Query hooks — the only way page/component code should touch
 * the Category module. Every hook delegates to category.service.ts;
 * none of them contain query logic themselves.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as service from './category.service';
import { categoryQueryKeys } from './category.queryKeys';
import type {
  CreateCategoryInput,
  ListCategoriesParams,
  UpdateCategoryInput,
} from './category.types';

export function useCategories(params: ListCategoriesParams = {}) {
  return useQuery({
    queryKey: categoryQueryKeys.list(params),
    queryFn: () => service.listCategories(params),
  });
}

export function useCategoryTree(departmentId: string) {
  return useQuery({
    queryKey: categoryQueryKeys.tree(departmentId),
    queryFn: () => service.getCategoryTree(departmentId),
    enabled: Boolean(departmentId),
  });
}

export function useCategory(id: string | undefined) {
  return useQuery({
    queryKey: categoryQueryKeys.detail(id ?? ''),
    queryFn: () => service.getCategoryById(id as string),
    enabled: Boolean(id),
  });
}

export function useCategoryBySlug(departmentSlug: string | undefined, categorySlug: string | undefined) {
  return useQuery({
    queryKey: categoryQueryKeys.bySlug(departmentSlug ?? '', categorySlug ?? ''),
    queryFn: () => service.getCategoryBySlug(departmentSlug as string, categorySlug as string),
    enabled: Boolean(departmentSlug && categorySlug),
  });
}

export function useCreateCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateCategoryInput) => service.createCategory(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: categoryQueryKeys.all });
    },
  });
}

export function useUpdateCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateCategoryInput }) =>
      service.updateCategory(id, input),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: categoryQueryKeys.all });
      queryClient.setQueryData(categoryQueryKeys.detail(updated.id), updated);
    },
  });
}

export function useDeactivateCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => service.deactivateCategory(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: categoryQueryKeys.all });
    },
  });
}

export function useReactivateCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => service.reactivateCategory(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: categoryQueryKeys.all });
    },
  });
}
