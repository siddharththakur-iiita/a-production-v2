-- =====================================================================
-- Migration: 021_customer_security_fix.sql
-- Purpose:   SECURITY FIX, discovered while implementing the backend
--            Customers module (not a schema redesign, no table
--            changes).
--
--            app_anonymize_customer(uuid) (007_customers.sql) is
--            SECURITY DEFINER but was defined with no authorization
--            check inside its body and no REVOKE/GRANT statements.
--            PostgreSQL grants EXECUTE on newly created functions to
--            PUBLIC by default, which — combined with SECURITY
--            DEFINER bypassing RLS entirely — meant ANY authenticated
--            (or anon) role could call
--            app_anonymize_customer('<any-customer-id>') and
--            permanently wipe that customer's PII. This is a genuine
--            privilege-escalation / data-destruction vulnerability,
--            not a design nicety, and is fixed here by (a) adding an
--            explicit in-function authorization check — a customer
--            may only anonymize their own account; staff holding
--            customers.manage may anonymize any account for
--            compliance/support-initiated deletion requests — and
--            (b) explicit REVOKE/GRANT statements, matching the
--            pattern already used correctly elsewhere in this
--            migration set (e.g. app_adjust_inventory_stock,
--            020_inventory_rpc.sql) but missed on this function.
--
-- Target:    PostgreSQL 15+, Supabase-compatible.
-- Idempotent: Yes (CREATE OR REPLACE FUNCTION).
-- Depends on: 001-020 (all prior migrations)
-- =====================================================================

CREATE OR REPLACE FUNCTION public.app_anonymize_customer(p_customer_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_customer_id IS DISTINCT FROM public.app_current_customer_id()
     AND NOT public.app_has_permission('customers.manage') THEN
    RAISE EXCEPTION 'not authorized to anonymize customer %', p_customer_id
      USING ERRCODE = '42501'; -- insufficient_privilege, consistent with classifyPostgrestError's permission_denied mapping
  END IF;

  UPDATE public.customer
  SET full_name = NULL,
      email = NULL,
      phone = NULL,
      phone_verified = false,
      marketing_opt_in = false,
      deleted_at = now()
  WHERE id = p_customer_id
    AND deleted_at IS NULL;
END;
$$;

COMMENT ON FUNCTION public.app_anonymize_customer(uuid) IS
  'Anonymizes a customer account (nulls PII, sets deleted_at) while preserving the row and its id for referential integrity with historical orders, reviews, and tailoring cases. Callable only by the customer themselves (self-service closure) or staff holding customers.manage (compliance/support-initiated deletion). Security-hardened in 021_customer_security_fix.sql — the original 007_customers.sql definition had no authorization check.';

REVOKE ALL ON FUNCTION public.app_anonymize_customer(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.app_anonymize_customer(uuid) TO authenticated;
