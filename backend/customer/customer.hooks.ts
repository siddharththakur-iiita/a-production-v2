/**
 * src/features/customer/customer.hooks.ts
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as service from './customer.service';
import { customerQueryKeys } from './customer.queryKeys';
import type {
  CreateCustomerTierInput,
  IssueLoyaltyAdjustmentInput,
  ListCustomersParams,
  RedeemReferralCodeInput,
  RegisterDeviceInput,
  SetCommunicationPreferenceInput,
  UpdateCustomerTierInput,
} from './customer.types';

// ---------------------------------------------------------------------
// Customer tier
// ---------------------------------------------------------------------

export function useCustomerTiers() {
  return useQuery({
    queryKey: customerQueryKeys.tiers(),
    queryFn: () => service.listCustomerTiers(),
  });
}

export function useCustomerTier(id: string | undefined) {
  return useQuery({
    queryKey: customerQueryKeys.tierDetail(id ?? ''),
    queryFn: () => service.getCustomerTierById(id as string),
    enabled: Boolean(id),
  });
}

export function useCreateCustomerTier() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateCustomerTierInput) => service.createCustomerTier(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: customerQueryKeys.tiers() }),
  });
}

export function useUpdateCustomerTier() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateCustomerTierInput }) =>
      service.updateCustomerTier(id, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: customerQueryKeys.tiers() }),
  });
}

// ---------------------------------------------------------------------
// Staff-side customer management
// ---------------------------------------------------------------------

export function useCustomersForStaff(params: ListCustomersParams = {}) {
  return useQuery({
    queryKey: customerQueryKeys.staffList(params),
    queryFn: () => service.listCustomersForStaff(params),
  });
}

export function useCustomerForStaff(id: string | undefined) {
  return useQuery({
    queryKey: customerQueryKeys.staffDetail(id ?? ''),
    queryFn: () => service.getCustomerByIdForStaff(id as string),
    enabled: Boolean(id),
  });
}

export function useAssignCustomerTier() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ customerId, tierId }: { customerId: string; tierId: string | null }) =>
      service.assignCustomerTier(customerId, tierId),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: customerQueryKeys.staffDetail(updated.id) });
      queryClient.invalidateQueries({ queryKey: customerQueryKeys.staffLists() });
    },
  });
}

export function useCloseCustomerAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (customerId: string) => service.closeCustomerAccount(customerId),
    onSuccess: (_data, customerId) => {
      queryClient.invalidateQueries({ queryKey: customerQueryKeys.staffDetail(customerId) });
      queryClient.invalidateQueries({ queryKey: customerQueryKeys.staffLists() });
    },
  });
}

// ---------------------------------------------------------------------
// Loyalty
// ---------------------------------------------------------------------

export function useMyLoyaltyAccount(customerId: string | undefined) {
  return useQuery({
    queryKey: customerQueryKeys.loyaltyAccount(customerId ?? ''),
    queryFn: () => service.getMyLoyaltyAccount(customerId as string),
    enabled: Boolean(customerId),
  });
}

export function useLoyaltyTransactions(loyaltyAccountId: string | undefined) {
  return useQuery({
    queryKey: customerQueryKeys.loyaltyTransactions(loyaltyAccountId ?? ''),
    queryFn: () => service.listLoyaltyTransactions(loyaltyAccountId as string),
    enabled: Boolean(loyaltyAccountId),
  });
}

export function useIssueLoyaltyAdjustment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: IssueLoyaltyAdjustmentInput) => service.issueLoyaltyAdjustment(input),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: customerQueryKeys.loyaltyTransactions(variables.loyaltyAccountId),
      });
      queryClient.invalidateQueries({ queryKey: customerQueryKeys.all });
    },
  });
}

// ---------------------------------------------------------------------
// Referral
// ---------------------------------------------------------------------

export function useMyReferrals(customerId: string | undefined) {
  return useQuery({
    queryKey: customerQueryKeys.referrals(customerId ?? ''),
    queryFn: () => service.listMyReferrals(customerId as string),
    enabled: Boolean(customerId),
  });
}

export function useRedeemReferralCode() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: RedeemReferralCodeInput) => service.redeemReferralCode(input),
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: customerQueryKeys.referrals(created.referrerCustomerId) });
      queryClient.invalidateQueries({ queryKey: customerQueryKeys.referrals(created.referredCustomerId) });
    },
  });
}

export function useMarkReferralRewarded() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (referralId: string) => service.markReferralRewarded(referralId),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: customerQueryKeys.referrals(updated.referrerCustomerId) });
      queryClient.invalidateQueries({ queryKey: customerQueryKeys.referrals(updated.referredCustomerId) });
    },
  });
}

// ---------------------------------------------------------------------
// Communication preference
// ---------------------------------------------------------------------

export function useCommunicationPreferences(customerId: string | undefined) {
  return useQuery({
    queryKey: customerQueryKeys.communicationPreferences(customerId ?? ''),
    queryFn: () => service.listCommunicationPreferences(customerId as string),
    enabled: Boolean(customerId),
  });
}

export function useSetCommunicationPreference() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: SetCommunicationPreferenceInput) => service.setCommunicationPreference(input),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({
        queryKey: customerQueryKeys.communicationPreferences(updated.customerId),
      });
    },
  });
}

// ---------------------------------------------------------------------
// Customer device
// ---------------------------------------------------------------------

export function useMyDevices(customerId: string | undefined) {
  return useQuery({
    queryKey: customerQueryKeys.devices(customerId ?? ''),
    queryFn: () => service.listMyDevices(customerId as string),
    enabled: Boolean(customerId),
  });
}

export function useRegisterDevice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: RegisterDeviceInput) => service.registerDevice(input),
    onSuccess: (registered) => {
      queryClient.invalidateQueries({ queryKey: customerQueryKeys.devices(registered.customerId) });
    },
  });
}

export function useDeregisterDevice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (deviceId: string) => service.deregisterDevice(deviceId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: customerQueryKeys.all }),
  });
}
