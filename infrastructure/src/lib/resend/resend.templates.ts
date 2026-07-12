/**
 * src/lib/resend/resend.templates.ts
 *
 * Six template-builder functions, each returning {subject, html}.
 * Every one renders into the single shared layout (resend.layout.ts)
 * and uses the shared currency formatter (lib/utils/currency.ts) —
 * neither is reimplemented per template. All user-supplied strings
 * (names, subjects, messages) are passed through escapeHtml before
 * interpolation; only this file's own static markup is trusted raw.
 * Order/OrderItem/Quotation/QuotationLineItem fields referenced below
 * are verified against features/order/order.types.ts and
 * features/tailoring/tailoring.types.ts, not assumed.
 */
import { renderEmailLayout, renderButton, escapeHtml } from './resend.layout';
import { formatCurrency } from '../utils/currency';
import type {
  WelcomeEmailInput,
  OrderConfirmationEmailInput,
  TailoringQuotationEmailInput,
  PasswordResetEmailInput,
  ContactAcknowledgementEmailInput,
  NewsletterConfirmationEmailInput,
} from './resend.types';

export interface RenderedEmail {
  subject: string;
  html: string;
}

export function welcomeEmail(input: WelcomeEmailInput): RenderedEmail {
  const bodyHtml = `
    <h1 style="margin:0 0 16px;font-size:22px;font-weight:normal;">Welcome, ${escapeHtml(input.customerName)}</h1>
    <p style="margin:0 0 16px;">Thank you for creating an account with A Productions. Whether you're drawn to
    our ready-made collections or a fully bespoke commission, we're glad to have you with us.</p>
    <p style="margin:0;">Explore our latest arrivals, or begin a consultation for a custom piece whenever you're ready.</p>
  `;
  return {
    subject: 'Welcome to A Productions',
    html: renderEmailLayout({ previewText: `Welcome to A Productions, ${input.customerName}`, bodyHtml }),
  };
}

export function orderConfirmationEmail(input: OrderConfirmationEmailInput): RenderedEmail {
  const rows = input.items
    .map(
      (item) => `
    <tr>
      <td style="padding:10px 0;border-bottom:1px solid #eeeeee;">${escapeHtml(item.descriptionSnapshot)}</td>
      <td style="padding:10px 0;border-bottom:1px solid #eeeeee;text-align:center;">${item.qty}</td>
      <td style="padding:10px 0;border-bottom:1px solid #eeeeee;text-align:right;">${formatCurrency(item.lineTotal, input.order.currency)}</td>
    </tr>`
    )
    .join('');

  const bodyHtml = `
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:normal;">Order Confirmed</h1>
    <p style="margin:0 0 24px;">Hi ${escapeHtml(input.customerName)}, thank you for your order. Here's a summary of what you ordered.</p>
    <p style="margin:0 0 24px;font-size:13px;color:#888888;">Order ${escapeHtml(input.order.orderNumber)}</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-bottom:16px;">
      <thead>
        <tr>
          <th style="text-align:left;padding-bottom:8px;border-bottom:2px solid #1a1a1a;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Item</th>
          <th style="text-align:center;padding-bottom:8px;border-bottom:2px solid #1a1a1a;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Qty</th>
          <th style="text-align:right;padding-bottom:8px;border-bottom:2px solid #1a1a1a;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Amount</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:16px;">
      <tr><td style="padding:4px 0;color:#666666;">Subtotal</td><td style="padding:4px 0;text-align:right;">${formatCurrency(input.order.subtotal, input.order.currency)}</td></tr>
      ${input.order.discountTotal > 0 ? `<tr><td style="padding:4px 0;color:#666666;">Discount</td><td style="padding:4px 0;text-align:right;">-${formatCurrency(input.order.discountTotal, input.order.currency)}</td></tr>` : ''}
      <tr><td style="padding:4px 0;color:#666666;">Tax</td><td style="padding:4px 0;text-align:right;">${formatCurrency(input.order.taxTotal, input.order.currency)}</td></tr>
      <tr><td style="padding:4px 0;color:#666666;">Shipping</td><td style="padding:4px 0;text-align:right;">${formatCurrency(input.order.shippingTotal, input.order.currency)}</td></tr>
      <tr><td style="padding:12px 0 0;font-weight:bold;border-top:1px solid #eeeeee;">Total</td><td style="padding:12px 0 0;text-align:right;font-weight:bold;border-top:1px solid #eeeeee;">${formatCurrency(input.order.grandTotal, input.order.currency)}</td></tr>
    </table>
  `;
  return {
    subject: `Order Confirmed — ${input.order.orderNumber}`,
    html: renderEmailLayout({ previewText: `Your order ${input.order.orderNumber} is confirmed`, bodyHtml }),
  };
}

