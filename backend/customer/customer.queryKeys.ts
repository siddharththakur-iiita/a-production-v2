/**
 * src/features/customer/customer.queryKeys.ts
 */
import type { ListCustomersParams } from './customer.types';

export const customerQueryKeys = {
  all: ['customers'] as const,

  tiers: () => [...customerQueryKeys.all, 'tiers'] as const,
  tierDetail: (id: string) => [...customerQueryKeys.tiers(), id] as const,

  staffLists: () => [...customerQueryKeys.all, 'staff-list'] as const,
  staffList: (params: ListCustomersParams) => [...customerQueryKeys.staffLists(), params] as const,
  staffDetail: (id: string) => [...customerQueryKeys.all, 'staff-detail', id] as const,

  loyaltyAccount: (customerId: string) => [...customerQueryKeys.all, customerId, 'loyalty-account'] as const,
  loyaltyTransactions: (loyaltyAccountId: string) =>
    [...customerQueryKeys.all, 'loyalty-transactions', loyaltyAccountId] as const,

  referrals: (customerId: string) => [...customerQueryKeys.all, customerId, 'referrals'] as const,

  communicationPreferences: (customerId: string) =>
    [...customerQueryKeys.all, customerId, 'communication-preferences'] as const,

  devices: (customerId: string) => [...customerQueryKeys.all, customerId, 'devices'] as const,
};
