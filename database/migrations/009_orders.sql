-- =====================================================================
-- Migration: 009_orders.sql
-- Purpose:   Orders / Commerce domain (Data Dictionary 05): order,
--            order_item, payment, payment_transaction, shipment,
--            shipment_tracking_event, coupon, coupon_redemption,
--            promotion, promotion_application, tax_rule,
--            invoice_sequence, invoice, return_request, refund,
--            refund_item, order_status_history. (17 tables)
-- Target:    PostgreSQL 15+, Supabase-compatible.
-- Idempotent: Yes.
-- Depends on: 001-008 (extensions, types, functions, auth, catalog,
--            inventory, customers, cart)
--
-- Cross-domain forward references: order_item.tailoring_request_id
-- and invoice.pdf_media_asset_id reference tables created later
-- (tailoring_request in 010_tailoring.sql, media_asset in
-- 011_cms.sql) and are declared as plain uuid with no inline FK; the
-- FK constraints are added via ALTER TABLE in those later migrations.
-- This file also finalizes the deferred FKs from 005_catalog.sql
-- (product_review.order_item_id) and 007_customers.sql
-- (loyalty_transaction.reference_order_id, inquiry.order_id).
--
-- Note on the Notifications dependency: the order status-change
-- trigger below calls public.app_enqueue_notification(...), a
-- function actually defined in 014_notifications.sql. This is safe
-- per the same late-binding principle used throughout this migration
-- set (PL/pgSQL function bodies are not validated against the catalog
-- until first execution) — by the time any real order status change
-- occurs in production, migration 014 will already have run.
-- =====================================================================


-- =====================================================================
-- TABLE: order
-- "order" is a reserved word in the SQL standard; quoted throughout.
-- =====================================================================
CREATE TABLE IF NOT EXISTS public."order" (
  id                          uuid                      NOT NULL DEFAULT gen_random_uuid(),
  customer_id                 uuid                      NULL,
  order_number                text                      NOT NULL,
  order_type                  text                      NOT NULL DEFAULT 'ready_made',
  status                      text                      NOT NULL DEFAULT 'pending_payment',
  subtotal                    numeric(12,2)             NOT NULL DEFAULT 0,
  discount_total               numeric(12,2)             NOT NULL DEFAULT 0,
  tax_total                   numeric(12,2)             NOT NULL DEFAULT 0,
  shipping_total               numeric(12,2)             NOT NULL DEFAULT 0,
  grand_total                  numeric(12,2)             NOT NULL DEFAULT 0,
  currency                    public.app_currency_code  NOT NULL DEFAULT 'INR',
  shipping_address_id          uuid                      NULL,
  shipping_address_snapshot    jsonb                     NULL,
  billing_address_id           uuid                      NULL,
  placed_at                   timestamptz               NOT NULL DEFAULT now(),
  created_at                  timestamptz               NOT NULL DEFAULT now(),
  updated_at                  timestamptz               NOT NULL DEFAULT now(),
  deleted_at                  timestamptz               NULL,
  created_by                  uuid                      NULL,
  updated_by                  uuid                      NULL,
  version                     integer                   NOT NULL DEFAULT 1,
  CONSTRAINT order_pkey PRIMARY KEY (id),
  CONSTRAINT order_order_number_key UNIQUE (order_number),
  CONSTRAINT order_customer_id_fkey FOREIGN KEY (customer_id)
    REFERENCES public.customer (id) ON DELETE RESTRICT,
  CONSTRAINT order_shipping_address_id_fkey FOREIGN KEY (shipping_address_id)
    REFERENCES public.address (id) ON DELETE RESTRICT,
  CONSTRAINT order_billing_address_id_fkey FOREIGN KEY (billing_address_id)
    REFERENCES public.address (id) ON DELETE RESTRICT,
  CONSTRAINT order_created_by_fkey FOREIGN KEY (created_by)
    REFERENCES public.admin_user (id) ON DELETE RESTRICT,
  CONSTRAINT order_updated_by_fkey FOREIGN KEY (updated_by)
    REFERENCES public.admin_user (id) ON DELETE RESTRICT,
  CONSTRAINT order_type_check CHECK (order_type IN ('ready_made', 'made_to_order', 'bespoke', 'mixed')),
  CONSTRAINT order_status_check CHECK (status IN (
    'pending_payment', 'paid', 'in_fulfillment', 'shipped', 'delivered',
    'closed', 'returned', 'refunded', 'cancelled'
  )),
  CONSTRAINT order_subtotal_nonneg_check CHECK (subtotal >= 0),
  CONSTRAINT order_discount_total_nonneg_check CHECK (discount_total >= 0),
  CONSTRAINT order_tax_total_nonneg_check CHECK (tax_total >= 0),
  CONSTRAINT order_shipping_total_nonneg_check CHECK (shipping_total >= 0),
  -- Fixed per Production Readiness Review, Major Finding 4.5: subtotal,
  -- discount_total, tax_total, and shipping_total were each individually
  -- constrained non-negative, but grand_total itself (computed by
  -- trg_order_compute_grand_total as subtotal - discount_total +
  -- tax_total + shipping_total) had no such guard — a sufficiently
  -- large discount_total (e.g. a coupon/promotion stacking bug
  -- elsewhere) could otherwise produce a negative grand_total with no
  -- defense at the table level.
  CONSTRAINT order_grand_total_nonneg_check CHECK (grand_total >= 0)
);

COMMENT ON TABLE public."order" IS
  'The commercial record of a transaction — the single unifying entity across ready-made, made-to-order, and bespoke purchases. Pattern A. Every payment, shipment, invoice, and refund hangs off this table.';
COMMENT ON COLUMN public."order".order_type IS
  'Denormalized convenience classification, maintained by trg_order_item_derive_order_type (defined after order_item below) from the actual order_item contents. Kept stored for query performance (Architecture Review Notes v2.0-E).';
COMMENT ON COLUMN public."order".shipping_address_snapshot IS
  'Frozen copy of the address text at time of order — protects the order''s historical record from later edits to the live address row, mirroring order_item.description_snapshot. Required whenever shipping_address_id is set (application-enforced).';
COMMENT ON COLUMN public."order".grand_total IS
  'Authoritatively computed by trg_order_compute_grand_total below as subtotal - discount_total + tax_total + shipping_total. Never trusted from client input.';

CREATE UNIQUE INDEX IF NOT EXISTS uq_order_order_number ON public."order" (order_number);
CREATE INDEX IF NOT EXISTS idx_order_customer_id ON public."order" (customer_id);
CREATE INDEX IF NOT EXISTS idx_order_status ON public."order" (status);
CREATE INDEX IF NOT EXISTS idx_order_placed_at ON public."order" (placed_at DESC);
-- Added during internal follow-up audit: address FKs on this
-- high-volume table were unindexed, unlike every other FK on this
-- table — the same class of gap as cart_item (external review 4.4).
CREATE INDEX IF NOT EXISTS idx_order_shipping_address_id ON public."order" (shipping_address_id);
CREATE INDEX IF NOT EXISTS idx_order_billing_address_id ON public."order" (billing_address_id);

