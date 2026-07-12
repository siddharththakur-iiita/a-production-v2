/**
 * src/lib/razorpay/razorpay.utils.ts
 *
 * Pure amount-conversion helpers — Razorpay's API always works in the
 * smallest currency unit (paise for INR), while this schema's own
 * money columns (numeric(12,2), per every migration's own convention)
 * are always in the major unit (rupees). Every Razorpay call site
 * must go through these, never hand-roll a *100/÷100.
 */
import { RazorpayError } from './razorpay.errors';

export function toPaise(amountInRupees: number): number {
  if (amountInRupees < 0) {
    throw new RazorpayError('validation_failed', 'Amount cannot be negative.');
  }
  return Math.round(amountInRupees * 100);
}

export function fromPaise(amountInPaise: number): number {
  return Math.round(amountInPaise) / 100;
}

export function amountsMatch(expectedRupees: number, actualPaise: number): boolean {
  return Math.abs(toPaise(expectedRupees) - actualPaise) <= 1;
}
