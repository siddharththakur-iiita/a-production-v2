-- =====================================================================
-- Migration: 006_inventory.sql
-- Purpose:   Inventory domain (Data Dictionary 02): warehouse,
--            product_variant, inventory_item, stock_movement.
-- Target:    PostgreSQL 15+, Supabase-compatible.
-- Idempotent: Yes.
-- Depends on: 001_extensions.sql, 002_types.sql, 003_functions.sql,
--            004_auth.sql, 005_catalog.sql
-- =====================================================================


-- =====================================================================
-- TABLE: warehouse
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.warehouse (
  id          uuid        NOT NULL DEFAULT gen_random_uuid(),
  name        text        NOT NULL,
  address     text        NULL,
  is_default  boolean     NOT NULL DEFAULT false,
  is_active   boolean     NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT warehouse_pkey PRIMARY KEY (id),
  CONSTRAINT warehouse_name_key UNIQUE (name)
);

COMMENT ON TABLE public.warehouse IS
  'Physical/logical stock location. A single default row is sufficient at launch; exists so multi-location fulfillment can be added later by inserting rows.';

DROP TRIGGER IF EXISTS trg_warehouse_updated_at ON public.warehouse;
CREATE TRIGGER trg_warehouse_updated_at
  BEFORE UPDATE ON public.warehouse
  FOR EACH ROW EXECUTE FUNCTION public.trg_set_updated_at();

DROP TRIGGER IF EXISTS trg_warehouse_single_default ON public.warehouse;
CREATE TRIGGER trg_warehouse_single_default
  BEFORE INSERT OR UPDATE OF is_default ON public.warehouse
  FOR EACH ROW EXECUTE FUNCTION public.trg_enforce_single_flag('is_default', '__none__');

ALTER TABLE public.warehouse ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.warehouse FORCE ROW LEVEL SECURITY;


-- =====================================================================
-- TABLE: product_variant
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.product_variant (
  id              uuid          NOT NULL DEFAULT gen_random_uuid(),
  product_id      uuid          NOT NULL,
  size            text          NULL,
  color           text          NULL,
  sku             text          NOT NULL,
  barcode         text          NULL,
  price_override  numeric(12,2) NULL,
  status          text          NOT NULL DEFAULT 'active',
  created_at      timestamptz   NOT NULL DEFAULT now(),
  updated_at      timestamptz   NOT NULL DEFAULT now(),
  deleted_at      timestamptz   NULL,
  created_by      uuid          NULL,
  updated_by      uuid          NULL,
  version         integer       NOT NULL DEFAULT 1,
  CONSTRAINT product_variant_pkey PRIMARY KEY (id),
  CONSTRAINT product_variant_sku_key UNIQUE (sku),
  CONSTRAINT product_variant_product_id_fkey FOREIGN KEY (product_id)
    REFERENCES public.product (id) ON DELETE CASCADE,
  CONSTRAINT product_variant_created_by_fkey FOREIGN KEY (created_by)
    REFERENCES public.admin_user (id) ON DELETE RESTRICT,
  CONSTRAINT product_variant_updated_by_fkey FOREIGN KEY (updated_by)
    REFERENCES public.admin_user (id) ON DELETE RESTRICT,
  CONSTRAINT product_variant_status_check CHECK (status IN ('active', 'discontinued')),
  CONSTRAINT product_variant_price_override_check CHECK (price_override IS NULL OR price_override >= 0)
);

COMMENT ON TABLE public.product_variant IS
  'A purchasable size/color combination of a product, used identically by ready-made and made-to-order items. The presence or absence of a corresponding inventory_item row (not a different schema) is what distinguishes stocked from made-to-order variants.';

-- Unique (product_id, size, color) treating NULL size/color as equal
-- for uniqueness purposes, via COALESCE on an expression index (a
-- plain UNIQUE constraint treats NULL <> NULL, which would allow
-- duplicate NULL/NULL rows).
CREATE UNIQUE INDEX IF NOT EXISTS uq_product_variant_product_size_color
  ON public.product_variant (product_id, COALESCE(size, ''), COALESCE(color, ''));
CREATE UNIQUE INDEX IF NOT EXISTS uq_product_variant_sku ON public.product_variant (sku);
CREATE INDEX IF NOT EXISTS idx_product_variant_product_id ON public.product_variant (product_id);
CREATE INDEX IF NOT EXISTS idx_product_variant_active
  ON public.product_variant (id) WHERE status = 'active' AND deleted_at IS NULL;

DROP TRIGGER IF EXISTS trg_product_variant_updated_at ON public.product_variant;
CREATE TRIGGER trg_product_variant_updated_at
  BEFORE UPDATE ON public.product_variant
  FOR EACH ROW EXECUTE FUNCTION public.trg_set_updated_at_versioned();

