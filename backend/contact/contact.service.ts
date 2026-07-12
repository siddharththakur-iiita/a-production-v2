/**
 * src/features/contact/contact.service.ts
 */
import * as repo from './contact.repository';
import { mapInquiryRow, type Inquiry, type SubmitInquiryInput } from './contact.types';
import { submitInquirySchema } from './contact.validation';
import { ContactError, mapContactPostgrestError, mapContactZodError } from './contact.errors';
import type { InquiryStatus } from '../../lib/supabase/database.types';

/** Submits an inquiry via app_submit_inquiry (012_contact.sql) — rate-limited and server-validated. Returns the new inquiry's id; fetch it via getInquiryById if the full row is needed. */
export async function submitInquiry(input: SubmitInquiryInput): Promise<string> {
  const parsed = submitInquirySchema.safeParse(input);
  if (!parsed.success) throw mapContactZodError(parsed.error);

  try {
    return await repo.submitInquiryRpc({
      p_name: parsed.data.name,
      p_email: parsed.data.email,
      p_phone: parsed.data.phone,
      p_subject: parsed.data.subject,
      p_message: parsed.data.message,
      p_source_page: parsed.data.sourcePage,
      p_order_id: parsed.data.orderId,
      p_inquiry_type: parsed.data.inquiryType,
    });
  } catch (err) {
    throw mapContactPostgrestError(err as never);
  }
}

export async function listMyInquiries(customerId: string): Promise<Inquiry[]> {
  try {
    const rows = await repo.findMyInquiries(customerId);
    return rows.map(mapInquiryRow);
  } catch (err) {
    throw mapContactPostgrestError(err as never);
  }
}

export async function listInquiriesForStaff(): Promise<Inquiry[]> {
  try {
    const rows = await repo.findInquiriesForStaff();
    return rows.map(mapInquiryRow);
  } catch (err) {
    throw mapContactPostgrestError(err as never);
  }
}

export async function getInquiryById(id: string): Promise<Inquiry | null> {
  try {
    const row = await repo.findInquiryById(id);
    return row ? mapInquiryRow(row) : null;
  } catch (err) {
    throw mapContactPostgrestError(err as never);
  }
}

// A small, linear lifecycle — new -> contacted -> closed, with closed
// also reachable directly from new (e.g. a spam/duplicate inquiry
// closed without ever being contacted). Modeled the same way as every
// other status-bearing entity in this codebase for consistency, even
// though it is simpler than Order/Tailoring's graphs.
const INQUIRY_STATUS_TRANSITIONS: Record<InquiryStatus, InquiryStatus[]> = {
  new: ['contacted', 'closed'],
  contacted: ['closed'],
  closed: [],
};

export async function advanceInquiryStatus(id: string, targetStatus: InquiryStatus): Promise<Inquiry> {
  const current = await repo.findInquiryById(id);
  if (!current) {
    throw new ContactError('inquiry_not_found', 'Inquiry not found.');
  }

  const allowedNext = INQUIRY_STATUS_TRANSITIONS[current.status];
  if (!allowedNext.includes(targetStatus)) {
    throw new ContactError(
      'validation_failed',
      `Cannot move an inquiry from "${current.status}" to "${targetStatus}".`
    );
  }

  try {
    const row = await repo.updateInquiryStatusRow(id, targetStatus);
    return mapInquiryRow(row);
  } catch (err) {
    throw mapContactPostgrestError(err as never);
  }
}

export async function assignInquiry(id: string, adminUserId: string): Promise<Inquiry> {
  try {
    const row = await repo.assignInquiryRow(id, adminUserId);
    return mapInquiryRow(row);
  } catch (err) {
    throw mapContactPostgrestError(err as never);
  }
}
