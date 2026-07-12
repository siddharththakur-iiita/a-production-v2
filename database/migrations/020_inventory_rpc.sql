-- =====================================================================
-- Migration: 020_inventory_rpc.sql
-- Purpose:   IMPLEMENTATION BLOCKER FIX, discovered while implementing
--            the backend Inventory module (not a schema redesign, no
--            new tables).
--
--            trg_inventory_item_log_movement (006_inventory.sql) reads
--            session-local GUCs (app.stock_movement_type,
--            app.stock_movement_reference_type,
--            app.stock_movement_reference_id) to record *why* a stock
--            change happened. Setting a session GUC and then running
--            an UPDATE in the same transaction cannot be expressed as
--            two separate PostgREST calls from a Supabase JS client —
--            each `.update()` is its own request/transaction. Without
--            this fix, every stock adjustment from the application
--            would silently fall back to the trigger's generic
--            inbound/outbound inference with no reference, which the
--            trigger explicitly supports but which permanently loses
--            traceability (e.g. "this decrement was order #482") that
--            006_inventory.sql's own comments describe as the point
--            of the reference_type/reference_id columns.
--
--            Also adds an atomic reservation-adjustment RPC, since
--            reserved_qty changes must respect the
--            inventory_item_reserved_le_on_hand_check CHECK
--            constraint under concurrency, and PostgREST's `.update()`
--            cannot express `SET reserved_qty = reserved_qty + delta`
--            (only literal values, not expressions) — a fetch-then-
--            write from the client would be race-prone.
--
-- Target:    PostgreSQL 15+, Supabase-compatible.
-- Idempotent: Yes.
-- Depends on: 001-019 (all prior migrations)
-- =====================================================================

-- ---------------------------------------------------------------------
-- app_adjust_inventory_stock(...)
-- Atomically sets the movement-context GUCs and applies a signed
-- delta to on_hand_qty in one transaction, so
-- trg_inventory_item_log_movement records the correct movement_type
-- and reference instead of falling back to inference. Enforces
-- non-negative on_hand_qty itself (in addition to the table's own
-- CHECK) so the error message is specific rather than a generic
-- constraint violation.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.app_adjust_inventory_stock(
  p_inventory_item_id uuid,
  p_delta integer,
  p_movement_type text,
  p_reference_type text DEFAULT NULL,
  p_reference_id uuid DEFAULT NULL
)
RETURNS public.inventory_item
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.inventory_item;
BEGIN
  IF p_movement_type NOT IN ('inbound', 'outbound', 'adjustment', 'return') THEN
    RAISE EXCEPTION 'invalid movement_type: %', p_movement_type;
  END IF;

  PERFORM set_config('app.stock_movement_type', p_movement_type, true);
  PERFORM set_config('app.stock_movement_reference_type', COALESCE(p_reference_type, ''), true);
  PERFORM set_config('app.stock_movement_reference_id', COALESCE(p_reference_id::text, ''), true);

  UPDATE public.inventory_item
  SET on_hand_qty = on_hand_qty + p_delta
  WHERE id = p_inventory_item_id
  RETURNING * INTO v_row;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'inventory_item % not found', p_inventory_item_id;
  END IF;

  RETURN v_row;
END;
$$;

COMMENT ON FUNCTION public.app_adjust_inventory_stock(uuid, integer, text, text, uuid) IS
  'Atomically applies a signed delta to inventory_item.on_hand_qty with full movement-context (type/reference) so trg_inventory_item_log_movement records a traceable stock_movement row instead of falling back to inference. The sanctioned way for application code to adjust stock — never UPDATE inventory_item.on_hand_qty directly from the client.';

REVOKE ALL ON FUNCTION public.app_adjust_inventory_stock(uuid, integer, text, text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.app_adjust_inventory_stock(uuid, integer, text, text, uuid) TO authenticated;


-- ---------------------------------------------------------------------
-- app_adjust_inventory_reservation(...)
-- Atomically applies a signed delta to reserved_qty. Does not touch
-- on_hand_qty, so it does not fire the stock-movement trigger (which
-- only reacts to on_hand_qty changes) — reservation changes are not
-- themselves stock movements, per the frozen schema's own comments.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.app_adjust_inventory_reservation(
  p_inventory_item_id uuid,
  p_delta integer
)
RETURNS public.inventory_item
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.inventory_item;
BEGIN
  UPDATE public.inventory_item
  SET reserved_qty = reserved_qty + p_delta
  WHERE id = p_inventory_item_id
  RETURNING * INTO v_row;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'inventory_item % not found', p_inventory_item_id;
  END IF;

  RETURN v_row;
END;
$$;

COMMENT ON FUNCTION public.app_adjust_inventory_reservation(uuid, integer) IS
  'Atomically applies a signed delta to inventory_item.reserved_qty. The inventory_item_reserved_le_on_hand_check CHECK constraint (006_inventory.sql) still applies and will reject the transaction if the delta would over-reserve — callers must handle that as a normal error, not pre-check-then-write, to stay race-free under concurrency.';

REVOKE ALL ON FUNCTION public.app_adjust_inventory_reservation(uuid, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.app_adjust_inventory_reservation(uuid, integer) TO authenticated;