DROP TRIGGER IF EXISTS trg_product_variant_audit ON public.product_variant;
CREATE TRIGGER trg_product_variant_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.product_variant
  FOR EACH ROW EXECUTE FUNCTION public.trg_audit_log();

DROP TRIGGER IF EXISTS trg_product_variant_soft_delete ON public.product_variant;
CREATE TRIGGER trg_product_variant_soft_delete
  BEFORE DELETE ON public.product_variant
  FOR EACH ROW EXECUTE FUNCTION public.trg_soft_delete_guard();

ALTER TABLE public.product_variant ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_variant FORCE ROW LEVEL SECURITY;


-- =====================================================================
-- TABLE: inventory_item
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.inventory_item (
  id             uuid        NOT NULL DEFAULT gen_random_uuid(),
  warehouse_id   uuid        NOT NULL,
  variant_id     uuid        NOT NULL,
  on_hand_qty    integer     NOT NULL DEFAULT 0,
  reserved_qty   integer     NOT NULL DEFAULT 0,
  reorder_level  integer     NOT NULL DEFAULT 0,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  deleted_at     timestamptz NULL,
  created_by     uuid        NULL,
  updated_by     uuid        NULL,
  version        integer     NOT NULL DEFAULT 1,
  CONSTRAINT inventory_item_pkey PRIMARY KEY (id),
  CONSTRAINT inventory_item_warehouse_variant_key UNIQUE (warehouse_id, variant_id),
  CONSTRAINT inventory_item_warehouse_id_fkey FOREIGN KEY (warehouse_id)
    REFERENCES public.warehouse (id) ON DELETE RESTRICT,
  CONSTRAINT inventory_item_variant_id_fkey FOREIGN KEY (variant_id)
    REFERENCES public.product_variant (id) ON DELETE RESTRICT,
  CONSTRAINT inventory_item_created_by_fkey FOREIGN KEY (created_by)
    REFERENCES public.admin_user (id) ON DELETE RESTRICT,
  CONSTRAINT inventory_item_updated_by_fkey FOREIGN KEY (updated_by)
    REFERENCES public.admin_user (id) ON DELETE RESTRICT,
  CONSTRAINT inventory_item_on_hand_nonneg_check CHECK (on_hand_qty >= 0),
  CONSTRAINT inventory_item_reserved_nonneg_check CHECK (reserved_qty >= 0),
  CONSTRAINT inventory_item_reserved_le_on_hand_check CHECK (reserved_qty <= on_hand_qty)
);

COMMENT ON TABLE public.inventory_item IS
  'The stock record for a product_variant at a specific warehouse — only ever created for ready_made products. Only created for stocked variants; its mere existence is the signal distinguishing ready-made from made-to-order.';
COMMENT ON COLUMN public.inventory_item.reserved_qty IS
  'Stock allocated to unpaid/pending carts or in-flight orders. "Available to sell" = on_hand_qty - reserved_qty, computed at query time, never stored.';

CREATE UNIQUE INDEX IF NOT EXISTS uq_inventory_item_warehouse_variant
  ON public.inventory_item (warehouse_id, variant_id);
CREATE INDEX IF NOT EXISTS idx_inventory_item_variant_id ON public.inventory_item (variant_id);
CREATE INDEX IF NOT EXISTS idx_inventory_item_low_stock
  ON public.inventory_item (id) WHERE on_hand_qty <= reorder_level;

DROP TRIGGER IF EXISTS trg_inventory_item_updated_at ON public.inventory_item;
CREATE TRIGGER trg_inventory_item_updated_at
  BEFORE UPDATE ON public.inventory_item
  FOR EACH ROW EXECUTE FUNCTION public.trg_set_updated_at_versioned();

DROP TRIGGER IF EXISTS trg_inventory_item_audit ON public.inventory_item;
CREATE TRIGGER trg_inventory_item_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.inventory_item
  FOR EACH ROW EXECUTE FUNCTION public.trg_audit_log();

DROP TRIGGER IF EXISTS trg_inventory_item_soft_delete ON public.inventory_item;
CREATE TRIGGER trg_inventory_item_soft_delete
  BEFORE DELETE ON public.inventory_item
  FOR EACH ROW EXECUTE FUNCTION public.trg_soft_delete_guard();

ALTER TABLE public.inventory_item ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_item FORCE ROW LEVEL SECURITY;


