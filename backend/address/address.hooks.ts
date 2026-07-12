/**
 * src/features/address/address.hooks.ts
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as service from './address.service';
import { addressQueryKeys } from './address.queryKeys';
import type { CreateAddressInput, UpdateAddressInput } from './address.types';

export function useAddressesForCustomer(customerId: string | undefined) {
  return useQuery({
    queryKey: addressQueryKeys.forCustomer(customerId ?? ''),
    queryFn: () => service.listAddressesForCustomer(customerId as string),
    enabled: Boolean(customerId),
  });
}

export function useAddress(id: string | undefined) {
  return useQuery({
    queryKey: addressQueryKeys.detail(id ?? ''),
    queryFn: () => service.getAddressById(id as string),
    enabled: Boolean(id),
  });
}

export function useCreateAddress() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateAddressInput) => service.createAddress(input),
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: addressQueryKeys.forCustomer(created.customerId) });
    },
  });
}

export function useUpdateAddress() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateAddressInput }) =>
      service.updateAddress(id, input),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: addressQueryKeys.detail(updated.id) });
      queryClient.invalidateQueries({ queryKey: addressQueryKeys.forCustomer(updated.customerId) });
    },
  });
}

export function useSetDefaultAddress() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => service.setDefaultAddress(id),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: addressQueryKeys.forCustomer(updated.customerId) });
    },
  });
}

export function useDeleteAddress() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => service.deleteAddress(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: addressQueryKeys.all }),
  });
}
