/**
 * src/features/customer/customer.repository.ts
 *
 * RLS reminder (016_rls.sql):
 *   customer_tier:            public SELECT; write gated on customers.manage_taxonomy
 *   customer (staff paths):   customer_staff_read (customers.view OR customers.manage);
 *                             customer_staff_write UPDATE gated on customers.manage
 *   loyalty_account:          owner SELECT; staff ALL gated on customers.manage
 *   loyalty_transaction:      owner SELECT (via join to loyalty_account.customer_id);
 *                             staff ALL gated on customers.manage
 *   referral:                 owner SELECT (referrer OR referred); staff ALL gated on customers.manage
 *   communication_preference: owner ALL (customer_id = auth.uid())
 *   customer_device:          owner ALL (customer_id = auth.uid())
 *   app_anonymize_customer:   RPC, self OR customers.manage (021_customer_security_fix.sql)
 */
import { supabase } from '../../lib/supabase/client';
import type {
  CustomerTierRow,
  CustomerTierInsert,
  CustomerTierUpdate,
  CustomerRow,
  CustomerUpdate,
  LoyaltyAccountRow,
  LoyaltyTransactionRow,
  LoyaltyTransactionInsert,
  ReferralRow,
  ReferralInsert,
  CommunicationPreferenceRow,
  CommunicationChannel,
  CustomerDeviceRow,
  CustomerDeviceInsert,
} from '../../lib/supabase/database.types';
import { toRange } from '../../lib/supabase/queryHelpers';
import type { ListCustomersParams } from './customer.types';

// ---------------------------------------------------------------------
// Customer tier
// ---------------------------------------------------------------------

export async function findCustomerTiers(): Promise<CustomerTierRow[]> {
  const { data, error } = await supabase.from('customer_tier').select('*').order('sort_order', { ascending: true });
  if (error) throw error;
  return data;
}

export async function findCustomerTierById(id: string): Promise<CustomerTierRow | null> {
  const { data, error } = await supabase.from('customer_tier').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data;
}

export async function insertCustomerTier(input: CustomerTierInsert): Promise<CustomerTierRow> {
  const { data, error } = await supabase.from('customer_tier').insert(input).select('*').single();
  if (error) throw error;
  return data;
}

export async function updateCustomerTierRow(id: string, patch: CustomerTierUpdate): Promise<CustomerTierRow> {
  const { data, error } = await supabase
    .from('customer_tier')
    .update(patch)
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

// ---------------------------------------------------------------------
// Staff-side customer management
// ---------------------------------------------------------------------

export async function findCustomersForStaff(
  params: ListCustomersParams
): Promise<{ rows: CustomerRow[]; count: number | null }> {
  let query = supabase.from('customer').select('*', { count: 'exact' }).is('deleted_at', null);

  if (params.tierId) query = query.eq('tier_id', params.tierId);
  if (params.searchTerm) {
    const term = `%${params.searchTerm}%`;
    query = query.or(`full_name.ilike.${term},email.ilike.${term},phone.ilike.${term}`);
  }

  query = query.order('created_at', { ascending: false });

  const [from, to] = toRange({ page: params.page, pageSize: params.pageSize });
  query = query.range(from, to);

  const { data, error, count } = await query;
  if (error) throw error;
  return { rows: data, count };
}

export async function findCustomerByIdForStaff(id: string): Promise<CustomerRow | null> {
  const { data, error } = await supabase.from('customer').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data;
}

export async function updateCustomerTierAssignment(customerId: string, tierId: string | null): Promise<CustomerRow> {
  const patch: CustomerUpdate = { tier_id: tierId };
  const { data, error } = await supabase
    .from('customer')
    .update(patch)
    .eq('id', customerId)
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

export async function anonymizeCustomerRpc(customerId: string): Promise<void> {
  const { error } = await supabase.rpc('app_anonymize_customer', { p_customer_id: customerId });
  if (error) throw error;
}

// ---------------------------------------------------------------------
// Loyalty
// ---------------------------------------------------------------------

export async function findLoyaltyAccountByCustomerId(customerId: string): Promise<LoyaltyAccountRow | null> {
  const { data, error } = await supabase
    .from('loyalty_account')
    .select('*')
    .eq('customer_id', customerId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function findLoyaltyTransactions(loyaltyAccountId: string): Promise<LoyaltyTransactionRow[]> {
  const { data, error } = await supabase
    .from('loyalty_transaction')
    .select('*')
    .eq('loyalty_account_id', loyaltyAccountId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function insertLoyaltyTransaction(
  input: LoyaltyTransactionInsert
): Promise<LoyaltyTransactionRow> {
  const { data, error } = await supabase.from('loyalty_transaction').insert(input).select('*').single();
  if (error) throw error;
  return data;
}

// ---------------------------------------------------------------------
// Referral
// ---------------------------------------------------------------------

export async function findReferralsForCustomer(customerId: string): Promise<ReferralRow[]> {
  const { data, error } = await supabase
    .from('referral')
    .select('*')
    .or(`referrer_customer_id.eq.${customerId},referred_customer_id.eq.${customerId}`)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function findReferralByCode(code: string): Promise<ReferralRow | null> {
  const { data, error } = await supabase.from('referral').select('*').eq('code', code).maybeSingle();
  if (error) throw error;
  return data;
}

export async function insertReferral(input: ReferralInsert): Promise<ReferralRow> {
  const { data, error } = await supabase.from('referral').insert(input).select('*').single();
  if (error) throw error;
  return data;
}

export async function updateReferralStatus(
  id: string,
  status: 'pending' | 'rewarded' | 'expired'
): Promise<ReferralRow> {
  const { data, error } = await supabase.from('referral').update({ status }).eq('id', id).select('*').single();
  if (error) throw error;
  return data;
}

// ---------------------------------------------------------------------
// Communication preference
// ---------------------------------------------------------------------

export async function findCommunicationPreferences(customerId: string): Promise<CommunicationPreferenceRow[]> {
  const { data, error } = await supabase
    .from('communication_preference')
    .select('*')
    .eq('customer_id', customerId);
  if (error) throw error;
  return data;
}

export async function upsertCommunicationPreference(params: {
  customerId: string;
  channel: CommunicationChannel;
  optIn: boolean;
}): Promise<CommunicationPreferenceRow> {
  const { data, error } = await supabase
    .from('communication_preference')
    .upsert(
      { customer_id: params.customerId, channel: params.channel, opt_in: params.optIn },
      { onConflict: 'customer_id,channel' }
    )
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

// ---------------------------------------------------------------------
// Customer device
// ---------------------------------------------------------------------

export async function findActiveDevicesForCustomer(customerId: string): Promise<CustomerDeviceRow[]> {
  const { data, error } = await supabase
    .from('customer_device')
    .select('*')
    .eq('customer_id', customerId)
    .eq('is_active', true);
  if (error) throw error;
  return data;
}

export async function upsertDeviceRegistration(input: CustomerDeviceInsert): Promise<CustomerDeviceRow> {
  const { data, error } = await supabase
    .from('customer_device')
    .upsert(
      { ...input, is_active: true, last_seen_at: new Date().toISOString() },
      { onConflict: 'push_token' }
    )
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

export async function deactivateDevice(id: string): Promise<void> {
  const { error } = await supabase.from('customer_device').update({ is_active: false }).eq('id', id);
  if (error) throw error;
}
