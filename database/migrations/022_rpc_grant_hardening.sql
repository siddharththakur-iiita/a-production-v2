-- =====================================================================
-- Migration: 022_rpc_grant_hardening.sql
-- Purpose:   SECURITY FIX, discovered via a systematic audit of every
--            SECURITY DEFINER function's grants while implementing
--            the Customers module (prompted by the app_anonymize_customer
--            finding in 021_customer_security_fix.sql). No table
--            changes; grant/revoke statements only, plus one added
--            in-function authorization check.
--
--            Finding (most severe): app_resolve_notification_recipient
--            (014_notifications.sql) is SECURITY DEFINER with no
--            REVOKE/GRANT, so it inherited PostgreSQL's default
--            PUBLIC EXECUTE grant. Since it looks up and returns a
--            customer's real email/phone for a given
--            (related_entity_type, related_entity_id, channel) with
--            NO ownership check, ANY authenticated or anon caller
--            could call it directly with a guessed order/refund/
--            tailoring_request/return_request/inquiry id and exfiltrate
--            that customer's contact details — a complete bypass of
--            every RLS policy protecting that data. Fixed by revoking
--            PUBLIC execute; this function is only ever meant to be
--            called internally by app_enqueue_notification (itself
--            SECURITY DEFINER, so the internal call succeeds
--            regardless of grants — see comment below).
--
--            Also locks down two other internal-only helpers that had
--            the same missing-grant gap (app_convert_quotation_to_order,
--            app_enqueue_notification) — both are only ever invoked
--            from other SECURITY DEFINER trigger functions, never
--            meant to be called directly by a client, so REVOKE-only
--            (no replacement GRANT) is correct for them.
--
--            Finally, makes the two genuinely public-facing helper
--            functions' grants explicit rather than relying on
--            Postgres' implicit PUBLIC default (app_validate_coupon,
--            which is intentionally public-facing per its own
--            docstring, and the RBAC read helpers app_has_permission /
--            app_current_admin_user_id, which RLS policies evaluated
--            as anon/authenticated genuinely need to keep calling).
--
-- Target:    PostgreSQL 15+, Supabase-compatible.
-- Idempotent: Yes.
-- Depends on: 001-021 (all prior migrations)
-- =====================================================================

-- ---------------------------------------------------------------------
-- Internal-only: no client should ever call these directly. Revoking
-- PUBLIC execute does not break their real call sites — each is only
-- ever invoked from within another SECURITY DEFINER function
-- (trg_quotation_status_change and the various trg_*_status_change /
-- trg_return_request_status_change triggers, respectively), and a
-- SECURITY DEFINER function executes with the privileges of its OWNER
-- (a superuser-equivalent role in the Supabase migration-running
-- context), which always bypasses ordinary EXECUTE grant checks —
-- only external, direct client RPC calls are affected by this REVOKE.
-- ---------------------------------------------------------------------

REVOKE ALL ON FUNCTION public.app_resolve_notification_recipient(text, uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.app_enqueue_notification(text, text, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.app_convert_quotation_to_order(uuid) FROM PUBLIC;

-- ---------------------------------------------------------------------
-- Genuinely public-facing: make the grant explicit instead of relying
-- on Postgres' implicit default, matching this project's own stated
-- convention (every other public RPC in this migration set states its
-- grant explicitly).
-- ---------------------------------------------------------------------

REVOKE ALL ON FUNCTION public.app_validate_coupon(text, numeric) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.app_validate_coupon(text, numeric) TO anon, authenticated;

-- ---------------------------------------------------------------------
-- RBAC read helpers: RLS policies evaluated in the context of the
-- anon/authenticated querying role call these directly inside their
-- USING/WITH CHECK clauses, so these two MUST remain callable by both
-- roles — revoking PUBLIC without re-granting to anon/authenticated
-- would break every RLS policy in 016_rls.sql that references them.
-- Made explicit here rather than left to the implicit PUBLIC default,
-- for the same self-documentation reason as app_validate_coupon above.
-- ---------------------------------------------------------------------

REVOKE ALL ON FUNCTION public.app_has_permission(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.app_has_permission(text) TO anon, authenticated;

REVOKE ALL ON FUNCTION public.app_current_admin_user_id() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.app_current_admin_user_id() TO anon, authenticated;

-- app_current_customer_id is SECURITY INVOKER (003_functions.sql), so
-- it carries no privilege-elevation risk the way the DEFINER functions
-- above do — included here purely for the same explicitness
-- consistency, since it is likewise called directly from RLS policies
-- evaluated as anon/authenticated.
REVOKE ALL ON FUNCTION public.app_current_customer_id() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.app_current_customer_id() TO anon, authenticated;
