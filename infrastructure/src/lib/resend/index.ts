/**
 * src/lib/resend/index.ts
 */
export { getResendClient } from './resend.client.server';
export {
  sendWelcomeEmail,
  sendOrderConfirmationEmail,
  sendTailoringQuotationEmail,
  sendPasswordResetEmail,
  sendContactAcknowledgementEmail,
  sendNewsletterConfirmationEmail,
} from './resend.service.server';
export {
  welcomeEmail,
  orderConfirmationEmail,
  tailoringQuotationEmail,
  passwordResetEmail,
  contactAcknowledgementEmail,
  newsletterConfirmationEmail,
} from './resend.templates';
export type { RenderedEmail } from './resend.templates';
export { renderEmailLayout, renderButton, escapeHtml } from './resend.layout';
export { ResendError, mapResendError } from './resend.errors';
export type { ResendErrorCode } from './resend.errors';
export type {
  SendEmailResult,
  WelcomeEmailInput,
  OrderConfirmationEmailInput,
  TailoringQuotationEmailInput,
  PasswordResetEmailInput,
  ContactAcknowledgementEmailInput,
  NewsletterConfirmationEmailInput,
} from './resend.types';
