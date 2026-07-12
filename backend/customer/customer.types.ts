/**
 * src/features/customer/customer.types.ts
 *
 * Domain types for the Customers module: customer_tier, staff-side
 * customer management, loyalty_account/loyalty_transaction, referral,
 * communication_preference, and customer_device (007_customers.sql).
 *
 * Scope note: self-service "my own profile" read/update already lives
 * in the Authentication module (auth.service.ts getCurrentCustomerProfile/
 * updateCustomerProfile) — this module does not duplicate that. It
 * owns the broader customer domain: admin/staff customer management,
 * and the customer-owned sub-resources (loyalty, referrals,
 * communication preferences, devices) the Auth module's profile
 * surface does not cover.
 */
import type {
  CustomerTierRow,
  CustomerRow,
  LoyaltyAccountRow,
  LoyaltyTransactionRow,
  ReferralRow,
  CommunicationPreferenceRow,
  CustomerDeviceRow,
} from '../../lib/supabase/database.types';

// ---------------------------------------------------------------------
// Customer tier
// ---------------------------------------------------------------------

export interface CustomerTier {
  id: string;
  name: string;
  minSpendThreshold: number;
  benefits: Record<string, unknown> | null;
  sortOrder: number;
}

export function mapCustomerTierRow(row: CustomerTierRow): CustomerTier {
  return {
    id: row.id,
    name: row.name,
    minSpendThreshold: Number(row.min_spend_threshold),
    benefits: row.benefits as Record<string, unknown> | null,
    sortOrder: row.sort_order,
  };
}

export interface CreateCustomerTierInput {
  name: string;
  minSpendThreshold?: number;
  benefits?: Record<string, unknown>;
  sortOrder?: number;
}

export interface UpdateCustomerTierInput {
  name?: string;
  minSpendThreshold?: number;
  benefits?: Record<string, unknown> | null;
  sortOrder?: number;
}

// ---------------------------------------------------------------------
// Staff-side customer management
// ---------------------------------------------------------------------

export interface CustomerSummary {
  id: string;
  fullName: string | null;
  email: string | null;
  phone: string | null;
  tierId: string | null;
  marketingOptIn: boolean;
  createdAt: string;
}

export function mapCustomerSummary(row: CustomerRow): CustomerSummary {
  return {
    id: row.id,
    fullName: row.full_name,
    email: row.email,
    phone: row.phone,
    tierId: row.tier_id,
    marketingOptIn: row.marketing_opt_in,
    createdAt: row.created_at,
  };
}

export interface ListCustomersParams {
  /** Matches against full_name/email/phone — see customer.repository.ts for the exact query shape. */
  searchTerm?: string;
  tierId?: string;
  page?: number;
  pageSize?: number;
}

// ---------------------------------------------------------------------
// Loyalty
// ---------------------------------------------------------------------

export interface LoyaltyAccount {
  id: string;
  customerId: string;
  pointsBalance: number;
}

export function mapLoyaltyAccountRow(row: LoyaltyAccountRow): LoyaltyAccount {
  return { id: row.id, customerId: row.customer_id, pointsBalance: row.points_balance };
}

export interface LoyaltyTransaction {
  id: string;
  loyaltyAccountId: string;
  pointsDelta: number;
  reason: string;
  referenceOrderId: string | null;
  createdAt: string;
}

export function mapLoyaltyTransactionRow(row: LoyaltyTransactionRow): LoyaltyTransaction {
  return {
    id: row.id,
    loyaltyAccountId: row.loyalty_account_id,
    pointsDelta: row.points_delta,
    reason: row.reason,
    referenceOrderId: row.reference_order_id,
    createdAt: row.created_at,
  };
}

export interface IssueLoyaltyAdjustmentInput {
  loyaltyAccountId: string;
  pointsDelta: number;
  reason: string;
  referenceOrderId?: string;
}

// ---------------------------------------------------------------------
// Referral
// ---------------------------------------------------------------------

export type ReferralStatus = ReferralRow['status'];

export interface Referral {
  id: string;
  referrerCustomerId: string;
  referredCustomerId: string;
  code: string;
  status: ReferralStatus;
  createdAt: string;
}

export function mapReferralRow(row: ReferralRow): Referral {
  return {
    id: row.id,
    referrerCustomerId: row.referrer_customer_id,
    referredCustomerId: row.referred_customer_id,
    code: row.code,
    status: row.status,
    createdAt: row.created_at,
  };
}

export interface RedeemReferralCodeInput {
  code: string;
  /** The newly-signed-up customer redeeming the code (the referred party). */
  referredCustomerId: string;
}

// ---------------------------------------------------------------------
// Communication preference
// ---------------------------------------------------------------------

export type CommunicationChannel = CommunicationPreferenceRow['channel'];

export interface CommunicationPreference {
  id: string;
  customerId: string;
  channel: CommunicationChannel;
  optIn: boolean;
}

export function mapCommunicationPreferenceRow(row: CommunicationPreferenceRow): CommunicationPreference {
  return { id: row.id, customerId: row.customer_id, channel: row.channel, optIn: row.opt_in };
}

export interface SetCommunicationPreferenceInput {
  customerId: string;
  channel: CommunicationChannel;
  optIn: boolean;
}

// ---------------------------------------------------------------------
// Customer device
// ---------------------------------------------------------------------

export type CustomerDevicePlatform = CustomerDeviceRow['platform'];

export interface CustomerDevice {
  id: string;
  customerId: string;
  platform: CustomerDevicePlatform;
  pushToken: string;
  lastSeenAt: string;
  isActive: boolean;
}

export function mapCustomerDeviceRow(row: CustomerDeviceRow): CustomerDevice {
  return {
    id: row.id,
    customerId: row.customer_id,
    platform: row.platform,
    pushToken: row.push_token,
    lastSeenAt: row.last_seen_at,
    isActive: row.is_active,
  };
}

export interface RegisterDeviceInput {
  customerId: string;
  platform: CustomerDevicePlatform;
  pushToken: string;
}
