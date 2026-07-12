/**
 * src/features/customer/customer.service.ts
 */
import * as repo from './customer.repository';
import {
  mapCustomerTierRow,
  mapCustomerSummary,
  mapLoyaltyAccountRow,
  mapLoyaltyTransactionRow,
  mapReferralRow,
  mapCommunicationPreferenceRow,
  mapCustomerDeviceRow,
  type CustomerTier,
  type CustomerSummary,
  type LoyaltyAccount,
  type LoyaltyTransaction,
  type Referral,
  type CommunicationPreference,
  type CustomerDevice,
  type CreateCustomerTierInput,
  type UpdateCustomerTierInput,
  type ListCustomersParams,
  type IssueLoyaltyAdjustmentInput,
  type RedeemReferralCodeInput,
  type SetCommunicationPreferenceInput,
  type RegisterDeviceInput,
} from './customer.types';
import {
  createCustomerTierSchema,
  updateCustomerTierSchema,
  listCustomersSchema,
  issueLoyaltyAdjustmentSchema,
  redeemReferralCodeSchema,
  setCommunicationPreferenceSchema,
  registerDeviceSchema,
} from './customer.validation';
import { CustomerError, mapCustomerPostgrestError, mapCustomerZodError } from './customer.errors';
import { toPaginatedResult, type PaginatedResult } from '../../lib/supabase/queryHelpers';

// ---------------------------------------------------------------------
// Customer tier
// ---------------------------------------------------------------------

export async function listCustomerTiers(): Promise<CustomerTier[]> {
  try {
    const rows = await repo.findCustomerTiers();
    return rows.map(mapCustomerTierRow);
  } catch (err) {
    throw mapCustomerPostgrestError(err as never);
  }
}

export async function getCustomerTierById(id: string): Promise<CustomerTier | null> {
  try {
    const row = await repo.findCustomerTierById(id);
    return row ? mapCustomerTierRow(row) : null;
  } catch (err) {
    throw mapCustomerPostgrestError(err as never);
  }
}

export async function createCustomerTier(input: CreateCustomerTierInput): Promise<CustomerTier> {
  const parsed = createCustomerTierSchema.safeParse(input);
  if (!parsed.success) throw mapCustomerZodError(parsed.error);

  try {
    const row = await repo.insertCustomerTier({
      name: parsed.data.name,
      min_spend_threshold: parsed.data.minSpendThreshold?.toFixed(2),
      benefits: parsed.data.benefits ?? null,
      sort_order: parsed.data.sortOrder,
    });
    return mapCustomerTierRow(row);
  } catch (err) {
    throw mapCustomerPostgrestError(err as never);
  }
}

export async function updateCustomerTier(id: string, input: UpdateCustomerTierInput): Promise<CustomerTier> {
  const parsed = updateCustomerTierSchema.safeParse(input);
  if (!parsed.success) throw mapCustomerZodError(parsed.error);

  try {
    const row = await repo.updateCustomerTierRow(id, {
      name: parsed.data.name,
      min_spend_threshold: parsed.data.minSpendThreshold?.toFixed(2),
      benefits: parsed.data.benefits,
      sort_order: parsed.data.sortOrder,
    });
    return mapCustomerTierRow(row);
  } catch (err) {
    throw mapCustomerPostgrestError(err as never);
  }
}

// ---------------------------------------------------------------------
// Staff-side customer management
// ---------------------------------------------------------------------

export async function listCustomersForStaff(
  params: ListCustomersParams = {}
): Promise<PaginatedResult<CustomerSummary>> {
  const parsed = listCustomersSchema.safeParse(params);
  if (!parsed.success) throw mapCustomerZodError(parsed.error);

  try {
    const { rows, count } = await repo.findCustomersForStaff(parsed.data);
    return toPaginatedResult(rows.map(mapCustomerSummary), count, parsed.data);
  } catch (err) {
    throw mapCustomerPostgrestError(err as never);
  }
}

export async function getCustomerByIdForStaff(id: string): Promise<CustomerSummary | null> {
  try {
    const row = await repo.findCustomerByIdForStaff(id);
    return row ? mapCustomerSummary(row) : null;
  } catch (err) {
    throw mapCustomerPostgrestError(err as never);
  }
}

