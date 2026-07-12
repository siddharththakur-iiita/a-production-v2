-- =====================================================================
-- Migration: 024_checkout_and_order_lifecycle.sql
-- Classification: IMPLEMENTATION
--
-- Purpose: implements the checkout transaction and order cancellation
-- workflow — verified to be genuinely missing (see below), not a
-- refactor or a redesign.
--
-- Verified gap: 009_orders.sql's order table RLS (016_rls.sql,
-- order_staff_all / order_owner_read) grants NO INSERT policy to
-- anon/authenticated at all, and 009_orders.sql's own comments state
-- orders are "created exclusively via a trusted SECURITY DEFINER
-- checkout function" — but no such function exists anywhere in
-- migrations 001-023. Without it, cart.customer_id-owned data can
-- never become an order.id-owned order through this schema at all;
-- checkout is not a missing convenience, it is a missing capability.
--
-- Why this is NOT a schema redesign:
--   - No table, column, relationship, or cardinality changes.
--   - Every write this function performs (order, order_item,
--     coupon_redemption, inventory_item via the existing
--     app_adjust_inventory_stock RPC) already has a well-defined
--     target shape from the frozen schema; this function only
--     orchestrates writes to tables/columns that already exist,
--     exactly the way 009_orders.sql's own comments already assumed
--     would happen.
--   - Reuses existing RPCs (app_validate_coupon,
--     app_adjust_inventory_stock) rather than duplicating their logic.
--
-- Target:    PostgreSQL 15+, Supabase-compatible.
-- Idempotent: Yes (CREATE OR REPLACE FUNCTION).
-- Depends on: 001-023 (all prior migrations)
-- =====================================================================

-- ---------------------------------------------------------------------
-- app_checkout_cart(...)
-- The complete checkout transaction: authoritatively re-prices every
-- cart line (never trusts cart_item.unit_price_snapshot), validates
-- and applies an optional coupon, computes tax from tax_rule,
-- decrements inventory for ready-made items, creates the order and
-- order_item rows, records the coupon redemption, and deletes the
-- cart — all as one atomic transaction (a single PL/pgSQL function
-- invocation is inherently one transaction; if any step raises, every
-- prior write in this call is rolled back).
--
-- p_shipping_total is accepted as a parameter rather than computed,
-- since shipping-rate calculation (by carrier/weight/distance) has no
-- corresponding table in the frozen schema — that computation is an
-- explicit, documented boundary of this function, not an oversight;
-- callers are expected to have already resolved a shipping quote
-- through whatever mechanism the business adopts (carrier API,
-- flat-rate table added later, etc.) before calling checkout.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.app_checkout_cart(
  p_customer_id uuid,
  p_cart_id uuid,
  p_shipping_address_id uuid,
  p_billing_address_id uuid DEFAULT NULL,
  p_coupon_code text DEFAULT NULL,
  p_shipping_total numeric DEFAULT 0,
  p_warehouse_id uuid DEFAULT NULL
)
RETURNS public."order"
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cart public.cart%ROWTYPE;
  v_shipping_address public.address%ROWTYPE;
  v_warehouse_id uuid := p_warehouse_id;
  v_item record;
  v_unit_price numeric(12,2);
  v_description text;
  v_product_type_code text;
  v_inventory_item_id uuid;
  v_available_qty integer;
  v_subtotal numeric(12,2) := 0;
  v_discount_total numeric(12,2) := 0;
  v_tax_total numeric(12,2) := 0;
  v_coupon record;
  v_tax_rule record;
  v_order public."order"%ROWTYPE;
  v_shipping_snapshot jsonb;
