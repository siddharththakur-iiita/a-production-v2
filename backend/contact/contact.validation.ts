/**
 * src/features/contact/contact.validation.ts
 *
 * Mirrors app_submit_inquiry's own server-side validation
 * (012_contact.sql: name/subject/message required, inquiry_type
 * restricted to the CHECK list) — a genuine second line of defense,
 * not a substitute; the RPC's own validation remains authoritative.
 */
import { z } from 'zod';

export const submitInquirySchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  email: z.string().email('A valid email is required'),
  phone: z.string().max(20).optional(),
  subject: z.string().min(1, 'Subject is required').max(200),
  message: z.string().min(1, 'Message is required').max(5000),
  sourcePage: z.string().max(200).optional(),
  orderId: z.string().uuid().optional(),
  inquiryType: z.enum(['general', 'order_support', 'product_question']).optional(),
});

export type SubmitInquiryValidated = z.infer<typeof submitInquirySchema>;