-- =====================================================================
-- TABLE: stock_movement
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.stock_movement (
  id                  uuid        NOT NULL DEFAULT gen_random_uuid(),
  inventory_item_id   uuid        NOT NULL,
  movement_type       text        NOT NULL,
  qty                 integer     NOT NULL,
  reference_type      text        NULL,
  reference_id        uuid        NULL,
  created_at          timestamptz NOT NULL DEFAULT now(),
  created_by          uuid        NULL,
  CONSTRAINT stock_movement_pkey PRIMARY KEY (id),
  CONSTRAINT stock_movement_inventory_item_id_fkey FOREIGN KEY (inventory_item_id)
    REFERENCES public.inventory_item (id) ON DELETE RESTRICT,
  CONSTRAINT stock_movement_created_by_fkey FOREIGN KEY (created_by)
    REFERENCES public.admin_user (id) ON DELETE SET NULL,
  CONSTRAINT stock_movement_type_check CHECK (movement_type IN ('inbound', 'outbound', 'adjustment', 'return')),
  CONSTRAINT stock_movement_qty_positive_check CHECK (qty > 0)
);

COMMENT ON TABLE public.stock_movement IS
  'Immutable audit trail of every change to an inventory_item quantity. Convention: qty is always stored as a positive magnitude; movement_type conveys direction. Never edited or deleted by any process; corrections are new compensating rows.';
COMMENT ON COLUMN public.stock_movement.reference_id IS
  'Polymorphic pointer (paired with reference_type) to the business event that caused this movement, e.g. an order. No native FK across multiple possible target tables.';
COMMENT ON COLUMN public.stock_movement.created_by IS
  'NULL = system-triggered (e.g. automatic checkout decrement) rather than a manual admin adjustment.';

CREATE INDEX IF NOT EXISTS idx_stock_movement_item_created
  ON public.stock_movement (inventory_item_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_stock_movement_reference
  ON public.stock_movement (reference_type, reference_id);

ALTER TABLE public.stock_movement ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_movement FORCE ROW LEVEL SECURITY;


-- =====================================================================
-- Stock-movement auto-logging trigger on inventory_item (Data
-- Dictionary 02, inventory_item, Section 10): ensures stock_movement
-- can never drift out of sync with inventory_item because a manual
-- update forgot to log it.
--
-- Calling convention: a transaction that updates on_hand_qty should
-- first set session-local context describing the semantic reason for
-- the change, e.g.:
--   SET LOCAL app.stock_movement_type = 'outbound';
--   SET LOCAL app.stock_movement_reference_type = 'order';
--   SET LOCAL app.stock_movement_reference_id = '<order-uuid>';
--   UPDATE inventory_item SET on_hand_qty = on_hand_qty - 1 WHERE ...;
-- If this context is not set, the trigger infers a reasonable default
-- (inbound/outbound based on the sign of the change, 'adjustment'-style
-- with no reference) rather than failing the update.
--
-- Checkout atomicity requirement (BRS v2.0 Section 18, Data Dictionary
-- 02 Section 10): application code performing a stock decrement at
-- checkout MUST use an atomic conditional update of the form
--   UPDATE inventory_item
--      SET on_hand_qty = on_hand_qty - :qty
--    WHERE variant_id = :id AND on_hand_qty >= :qty
-- to prevent overselling under concurrent orders. This is an
-- application-layer requirement this trigger cannot itself enforce,
-- since the trigger only reacts after a successful UPDATE.
-- =====================================================================
CREATE OR REPLACE FUNCTION public.trg_inventory_item_log_movement()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_delta integer;
  v_movement_type text;
  v_reference_type text;
  v_reference_id uuid;
BEGIN
  v_delta := NEW.on_hand_qty - OLD.on_hand_qty;

  IF v_delta = 0 THEN
    RETURN NEW;
  END IF;

  v_movement_type := NULLIF(current_setting('app.stock_movement_type', true), '');
  IF v_movement_type IS NULL THEN
    v_movement_type := CASE WHEN v_delta > 0 THEN 'inbound' ELSE 'outbound' END;
  END IF;

  v_reference_type := NULLIF(current_setting('app.stock_movement_reference_type', true), '');
  BEGIN
    v_reference_id := NULLIF(current_setting('app.stock_movement_reference_id', true), '')::uuid;
  EXCEPTION WHEN OTHERS THEN
    v_reference_id := NULL;
  END;

  INSERT INTO public.stock_movement (
    inventory_item_id, movement_type, qty, reference_type, reference_id, created_by
  )
  VALUES (
    NEW.id, v_movement_type, abs(v_delta), v_reference_type, v_reference_id,
    public.app_current_admin_user_id()
  );

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.trg_inventory_item_log_movement() IS
  'Automatically inserts a stock_movement row reflecting the on_hand_qty delta whenever inventory_item is updated. Reads optional session-local GUCs (app.stock_movement_type/reference_type/reference_id) for semantic context, defaulting to inbound/outbound inference if absent.';

DROP TRIGGER IF EXISTS trg_inventory_item_log_movement_trigger ON public.inventory_item;
CREATE TRIGGER trg_inventory_item_log_movement_trigger
  AFTER UPDATE OF on_hand_qty, reserved_qty ON public.inventory_item
  FOR EACH ROW EXECUTE FUNCTION public.trg_inventory_item_log_movement();
