-- =====================================================================
-- Migration: 008_cart.sql
-- Purpose:   Cart domain (Data Dictionary 04, cart section): cart,
--            cart_item.
-- Target:    PostgreSQL 15+, Supabase-compatible.
-- Idempotent: Yes.
-- Depends on: 001_extensions.sql, 002_types.sql, 003_functions.sql,
--            004_auth.sql, 005_catalog.sql, 006_inventory.sql,
--            007_customers.sql
--
-- Cross-domain forward reference: cart_item.tailoring_request_id
-- references public.tailoring_request (Tailoring domain,
-- 010_tailoring.sql) and is declared here as plain uuid with no
-- inline FK; the FK constraint is added via ALTER TABLE at the end of
-- 010_tailoring.sql.
-- =====================================================================


-- =====================================================================
-- TABLE: cart
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.cart (
  id           uuid        NOT NULL DEFAULT gen_random_uuid(),
  customer_id  uuid        NULL,
  session_id   text        NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT cart_pkey PRIMARY KEY (id),
  CONSTRAINT cart_customer_id_fkey FOREIGN KEY (customer_id)
    REFERENCES public.customer (id) ON DELETE RESTRICT,
  CONSTRAINT cart_customer_or_session_check CHECK (customer_id IS NOT NULL OR session_id IS NOT NULL)
);

COMMENT ON TABLE public.cart IS
  'A shopping cart, owned either by an authenticated customer or an anonymous browser session (guest cart). updated_at is functionally load-bearing for abandoned-cart detection, not just bookkeeping. Deleted (hard delete) once successfully converted into an order at checkout — one of the few tables where a real DELETE is expected and correct.';
COMMENT ON COLUMN public.cart.session_id IS
  'Anonymous session/browser identifier, required when customer_id is NULL. Guest-cart access control is enforced at the API layer via a signed session token, not by Postgres RLS, since an anonymous session has no auth.uid() to key a policy on.';

-- One active cart per authenticated customer.
CREATE UNIQUE INDEX IF NOT EXISTS uq_cart_customer_id
  ON public.cart (customer_id) WHERE customer_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_cart_session_id ON public.cart (session_id);
CREATE INDEX IF NOT EXISTS idx_cart_updated_at ON public.cart (updated_at);

DROP TRIGGER IF EXISTS trg_cart_updated_at ON public.cart;
CREATE TRIGGER trg_cart_updated_at
  BEFORE UPDATE ON public.cart
  FOR EACH ROW EXECUTE FUNCTION public.trg_set_updated_at();

-- RLS: enabled here, policies defined centrally in 016_rls.sql
-- (RLS-2 for customer_id-owned carts; guest carts additionally gated
-- at the API layer per the column comment above).
ALTER TABLE public.cart ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cart FORCE ROW LEVEL SECURITY;


-- =====================================================================
-- TABLE: cart_item
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.cart_item (
  id                     uuid          NOT NULL DEFAULT gen_random_uuid(),
  cart_id                uuid          NOT NULL,
  product_id             uuid          NULL,
  variant_id             uuid          NULL,
  tailoring_request_id   uuid          NULL, -- FK deferred to 010_tailoring.sql
  qty                    integer       NOT NULL DEFAULT 1,
  unit_price_snapshot    numeric(12,2) NOT NULL,
  created_at             timestamptz   NOT NULL DEFAULT now(),
  updated_at             timestamptz   NOT NULL DEFAULT now(),
  CONSTRAINT cart_item_pkey PRIMARY KEY (id),
  CONSTRAINT cart_item_cart_id_fkey FOREIGN KEY (cart_id)
    REFERENCES public.cart (id) ON DELETE CASCADE,
  CONSTRAINT cart_item_product_id_fkey FOREIGN KEY (product_id)
    REFERENCES public.product (id) ON DELETE CASCADE,
  CONSTRAINT cart_item_variant_id_fkey FOREIGN KEY (variant_id)
    REFERENCES public.product_variant (id) ON DELETE CASCADE,
  CONSTRAINT cart_item_qty_positive_check CHECK (qty > 0),
  CONSTRAINT cart_item_unit_price_nonneg_check CHECK (unit_price_snapshot >= 0),
  CONSTRAINT cart_item_product_xor_tailoring_check CHECK (
    (product_id IS NOT NULL) <> (tailoring_request_id IS NOT NULL)
  ),
  CONSTRAINT cart_item_tailoring_qty_one_check CHECK (
    tailoring_request_id IS NULL OR qty = 1
  )
);

COMMENT ON TABLE public.cart_item IS
  'A cart line item: a ready-made/made-to-order product+variant, OR an in-progress bespoke request being formalized toward checkout — unified so cart-to-order conversion is consistent across all three product types (BRS v2.0 Section 9).';
COMMENT ON COLUMN public.cart_item.unit_price_snapshot IS
  'Price at time of adding to cart, for display only. Re-validated (never blindly trusted) against current product.price/quotation.total at actual checkout time — see RLS-5 anti-tampering principle.';

CREATE INDEX IF NOT EXISTS idx_cart_item_cart_id ON public.cart_item (cart_id);
-- Fixed per Production Readiness Review, Major Finding 4.4: both
-- product_id and variant_id are FK columns with ON DELETE CASCADE but
-- had no supporting index, meaning any admin operation needing "which
-- live carts reference this variant" (e.g. before deactivating a
-- variant or a price-change impact check) would sequential-scan this
-- table at scale.
CREATE INDEX IF NOT EXISTS idx_cart_item_product_id ON public.cart_item (product_id);
CREATE INDEX IF NOT EXISTS idx_cart_item_variant_id ON public.cart_item (variant_id);

DROP TRIGGER IF EXISTS trg_cart_item_updated_at ON public.cart_item;
CREATE TRIGGER trg_cart_item_updated_at
  BEFORE UPDATE ON public.cart_item
  FOR EACH ROW EXECUTE FUNCTION public.trg_set_updated_at();

-- Refreshes the parent cart's updated_at (resets the abandonment
-- clock) whenever an item is added, using the generic app_touch_parent
-- helper from 003_functions.sql.
CREATE OR REPLACE FUNCTION public.trg_cart_item_touch_cart()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM public.app_touch_parent('cart', NEW.cart_id);
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.trg_cart_item_touch_cart() IS
  'Bumps the parent cart.updated_at whenever a cart_item is inserted, so abandoned-cart detection correctly resets its clock.';

DROP TRIGGER IF EXISTS trg_cart_item_touch_cart_trigger ON public.cart_item;
CREATE TRIGGER trg_cart_item_touch_cart_trigger
  AFTER INSERT ON public.cart_item
  FOR EACH ROW EXECUTE FUNCTION public.trg_cart_item_touch_cart();

-- RLS: enabled here, policies defined centrally in 016_rls.sql
-- (follows parent cart's access rule).
ALTER TABLE public.cart_item ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cart_item FORCE ROW LEVEL SECURITY;