export function tailoringQuotationEmail(input: TailoringQuotationEmailInput): RenderedEmail {
  const rows = input.quotation.lineItems
    .map(
      (item) => `
    <tr>
      <td style="padding:10px 0;border-bottom:1px solid #eeeeee;">${escapeHtml(item.description)}</td>
      <td style="padding:10px 0;border-bottom:1px solid #eeeeee;text-align:right;">${formatCurrency(item.amount, 'INR')}</td>
    </tr>`
    )
    .join('');

  const validUntilText = input.quotation.validUntil
    ? `<p style="margin:0 0 16px;font-size:13px;color:#888888;">Valid until ${new Date(input.quotation.validUntil).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</p>`
    : '';

  const bodyHtml = `
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:normal;">Your Bespoke Quotation is Ready</h1>
    <p style="margin:0 0 8px;">Hi ${escapeHtml(input.customerName)}, our atelier has prepared a quotation for your bespoke commission.</p>
    ${validUntilText}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-bottom:16px;">
      <thead>
        <tr><th style="text-align:left;padding-bottom:8px;border-bottom:2px solid #1a1a1a;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Description</th>
        <th style="text-align:right;padding-bottom:8px;border-bottom:2px solid #1a1a1a;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Amount</th></tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:16px;">
      <tr><td style="padding:4px 0;color:#666666;">Subtotal</td><td style="padding:4px 0;text-align:right;">${formatCurrency(input.quotation.subtotal, 'INR')}</td></tr>
      <tr><td style="padding:4px 0;color:#666666;">Tax</td><td style="padding:4px 0;text-align:right;">${formatCurrency(input.quotation.taxTotal, 'INR')}</td></tr>
      <tr><td style="padding:12px 0 0;font-weight:bold;border-top:1px solid #eeeeee;">Total</td><td style="padding:12px 0 0;text-align:right;font-weight:bold;border-top:1px solid #eeeeee;">${formatCurrency(input.quotation.total, 'INR')}</td></tr>
    </table>
    <p style="margin:16px 0 0;">Please review and let us know if you'd like to proceed — our concierge team is happy to answer any questions.</p>
  `;
  return {
    subject: 'Your Bespoke Quotation from A Productions',
    html: renderEmailLayout({ previewText: 'Your bespoke tailoring quotation is ready for review', bodyHtml }),
  };
}

export function passwordResetEmail(input: PasswordResetEmailInput): RenderedEmail {
  const expiryText = input.expiresInMinutes
    ? `<p style="margin:16px 0 0;font-size:13px;color:#888888;">This link expires in ${input.expiresInMinutes} minutes.</p>`
    : '';

  const bodyHtml = `
    <h1 style="margin:0 0 16px;font-size:22px;font-weight:normal;">Reset Your Password</h1>
    <p style="margin:0 0 16px;">We received a request to reset your password. Click below to choose a new one.</p>
    ${renderButton('Reset Password', input.resetUrl)}
    <p style="margin:16px 0 0;font-size:13px;color:#888888;">If you didn't request this, you can safely ignore this email — your password will not be changed.</p>
    ${expiryText}
  `;
  return {
    subject: 'Reset Your Password — A Productions',
    html: renderEmailLayout({ previewText: 'Reset your A Productions password', bodyHtml }),
  };
}

export function contactAcknowledgementEmail(input: ContactAcknowledgementEmailInput): RenderedEmail {
  const bodyHtml = `
    <h1 style="margin:0 0 16px;font-size:22px;font-weight:normal;">We've Received Your Message</h1>
    <p style="margin:0 0 16px;">Hi ${escapeHtml(input.name)}, thank you for contacting A Productions regarding
    "${escapeHtml(input.subject)}". Our team will respond as soon as possible, typically within one business day.</p>
    <p style="margin:0;">If your inquiry is urgent, please reach us directly using the contact details on our website.</p>
  `;
  return {
    subject: `We've received your message: ${input.subject}`,
    html: renderEmailLayout({ previewText: 'Thank you for contacting A Productions', bodyHtml }),
  };
}

export function newsletterConfirmationEmail(input: NewsletterConfirmationEmailInput): RenderedEmail {
  const bodyHtml = `
    <h1 style="margin:0 0 16px;font-size:22px;font-weight:normal;">You're Subscribed</h1>
    <p style="margin:0 0 16px;">Thank you for subscribing to the A Productions newsletter. You'll be the first
    to hear about new collections, trunk shows, and bespoke atelier openings.</p>
    <p style="margin:16px 0 0;font-size:12px;color:#aaaaaa;">
      <a href="${escapeHtml(input.unsubscribeUrl)}" style="color:#aaaaaa;">Unsubscribe</a> at any time.
    </p>
  `;
  return {
    subject: "You're Subscribed to the A Productions Newsletter",
    html: renderEmailLayout({ previewText: 'Welcome to the A Productions newsletter', bodyHtml }),
  };
}