export async function assignCustomerTier(customerId: string, tierId: string | null): Promise<CustomerSummary> {
  try {
    const row = await repo.updateCustomerTierAssignment(customerId, tierId);
    return mapCustomerSummary(row);
  } catch (err) {
    throw mapCustomerPostgrestError(err as never);
  }
}

/**
 * Closes a customer account via app_anonymize_customer
 * (021_customer_security_fix.sql). Callable by the customer
 * themselves (self-service closure) or staff holding customers.manage
 * (compliance/support-initiated deletion) — the database function
 * itself enforces this, not this service function; a caller lacking
 * authorization receives a 'not_authorized_for_customer' CustomerError
 * mapped from the RPC's 42501 exception.
 */
export async function closeCustomerAccount(customerId: string): Promise<void> {
  try {
    await repo.anonymizeCustomerRpc(customerId);
  } catch (err) {
    throw mapCustomerPostgrestError(err as never);
  }
}

// ---------------------------------------------------------------------
// Loyalty
// ---------------------------------------------------------------------

export async function getMyLoyaltyAccount(customerId: string): Promise<LoyaltyAccount | null> {
  try {
    const row = await repo.findLoyaltyAccountByCustomerId(customerId);
    return row ? mapLoyaltyAccountRow(row) : null;
  } catch (err) {
    throw mapCustomerPostgrestError(err as never);
  }
}

export async function listLoyaltyTransactions(loyaltyAccountId: string): Promise<LoyaltyTransaction[]> {
  try {
    const rows = await repo.findLoyaltyTransactions(loyaltyAccountId);
    return rows.map(mapLoyaltyTransactionRow);
  } catch (err) {
    throw mapCustomerPostgrestError(err as never);
  }
}

/**
 * Staff-issued goodwill/manual adjustment. Requires customers.manage
 * (loyalty_transaction_staff_all RLS policy) — a customer cannot call
 * this for themselves; earn transactions from real purchases are
 * created by the Orders module at checkout time, not here.
 */
export async function issueLoyaltyAdjustment(input: IssueLoyaltyAdjustmentInput): Promise<LoyaltyTransaction> {
  const parsed = issueLoyaltyAdjustmentSchema.safeParse(input);
  if (!parsed.success) throw mapCustomerZodError(parsed.error);

  try {
    const row = await repo.insertLoyaltyTransaction({
      loyalty_account_id: parsed.data.loyaltyAccountId,
      points_delta: parsed.data.pointsDelta,
      reason: parsed.data.reason,
      reference_order_id: parsed.data.referenceOrderId,
    });
    return mapLoyaltyTransactionRow(row);
  } catch (err) {
    throw mapCustomerPostgrestError(err as never);
  }
}

// ---------------------------------------------------------------------
// Referral
//
// Design note: referral.code is UNIQUE per redemption row, but the
// frozen schema has no column anywhere storing a customer's own
// shareable code before their first successful referral — the Data
// Dictionary itself flags this as an open business-process question,
// not a resolved design. Rather than requesting a schema change for
// something already flagged as "confirm with business," this service
// Design note: referral.code is UNIQUE per redemption row, but the
// frozen schema has no column anywhere storing a customer's own
// shareable code before their first successful referral — the Data
// Dictionary itself flags this as an open business-process question,
// not a resolved design. Rather than requesting a schema change for
// something already flagged as "confirm with business," this service
// resolves it without any SQL change: a customer's shareable referral
// link simply encodes their own customer_id directly (see
// getMyReferralIdentifier), and each redemption generates a fresh
// UUID for the row's own `code` column — satisfying the UNIQUE
// constraint per redemption event while letting the referrer's link
// stay stable and reusable across multiple referred sign-ups. If the
// business later wants human-readable/vanity codes stored explicitly,
// that remains the single, non-breaking nullable-column addition the
// Data Dictionary already anticipated — not something this service
// works around by inventing new state.
// ---------------------------------------------------------------------

/** A customer's own shareable referral identifier — simply their customer_id; see design note above. */
export function getMyReferralIdentifier(customerId: string): string {
  return customerId;
}

