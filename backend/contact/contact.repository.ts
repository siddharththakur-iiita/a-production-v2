/**
 * src/features/contact/contact.repository.ts
 *
 * RLS reminder (016_rls.sql):
 *   inquiry_public_insert: anon/authenticated INSERT WITH CHECK (true) — exists as a
 *                          defense-in-depth alternative path, but this module always
 *                          uses the RPC below instead, since raw insert bypasses the
 *                          rate limiting app_submit_inquiry provides.
 *   inquiry_owner_read:    authenticated SELECT WHERE customer_id = app_current_customer_id()
 *   inquiry_staff_all:     authenticated ALL, gated on support.manage
 */
import { supabase } from '../../lib/supabase/client';
import type { InquiryRow, InquiryStatus, SubmitInquiryArgs } from '../../lib/supabase/database.types';

export async function submitInquiryRpc(args: SubmitInquiryArgs): Promise<string> {
  const { data, error } = await supabase.rpc('app_submit_inquiry', args);
  if (error) throw error;
  return data;
}

export async function findMyInquiries(customerId: string): Promise<InquiryRow[]> {
  const { data, error } = await supabase
    .from('inquiry')
    .select('*')
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function findInquiriesForStaff(): Promise<InquiryRow[]> {
  const { data, error } = await supabase.from('inquiry').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function findInquiryById(id: string): Promise<InquiryRow | null> {
  const { data, error } = await supabase.from('inquiry').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data;
}

export async function updateInquiryStatusRow(id: string, status: InquiryStatus): Promise<InquiryRow> {
  const { data, error } = await supabase.from('inquiry').update({ status }).eq('id', id).select('*').single();
  if (error) throw error;
  return data;
}

export async function assignInquiryRow(id: string, adminUserId: string): Promise<InquiryRow> {
  const { data, error } = await supabase
    .from('inquiry')
    .update({ handled_by: adminUserId })
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  return data;
}
