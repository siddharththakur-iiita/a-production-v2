-- =====================================================================
-- Migration: 025_refund_atomicity.sql
-- Classification: IMPLEMENTATION
--
-- Purpose: atomic refund + refund_item creation.
--
-- Verified gap: trg_refund_item_validate_sum_trigger (009_orders.sql)
-- is DEFERRABLE INITIALLY DEFERRED and fires FOR EACH ROW on
-- refund_item — it validates correctly across two sequential
-- PostgREST calls in the HAPPY path (insert refund, then batch-insert
-- all refund_item rows in one .insert(array) call), since the
-- deferred check reads the already-committed refund.amount at the
-- second transaction's commit. However, in the FAILURE path — refund
-- insert succeeds, then the refund_item batch insert fails for any
-- reason (network error, validation error, client crash) — the
-- refund_item trigger never fires at all (it is FOR EACH ROW; zero
-- rows means zero firings), leaving an orphaned refund row with no
-- items and no enforcement that it ever gets corrected. This is a
-- genuine atomicity gap a two-call REST pattern cannot close, not a
-- theoretical concern.
--
-- Why this is NOT a schema redesign:
--   - No table, column, relationship, or cardinality changes.
--   - refund/refund_item's existing shape, constraints, and the
--     deferred trigger itself are entirely unchanged and continue to
--     be the actual enforced invariant; this function only ensures
--     both inserts happen in one transaction so that invariant is
--     checked before either write is visible to any other session.
--   - amount is computed server-side from the line items (never
--     trusted from the client), consistent with this schema's
--     existing anti-tampering principle for every other financial
--     write (order, payment, invoice).
--
-- Target:    PostgreSQL 15+, Supabase-compatible.
-- Idempotent: Yes.
-- Depends on: 001-024 (all prior migrations)
-- =====================================================================

CREATE OR REPLACE FUNCTION public.app_issue_refund(
  p_order_id uuid,
  p_payment_id uuid,
  p_reason text,
  p_line_items jsonb,
  p_return_request_id uuid DEFAULT NULL
)
RETURNS public.refund
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_refund public.refund%ROWTYPE;
  v_line jsonb;
  v_total numeric(12,2) := 0;
BEGIN
  IF NOT public.app_has_permission('orders.refund') THEN
    RAISE EXCEPTION 'not authorized to issue refunds' USING ERRCODE = '42501';
  END IF;

  IF jsonb_array_length(p_line_items) = 0 THEN
    RAISE EXCEPTION 'a refund requires at least one line item';
  END IF;

  FOR v_line IN SELECT * FROM jsonb_array_elements(p_line_items)
  LOOP
    v_total := v_total + (v_line ->> 'amount')::numeric(12,2);
  END LOOP;

  INSERT INTO public.refund (order_id, payment_id, return_request_id, amount, reason, status)
  VALUES (p_order_id, p_payment_id, p_return_request_id, v_total, p_reason, 'requested')
  RETURNING * INTO v_refund;

  INSERT INTO public.refund_item (refund_id, order_item_id, qty, amount)
  SELECT
    v_refund.id,
    (elem ->> 'order_item_id')::uuid,
    (elem ->> 'qty')::integer,
    (elem ->> 'amount')::numeric(12,2)
  FROM jsonb_array_elements(p_line_items) AS elem;

  RETURN v_refund;
END;
$$;

COMMENT ON FUNCTION public.app_issue_refund(uuid, uuid, text, jsonb, uuid) IS
  'Atomically creates a refund and its refund_item rows in one transaction, computing amount server-side from the line items (never trusted from the client). Closes the atomicity gap where a partially-failed two-call refund+refund_item creation could leave an orphaned refund row with no items.';

REVOKE ALL ON FUNCTION public.app_issue_refund(uuid, uuid, text, jsonb, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.app_issue_refund(uuid, uuid, text, jsonb, uuid) TO authenticated;
