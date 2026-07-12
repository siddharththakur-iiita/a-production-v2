/**
 * src/features/auth/auth.types.ts
 *
 * Domain types for the Authentication module. Distinct from the raw
 * database.types.ts row shapes — these are the shapes the rest of the
 * application (React components, other feature modules) actually
 * consumes, decoupling callers from PostgREST's raw wire format
 * (e.g. numeric columns arriving as strings).
 */
import type { CustomerRow } from '../../lib/supabase/database.types';

/** The authenticated identity, independent of which auth method was used. */
export interface AuthSession {
  userId: string;
  email: string | null;
  phone: string | null;
  /** True once Supabase Auth has confirmed the email or phone challenge. */
  isVerified: boolean;
}

/** The application-level customer profile, mapped from CustomerRow. */
export interface CustomerProfile {
  id: string;
  fullName: string | null;
  email: string | null;
  phone: string | null;
  phoneVerified: boolean;
  tierId: string | null;
  marketingOptIn: boolean;
  /** True for a guest/anonymous-auth identity (023_guest_cart_support.sql) — see Cart module for how this is used. */
  isAnonymous: boolean;
  createdAt: string;
}

export function mapCustomerRow(row: CustomerRow): CustomerProfile {
  return {
    id: row.id,
    fullName: row.full_name,
    email: row.email,
    phone: row.phone,
    phoneVerified: row.phone_verified,
    tierId: row.tier_id,
    marketingOptIn: row.marketing_opt_in,
    isAnonymous: row.is_anonymous,
    createdAt: row.created_at,
  };
}

export interface SignUpWithEmailParams {
  email: string;
  password: string;
  fullName?: string;
  marketingOptIn?: boolean;
}

export interface SignInWithEmailParams {
  email: string;
  password: string;
}

export interface SignUpWithPhoneParams {
  phone: string; // E.164 format, e.g. +919876543210
}

export interface VerifyPhoneOtpParams {
  phone: string;
  token: string;
}

export interface UpdateCustomerProfileParams {
  fullName?: string;
  marketingOptIn?: boolean;
}

/**
 * The auth method is deliberately left open (BRS v2.0 Ambiguity
 * v2.0-D was never resolved by the business) — the schema and this
 * module support both email/password and phone/OTP identically. The
 * frontend decides which flow(s) to surface in the UI; this module
 * does not assume one over the other.
 */
export type AuthMethod = 'email' | 'phone';