BEGIN
  IF p_customer_id IS DISTINCT FROM public.app_current_customer_id()
     AND NOT public.app_has_permission('orders.manage') THEN
    RAISE EXCEPTION 'not authorized to check out this cart' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_cart FROM public.cart WHERE id = p_cart_id AND customer_id = p_customer_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'cart % not found for customer %', p_cart_id, p_customer_id;
  END IF;

  SELECT * INTO v_shipping_address FROM public.address
    WHERE id = p_shipping_address_id AND customer_id = p_customer_id AND deleted_at IS NULL;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'shipping address % not found for customer %', p_shipping_address_id, p_customer_id;
  END IF;

  v_shipping_snapshot := jsonb_build_object(
    'label', v_shipping_address.label,
    'line1', v_shipping_address.line1,
    'line2', v_shipping_address.line2,
    'city', v_shipping_address.city,
    'state', v_shipping_address.state,
    'postal_code', v_shipping_address.postal_code,
    'country', v_shipping_address.country
  );

  IF v_warehouse_id IS NULL THEN
    SELECT id INTO v_warehouse_id FROM public.warehouse WHERE is_default AND is_active LIMIT 1;
  END IF;

  INSERT INTO public."order" (
    customer_id, status, subtotal, discount_total, tax_total, shipping_total,
    shipping_address_id, shipping_address_snapshot, billing_address_id
  )
  VALUES (
    p_customer_id, 'pending_payment', 0, 0, 0, GREATEST(p_shipping_total, 0),
    p_shipping_address_id, v_shipping_snapshot, COALESCE(p_billing_address_id, p_shipping_address_id)
  )
  RETURNING * INTO v_order;

  FOR v_item IN
    SELECT * FROM public.cart_item WHERE cart_id = p_cart_id
  LOOP
    IF v_item.tailoring_request_id IS NOT NULL THEN
      SELECT q.total INTO v_unit_price
      FROM public.quotation q
      WHERE q.tailoring_request_id = v_item.tailoring_request_id AND q.status = 'accepted'
      ORDER BY q.version_number DESC
      LIMIT 1;

      IF v_unit_price IS NULL THEN
        RAISE EXCEPTION 'tailoring request % has no accepted quotation', v_item.tailoring_request_id;
      END IF;

      v_description := 'Bespoke tailoring commission (request ' || v_item.tailoring_request_id::text || ')';

      INSERT INTO public.order_item (
        order_id, product_id, variant_id, tailoring_request_id, description_snapshot, qty, unit_price
      )
      VALUES (v_order.id, NULL, NULL, v_item.tailoring_request_id, v_description, 1, v_unit_price);

      v_subtotal := v_subtotal + v_unit_price;

    ELSE
      SELECT
        COALESCE(pv.price_override, p.price),
        p.name || COALESCE(' — ' || NULLIF(pv.size, '') || COALESCE(' / ' || NULLIF(pv.color, ''), ''), ''),
        pt.code
      INTO v_unit_price, v_description, v_product_type_code
      FROM public.product p
      JOIN public.product_type pt ON pt.id = p.product_type_id
      LEFT JOIN public.product_variant pv ON pv.id = v_item.variant_id
      WHERE p.id = v_item.product_id;

      IF v_unit_price IS NULL THEN
        RAISE EXCEPTION 'product % has no price and cannot be checked out', v_item.product_id;
      END IF;

      IF v_product_type_code = 'ready_made' AND v_item.variant_id IS NOT NULL AND v_warehouse_id IS NOT NULL THEN
        SELECT id, on_hand_qty - reserved_qty INTO v_inventory_item_id, v_available_qty
        FROM public.inventory_item
        WHERE variant_id = v_item.variant_id AND warehouse_id = v_warehouse_id;

        IF v_inventory_item_id IS NOT NULL THEN
          IF v_available_qty < v_item.qty THEN
            RAISE EXCEPTION 'insufficient stock for variant % (requested %, available %)',
              v_item.variant_id, v_item.qty, v_available_qty;
          END IF;

          PERFORM public.app_adjust_inventory_stock(
            p_inventory_item_id => v_inventory_item_id,
            p_delta => -v_item.qty,
            p_movement_type => 'outbound',
            p_reference_type => 'order',
            p_reference_id => v_order.id
          );
        END IF;
      END IF;

      INSERT INTO public.order_item (
        order_id, product_id, variant_id, tailoring_request_id, description_snapshot, qty, unit_price
      )
      VALUES (v_order.id, v_item.product_id, v_item.variant_id, NULL, v_description, v_item.qty, v_unit_price);

      v_subtotal := v_subtotal + (v_unit_price * v_item.qty);
    END IF;
  END LOOP;

  IF v_subtotal = 0 THEN
    RAISE EXCEPTION 'cart % has no priceable items', p_cart_id;
  END IF;

  IF p_coupon_code IS NOT NULL THEN
    SELECT * INTO v_coupon FROM public.app_validate_coupon(p_coupon_code, v_subtotal);
    IF NOT v_coupon.is_valid THEN
      RAISE EXCEPTION 'coupon "%" is not valid: %', p_coupon_code, v_coupon.reason;
    END IF;

    v_discount_total := CASE
      WHEN v_coupon.discount_type = 'percent' THEN round(v_subtotal * v_coupon.value / 100, 2)
      ELSE LEAST(v_coupon.value, v_subtotal)
    END;

    INSERT INTO public.coupon_redemption (coupon_id, order_id, customer_id)
    VALUES (v_coupon.coupon_id, v_order.id, p_customer_id);
  END IF;

  -- Tax: sums every applicable tax_rule row for the shipping state.
  -- Yields 0 if tax_rule is empty, which is correct/expected — no GST
  -- slabs are seeded pending legal/finance review (018_seed.sql).
  FOR v_tax_rule IN
    SELECT rate, applies_to FROM public.tax_rule
    WHERE region = v_shipping_address.state AND is_active
  LOOP
    IF v_tax_rule.applies_to IS NULL
       OR NOT (v_tax_rule.applies_to ? 'price_gt')
       OR (v_subtotal - v_discount_total) > (v_tax_rule.applies_to ->> 'price_gt')::numeric THEN
      v_tax_total := v_tax_total + round((v_subtotal - v_discount_total) * v_tax_rule.rate / 100, 2);
    END IF;
  END LOOP;

  UPDATE public."order"
  SET subtotal = v_subtotal, discount_total = v_discount_total, tax_total = v_tax_total
  WHERE id = v_order.id
  RETURNING * INTO v_order;

  -- Cart is deleted (hard delete, not soft) once converted, per
  -- 008_cart.sql's own documented behavior. ON DELETE CASCADE removes
  -- its cart_item rows.
  DELETE FROM public.cart WHERE id = p_cart_id;

  RETURN v_order;
