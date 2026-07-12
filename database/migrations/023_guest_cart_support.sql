-- =====================================================================
-- Migration: 023_guest_cart_support.sql
-- Classification: IMPLEMENTATION
--
-- Purpose: enables a capability the frozen schema already implies but
-- cannot currently support end-to-end — guest (unauthenticated
-- visitor) carts. cart.session_id (008_cart.sql) exists specifically
-- for this purpose, and cart_owner_all's own RLS design intentionally
-- allows customer_id to be NULL for a guest cart — but as verified
-- while implementing the Cart module:
--
--   1. cart_owner_all (016_rls.sql) is `TO authenticated` only; there
--      is no policy granting the `anon` role any access to cart at
--      all, and `customer_id = auth.uid()` can never be true when
--      customer_id IS NULL (SQL NULL comparison semantics) — so a
--      guest cart, once created, is unreachable by anyone, including
--      its own creator, through the direct PostgREST client.
--
--   2. The correct fix is Supabase's built-in anonymous authentication
--      (supabase.auth.signInAnonymously()), which gives a guest a
--      real auth.uid() — at which point the EXISTING cart_owner_all
--      policy (customer_id = auth.uid()) already works with NO RLS
--      change required.
--
--   3. That fix is blocked by a second, independent constraint:
--      customer_email_or_phone_check (007_customers.sql) requires
--      every customer row to have an email or phone. An anonymous
--      auth.users row has neither, so handle_new_customer()'s INSERT
--      would violate this CHECK and abort the anonymous sign-in
--      transaction entirely.
--
-- Why this is NOT a schema redesign:
--   - No table is removed, renamed, or has a relationship/cardinality
--     change.
--   - The only structural change is one new NULLABLE boolean column
--     with a DEFAULT, which is purely additive.
--   - The CHECK constraint change WIDENS acceptance (adds an OR
--     condition) rather than narrowing it — every row that satisfied
--     the original constraint still satisfies the new one, so this is
--     non-breaking for 100% of existing/expected data.
--   - No other module, table, or RLS policy is touched.
--
-- Target:    PostgreSQL 15+, Supabase-compatible (relies on
--            auth.users.is_anonymous, a real column Supabase Auth
--            provides for exactly this feature).
-- Idempotent: Yes.
-- Depends on: 001-022 (all prior migrations)
-- =====================================================================

-- ---------------------------------------------------------------------
-- Add is_anonymous to customer, defaulting false for all existing
-- rows (every current customer has a real email/phone already, so
-- this default is correct for 100% of existing data).
-- ---------------------------------------------------------------------
ALTER TABLE public.customer
  ADD COLUMN IF NOT EXISTS is_anonymous boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.customer.is_anonymous IS
  'True for a customer row created via Supabase anonymous sign-in (guest cart/checkout flow), mirroring auth.users.is_anonymous. Set exclusively by handle_new_customer() at row-creation time; never updated afterward — if a guest later adds a real email/phone (account "upgrade"/linkIdentity), a corrected row should have is_anonymous explicitly cleared as part of that flow, not silently overwritten by any other path.';

-- ---------------------------------------------------------------------
-- Widen customer_email_or_phone_check to also accept is_anonymous.
-- Dropping and re-adding is required since PostgreSQL has no
-- ALTER CONSTRAINT for CHECK clause bodies; re-validation over
-- existing data is guaranteed to pass since the new condition is a
-- strict OR-widening of the old one.
-- ---------------------------------------------------------------------
ALTER TABLE public.customer
  DROP CONSTRAINT IF EXISTS customer_email_or_phone_check;

ALTER TABLE public.customer
  ADD CONSTRAINT customer_email_or_phone_check
  CHECK (email IS NOT NULL OR phone IS NOT NULL OR is_anonymous);

-- ---------------------------------------------------------------------
-- Update handle_new_customer() (019_auth_bootstrap.sql) to populate
-- is_anonymous from the auth.users row. CREATE OR REPLACE is
-- idempotent and does not require dropping/recreating the trigger
-- that references it.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_customer()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.customer (id, email, phone, full_name, is_anonymous)
  VALUES (
    NEW.id,
    NULLIF(NEW.email, ''),
    NULLIF(NEW.phone, ''),
    NEW.raw_user_meta_data ->> 'full_name',
    COALESCE(NEW.is_anonymous, false)
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.handle_new_customer() IS
  'Bootstraps a public.customer row whenever a new auth.users row is created for the customer-facing auth realm, including anonymous sign-ins (guest cart/checkout support, 023_guest_cart_support.sql). Normalizes empty-string phone/email to NULL to satisfy the app_phone/app_email domain CHECKs.';
