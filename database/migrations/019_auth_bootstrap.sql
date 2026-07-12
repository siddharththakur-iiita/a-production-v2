-- =====================================================================
-- Migration: 019_auth_bootstrap.sql
-- Purpose:   RUNTIME ISSUE FIX, discovered while implementing the
--            backend Authentication module (not a schema redesign).
--
--            customer.id (007_customers.sql) has no DEFAULT — it is
--            documented as "supplied = auth.users.id" — but no
--            migration in 001-018 ever created the trigger that
--            actually supplies it. Without this, Supabase Auth
--            signup succeeds while public.customer stays empty,
--            silently breaking every RLS policy, order, wishlist,
--            etc. that key off customer.id. This is the standard
--            Supabase "handle_new_user" pattern, exactly as
--            anticipated (but never implemented) in Data Dictionary
--            04's own commentary on the customer table.
--
--            Same gap, same fix, applied to admin_user (004_auth.sql),
--            which has the identical "supplied, not generated" id
--            column and needed the identical bootstrap mechanism.
--
-- Target:    PostgreSQL 15+, Supabase-compatible (relies on the
--            auth.users table Supabase provisions).
-- Idempotent: Yes.
-- Depends on: 001-018 (all prior migrations)
-- =====================================================================

-- ---------------------------------------------------------------------
-- handle_new_customer()
-- Fires after a new row lands in auth.users and creates the
-- corresponding public.customer row. Handles both email and phone
-- signup: auth.users.phone is '' (empty string), not NULL, when phone
-- auth isn't used — inserting '' directly would violate the
-- app_phone domain's format CHECK, so it is normalized to NULL first.
-- ON CONFLICT DO NOTHING makes this safe to fire more than once for
-- the same auth user id (e.g. email confirmation flows that touch
-- auth.users more than once).
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_customer()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.customer (id, email, phone, full_name)
  VALUES (
    NEW.id,
    NULLIF(NEW.email, ''),
    NULLIF(NEW.phone, ''),
    NEW.raw_user_meta_data ->> 'full_name'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.handle_new_customer() IS
  'Bootstraps a public.customer row whenever a new auth.users row is created for the customer-facing auth realm. Normalizes auth.users'' empty-string phone/email to NULL to satisfy the app_phone/app_email domain CHECKs.';

DROP TRIGGER IF EXISTS on_auth_user_created_customer ON auth.users;
CREATE TRIGGER on_auth_user_created_customer
  AFTER INSERT ON auth.users
  FOR EACH ROW
  WHEN (NEW.raw_app_meta_data ->> 'actor_type' IS DISTINCT FROM 'admin')
  EXECUTE FUNCTION public.handle_new_customer();


-- ---------------------------------------------------------------------
-- handle_new_admin_user()
-- Identical pattern for the admin/staff auth realm (004_auth.sql).
-- Guarded by the same raw_app_meta_data.actor_type discriminator so a
-- single Supabase project can serve both auth realms without a
-- signup accidentally creating rows in both public.customer and
-- public.admin_user for the same auth.users id. The app is
-- responsible for setting app_metadata.actor_type = 'admin' at the
-- time an admin account is provisioned (via the Admin API, not
-- self-service signup) — see auth.service admin bootstrap notes.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_admin_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.admin_user (id, email, full_name, status)
  VALUES (
    NEW.id,
    NULLIF(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email),
    'active'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.handle_new_admin_user() IS
  'Bootstraps a public.admin_user row for auth.users rows explicitly flagged as staff via raw_app_meta_data.actor_type = admin. admin_user.email is NOT NULL, so this path assumes email-based admin provisioning.';

DROP TRIGGER IF EXISTS on_auth_user_created_admin ON auth.users;
CREATE TRIGGER on_auth_user_created_admin
  AFTER INSERT ON auth.users
  FOR EACH ROW
  WHEN (NEW.raw_app_meta_data ->> 'actor_type' = 'admin')
  EXECUTE FUNCTION public.handle_new_admin_user();
