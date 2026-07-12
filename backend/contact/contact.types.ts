/**
 * src/features/contact/contact.types.ts
 *
 * Domain types for the Contact module (012_contact.sql /
 * 007_customers.sql's inquiry table). Scope note: contact_info
 * (phone/email/address display) is already correctly owned by the
 * CMS module's getContactInfo() — a direct, RLS-1 public read against
 * public.contact_info. This module does not duplicate that as a
 * second RPC-based path; it owns what's genuinely unique to it: the
 * inquiry submission workflow and staff-side inquiry management,
 * neither of which any other module touches.
 */
import type { InquiryRow, InquiryStatus, InquiryType } from '../../lib/supabase/database.types';

export interface Inquiry {
  id: string;
  customerId: string | null;
  orderId: string | null;
  inquiryType: InquiryType;
  name: string;
  email: string;
  phone: string | null;
  subject: string;
  message: string;
  status: InquiryStatus;
  handledBy: string | null;
  sourcePage: string | null;
  createdAt: string;
}

export function mapInquiryRow(row: InquiryRow): Inquiry {
  return {
    id: row.id,
    customerId: row.customer_id,
    orderId: row.order_id,
    inquiryType: row.inquiry_type,
    name: row.name,
    email: row.email,
    phone: row.phone,
    subject: row.subject,
    message: row.message,
    status: row.status,
    handledBy: row.handled_by,
    sourcePage: row.source_page,
    createdAt: row.created_at,
  };
}

export interface SubmitInquiryInput {
  name: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
  sourcePage?: string;
  orderId?: string;
  inquiryType?: InquiryType;
}
