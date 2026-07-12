/**
 * src/features/collection/collection.hooks.ts
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as service from './collection.service';
import { collectionQueryKeys } from './collection.queryKeys';
import type { CreateCollectionInput, UpdateCollectionInput } from './collection.types';

export function usePublishedCollections() {
  return useQuery({
    queryKey: collectionQueryKeys.publishedList(),
    queryFn: () => service.listPublishedCollections(),
  });
}

export function useCollectionsForStaff() {
  return useQuery({
    queryKey: collectionQueryKeys.staffList(),
    queryFn: () => service.listCollectionsForStaff(),
  });
}

export function useCollectionBySlug(slug: string | undefined) {
  return useQuery({
    queryKey: collectionQueryKeys.bySlug(slug ?? ''),
    queryFn: () => service.getCollectionBySlug(slug as string),
    enabled: Boolean(slug),
  });
}

export function useCollection(id: string | undefined) {
  return useQuery({
    queryKey: collectionQueryKeys.detail(id ?? ''),
    queryFn: () => service.getCollectionById(id as string),
    enabled: Boolean(id),
  });
}

export function useCollectionProducts(collectionId: string | undefined) {
  return useQuery({
    queryKey: collectionQueryKeys.products(collectionId ?? ''),
    queryFn: () => service.getCollectionProducts(collectionId as string),
    enabled: Boolean(collectionId),
  });
}

export function useCreateCollection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateCollectionInput) => service.createCollection(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: collectionQueryKeys.all });
    },
  });
}

export function useUpdateCollection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateCollectionInput }) =>
      service.updateCollection(id, input),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: collectionQueryKeys.all });
      queryClient.setQueryData(collectionQueryKeys.detail(updated.id), updated);
    },
  });
}

export function usePublishCollection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => service.publishCollection(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: collectionQueryKeys.all }),
  });
}

export function useArchiveCollection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => service.archiveCollection(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: collectionQueryKeys.all }),
  });
}

export function useRevertCollectionToDraft() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => service.revertCollectionToDraft(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: collectionQueryKeys.all }),
  });
}

export function useDeleteCollection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => service.deleteCollection(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: collectionQueryKeys.all }),
  });
}

export function useAddProductToCollection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { collectionId: string; productId: string; sortOrder?: number }) =>
      service.addProductToCollection(input),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: collectionQueryKeys.products(variables.collectionId) });
    },
  });
}

export function useRemoveProductFromCollection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ collectionId, productId }: { collectionId: string; productId: string }) =>
      service.removeProductFromCollection(collectionId, productId),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: collectionQueryKeys.products(variables.collectionId) });
    },
  });
}

export function useReorderProductInCollection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      collectionId,
      productId,
      newSortOrder,
    }: {
      collectionId: string;
      productId: string;
      newSortOrder: number;
    }) => service.reorderProductInCollection(collectionId, productId, newSortOrder),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: collectionQueryKeys.products(variables.collectionId) });
    },
  });
}
