-- =====================================================================
-- Migration: 026_design_brief_insert_policy.sql
-- Classification: IMPLEMENTATION
--
-- Purpose: adds the missing customer-facing INSERT policy for
-- design_brief.
--
-- Verified gap: design_brief (010_tailoring.sql) has only
-- design_brief_owner_read (SELECT) and design_brief_staff_all
-- (staff-only ALL) in 016_rls.sql — no policy at all permits a
-- customer or guest to insert their own design brief. This is
-- inconsistent with every other customer-submitted table in the same
-- bespoke-tailoring workflow: appointment_public_insert,
-- fabric_selection_public_insert, and reference_image_owner_insert
-- all correctly allow the submitting party to create their own row.
-- design_brief holds the same category of customer-submitted creative
-- input (preferred garment_type, embroidery_type, notes) as its three
-- siblings, and the frontend's "Custom Design" submission flow
-- (documented in the original BRS audit) assumes a customer can
-- submit a design brief directly, not only via staff. This reads as
-- a straightforward omission during the original RLS authoring pass,
-- not a deliberate business restriction — no comment or design note
-- anywhere in 010_tailoring.sql or the Data Dictionary singles out
-- design_brief as intentionally staff-only, unlike, say,
-- tailoring_order_stage_history, which is explicitly documented as
-- staff-only.
--
-- Why this is NOT a schema redesign:
--   - No table, column, or constraint changes whatsoever.
--   - Adds exactly one CREATE POLICY statement, mirroring the exact
--     ownership-check pattern already used by
--     fabric_selection_public_insert (the closest sibling: same
--     tailoring_request_id-scoped ownership check, same guest-or-owner
--     condition).
--
-- Target:    PostgreSQL 15+, Supabase-compatible.
-- Idempotent: Yes.
-- Depends on: 001-025 (all prior migrations)
-- =====================================================================

DROP POLICY IF EXISTS design_brief_public_insert ON public.design_brief;
CREATE POLICY design_brief_public_insert ON public.design_brief FOR INSERT TO anon, authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tailoring_request tr
      WHERE tr.id = design_brief.tailoring_request_id
        AND (tr.customer_id = public.app_current_customer_id() OR tr.customer_id IS NULL)
    )
  );
-- Same residual limitation as appointment_public_insert/
-- fabric_selection_public_insert (016_rls.sql, Production Readiness
-- Review Major Finding 4.2): a genuinely anonymous (anon-role) guest
-- cannot be distinguished from a different anonymous guest by RLS
-- alone, since neither has a stable identity to key a policy on. This
-- is the same already-documented, already-accepted limitation as the
-- guest-cart case, not a new one introduced here.
