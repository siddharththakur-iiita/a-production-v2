/**
 * src/lib/resend/resend.service.server.ts
 *
 * SERVER-ONLY. The reusable email-sending service: one generic
 * sendEmail() wired to the Resend client and error mapper, plus one
 * convenience function per template in resend.templates.ts. Every
 * business module that needs to send an email (Auth's welcome/
 * password-reset, Orders' confirmation, Tailoring's quotation,
 * Contact's acknowledgement, Newsletter's confirmation) calls the
 * matching function here rather than reaching into Resend directly —
 * this is the one place that knows the From address and the one
 * place that maps Resend failures to ResendError.
 */
import { getResendClient } from './resend.client.server';
import { getServerEnv } from '../env/env';
import { mapResendError, ResendError } from './resend.errors';
import {
  welcomeEmail,
  orderConfirmationEmail,
  tailoringQuotationEmail,
  passwordResetEmail,
  contactAcknowledgementEmail,
  newsletterConfirmationEmail,
} from './resend.templates';
import type {
  SendEmailResult,
  WelcomeEmailInput,
  OrderConfirmationEmailInput,
  TailoringQuotationEmailInput,
  PasswordResetEmailInput,
  ContactAcknowledgementEmailInput,
  NewsletterConfirmationEmailInput,
} from './resend.types';

async function sendEmail(params: { to: string; subject: string; html: string }): Promise<SendEmailResult> {
  if (!params.to || !params.to.includes('@')) {
    throw new ResendError('validation_failed', `"${params.to}" is not a valid recipient email address.`);
  }

  const env = getServerEnv();
  const client = getResendClient();

  try {
    const result = await client.emails.send({
      from: `${env.RESEND_FROM_NAME} <${env.RESEND_FROM_EMAIL}>`,
      to: params.to,
      subject: params.subject,
      html: params.html,
    });

    if (result.error) {
      throw mapResendError(result.error);
    }
    if (!result.data) {
      throw new ResendError('send_failed', 'Resend returned no data and no error — unexpected response shape.');
    }

    return { id: result.data.id };
  } catch (err) {
    throw mapResendError(err);
  }
}

export async function sendWelcomeEmail(input: WelcomeEmailInput): Promise<SendEmailResult> {
  const { subject, html } = welcomeEmail(input);
  return sendEmail({ to: input.to, subject, html });
}

export async function sendOrderConfirmationEmail(input: OrderConfirmationEmailInput): Promise<SendEmailResult> {
  const { subject, html } = orderConfirmationEmail(input);
  return sendEmail({ to: input.to, subject, html });
}

export async function sendTailoringQuotationEmail(input: TailoringQuotationEmailInput): Promise<SendEmailResult> {
  const { subject, html } = tailoringQuotationEmail(input);
  return sendEmail({ to: input.to, subject, html });
}

export async function sendPasswordResetEmail(input: PasswordResetEmailInput): Promise<SendEmailResult> {
  const { subject, html } = passwordResetEmail(input);
  return sendEmail({ to: input.to, subject, html });
}

export async function sendContactAcknowledgementEmail(
  input: ContactAcknowledgementEmailInput
): Promise<SendEmailResult> {
  const { subject, html } = contactAcknowledgementEmail(input);
  return sendEmail({ to: input.to, subject, html });
}

export async function sendNewsletterConfirmationEmail(
  input: NewsletterConfirmationEmailInput
): Promise<SendEmailResult> {
  const { subject, html } = newsletterConfirmationEmail(input);
  return sendEmail({ to: input.to, subject, html });
}
