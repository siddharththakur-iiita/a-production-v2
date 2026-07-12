/**
 * src/lib/resend/resend.types.ts
 *
 * Email input types intentionally take already-resolved data, not IDs
 * to fetch — fetching is each business module's own responsibility
 * (its service.ts); this infra layer only renders and sends. Where a
 * business module already exports a suitable type, it's reused
 * directly (Order, OrderItem from the Orders module; Quotation from
 * the Tailoring module) rather than redefining a parallel shape.
 */
import type { Order, OrderItem } from '../../features/order';
import type { Quotation } from '../../features/tailoring';

export interface SendEmailResult {
  id: string;
}

export interface WelcomeEmailInput {
  to: string;
  customerName: string;
}

export interface OrderConfirmationEmailInput {
  to: string;
  customerName: string;
  order: Order;
  items: OrderItem[];
}

export interface TailoringQuotationEmailInput {
  to: string;
  customerName: string;
  quotation: Quotation;
  tailoringRequestId: string;
}

export interface PasswordResetEmailInput {
  to: string;
  resetUrl: string;
  expiresInMinutes?: number;
}

export interface ContactAcknowledgementEmailInput {
  to: string;
  name: string;
  subject: string;
}

export interface NewsletterConfirmationEmailInput {
  to: string;
  unsubscribeUrl: string;
}