END;
$$;

COMMENT ON FUNCTION public.app_checkout_cart(uuid, uuid, uuid, uuid, text, numeric, uuid) IS
  'The complete checkout transaction: authoritative re-pricing, coupon validation/application, tax computation, inventory decrement, order/order_item creation, and cart deletion — all atomic. The sanctioned, and only, way an order is ever created; order has no client INSERT policy (016_rls.sql).';

REVOKE ALL ON FUNCTION public.app_checkout_cart(uuid, uuid, uuid, uuid, text, numeric, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.app_checkout_cart(uuid, uuid, uuid, uuid, text, numeric, uuid) TO authenticated;


-- ---------------------------------------------------------------------
-- app_cancel_order(...)
-- Order cancellation with inventory restoration. Only valid from
-- pending_payment or paid — an order already in fulfillment/shipped/
-- delivered must go through the return/refund workflow instead.
--
-- The cancellation reason is recorded by UPDATING the
-- order_status_history row that trg_order_status_change (009_orders.sql)
-- already creates as a side effect of the status UPDATE below — not
-- by inserting a second row, which would double-log the same
-- transition. This function only ever writes order_status_history via
-- that single UPDATE-then-correct sequence.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.app_cancel_order(p_order_id uuid, p_reason text DEFAULT NULL)
RETURNS public."order"
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order public."order"%ROWTYPE;
  v_item record;
  v_inventory_item_id uuid;
BEGIN
  SELECT * INTO v_order FROM public."order" WHERE id = p_order_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'order % not found', p_order_id;
  END IF;

  IF v_order.customer_id IS DISTINCT FROM public.app_current_customer_id()
     AND NOT public.app_has_permission('orders.manage') THEN
    RAISE EXCEPTION 'not authorized to cancel order %', p_order_id USING ERRCODE = '42501';
  END IF;

  IF v_order.status NOT IN ('pending_payment', 'paid') THEN
    RAISE EXCEPTION 'order % cannot be cancelled from status %', p_order_id, v_order.status;
  END IF;

  FOR v_item IN
    SELECT oi.variant_id, oi.qty
    FROM public.order_item oi
    WHERE oi.order_id = p_order_id AND oi.variant_id IS NOT NULL
  LOOP
    SELECT id INTO v_inventory_item_id
    FROM public.inventory_item
    WHERE variant_id = v_item.variant_id
    LIMIT 1;

    IF v_inventory_item_id IS NOT NULL THEN
      PERFORM public.app_adjust_inventory_stock(
        p_inventory_item_id => v_inventory_item_id,
        p_delta => v_item.qty,
        p_movement_type => 'return',
        p_reference_type => 'order',
        p_reference_id => p_order_id
      );
    END IF;
  END LOOP;

  UPDATE public."order"
  SET status = 'cancelled'
  WHERE id = p_order_id
  RETURNING * INTO v_order;

  IF p_reason IS NOT NULL THEN
    UPDATE public.order_status_history
    SET note = p_reason
    WHERE id = (
      SELECT id FROM public.order_status_history
      WHERE order_id = p_order_id AND status = 'cancelled'
      ORDER BY changed_at DESC
      LIMIT 1
    );
  END IF;

  RETURN v_order;
END;
$$;

COMMENT ON FUNCTION public.app_cancel_order(uuid, text) IS
  'Cancels an order from pending_payment or paid, restoring any decremented inventory. Not valid once an order has entered fulfillment — use the return/refund workflow instead.';

REVOKE ALL ON FUNCTION public.app_cancel_order(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.app_cancel_order(uuid, text) TO authenticated;
