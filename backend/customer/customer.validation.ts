/**
 * src/features/customer/customer.validation.ts
 */
import { z } from 'zod';
import { requireAtLeastOneField } from '../../lib/validation/commonSchemas';

export const createCustomerTierSchema = z.object({
  name: z.string().min(1, 'Name is required').max(30),
  minSpendThreshold: z.number().min(0).optional(),
  benefits: z.record(z.unknown()).optional(),
  sortOrder: z.number().int().min(0).optional(),
});

export const updateCustomerTierSchema = requireAtLeastOneField(
  z.object({
    name: z.string().min(1).max(30).optional(),
    minSpendThreshold: z.number().min(0).optional(),
    benefits: z.record(z.unknown()).nullable().optional(),
    sortOrder: z.number().int().min(0).optional(),
  })
);

export const listCustomersSchema = z.object({
  searchTerm: z.string().max(200).optional(),
  tierId: z.string().uuid().optional(),
  page: z.number().int().min(1).optional(),
  pageSize: z.number().int().min(1).max(100).optional(),
});

export const issueLoyaltyAdjustmentSchema = z.object({
  loyaltyAccountId: z.string().uuid(),
  pointsDelta: z.number().int().refine((v) => v !== 0, 'pointsDelta must not be zero'),
  reason: z.string().min(1, 'Reason is required').max(200),
  referenceOrderId: z.string().uuid().optional(),
});

export const redeemReferralCodeSchema = z.object({
  code: z.string().min(1, 'Referral code is required').max(50),
  referredCustomerId: z.string().uuid(),
});

const channelSchema = z.enum(['email', 'sms', 'whatsapp', 'push']);

export const setCommunicationPreferenceSchema = z.object({
  customerId: z.string().uuid(),
  channel: channelSchema,
  optIn: z.boolean(),
});

const platformSchema = z.enum(['ios', 'android', 'web']);

export const registerDeviceSchema = z.object({
  customerId: z.string().uuid(),
  platform: platformSchema,
  pushToken: z.string().min(1, 'Push token is required').max(500),
});

export type CreateCustomerTierValidated = z.infer<typeof createCustomerTierSchema>;
export type UpdateCustomerTierValidated = z.infer<typeof updateCustomerTierSchema>;
export type ListCustomersValidated = z.infer<typeof listCustomersSchema>;
export type IssueLoyaltyAdjustmentValidated = z.infer<typeof issueLoyaltyAdjustmentSchema>;
export type RedeemReferralCodeValidated = z.infer<typeof redeemReferralCodeSchema>;
export type SetCommunicationPreferenceValidated = z.infer<typeof setCommunicationPreferenceSchema>;
export type RegisterDeviceValidated = z.infer<typeof registerDeviceSchema>;
