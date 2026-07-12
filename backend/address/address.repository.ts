/**
 * src/features/address/address.repository.ts
 *
 * RLS reminder (016_rls.sql):
 *   address_owner_all:  authenticated ALL, WHERE customer_id = app_current_customer_id()
 *   address_staff_read: authenticated SELECT, gated on customers.view OR customers.manage
 */
import { supabase } from '../../lib/supabase/client';
import type { AddressRow, AddressInsert, AddressUpdate } from '../../lib/supabase/database.types';

export async function findAddressesForCustomer(customerId: string): Promise<AddressRow[]> {
  const { data, error } = await supabase
    .from('address')
    .select('*')
    .eq('customer_id', customerId)
    .order('is_default', { ascending: false })
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data;
}

export async function findAddressById(id: string): Promise<AddressRow | null> {
  const { data, error } = await supabase.from('address').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data;
}

export async function insertAddress(input: AddressInsert): Promise<AddressRow> {
  const { data, error } = await supabase.from('address').insert(input).select('*').single();
  if (error) throw error;
  return data;
}

export async function updateAddressRow(id: string, patch: AddressUpdate): Promise<AddressRow> {
  const { data, error } = await supabase.from('address').update(patch).eq('id', id).select('*').single();
  if (error) throw error;
  return data;
}

export async function setAddressDefault(id: string): Promise<AddressRow> {
  const { data, error } = await supabase
    .from('address')
    .update({ is_default: true })
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

export async function softDeleteAddress(id: string): Promise<void> {
  const { error } = await supabase.from('address').delete().eq('id', id);
  if (error) throw error;
}
