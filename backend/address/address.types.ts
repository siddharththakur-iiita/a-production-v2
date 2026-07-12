/**
 * src/features/address/address.types.ts
 *
 * Domain types for the Customer Addresses module (public.address,
 * 007_customers.sql). Fully owner-scoped (RLS-2) — a customer manages
 * only their own address book; staff get read-only visibility for
 * support purposes (address_staff_read, 016_rls.sql), which this
 * module also exposes for the future Orders/Support tooling.
 */
import type { AddressRow } from '../../lib/supabase/database.types';

export interface Address {
  id: string;
  customerId: string;
  label: string | null;
  line1: string;
  line2: string | null;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  isDefault: boolean;
}

export function mapAddressRow(row: AddressRow): Address {
  return {
    id: row.id,
    customerId: row.customer_id,
    label: row.label,
    line1: row.line1,
    line2: row.line2,
    city: row.city,
    state: row.state,
    postalCode: row.postal_code,
    country: row.country,
    isDefault: row.is_default,
  };
}

export interface CreateAddressInput {
  customerId: string;
  label?: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postalCode: string;
  country?: string;
  isDefault?: boolean;
}

export interface UpdateAddressInput {
  label?: string | null;
  line1?: string;
  line2?: string | null;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
}
