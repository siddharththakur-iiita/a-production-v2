/**
 * src/features/auth/auth.service.ts
 *
 * Core Authentication module. Wraps the Supabase JS v2 auth client
 * plus the public.customer table (007_customers.sql /
 * 019_auth_bootstrap.sql) behind a small, typed surface. Every
 * exported function here corresponds to a real, exact query shape
 * against the frozen schema:
 *
 *   - Signup/signin/signout/session/OTP:  Supabase Auth SDK only.
 *   - Profile read:   SELECT * FROM customer WHERE id = :userId
 *                      (satisfied by RLS policy customer_self_read,
 *                      016_rls.sql — no service-role needed).
 *   - Profile update: UPDATE customer SET ... WHERE id = :userId
 *                      (satisfied by RLS policy customer_self_update).
 *
 * The public.customer ROW ITSELF is never inserted by this module —
 * that is the exclusive responsibility of the handle_new_customer()
 * trigger (019_auth_bootstrap.sql), which fires atomically on
 * auth.users insert. This module only ever reads/updates that row
 * after the fact.
 */
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../../lib/supabase/client';
import type { CustomerUpdate } from '../../lib/supabase/database.types';
import {
  mapCustomerRow,
  type CustomerProfile,
  type SignUpWithEmailParams,
  type SignInWithEmailParams,
  type SignUpWithPhoneParams,
  type VerifyPhoneOtpParams,
  type UpdateCustomerProfileParams,
} from './auth.types';
import { AppAuthError, mapPostgrestError, mapSupabaseAuthError } from './auth.errors';

// ---------------------------------------------------------------------
// Sign up
// ---------------------------------------------------------------------

/**
 * Registers a new customer via email + password. The corresponding
 * public.customer row is created automatically by
 * handle_new_customer() the moment Supabase Auth inserts into
 * auth.users — this function does not, and must not, insert into
 * public.customer directly.
 */
export async function signUpWithEmail(params: SignUpWithEmailParams): Promise<{
  user: User | null;
  session: Session | null;
}> {
  const { data, error } = await supabase.auth.signUp({
    email: params.email,
    password: params.password,
    options: {
      data: {
        full_name: params.fullName ?? null,
      },
    },
  });

  if (error) throw mapSupabaseAuthError(error);

  // marketing_opt_in has no equivalent in auth.users' metadata and
  // isn't set by handle_new_customer(), so it's applied as a
  // follow-up update once the trigger-created row exists. If the
  // project requires email confirmation before a session exists,
  // data.user is populated but data.session is null; the update
  // below is skipped in that case since RLS (customer_self_update)
  // requires an authenticated session to succeed, and will be
  // applied on first sign-in instead via completeProfileSetup().
  if (params.marketingOptIn !== undefined && data.session) {
    await updateCustomerProfile({ marketingOptIn: params.marketingOptIn });
  }

  return { user: data.user, session: data.session };
}

/**
 * Registers/signs in a customer via phone number, sending an OTP.
 * Supabase treats an unrecognized phone number as an implicit signup
 * at verifyPhoneOtp time — there is no separate "phone signup"
 * endpoint, matching Supabase's own passwordless model.
 */
export async function requestPhoneOtp(params: SignUpWithPhoneParams): Promise<void> {
  const { error } = await supabase.auth.signInWithOtp({ phone: params.phone });
  if (error) throw mapSupabaseAuthError(error);
}

/**
 * Completes a phone-OTP sign-in/sign-up. On first-ever verification
 * for a given phone number this is also what causes auth.users to
 * gain a row, which in turn fires handle_new_customer().
 */
export async function verifyPhoneOtp(params: VerifyPhoneOtpParams): Promise<{
  user: User | null;
  session: Session | null;
}> {
  const { data, error } = await supabase.auth.verifyOtp({
    phone: params.phone,
    token: params.token,
    type: 'sms',
  });

  if (error) throw mapSupabaseAuthError(error);
  return { user: data.user, session: data.session };
}

// ---------------------------------------------------------------------
// Sign in
// ---------------------------------------------------------------------

export async function signInWithEmail(params: SignInWithEmailParams): Promise<{
  user: User;
  session: Session;
}> {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: params.email,
    password: params.password,
  });

  if (error) throw mapSupabaseAuthError(error);
  if (!data.session || !data.user) {
    throw new AppAuthError('session_missing', 'Sign-in succeeded but no session was returned.');
  }

  return { user: data.user, session: data.session };
}

/**
 * Signs in as an anonymous guest (023_guest_cart_support.sql). Creates
 * a real auth.users row (with is_anonymous = true) and a real session/
 * auth.uid(), which handle_new_customer() bootstraps into a
 * public.customer row with is_anonymous = true — at which point every
 * existing owner-scoped RLS policy (cart, wishlist, etc.) already
 * works for this guest with no special-casing, since they all key off
 * customer_id = auth.uid() regardless of whether that identity is
 * anonymous or a fully registered account. This is the sanctioned way
 * to support guest carts; a raw client-side session_id string has no
 * working RLS path at all (see cart.service.ts for where this is
 * actually used).
 *
 * If the visitor already has any session (anonymous or real), callers
 * should prefer getSession() and only call this when no session
 * exists — see useEnsureSession() in AuthProvider.tsx.
 */
