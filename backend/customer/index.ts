/**
 * src/features/customer/index.ts
 */
export {
  useCustomerTiers,
  useCustomerTier,
  useCreateCustomerTier,
  useUpdateCustomerTier,
  useCustomersForStaff,
  useCustomerForStaff,
  useAssignCustomerTier,
  useCloseCustomerAccount,
  useMyLoyaltyAccount,
  useLoyaltyTransactions,
  useIssueLoyaltyAdjustment,
  useMyReferrals,
  useRedeemReferralCode,
  useMarkReferralRewarded,
  useCommunicationPreferences,
  useSetCommunicationPreference,
  useMyDevices,
  useRegisterDevice,
  useDeregisterDevice,
} from './customer.hooks';

export {
  listCustomerTiers,
  getCustomerTierById,
  createCustomerTier,
  updateCustomerTier,
  listCustomersForStaff,
  getCustomerByIdForStaff,
  assignCustomerTier,
  closeCustomerAccount,
  getMyLoyaltyAccount,
  listLoyaltyTransactions,
  issueLoyaltyAdjustment,
  getMyReferralIdentifier,
  listMyReferrals,
  redeemReferralCode,
  markReferralRewarded,
  expireReferral,
  listCommunicationPreferences,
  setCommunicationPreference,
  listMyDevices,
  registerDevice,
  deregisterDevice,
} from './customer.service';

export { customerQueryKeys } from './customer.queryKeys';

export type {
  CustomerTier,
  CustomerSummary,
  ListCustomersParams,
  LoyaltyAccount,
  LoyaltyTransaction,
  Referral,
  ReferralStatus,
  CommunicationPreference,
  CommunicationChannel,
  CustomerDevice,
  CustomerDevicePlatform,
  CreateCustomerTierInput,
  UpdateCustomerTierInput,
  IssueLoyaltyAdjustmentInput,
  RedeemReferralCodeInput,
  SetCommunicationPreferenceInput,
  RegisterDeviceInput,
} from './customer.types';

export { CustomerError } from './customer.errors';
export type { CustomerErrorCode } from './customer.errors';