export async function listMyReferrals(customerId: string): Promise<Referral[]> {
  try {
    const rows = await repo.findReferralsForCustomer(customerId);
    return rows.map(mapReferralRow);
  } catch (err) {
    throw mapCustomerPostgrestError(err as never);
  }
}

export async function redeemReferralCode(input: RedeemReferralCodeInput): Promise<Referral> {
  const parsed = redeemReferralCodeSchema.safeParse(input);
  if (!parsed.success) throw mapCustomerZodError(parsed.error);

  // The "code" a referred customer enters is the referrer's own
  // customer_id (see design note above) — validated here as a UUID
  // shape before ever reaching the database, since a malformed code
  // otherwise surfaces as an opaque foreign-key-violation.
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidPattern.test(parsed.data.code)) {
    throw new CustomerError('referral_code_not_found', 'This referral code is not valid.');
  }

  if (parsed.data.code === parsed.data.referredCustomerId) {
    throw new CustomerError('self_referral_not_allowed', 'A customer cannot refer themselves.');
  }

  try {
    const row = await repo.insertReferral({
      referrer_customer_id: parsed.data.code,
      referred_customer_id: parsed.data.referredCustomerId,
      code: crypto.randomUUID(),
    });
    return mapReferralRow(row);
  } catch (err) {
    throw mapCustomerPostgrestError(err as never);
  }
}

/** Staff/system: marks a referral as rewarded once the referred customer's qualifying action (e.g. first order) completes. */
export async function markReferralRewarded(referralId: string): Promise<Referral> {
  try {
    const row = await repo.updateReferralStatus(referralId, 'rewarded');
    return mapReferralRow(row);
  } catch (err) {
    throw mapCustomerPostgrestError(err as never);
  }
}

export async function expireReferral(referralId: string): Promise<Referral> {
  try {
    const row = await repo.updateReferralStatus(referralId, 'expired');
    return mapReferralRow(row);
  } catch (err) {
    throw mapCustomerPostgrestError(err as never);
  }
}

// ---------------------------------------------------------------------
// Communication preference
// ---------------------------------------------------------------------

export async function listCommunicationPreferences(customerId: string): Promise<CommunicationPreference[]> {
  try {
    const rows = await repo.findCommunicationPreferences(customerId);
    return rows.map(mapCommunicationPreferenceRow);
  } catch (err) {
    throw mapCustomerPostgrestError(err as never);
  }
}

export async function setCommunicationPreference(
  input: SetCommunicationPreferenceInput
): Promise<CommunicationPreference> {
  const parsed = setCommunicationPreferenceSchema.safeParse(input);
  if (!parsed.success) throw mapCustomerZodError(parsed.error);

  try {
    const row = await repo.upsertCommunicationPreference(parsed.data);
    return mapCommunicationPreferenceRow(row);
  } catch (err) {
    throw mapCustomerPostgrestError(err as never);
  }
}

// ---------------------------------------------------------------------
// Customer device
// ---------------------------------------------------------------------

export async function listMyDevices(customerId: string): Promise<CustomerDevice[]> {
  try {
    const rows = await repo.findActiveDevicesForCustomer(customerId);
    return rows.map(mapCustomerDeviceRow);
  } catch (err) {
    throw mapCustomerPostgrestError(err as never);
  }
}

export async function registerDevice(input: RegisterDeviceInput): Promise<CustomerDevice> {
  const parsed = registerDeviceSchema.safeParse(input);
  if (!parsed.success) throw mapCustomerZodError(parsed.error);

  try {
    const row = await repo.upsertDeviceRegistration({
      customer_id: parsed.data.customerId,
      platform: parsed.data.platform,
      push_token: parsed.data.pushToken,
    });
    return mapCustomerDeviceRow(row);
  } catch (err) {
    throw mapCustomerPostgrestError(err as never);
  }
}

export async function deregisterDevice(deviceId: string): Promise<void> {
  try {
    await repo.deactivateDevice(deviceId);
  } catch (err) {
    throw mapCustomerPostgrestError(err as never);
  }
}