export async function signInAnonymously(): Promise<{ user: User; session: Session }> {
  const { data, error } = await supabase.auth.signInAnonymously();

  if (error) throw mapSupabaseAuthError(error);
  if (!data.session || !data.user) {
    throw new AppAuthError('session_missing', 'Anonymous sign-in succeeded but no session was returned.');
  }

  return { user: data.user, session: data.session };
}

// ---------------------------------------------------------------------
// Session management
// ---------------------------------------------------------------------

export async function getSession(): Promise<Session | null> {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw mapSupabaseAuthError(error);
  return data.session;
}

/**
 * Returns the current session if one exists (anonymous or real),
 * otherwise transparently creates an anonymous one via
 * signInAnonymously(). This is the bootstrapping step a guest
 * storefront visitor needs before any owner-scoped action (starting a
 * cart, saving a wishlist item) can succeed — every such RLS policy
 * requires *some* auth.uid(), and this guarantees one exists without
 * forcing the visitor through a real signup first.
 */
export async function ensureSession(): Promise<Session> {
  const existing = await getSession();
  if (existing) return existing;

  const { session } = await signInAnonymously();
  return session;
}

export async function getCurrentUser(): Promise<User | null> {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw mapSupabaseAuthError(error);
  return data.user;
}

export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) throw mapSupabaseAuthError(error);
}

/**
 * Subscribes to auth state changes (sign-in, sign-out, token
 * refresh). Returns the unsubscribe function directly, matching the
 * cleanup-function convention React's useEffect expects.
 */
export function onAuthStateChange(
  callback: (session: Session | null) => void
): () => void {
  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(session);
  });

  return () => subscription.unsubscribe();
}

// ---------------------------------------------------------------------
// Password management
// ---------------------------------------------------------------------

export async function requestPasswordReset(email: string, redirectTo?: string): Promise<void> {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo,
  });
  if (error) throw mapSupabaseAuthError(error);
}

export async function updatePassword(newPassword: string): Promise<void> {
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw mapSupabaseAuthError(error);
}

// ---------------------------------------------------------------------
// Customer profile (public.customer)
// ---------------------------------------------------------------------

/**
 * Fetches the caller's own customer profile.
 * Query: SELECT * FROM customer WHERE id = :userId LIMIT 1
 * Authorized by RLS policy customer_self_read (016_rls.sql):
 * `id = app_current_customer_id()`. No explicit permission check is
 * needed here beyond having a valid session — RLS is the boundary.
 */
export async function getCurrentCustomerProfile(): Promise<CustomerProfile | null> {
  const user = await getCurrentUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('customer')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  if (error) throw mapPostgrestError(error);
  if (!data) return null;

  return mapCustomerRow(data);
}

/**
 * Updates the caller's own customer profile.
 * Query: UPDATE customer SET full_name = ..., marketing_opt_in = ...
 *        WHERE id = :userId
 * Authorized by RLS policy customer_self_update (016_rls.sql):
 * `id = app_current_customer_id()` on both USING and WITH CHECK.
 * Only the two fields a customer is expected to self-service are
 * exposed here (full_name, marketing_opt_in) — email/phone changes
 * go through Supabase Auth's own updateUser()/OTP re-verification
 * flow, not a direct table write, since those columns are also
 * identity-bearing (customer.email/customer.phone) and changing them
 * outside the auth flow would desynchronize auth.users from
 * public.customer.
 */
export async function updateCustomerProfile(
  params: UpdateCustomerProfileParams
): Promise<CustomerProfile> {
  const user = await getCurrentUser();
  if (!user) {
    throw new AppAuthError('session_missing', 'You must be signed in to update your profile.');
  }

  const patch: CustomerUpdate = {};
  if (params.fullName !== undefined) patch.full_name = params.fullName;
  if (params.marketingOptIn !== undefined) patch.marketing_opt_in = params.marketingOptIn;

  const { data, error } = await supabase
    .from('customer')
    .update(patch)
    .eq('id', user.id)
    .select('*')
    .single();

  if (error) throw mapPostgrestError(error);
  return mapCustomerRow(data);
}

/**
 * Safety-net for the email-confirmation-required signup path: applies
 * any profile fields (e.g. marketingOptIn) that couldn't be written
 * at signUpWithEmail() time because no session existed yet. Call this
 * once after the first successful sign-in following a fresh signup.
 * A no-op if there is nothing pending — cheap to call unconditionally.
 */
export async function completeProfileSetup(
  params: UpdateCustomerProfileParams
): Promise<CustomerProfile | null> {
  const profile = await getCurrentCustomerProfile();
  if (!profile) return null;
  if (Object.keys(params).length === 0) return profile;
  return updateCustomerProfile(params);
}