-- Concurrency-safe order_number generation via a native sequence
-- (Data Dictionary 05, order table, Section 11: "never MAX()+1 under
-- concurrent checkouts").
CREATE SEQUENCE IF NOT EXISTS public.order_number_seq START WITH 1 INCREMENT BY 1;

CREATE OR REPLACE FUNCTION public.app_generate_order_number()
RETURNS text
LANGUAGE sql
AS $$
  SELECT 'AP-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('public.order_number_seq')::text, 6, '0');
$$;

COMMENT ON FUNCTION public.app_generate_order_number() IS
  'Generates a concurrency-safe, human-friendly order number (e.g. AP-2026-000483) via an atomic sequence nextval(). Never derive order_number from MAX(order_number)+1.';

ALTER TABLE public."order"
  ALTER COLUMN order_number SET DEFAULT public.app_generate_order_number();

DROP TRIGGER IF EXISTS trg_order_updated_at ON public."order";
CREATE TRIGGER trg_order_updated_at
  BEFORE UPDATE ON public."order"
  FOR EACH ROW EXECUTE FUNCTION public.trg_set_updated_at_versioned();

DROP TRIGGER IF EXISTS trg_order_audit ON public."order";
CREATE TRIGGER trg_order_audit
  AFTER INSERT OR UPDATE OR DELETE ON public."order"
  FOR EACH ROW EXECUTE FUNCTION public.trg_audit_log();

DROP TRIGGER IF EXISTS trg_order_soft_delete ON public."order";
CREATE TRIGGER trg_order_soft_delete
  BEFORE DELETE ON public."order"
  FOR EACH ROW EXECUTE FUNCTION public.trg_soft_delete_guard();

-- Authoritative grand_total computation.
CREATE OR REPLACE FUNCTION public.trg_order_compute_grand_total()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.grand_total := NEW.subtotal - NEW.discount_total + NEW.tax_total + NEW.shipping_total;
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.trg_order_compute_grand_total() IS
  'Authoritatively computes order.grand_total = subtotal - discount_total + tax_total + shipping_total on every insert/update.';

DROP TRIGGER IF EXISTS trg_order_compute_grand_total_trigger ON public."order";
CREATE TRIGGER trg_order_compute_grand_total_trigger
  BEFORE INSERT OR UPDATE OF subtotal, discount_total, tax_total, shipping_total ON public."order"
  FOR EACH ROW EXECUTE FUNCTION public.trg_order_compute_grand_total();

-- Status-change trigger: logs to order_status_history (created later
-- in this file — safe forward reference, PL/pgSQL late binding) and
-- enqueues a notification.
CREATE OR REPLACE FUNCTION public.trg_order_status_change()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.order_status_history (order_id, status, changed_by)
    VALUES (NEW.id, NEW.status, public.app_current_admin_user_id());

    PERFORM public.app_enqueue_notification(
      p_template_key => 'order_' || NEW.status,
      p_related_entity_type => 'order',
      p_related_entity_id => NEW.id
    );
  END IF;
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.trg_order_status_change() IS
  'On order.status change, logs to order_status_history and enqueues a status-appropriate notification via app_enqueue_notification (defined in 014_notifications.sql).';

DROP TRIGGER IF EXISTS trg_order_status_change_trigger ON public."order";
CREATE TRIGGER trg_order_status_change_trigger
  AFTER UPDATE OF status ON public."order"
  FOR EACH ROW EXECUTE FUNCTION public.trg_order_status_change();

-- RLS: enabled here, policies defined centrally in 016_rls.sql
-- (RLS-5: owner-SELECT only; no client INSERT/UPDATE whatsoever —
-- every order is created via a SECURITY DEFINER checkout function).
ALTER TABLE public."order" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."order" FORCE ROW LEVEL SECURITY;


-- =====================================================================
-- TABLE: order_item
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.order_item (
  id                     uuid          NOT NULL DEFAULT gen_random_uuid(),
  order_id               uuid          NOT NULL,
  product_id             uuid          NULL,
  variant_id             uuid          NULL,
  tailoring_request_id   uuid          NULL, -- FK deferred to 010_tailoring.sql
  description_snapshot   text          NOT NULL,
  qty                    integer       NOT NULL DEFAULT 1,
  unit_price             numeric(12,2) NOT NULL,
  line_total             numeric(12,2) NOT NULL DEFAULT 0,
  created_at             timestamptz   NOT NULL DEFAULT now(),
  updated_at             timestamptz   NOT NULL DEFAULT now(),
  CONSTRAINT order_item_pkey PRIMARY KEY (id),
  CONSTRAINT order_item_order_id_fkey FOREIGN KEY (order_id)
    REFERENCES public."order" (id) ON DELETE CASCADE,
  CONSTRAINT order_item_product_id_fkey FOREIGN KEY (product_id)
    REFERENCES public.product (id) ON DELETE RESTRICT,
  CONSTRAINT order_item_variant_id_fkey FOREIGN KEY (variant_id)
    REFERENCES public.product_variant (id) ON DELETE RESTRICT,
  CONSTRAINT order_item_qty_positive_check CHECK (qty > 0),
  CONSTRAINT order_item_unit_price_nonneg_check CHECK (unit_price >= 0),
  CONSTRAINT order_item_product_xor_tailoring_check CHECK (
    (product_id IS NOT NULL) <> (tailoring_request_id IS NOT NULL)
  )
);

COMMENT ON TABLE public.order_item IS
  'An individual line within an order. description_snapshot deliberately duplicates catalog/tailoring data — an order must remain a truthful historical record regardless of later catalog edits.';

CREATE INDEX IF NOT EXISTS idx_order_item_order_id ON public.order_item (order_id);
CREATE INDEX IF NOT EXISTS idx_order_item_variant_id ON public.order_item (variant_id);
-- Added during internal follow-up audit (same tier as the external
-- review's cart_item finding): product_id had no index despite being
-- the natural key for "sales by product" reporting on a high-volume
-- table.
CREATE INDEX IF NOT EXISTS idx_order_item_product_id ON public.order_item (product_id);

DROP TRIGGER IF EXISTS trg_order_item_updated_at ON public.order_item;
CREATE TRIGGER trg_order_item_updated_at
  BEFORE UPDATE ON public.order_item
  FOR EACH ROW EXECUTE FUNCTION public.trg_set_updated_at();

-- Authoritative line_total computation.
CREATE OR REPLACE FUNCTION public.trg_order_item_compute_line_total()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.line_total := NEW.qty * NEW.unit_price;
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.trg_order_item_compute_line_total() IS
  'Authoritatively computes order_item.line_total = qty * unit_price.';

DROP TRIGGER IF EXISTS trg_order_item_compute_line_total_trigger ON public.order_item;
CREATE TRIGGER trg_order_item_compute_line_total_trigger
  BEFORE INSERT OR UPDATE OF qty, unit_price ON public.order_item
  FOR EACH ROW EXECUTE FUNCTION public.trg_order_item_compute_line_total();

-- order.order_type derivation trigger (Data Dictionary 05, order
-- table Section 10 / order_item table Section 10).
CREATE OR REPLACE FUNCTION public.trg_order_item_derive_order_type()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_order_id uuid := COALESCE(NEW.order_id, OLD.order_id);
  v_has_tailoring boolean;
  v_has_ready_made boolean;
  v_has_made_to_order boolean;
  v_kind_count integer;
  v_derived_type text;
BEGIN
  SELECT
    bool_or(oi.tailoring_request_id IS NOT NULL),
    bool_or(pt.code = 'ready_made'),
    bool_or(pt.code = 'made_to_order')
  INTO v_has_tailoring, v_has_ready_made, v_has_made_to_order
  FROM public.order_item oi
  LEFT JOIN public.product p ON p.id = oi.product_id
  LEFT JOIN public.product_type pt ON pt.id = p.product_type_id
  WHERE oi.order_id = v_order_id;

  v_kind_count :=
    (CASE WHEN v_has_tailoring THEN 1 ELSE 0 END) +
    (CASE WHEN v_has_ready_made THEN 1 ELSE 0 END) +
    (CASE WHEN v_has_made_to_order THEN 1 ELSE 0 END);

  IF v_kind_count > 1 THEN
    v_derived_type := 'mixed';
  ELSIF v_has_tailoring THEN
    v_derived_type := 'bespoke';
  ELSIF v_has_made_to_order THEN
    v_derived_type := 'made_to_order';
  ELSE
    v_derived_type := 'ready_made';
  END IF;

  UPDATE public."order" SET order_type = v_derived_type WHERE id = v_order_id;

  RETURN COALESCE(NEW, OLD);
END;
$$;

COMMENT ON FUNCTION public.trg_order_item_derive_order_type() IS
  'Recomputes the parent order.order_type (ready_made|made_to_order|bespoke|mixed) from the distinct set of item kinds present in order_item whenever a row is inserted, updated, or deleted.';

DROP TRIGGER IF EXISTS trg_order_item_derive_order_type_trigger ON public.order_item;
CREATE TRIGGER trg_order_item_derive_order_type_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.order_item
  FOR EACH ROW EXECUTE FUNCTION public.trg_order_item_derive_order_type();

ALTER TABLE public.order_item ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_item FORCE ROW LEVEL SECURITY;


-- =====================================================================
-- TABLE: payment
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.payment (
  id                   uuid          NOT NULL DEFAULT gen_random_uuid(),
  order_id             uuid          NOT NULL,
  provider             text          NOT NULL,
  status               text          NOT NULL DEFAULT 'initiated',
  amount               numeric(12,2) NOT NULL,
  currency             public.app_currency_code NOT NULL DEFAULT 'INR',
  provider_reference   text          NULL,
  created_at           timestamptz   NOT NULL DEFAULT now(),
  updated_at           timestamptz   NOT NULL DEFAULT now(),
  deleted_at           timestamptz   NULL,
  created_by           uuid          NULL,
  updated_by           uuid          NULL,
  version              integer       NOT NULL DEFAULT 1,
  CONSTRAINT payment_pkey PRIMARY KEY (id),
  CONSTRAINT payment_order_id_fkey FOREIGN KEY (order_id)
    REFERENCES public."order" (id) ON DELETE RESTRICT,
  CONSTRAINT payment_created_by_fkey FOREIGN KEY (created_by)
    REFERENCES public.admin_user (id) ON DELETE RESTRICT,
  CONSTRAINT payment_updated_by_fkey FOREIGN KEY (updated_by)
    REFERENCES public.admin_user (id) ON DELETE RESTRICT,
  CONSTRAINT payment_provider_check CHECK (provider IN ('razorpay', 'stripe', 'cod', 'bank_transfer')),
  CONSTRAINT payment_status_check CHECK (status IN (
    'initiated', 'authorized', 'captured', 'failed', 'refunded', 'partially_refunded'
  )),
  CONSTRAINT payment_amount_nonneg_check CHECK (amount >= 0)
);

COMMENT ON TABLE public.payment IS
  'A payment attempt/record against an order — provider-agnostic. amount may be less than order.grand_total if this is a deposit (installment support: schema-ready, business confirmation pending per BRS v2.0 Ambiguity v2.0-C).';

CREATE INDEX IF NOT EXISTS idx_payment_order_id ON public.payment (order_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_payment_provider_reference
  ON public.payment (provider, provider_reference) WHERE provider_reference IS NOT NULL;

DROP TRIGGER IF EXISTS trg_payment_updated_at ON public.payment;
CREATE TRIGGER trg_payment_updated_at
  BEFORE UPDATE ON public.payment
  FOR EACH ROW EXECUTE FUNCTION public.trg_set_updated_at_versioned();

DROP TRIGGER IF EXISTS trg_payment_audit ON public.payment;
CREATE TRIGGER trg_payment_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.payment
  FOR EACH ROW EXECUTE FUNCTION public.trg_audit_log();

DROP TRIGGER IF EXISTS trg_payment_soft_delete ON public.payment;
CREATE TRIGGER trg_payment_soft_delete
  BEFORE DELETE ON public.payment
  FOR EACH ROW EXECUTE FUNCTION public.trg_soft_delete_guard();

-- Payment status -> order status propagation.
CREATE OR REPLACE FUNCTION public.trg_payment_propagate_order_status()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status = 'captured' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'captured') THEN
    UPDATE public."order" SET status = 'paid' WHERE id = NEW.order_id AND status = 'pending_payment';
  ELSIF NEW.status = 'failed' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'failed') THEN
    PERFORM public.app_enqueue_notification(
      p_template_key => 'payment_failed',
      p_related_entity_type => 'order',
      p_related_entity_id => NEW.order_id
    );
  END IF;
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.trg_payment_propagate_order_status() IS
  'Propagates a payment reaching status=captured to order.status=paid, and enqueues a payment_failed notification on failure.';

DROP TRIGGER IF EXISTS trg_payment_propagate_order_status_trigger ON public.payment;
CREATE TRIGGER trg_payment_propagate_order_status_trigger
  AFTER INSERT OR UPDATE OF status ON public.payment
  FOR EACH ROW EXECUTE FUNCTION public.trg_payment_propagate_order_status();

-- RLS: enabled here, policies in 016_rls.sql (RLS-5).
ALTER TABLE public.payment ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment FORCE ROW LEVEL SECURITY;


-- =====================================================================
-- TABLE: payment_transaction
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.payment_transaction (
  id                 uuid          NOT NULL DEFAULT gen_random_uuid(),
  payment_id         uuid          NOT NULL,
  transaction_type   text          NOT NULL,
  amount             numeric(12,2) NULL,
  provider_payload   jsonb         NULL,
  created_at         timestamptz   NOT NULL DEFAULT now(),
  CONSTRAINT payment_transaction_pkey PRIMARY KEY (id),
  CONSTRAINT payment_transaction_payment_id_fkey FOREIGN KEY (payment_id)
    REFERENCES public.payment (id) ON DELETE RESTRICT,
  CONSTRAINT payment_transaction_type_check CHECK (transaction_type IN ('charge', 'refund', 'webhook_event'))
);

COMMENT ON TABLE public.payment_transaction IS
  'Raw, immutable log of every event against a payment — charge attempts, refund calls, webhook deliveries. provider_payload should have sensitive fields redacted before storage at the application layer.';

CREATE INDEX IF NOT EXISTS idx_payment_transaction_payment_created
  ON public.payment_transaction (payment_id, created_at DESC);
-- Idempotency guard for retried webhook deliveries, keyed on a
-- provider-supplied event id inside the payload where present.
CREATE UNIQUE INDEX IF NOT EXISTS uq_payment_transaction_webhook_event
  ON public.payment_transaction ((provider_payload ->> 'event_id'))
  WHERE transaction_type = 'webhook_event' AND provider_payload ? 'event_id';

ALTER TABLE public.payment_transaction ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_transaction FORCE ROW LEVEL SECURITY;


-- =====================================================================
-- TABLE: shipment
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.shipment (
  id             uuid        NOT NULL DEFAULT gen_random_uuid(),
  order_id       uuid        NOT NULL,
  carrier        text        NULL,
  tracking_number text       NULL,
  status         text        NOT NULL DEFAULT 'pending',
  shipped_at     timestamptz NULL,
  delivered_at   timestamptz NULL,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  deleted_at     timestamptz NULL,
  created_by     uuid        NULL,
  updated_by     uuid        NULL,
  version        integer     NOT NULL DEFAULT 1,
  CONSTRAINT shipment_pkey PRIMARY KEY (id),
  CONSTRAINT shipment_order_id_fkey FOREIGN KEY (order_id)
    REFERENCES public."order" (id) ON DELETE RESTRICT,
  CONSTRAINT shipment_created_by_fkey FOREIGN KEY (created_by)
    REFERENCES public.admin_user (id) ON DELETE RESTRICT,
  CONSTRAINT shipment_updated_by_fkey FOREIGN KEY (updated_by)
    REFERENCES public.admin_user (id) ON DELETE RESTRICT,
  CONSTRAINT shipment_status_check CHECK (status IN (
    'pending', 'picked_up', 'in_transit', 'out_for_delivery', 'delivered', 'failed_delivery'
  )),
  CONSTRAINT shipment_delivered_after_shipped_check CHECK (
    delivered_at IS NULL OR shipped_at IS NULL OR delivered_at >= shipped_at
  )
);

COMMENT ON TABLE public.shipment IS
  'Tracks physical fulfillment of an order via a carrier. A single order may have more than one shipment (split fulfillment).';

CREATE INDEX IF NOT EXISTS idx_shipment_order_id ON public.shipment (order_id);
CREATE INDEX IF NOT EXISTS idx_shipment_tracking_number ON public.shipment (tracking_number);

DROP TRIGGER IF EXISTS trg_shipment_updated_at ON public.shipment;
CREATE TRIGGER trg_shipment_updated_at
  BEFORE UPDATE ON public.shipment
  FOR EACH ROW EXECUTE FUNCTION public.trg_set_updated_at_versioned();

DROP TRIGGER IF EXISTS trg_shipment_audit ON public.shipment;
CREATE TRIGGER trg_shipment_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.shipment
  FOR EACH ROW EXECUTE FUNCTION public.trg_audit_log();

DROP TRIGGER IF EXISTS trg_shipment_soft_delete ON public.shipment;
CREATE TRIGGER trg_shipment_soft_delete
  BEFORE DELETE ON public.shipment
  FOR EACH ROW EXECUTE FUNCTION public.trg_soft_delete_guard();

-- Status-change trigger: logs to shipment_tracking_event (created
-- below — safe forward reference) and propagates delivery to order.
CREATE OR REPLACE FUNCTION public.trg_shipment_status_change()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.shipment_tracking_event (shipment_id, status, occurred_at)
    VALUES (NEW.id, NEW.status, now());

    IF NEW.status = 'delivered' THEN
      UPDATE public."order" SET status = 'delivered' WHERE id = NEW.order_id;
      PERFORM public.app_enqueue_notification(
        p_template_key => 'order_delivered',
        p_related_entity_type => 'order',
        p_related_entity_id => NEW.order_id
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.trg_shipment_status_change() IS
  'On shipment.status change, logs to shipment_tracking_event, and on reaching delivered, updates order.status and enqueues the delivery notification.';

DROP TRIGGER IF EXISTS trg_shipment_status_change_trigger ON public.shipment;
CREATE TRIGGER trg_shipment_status_change_trigger
  AFTER UPDATE OF status ON public.shipment
  FOR EACH ROW EXECUTE FUNCTION public.trg_shipment_status_change();

ALTER TABLE public.shipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipment FORCE ROW LEVEL SECURITY;


-- =====================================================================
-- TABLE: shipment_tracking_event
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.shipment_tracking_event (
  id            uuid        NOT NULL DEFAULT gen_random_uuid(),
  shipment_id   uuid        NOT NULL,
  status        text        NOT NULL,
  location      text        NULL,
  occurred_at   timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT shipment_tracking_event_pkey PRIMARY KEY (id),
  CONSTRAINT shipment_tracking_event_shipment_id_fkey FOREIGN KEY (shipment_id)
    REFERENCES public.shipment (id) ON DELETE RESTRICT
);

COMMENT ON TABLE public.shipment_tracking_event IS
  'Immutable log of carrier tracking updates, powering a customer-facing tracking timeline.';

CREATE INDEX IF NOT EXISTS idx_shipment_tracking_event_shipment_occurred
  ON public.shipment_tracking_event (shipment_id, occurred_at);

ALTER TABLE public.shipment_tracking_event ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipment_tracking_event FORCE ROW LEVEL SECURITY;


-- =====================================================================
-- TABLE: coupon
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.coupon (
  id                   uuid          NOT NULL DEFAULT gen_random_uuid(),
  code                 extensions.citext NOT NULL, -- citext for case-insensitive comparison; NOT the app_email domain, which would wrongly enforce an email-shaped format on coupon codes
  discount_type        text          NOT NULL,
  value                numeric(12,2) NOT NULL,
  min_order_value      numeric(12,2) NULL,
  usage_limit          integer       NULL,
  per_customer_limit   integer       NULL,
  starts_at            timestamptz   NULL,
  ends_at              timestamptz   NULL,
  status               text          NOT NULL DEFAULT 'active',
  created_at           timestamptz   NOT NULL DEFAULT now(),
  updated_at           timestamptz   NOT NULL DEFAULT now(),
  deleted_at           timestamptz   NULL,
  created_by           uuid          NULL,
  updated_by           uuid          NULL,
  version              integer       NOT NULL DEFAULT 1,
  CONSTRAINT coupon_pkey PRIMARY KEY (id),
  CONSTRAINT coupon_code_key UNIQUE (code),
  CONSTRAINT coupon_created_by_fkey FOREIGN KEY (created_by)
    REFERENCES public.admin_user (id) ON DELETE RESTRICT,
  CONSTRAINT coupon_updated_by_fkey FOREIGN KEY (updated_by)
    REFERENCES public.admin_user (id) ON DELETE RESTRICT,
  CONSTRAINT coupon_discount_type_check CHECK (discount_type IN ('percent', 'fixed')),
  CONSTRAINT coupon_value_positive_check CHECK (value > 0),
  CONSTRAINT coupon_usage_limit_positive_check CHECK (usage_limit IS NULL OR usage_limit > 0),
  CONSTRAINT coupon_per_customer_limit_positive_check CHECK (per_customer_limit IS NULL OR per_customer_limit > 0),
  CONSTRAINT coupon_status_check CHECK (status IN ('active', 'paused', 'expired')),
  CONSTRAINT coupon_dates_check CHECK (ends_at IS NULL OR starts_at IS NULL OR ends_at >= starts_at)
);

COMMENT ON TABLE public.coupon IS
  'Code-based, customer-entered discounts — distinct from promotion (automatic, code-less discounts). code uses extensions.citext directly (not the app_email domain, whose CHECK enforces email-shaped format and would reject real coupon codes) purely for case-insensitive comparison.';

CREATE UNIQUE INDEX IF NOT EXISTS uq_coupon_code ON public.coupon (code);
CREATE INDEX IF NOT EXISTS idx_coupon_active ON public.coupon (id) WHERE status = 'active';

-- Conditional value-range validation: value <= 100 only when
-- discount_type = 'percent' (Data Dictionary 05, coupon Section 3 —
-- not expressible as a plain unconditional CHECK).
CREATE OR REPLACE FUNCTION public.trg_coupon_validate_value()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.discount_type = 'percent' AND NEW.value > 100 THEN
    RAISE EXCEPTION 'coupon "%": percent-type discount value must be <= 100', NEW.code;
  END IF;
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.trg_coupon_validate_value() IS
  'Enforces value <= 100 only when discount_type = percent; fixed-amount coupons are not subject to this ceiling.';

DROP TRIGGER IF EXISTS trg_coupon_validate_value_trigger ON public.coupon;
CREATE TRIGGER trg_coupon_validate_value_trigger
  BEFORE INSERT OR UPDATE ON public.coupon
  FOR EACH ROW EXECUTE FUNCTION public.trg_coupon_validate_value();

DROP TRIGGER IF EXISTS trg_coupon_updated_at ON public.coupon;
CREATE TRIGGER trg_coupon_updated_at
  BEFORE UPDATE ON public.coupon
  FOR EACH ROW EXECUTE FUNCTION public.trg_set_updated_at_versioned();

DROP TRIGGER IF EXISTS trg_coupon_audit ON public.coupon;
CREATE TRIGGER trg_coupon_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.coupon
  FOR EACH ROW EXECUTE FUNCTION public.trg_audit_log();

DROP TRIGGER IF EXISTS trg_coupon_soft_delete ON public.coupon;
CREATE TRIGGER trg_coupon_soft_delete
  BEFORE DELETE ON public.coupon
  FOR EACH ROW EXECUTE FUNCTION public.trg_soft_delete_guard();

-- RLS: enabled here; the raw table is staff-only (016_rls.sql), the
-- public-facing surface for checkout-time validation is the
-- app_validate_coupon() SECURITY DEFINER function below.
ALTER TABLE public.coupon ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupon FORCE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.app_validate_coupon(p_code text, p_order_subtotal numeric)
RETURNS TABLE (is_valid boolean, reason text, coupon_id uuid, discount_type text, value numeric)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_coupon public.coupon%ROWTYPE;
BEGIN
  SELECT * INTO v_coupon FROM public.coupon c WHERE c.code = p_code AND c.deleted_at IS NULL;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'not_found', NULL::uuid, NULL::text, NULL::numeric;
    RETURN;
  END IF;

  IF v_coupon.status <> 'active' THEN
    RETURN QUERY SELECT false, 'inactive', v_coupon.id, NULL::text, NULL::numeric;
    RETURN;
  END IF;

  IF (v_coupon.starts_at IS NOT NULL AND now() < v_coupon.starts_at)
     OR (v_coupon.ends_at IS NOT NULL AND now() > v_coupon.ends_at) THEN
    RETURN QUERY SELECT false, 'out_of_date_range', v_coupon.id, NULL::text, NULL::numeric;
    RETURN;
  END IF;

  IF v_coupon.min_order_value IS NOT NULL AND p_order_subtotal < v_coupon.min_order_value THEN
    RETURN QUERY SELECT false, 'below_min_order_value', v_coupon.id, NULL::text, NULL::numeric;
    RETURN;
  END IF;

  IF v_coupon.usage_limit IS NOT NULL THEN
    IF (SELECT count(*) FROM public.coupon_redemption cr WHERE cr.coupon_id = v_coupon.id) >= v_coupon.usage_limit THEN
      RETURN QUERY SELECT false, 'usage_limit_reached', v_coupon.id, NULL::text, NULL::numeric;
      RETURN;
    END IF;
  END IF;

  RETURN QUERY SELECT true, NULL::text, v_coupon.id, v_coupon.discount_type, v_coupon.value;
END;
$$;

COMMENT ON FUNCTION public.app_validate_coupon(text, numeric) IS
  'Public-facing, SECURITY DEFINER coupon validation surface for checkout. Returns validity plus discount parameters without exposing the raw coupon table to anon/authenticated roles directly.';


-- =====================================================================
-- TABLE: coupon_redemption
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.coupon_redemption (
  id            uuid        NOT NULL DEFAULT gen_random_uuid(),
  coupon_id     uuid        NOT NULL,
  order_id      uuid        NOT NULL,
  customer_id   uuid        NULL,
  redeemed_at   timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT coupon_redemption_pkey PRIMARY KEY (id),
  CONSTRAINT coupon_redemption_order_id_key UNIQUE (order_id, coupon_id),
  CONSTRAINT coupon_redemption_coupon_id_fkey FOREIGN KEY (coupon_id)
    REFERENCES public.coupon (id) ON DELETE RESTRICT,
  CONSTRAINT coupon_redemption_order_id_fkey FOREIGN KEY (order_id)
    REFERENCES public."order" (id) ON DELETE RESTRICT,
  CONSTRAINT coupon_redemption_customer_id_fkey FOREIGN KEY (customer_id)
    REFERENCES public.customer (id) ON DELETE RESTRICT
);

COMMENT ON TABLE public.coupon_redemption IS
  'Records each use of a coupon against an order. per_customer_limit enforcement requires counting prior rows, done via trg_coupon_redemption_enforce_limit below (not expressible as a plain constraint).';

CREATE INDEX IF NOT EXISTS idx_coupon_redemption_coupon_id ON public.coupon_redemption (coupon_id);
CREATE INDEX IF NOT EXISTS idx_coupon_redemption_customer_id ON public.coupon_redemption (customer_id);

CREATE OR REPLACE FUNCTION public.trg_coupon_redemption_enforce_limit()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_limit integer;
  v_existing_count integer;
BEGIN
  IF NEW.customer_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT per_customer_limit INTO v_limit FROM public.coupon WHERE id = NEW.coupon_id;

  IF v_limit IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT count(*) INTO v_existing_count
  FROM public.coupon_redemption
  WHERE coupon_id = NEW.coupon_id AND customer_id = NEW.customer_id;

  IF v_existing_count >= v_limit THEN
    RAISE EXCEPTION 'coupon redemption limit (%) reached for this customer', v_limit;
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.trg_coupon_redemption_enforce_limit() IS
  'Rejects a coupon_redemption insert if the customer has already reached the coupon per_customer_limit.';

DROP TRIGGER IF EXISTS trg_coupon_redemption_enforce_limit_trigger ON public.coupon_redemption;
CREATE TRIGGER trg_coupon_redemption_enforce_limit_trigger
  BEFORE INSERT ON public.coupon_redemption
  FOR EACH ROW EXECUTE FUNCTION public.trg_coupon_redemption_enforce_limit();

ALTER TABLE public.coupon_redemption ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupon_redemption FORCE ROW LEVEL SECURITY;


-- =====================================================================
-- TABLE: promotion
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.promotion (
  id          uuid            NOT NULL DEFAULT gen_random_uuid(),
  name        text            NOT NULL,
  rule        public.app_jsonb_object NOT NULL,
  starts_at   timestamptz     NULL,
  ends_at     timestamptz     NULL,
  status      text            NOT NULL DEFAULT 'active',
  created_at  timestamptz     NOT NULL DEFAULT now(),
  updated_at  timestamptz     NOT NULL DEFAULT now(),
  deleted_at  timestamptz     NULL,
  created_by  uuid            NULL,
  updated_by  uuid            NULL,
  version     integer         NOT NULL DEFAULT 1,
  CONSTRAINT promotion_pkey PRIMARY KEY (id),
  CONSTRAINT promotion_created_by_fkey FOREIGN KEY (created_by)
    REFERENCES public.admin_user (id) ON DELETE RESTRICT,
  CONSTRAINT promotion_updated_by_fkey FOREIGN KEY (updated_by)
    REFERENCES public.admin_user (id) ON DELETE RESTRICT,
  CONSTRAINT promotion_status_check CHECK (status IN ('active', 'paused', 'expired')),
  CONSTRAINT promotion_dates_check CHECK (ends_at IS NULL OR starts_at IS NULL OR ends_at >= starts_at)
);

COMMENT ON TABLE public.promotion IS
  'Automatic, code-less discounts (e.g. "10% off Festive Collection this week"), evaluated by the checkout pricing engine (application code), not by SQL. This table is a configuration store, not a computation engine.';

CREATE INDEX IF NOT EXISTS idx_promotion_active ON public.promotion (id) WHERE status = 'active';

DROP TRIGGER IF EXISTS trg_promotion_updated_at ON public.promotion;
CREATE TRIGGER trg_promotion_updated_at
  BEFORE UPDATE ON public.promotion
  FOR EACH ROW EXECUTE FUNCTION public.trg_set_updated_at_versioned();

DROP TRIGGER IF EXISTS trg_promotion_audit ON public.promotion;
CREATE TRIGGER trg_promotion_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.promotion
  FOR EACH ROW EXECUTE FUNCTION public.trg_audit_log();

DROP TRIGGER IF EXISTS trg_promotion_soft_delete ON public.promotion;
CREATE TRIGGER trg_promotion_soft_delete
  BEFORE DELETE ON public.promotion
  FOR EACH ROW EXECUTE FUNCTION public.trg_soft_delete_guard();

ALTER TABLE public.promotion ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promotion FORCE ROW LEVEL SECURITY;


-- =====================================================================
-- TABLE: promotion_application
-- Added during the Data Dictionary self-review (Section 2.3): gives
-- order.discount_total a traceable source for automatic promotions,
-- mirroring what coupon_redemption already provides for coupons.
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.promotion_application (
  id               uuid          NOT NULL DEFAULT gen_random_uuid(),
  promotion_id     uuid          NOT NULL,
  order_id         uuid          NOT NULL,
  amount_applied   numeric(12,2) NOT NULL,
  applied_at       timestamptz   NOT NULL DEFAULT now(),
  CONSTRAINT promotion_application_pkey PRIMARY KEY (id),
  CONSTRAINT promotion_application_order_promotion_key UNIQUE (order_id, promotion_id),
  CONSTRAINT promotion_application_promotion_id_fkey FOREIGN KEY (promotion_id)
    REFERENCES public.promotion (id) ON DELETE RESTRICT,
  CONSTRAINT promotion_application_order_id_fkey FOREIGN KEY (order_id)
    REFERENCES public."order" (id) ON DELETE RESTRICT,
  CONSTRAINT promotion_application_amount_nonneg_check CHECK (amount_applied >= 0)
);

COMMENT ON TABLE public.promotion_application IS
  'Records that a specific promotion was applied to a specific order and for how much, giving order.discount_total a traceable source. Added during Principal Database Architect Self-Review.';

CREATE INDEX IF NOT EXISTS idx_promotion_application_promotion_id ON public.promotion_application (promotion_id);
CREATE INDEX IF NOT EXISTS idx_promotion_application_order_id ON public.promotion_application (order_id);

ALTER TABLE public.promotion_application ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promotion_application FORCE ROW LEVEL SECURITY;


-- =====================================================================
-- TABLE: tax_rule
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.tax_rule (
  id          uuid                    NOT NULL DEFAULT gen_random_uuid(),
  region      text                    NOT NULL,
  tax_type    text                    NOT NULL,
  rate        public.app_percentage   NOT NULL,
  applies_to  jsonb                   NULL,
  is_active   boolean                 NOT NULL DEFAULT true,
  created_at  timestamptz             NOT NULL DEFAULT now(),
  updated_at  timestamptz             NOT NULL DEFAULT now(),
  deleted_at  timestamptz             NULL,
  created_by  uuid                    NULL,
  updated_by  uuid                    NULL,
  version     integer                 NOT NULL DEFAULT 1,
  CONSTRAINT tax_rule_pkey PRIMARY KEY (id),
  CONSTRAINT tax_rule_created_by_fkey FOREIGN KEY (created_by)
    REFERENCES public.admin_user (id) ON DELETE RESTRICT,
  CONSTRAINT tax_rule_updated_by_fkey FOREIGN KEY (updated_by)
    REFERENCES public.admin_user (id) ON DELETE RESTRICT
);

COMMENT ON TABLE public.tax_rule IS
  'Region- and category-dependent tax rates (India GST has apparel-category-dependent slabs). applies_to is jsonb to express conditional scoping (e.g. price-threshold-dependent slabs). Seed data requires legal/finance review of current GST slab structure before go-live.';

CREATE INDEX IF NOT EXISTS idx_tax_rule_region_type ON public.tax_rule (region, tax_type);

DROP TRIGGER IF EXISTS trg_tax_rule_updated_at ON public.tax_rule;
CREATE TRIGGER trg_tax_rule_updated_at
  BEFORE UPDATE ON public.tax_rule
  FOR EACH ROW EXECUTE FUNCTION public.trg_set_updated_at_versioned();

DROP TRIGGER IF EXISTS trg_tax_rule_audit ON public.tax_rule;
CREATE TRIGGER trg_tax_rule_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.tax_rule
  FOR EACH ROW EXECUTE FUNCTION public.trg_audit_log();

DROP TRIGGER IF EXISTS trg_tax_rule_soft_delete ON public.tax_rule;
CREATE TRIGGER trg_tax_rule_soft_delete
  BEFORE DELETE ON public.tax_rule
  FOR EACH ROW EXECUTE FUNCTION public.trg_soft_delete_guard();

ALTER TABLE public.tax_rule ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tax_rule FORCE ROW LEVEL SECURITY;


-- =====================================================================
-- TABLE: invoice_sequence
-- Natural key (financial_year), no surrogate id, per Data Dictionary
-- 05 Section 2 rationale.
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.invoice_sequence (
  financial_year  text    NOT NULL,
  last_number     integer NOT NULL DEFAULT 0,
  CONSTRAINT invoice_sequence_pkey PRIMARY KEY (financial_year),
  CONSTRAINT invoice_sequence_financial_year_format_check CHECK (financial_year ~ '^\d{4}-\d{2}$'),
  CONSTRAINT invoice_sequence_last_number_nonneg_check CHECK (last_number >= 0)
);

COMMENT ON TABLE public.invoice_sequence IS
  'Concurrency-safe, gapless, per-financial-year counter for invoice.invoice_number, satisfying Indian GST unbroken sequential numbering. Writes only via app_generate_invoice_number() below, inside the same transaction that creates the invoice row — never MAX()+1.';

ALTER TABLE public.invoice_sequence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_sequence FORCE ROW LEVEL SECURITY;

-- Computes the Indian financial-year string (April-March) for a given
-- timestamp, e.g. 2026-07-07 -> '2026-27'.
CREATE OR REPLACE FUNCTION public.app_financial_year(p_at timestamptz DEFAULT now())
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN extract(month FROM p_at) >= 4
      THEN extract(year FROM p_at)::text || '-' || lpad(((extract(year FROM p_at)::integer + 1) % 100)::text, 2, '0')
    ELSE (extract(year FROM p_at)::integer - 1)::text || '-' || lpad((extract(year FROM p_at)::integer % 100)::text, 2, '0')
  END;
$$;

COMMENT ON FUNCTION public.app_financial_year(timestamptz) IS
  'Returns the Indian financial-year string (April-March) for the given timestamp, e.g. 2026-07-07 -> 2026-27.';

-- Atomic, gapless invoice number generation: upserts/increments
-- invoice_sequence for the current financial year inside a single
-- statement (row-level lock during the UPDATE makes this safe under
-- concurrency), then formats the result.
CREATE OR REPLACE FUNCTION public.app_generate_invoice_number()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  v_fy text := public.app_financial_year();
  v_number integer;
BEGIN
  INSERT INTO public.invoice_sequence (financial_year, last_number)
  VALUES (v_fy, 1)
  ON CONFLICT (financial_year)
  DO UPDATE SET last_number = public.invoice_sequence.last_number + 1
  RETURNING last_number INTO v_number;

  RETURN 'AP/' || v_fy || '/' || lpad(v_number::text, 6, '0');
END;
$$;

COMMENT ON FUNCTION public.app_generate_invoice_number() IS
  'Atomically generates the next gapless invoice number for the current Indian financial year, e.g. AP/2026-27/000483. Never derive invoice numbers via MAX()+1.';


-- =====================================================================
-- TABLE: invoice
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.invoice (
  id                    uuid        NOT NULL DEFAULT gen_random_uuid(),
  order_id              uuid        NOT NULL,
  invoice_number        text        NOT NULL DEFAULT public.app_generate_invoice_number(),
  issued_at             timestamptz NOT NULL DEFAULT now(),
  pdf_media_asset_id    uuid        NULL, -- FK deferred to 011_cms.sql (media_asset)
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  deleted_at            timestamptz NULL,
  created_by            uuid        NULL,
  updated_by            uuid        NULL,
  version               integer     NOT NULL DEFAULT 1,
  CONSTRAINT invoice_pkey PRIMARY KEY (id),
  CONSTRAINT invoice_invoice_number_key UNIQUE (invoice_number),
  CONSTRAINT invoice_order_id_key UNIQUE (order_id),
  CONSTRAINT invoice_order_id_fkey FOREIGN KEY (order_id)
    REFERENCES public."order" (id) ON DELETE RESTRICT,
  CONSTRAINT invoice_created_by_fkey FOREIGN KEY (created_by)
    REFERENCES public.admin_user (id) ON DELETE RESTRICT,
  CONSTRAINT invoice_updated_by_fkey FOREIGN KEY (updated_by)
    REFERENCES public.admin_user (id) ON DELETE RESTRICT
);

COMMENT ON TABLE public.invoice IS
  'The GST-compliant invoice document record for an order. invoice_number/issued_at must never be mutated once set; TRG-SOFT-DELETE-GUARD here is a defensive safety net, not an expected operational path, since real invoices are essentially never deleted.';

CREATE UNIQUE INDEX IF NOT EXISTS uq_invoice_invoice_number ON public.invoice (invoice_number);
CREATE UNIQUE INDEX IF NOT EXISTS uq_invoice_order_id ON public.invoice (order_id);

DROP TRIGGER IF EXISTS trg_invoice_updated_at ON public.invoice;
CREATE TRIGGER trg_invoice_updated_at
  BEFORE UPDATE ON public.invoice
  FOR EACH ROW EXECUTE FUNCTION public.trg_set_updated_at_versioned();

DROP TRIGGER IF EXISTS trg_invoice_audit ON public.invoice;
CREATE TRIGGER trg_invoice_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.invoice
  FOR EACH ROW EXECUTE FUNCTION public.trg_audit_log();

DROP TRIGGER IF EXISTS trg_invoice_soft_delete ON public.invoice;
CREATE TRIGGER trg_invoice_soft_delete
  BEFORE DELETE ON public.invoice
  FOR EACH ROW EXECUTE FUNCTION public.trg_soft_delete_guard();

ALTER TABLE public.invoice ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice FORCE ROW LEVEL SECURITY;


-- =====================================================================
-- TABLE: return_request
-- Added per Architecture Review Notes Section 2.2: the operational
-- return/exchange workflow that precedes a financial refund.
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.return_request (
  id                       uuid        NOT NULL DEFAULT gen_random_uuid(),
  order_item_id            uuid        NOT NULL,
  customer_id              uuid        NOT NULL,
  reason                   text        NOT NULL,
  status                   text        NOT NULL DEFAULT 'requested',
  return_tracking_number   text        NULL,
  requested_at             timestamptz NOT NULL DEFAULT now(),
  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now(),
  deleted_at               timestamptz NULL,
  created_by               uuid        NULL,
  updated_by               uuid        NULL,
  version                  integer     NOT NULL DEFAULT 1,
  CONSTRAINT return_request_pkey PRIMARY KEY (id),
  CONSTRAINT return_request_order_item_id_fkey FOREIGN KEY (order_item_id)
    REFERENCES public.order_item (id) ON DELETE RESTRICT,
  CONSTRAINT return_request_customer_id_fkey FOREIGN KEY (customer_id)
    REFERENCES public.customer (id) ON DELETE RESTRICT,
  CONSTRAINT return_request_created_by_fkey FOREIGN KEY (created_by)
    REFERENCES public.admin_user (id) ON DELETE RESTRICT,
  CONSTRAINT return_request_updated_by_fkey FOREIGN KEY (updated_by)
    REFERENCES public.admin_user (id) ON DELETE RESTRICT,
  CONSTRAINT return_request_status_check CHECK (status IN (
    'requested', 'approved', 'rejected', 'item_received', 'inspected', 'refund_issued', 'exchanged'
  ))
);

COMMENT ON TABLE public.return_request IS
  'Tracks a customer-initiated return of a ready-made physical item. Bespoke/made-to-order items are treated as non-returnable by business policy — enforced at the application layer, not by a DB constraint (would require a cross-table check).';

CREATE INDEX IF NOT EXISTS idx_return_request_order_item_id ON public.return_request (order_item_id);
CREATE INDEX IF NOT EXISTS idx_return_request_customer_id ON public.return_request (customer_id);
CREATE INDEX IF NOT EXISTS idx_return_request_status ON public.return_request (status);

DROP TRIGGER IF EXISTS trg_return_request_updated_at ON public.return_request;
CREATE TRIGGER trg_return_request_updated_at
  BEFORE UPDATE ON public.return_request
  FOR EACH ROW EXECUTE FUNCTION public.trg_set_updated_at_versioned();

DROP TRIGGER IF EXISTS trg_return_request_audit ON public.return_request;
CREATE TRIGGER trg_return_request_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.return_request
  FOR EACH ROW EXECUTE FUNCTION public.trg_audit_log();

DROP TRIGGER IF EXISTS trg_return_request_soft_delete ON public.return_request;
CREATE TRIGGER trg_return_request_soft_delete
  BEFORE DELETE ON public.return_request
  FOR EACH ROW EXECUTE FUNCTION public.trg_soft_delete_guard();

CREATE OR REPLACE FUNCTION public.trg_return_request_status_change()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    PERFORM public.app_enqueue_notification(
      p_template_key => 'return_' || NEW.status,
      p_related_entity_type => 'return_request',
      p_related_entity_id => NEW.id
    );
  END IF;
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.trg_return_request_status_change() IS
  'Enqueues a status-appropriate customer notification whenever return_request.status changes.';

DROP TRIGGER IF EXISTS trg_return_request_status_change_trigger ON public.return_request;
CREATE TRIGGER trg_return_request_status_change_trigger
  AFTER UPDATE OF status ON public.return_request
  FOR EACH ROW EXECUTE FUNCTION public.trg_return_request_status_change();

ALTER TABLE public.return_request ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.return_request FORCE ROW LEVEL SECURITY;


-- =====================================================================
-- TABLE: refund
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.refund (
  id                   uuid          NOT NULL DEFAULT gen_random_uuid(),
  order_id             uuid          NOT NULL,
  payment_id           uuid          NOT NULL,
  return_request_id    uuid          NULL,
  amount               numeric(12,2) NOT NULL,
  reason               text          NOT NULL,
  status               text          NOT NULL DEFAULT 'requested',
  processed_at         timestamptz   NULL,
  created_at           timestamptz   NOT NULL DEFAULT now(),
  updated_at           timestamptz   NOT NULL DEFAULT now(),
  deleted_at           timestamptz   NULL,
  created_by           uuid          NULL,
  updated_by           uuid          NULL,
  version              integer       NOT NULL DEFAULT 1,
  CONSTRAINT refund_pkey PRIMARY KEY (id),
  CONSTRAINT refund_order_id_fkey FOREIGN KEY (order_id)
    REFERENCES public."order" (id) ON DELETE RESTRICT,
  CONSTRAINT refund_payment_id_fkey FOREIGN KEY (payment_id)
    REFERENCES public.payment (id) ON DELETE RESTRICT,
  CONSTRAINT refund_return_request_id_fkey FOREIGN KEY (return_request_id)
    REFERENCES public.return_request (id) ON DELETE RESTRICT,
  CONSTRAINT refund_created_by_fkey FOREIGN KEY (created_by)
    REFERENCES public.admin_user (id) ON DELETE RESTRICT,
  CONSTRAINT refund_updated_by_fkey FOREIGN KEY (updated_by)
    REFERENCES public.admin_user (id) ON DELETE RESTRICT,
  CONSTRAINT refund_amount_positive_check CHECK (amount > 0),
  CONSTRAINT refund_status_check CHECK (status IN ('requested', 'approved', 'processed', 'rejected'))
);

COMMENT ON TABLE public.refund IS
  'The financial record of a refund against an order/payment, optionally originating from a return_request, or issued directly for cancellations/goodwill.';

CREATE INDEX IF NOT EXISTS idx_refund_order_id ON public.refund (order_id);
CREATE INDEX IF NOT EXISTS idx_refund_payment_id ON public.refund (payment_id);
CREATE INDEX IF NOT EXISTS idx_refund_return_request_id ON public.refund (return_request_id);

DROP TRIGGER IF EXISTS trg_refund_updated_at ON public.refund;
CREATE TRIGGER trg_refund_updated_at
  BEFORE UPDATE ON public.refund
  FOR EACH ROW EXECUTE FUNCTION public.trg_set_updated_at_versioned();

DROP TRIGGER IF EXISTS trg_refund_audit ON public.refund;
CREATE TRIGGER trg_refund_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.refund
  FOR EACH ROW EXECUTE FUNCTION public.trg_audit_log();

DROP TRIGGER IF EXISTS trg_refund_soft_delete ON public.refund;
CREATE TRIGGER trg_refund_soft_delete
  BEFORE DELETE ON public.refund
  FOR EACH ROW EXECUTE FUNCTION public.trg_soft_delete_guard();

-- Cumulative-refund validation: sum of all refund.amount for a
-- payment_id must never exceed that payment's amount.
CREATE OR REPLACE FUNCTION public.trg_refund_validate_cumulative()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_payment_amount numeric(12,2);
  v_total_refunded numeric(12,2);
BEGIN
  SELECT amount INTO v_payment_amount FROM public.payment WHERE id = NEW.payment_id;

  SELECT COALESCE(sum(amount), 0) INTO v_total_refunded
  FROM public.refund
  WHERE payment_id = NEW.payment_id
    AND deleted_at IS NULL
    AND id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid);

  IF v_total_refunded + NEW.amount > v_payment_amount THEN
    RAISE EXCEPTION 'refund amount % would exceed payment amount % (already refunded %)',
      NEW.amount, v_payment_amount, v_total_refunded;
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.trg_refund_validate_cumulative() IS
  'Rejects a refund insert/update if the cumulative refunded amount for the parent payment would exceed that payment''s amount.';

DROP TRIGGER IF EXISTS trg_refund_validate_cumulative_trigger ON public.refund;
CREATE TRIGGER trg_refund_validate_cumulative_trigger
  BEFORE INSERT OR UPDATE OF amount ON public.refund
  FOR EACH ROW EXECUTE FUNCTION public.trg_refund_validate_cumulative();

-- Status-change trigger: on reaching processed, updates payment.status
-- and enqueues a notification.
CREATE OR REPLACE FUNCTION public.trg_refund_status_change()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_payment_amount numeric(12,2);
  v_total_refunded numeric(12,2);
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.status = 'processed' AND OLD.status IS DISTINCT FROM 'processed' THEN
    SELECT amount INTO v_payment_amount FROM public.payment WHERE id = NEW.payment_id;
    SELECT COALESCE(sum(amount), 0) INTO v_total_refunded
    FROM public.refund WHERE payment_id = NEW.payment_id AND status = 'processed' AND deleted_at IS NULL;

    UPDATE public.payment
    SET status = CASE WHEN v_total_refunded >= v_payment_amount THEN 'refunded' ELSE 'partially_refunded' END
    WHERE id = NEW.payment_id;

    PERFORM public.app_enqueue_notification(
      p_template_key => 'refund_processed',
      p_related_entity_type => 'refund',
      p_related_entity_id => NEW.id
    );
  END IF;
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.trg_refund_status_change() IS
  'On refund.status reaching processed, updates the parent payment.status to refunded or partially_refunded and enqueues a notification.';

DROP TRIGGER IF EXISTS trg_refund_status_change_trigger ON public.refund;
CREATE TRIGGER trg_refund_status_change_trigger
  AFTER UPDATE OF status ON public.refund
  FOR EACH ROW EXECUTE FUNCTION public.trg_refund_status_change();

ALTER TABLE public.refund ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.refund FORCE ROW LEVEL SECURITY;


-- =====================================================================
-- TABLE: refund_item
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.refund_item (
  id              uuid          NOT NULL DEFAULT gen_random_uuid(),
  refund_id       uuid          NOT NULL,
  order_item_id   uuid          NOT NULL,
  qty             integer       NOT NULL,
  amount          numeric(12,2) NOT NULL,
  created_at      timestamptz   NOT NULL DEFAULT now(),
  updated_at      timestamptz   NOT NULL DEFAULT now(),
  CONSTRAINT refund_item_pkey PRIMARY KEY (id),
  CONSTRAINT refund_item_refund_id_fkey FOREIGN KEY (refund_id)
    REFERENCES public.refund (id) ON DELETE CASCADE,
  CONSTRAINT refund_item_order_item_id_fkey FOREIGN KEY (order_item_id)
    REFERENCES public.order_item (id) ON DELETE RESTRICT,
  CONSTRAINT refund_item_qty_positive_check CHECK (qty > 0),
  CONSTRAINT refund_item_amount_nonneg_check CHECK (amount >= 0)
);

COMMENT ON TABLE public.refund_item IS
  'Breaks down a refund by the specific order_item(s) and quantities it covers, supporting partial refunds.';

CREATE INDEX IF NOT EXISTS idx_refund_item_refund_id ON public.refund_item (refund_id);
CREATE INDEX IF NOT EXISTS idx_refund_item_order_item_id ON public.refund_item (order_item_id);

DROP TRIGGER IF EXISTS trg_refund_item_updated_at ON public.refund_item;
CREATE TRIGGER trg_refund_item_updated_at
  BEFORE UPDATE ON public.refund_item
  FOR EACH ROW EXECUTE FUNCTION public.trg_set_updated_at();

-- Deferred constraint trigger: at commit time, the sum of
-- refund_item.amount for a refund_id must equal that refund.amount.
-- Deferred (not immediate) so a transaction may insert multiple
-- refund_item rows one at a time before the total reconciles.
CREATE OR REPLACE FUNCTION public.trg_refund_item_validate_sum()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_refund_id uuid := COALESCE(NEW.refund_id, OLD.refund_id);
  v_refund_amount numeric(12,2);
  v_item_sum numeric(12,2);
BEGIN
  SELECT amount INTO v_refund_amount FROM public.refund WHERE id = v_refund_id;
  SELECT COALESCE(sum(amount), 0) INTO v_item_sum FROM public.refund_item WHERE refund_id = v_refund_id;

  IF v_item_sum <> v_refund_amount THEN
    RAISE EXCEPTION 'refund_item sum (%) does not equal parent refund.amount (%) for refund %',
      v_item_sum, v_refund_amount, v_refund_id;
  END IF;

  RETURN NULL;
END;
$$;

COMMENT ON FUNCTION public.trg_refund_item_validate_sum() IS
  'Deferred constraint trigger: validates at commit time that the sum of refund_item.amount for a refund equals the parent refund.amount.';

DROP TRIGGER IF EXISTS trg_refund_item_validate_sum_trigger ON public.refund_item;
CREATE CONSTRAINT TRIGGER trg_refund_item_validate_sum_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.refund_item
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION public.trg_refund_item_validate_sum();

ALTER TABLE public.refund_item ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.refund_item FORCE ROW LEVEL SECURITY;


-- =====================================================================
-- TABLE: order_status_history
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.order_status_history (
  id           uuid        NOT NULL DEFAULT gen_random_uuid(),
  order_id     uuid        NOT NULL,
  status       text        NOT NULL,
  changed_at   timestamptz NOT NULL DEFAULT now(),
  changed_by   uuid        NULL,
  note         text        NULL,
  CONSTRAINT order_status_history_pkey PRIMARY KEY (id),
  CONSTRAINT order_status_history_order_id_fkey FOREIGN KEY (order_id)
    REFERENCES public."order" (id) ON DELETE CASCADE,
  CONSTRAINT order_status_history_changed_by_fkey FOREIGN KEY (changed_by)
    REFERENCES public.admin_user (id) ON DELETE SET NULL
);

COMMENT ON TABLE public.order_status_history IS
  'Immutable audit trail of order.status transitions. Populated exclusively by trg_order_status_change (defined on the order table above), never written to directly.';

CREATE INDEX IF NOT EXISTS idx_order_status_history_order_changed
  ON public.order_status_history (order_id, changed_at DESC);

ALTER TABLE public.order_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_status_history FORCE ROW LEVEL SECURITY;


-- =====================================================================
-- Finalize deferred FKs from earlier migrations now that order and
-- order_item exist.
-- =====================================================================
ALTER TABLE public.loyalty_transaction
  DROP CONSTRAINT IF EXISTS loyalty_transaction_reference_order_id_fkey;
ALTER TABLE public.loyalty_transaction
  ADD CONSTRAINT loyalty_transaction_reference_order_id_fkey FOREIGN KEY (reference_order_id)
    REFERENCES public."order" (id) ON DELETE SET NULL;

ALTER TABLE public.inquiry
  DROP CONSTRAINT IF EXISTS inquiry_order_id_fkey;
ALTER TABLE public.inquiry
  ADD CONSTRAINT inquiry_order_id_fkey FOREIGN KEY (order_id)
    REFERENCES public."order" (id) ON DELETE RESTRICT;

ALTER TABLE public.product_review
  DROP CONSTRAINT IF EXISTS product_review_order_item_id_fkey;
ALTER TABLE public.product_review
  ADD CONSTRAINT product_review_order_item_id_fkey FOREIGN KEY (order_item_id)
    REFERENCES public.order_item (id) ON DELETE SET NULL;
