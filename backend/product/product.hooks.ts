/**
 * src/features/product/product.hooks.ts
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as service from './product.service';
import { productQueryKeys } from './product.queryKeys';
import type {
  AddProductImageInput,
  AddProductSpecificationInput,
  CreateProductInput,
  ListProductsParams,
  SearchProductsParams,
  UpdateProductInput,
} from './product.types';
import type { TaxonomyTableName } from '../../lib/supabase/database.types';

export function useProducts(params: ListProductsParams = {}) {
  return useQuery({
    queryKey: productQueryKeys.list(params),
    queryFn: () => service.listProducts(params),
  });
}

export function useProductSearch(params: SearchProductsParams) {
  return useQuery({
    queryKey: productQueryKeys.search(params),
    queryFn: () => service.searchProducts(params),
    enabled: params.query.trim().length > 0,
  });
}

export function useProduct(slug: string | undefined) {
  return useQuery({
    queryKey: productQueryKeys.bySlug(slug ?? ''),
    queryFn: () => service.getProductBySlug(slug as string),
    enabled: Boolean(slug),
  });
}

export function useProductForStaff(id: string | undefined) {
  return useQuery({
    queryKey: productQueryKeys.byIdStaff(id ?? ''),
    queryFn: () => service.getProductByIdForStaff(id as string),
    enabled: Boolean(id),
  });
}

export function useProductTaxonomyIds(productId: string | undefined, taxonomy: TaxonomyTableName) {
  return useQuery({
    queryKey: productQueryKeys.taxonomy(productId ?? '', taxonomy),
    queryFn: () => service.getProductTaxonomyIds(taxonomy, productId as string),
    enabled: Boolean(productId),
  });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateProductInput) => service.createProduct(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: productQueryKeys.all }),
  });
}

export function useUpdateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateProductInput }) =>
      service.updateProduct(id, input),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: productQueryKeys.all });
      queryClient.setQueryData(productQueryKeys.bySlug(updated.slug), updated);
    },
  });
}

export function usePublishProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => service.publishProduct(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: productQueryKeys.all }),
  });
}

export function useArchiveProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => service.archiveProduct(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: productQueryKeys.all }),
  });
}

export function useRevertProductToDraft() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => service.revertProductToDraft(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: productQueryKeys.all }),
  });
}

export function useSetProductFeatured() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isFeatured }: { id: string; isFeatured: boolean }) =>
      service.setProductFeatured(id, isFeatured),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: productQueryKeys.all }),
  });
}

export function useSetProductTrending() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isTrending }: { id: string; isTrending: boolean }) =>
      service.setProductTrending(id, isTrending),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: productQueryKeys.all }),
  });
}

export function useDeleteProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => service.deleteProduct(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: productQueryKeys.all }),
  });
}

export function useAddProductImage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: AddProductImageInput) => service.addProductImage(input),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: productQueryKeys.byIdStaff(variables.productId) });
    },
  });
}

export function useRemoveProductImage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (imageId: string) => service.removeProductImage(imageId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: productQueryKeys.details() }),
  });
}

export function useSetPrimaryImage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (imageId: string) => service.setPrimaryImage(imageId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: productQueryKeys.details() }),
  });
}

export function useAddProductSpecification() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: AddProductSpecificationInput) => service.addProductSpecification(input),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: productQueryKeys.byIdStaff(variables.productId) });
    },
  });
}

export function useRemoveProductSpecification() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (specificationId: string) => service.removeProductSpecification(specificationId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: productQueryKeys.details() }),
  });
}

export function useAssignTaxonomy() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      taxonomy,
      productId,
      taxonomyId,
    }: {
      taxonomy: TaxonomyTableName;
      productId: string;
      taxonomyId: string;
    }) => service.assignTaxonomy(taxonomy, productId, taxonomyId),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: productQueryKeys.taxonomy(variables.productId, variables.taxonomy),
      });
    },
  });
}

export function useUnassignTaxonomy() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      taxonomy,
      productId,
      taxonomyId,
    }: {
      taxonomy: TaxonomyTableName;
      productId: string;
      taxonomyId: string;
    }) => service.unassignTaxonomy(taxonomy, productId, taxonomyId),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: productQueryKeys.taxonomy(variables.productId, variables.taxonomy),
      });
    },
  });
}
