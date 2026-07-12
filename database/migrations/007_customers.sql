-- =====================================================================
-- Migration: 007_customers.sql
-- Purpose:   Customer domain (Data Dictionary 04): customer_tier,
--            customer, address, wishlist, wishlist_item,
--            loyalty_account, loyalty_transaction, referral,
--            communication_preference, customer_device, inquiry.
--            (cart/cart_item are deferred to 008_cart.sql per the
--            requested migration order.)
-- Target:    PostgreSQL 15+, Supabase-compatible.
-- Idempotent: Yes.
-- Depends on: 001_extensions.sql, 002_types.sql, 003_functions.sql,
--            004_auth.sql, 005_catalog.sql, 006_inventory.sql
--
-- Cross-domain forward references: loyalty_transaction.reference_order_id
-- and inquiry.order_id reference public.order (Orders domain,
-- 009_orders.sql) and are declared here as plain uuid with no inline
-- FK; the FK constraint is added via ALTER TABLE at the end of
-- 009_orders.sql.
-- =====================================================================


-- =====================================================================
-- TABLE: customer_tier
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.customer_tier (
  id                    uuid          NOT NULL DEFAULT gen_random_uuid(),
  name                  text          NOT NULL,
  min_spend_threshold   numeric(12,2) NOT NULL DEFAULT 0,
  benefits              jsonb         NULL,
  sort_order            integer       NOT NULL DEFAULT 0,
  created_at            timestamptz   NOT NULL DEFAULT now(),
  updated_at            timestamptz   NOT NULL DEFAULT now(),
  CONSTRAINT customer_tier_pkey PRIMARY KEY (id),
  CONSTRAINT customer_tier_name_key UNIQUE (name),
  CONSTRAINT customer_tier_min_spend_nonneg_check CHECK (min_spend_threshold >= 0)
);

COMMENT ON TABLE public.customer_tier IS
  'Lookup of loyalty/VIP tiers (Bronze/Silver/Gold/Platinum). Tier assignment (moving a customer between tiers) is a scheduled/triggered business process evaluated against cumulative order totals, not performed by this table itself.';

CREATE INDEX IF NOT EXISTS idx_customer_tier_sort_order ON public.customer_tier (sort_order);

DROP TRIGGER IF EXISTS trg_customer_tier_updated_at ON public.customer_tier;
CREATE TRIGGER trg_customer_tier_updated_at
  BEFORE UPDATE ON public.customer_tier
  FOR EACH ROW EXECUTE FUNCTION public.trg_set_updated_at();

ALTER TABLE public.customer_tier ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_tier FORCE ROW LEVEL SECURITY;


-- =====================================================================
-- TABLE: customer
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.customer (
  id                       uuid             NOT NULL, -- supplied = auth.users.id, not generated here
  full_name                text             NULL,
  email                    public.app_email NULL,
  phone                    public.app_phone NULL,
  phone_verified           boolean          NOT NULL DEFAULT false,
  tier_id                  uuid             NULL,
  referred_by_customer_id  uuid             NULL,
  marketing_opt_in         boolean          NOT NULL DEFAULT false,
  created_at               timestamptz      NOT NULL DEFAULT now(),
  updated_at               timestamptz      NOT NULL DEFAULT now(),
  deleted_at               timestamptz      NULL,
  created_by               uuid             NULL,
  updated_by               uuid             NULL,
  version                  integer          NOT NULL DEFAULT 1,
  CONSTRAINT customer_pkey PRIMARY KEY (id),
  CONSTRAINT customer_tier_id_fkey FOREIGN KEY (tier_id)
    REFERENCES public.customer_tier (id) ON DELETE RESTRICT,
  CONSTRAINT customer_referred_by_customer_id_fkey FOREIGN KEY (referred_by_customer_id)
    REFERENCES public.customer (id) ON DELETE RESTRICT,
  CONSTRAINT customer_created_by_fkey FOREIGN KEY (created_by)
    REFERENCES public.admin_user (id) ON DELETE RESTRICT,
  CONSTRAINT customer_updated_by_fkey FOREIGN KEY (updated_by)
    REFERENCES public.admin_user (id) ON DELETE RESTRICT,
  CONSTRAINT customer_email_or_phone_check CHECK (email IS NOT NULL OR phone IS NOT NULL),
  CONSTRAINT customer_no_self_referral_check CHECK (referred_by_customer_id IS NULL OR referred_by_customer_id <> id)
);

COMMENT ON TABLE public.customer IS
  'Core identity record for a registered platform user. id equals the customer-auth-realm provider id (Supabase auth.users.id). deleted_at represents "anonymized," not "removed" — see trg_customer_soft_delete below.';
COMMENT ON COLUMN public.customer.deleted_at IS
  'Anonymization marker: a customer with deleted_at set is treated as a closed/anonymized account. PII columns (full_name/email/phone) should be nulled by the anonymization procedure at the same time deleted_at is set; historical order/review/tailoring_request rows remain intact via FK.';

CREATE UNIQUE INDEX IF NOT EXISTS uq_customer_email ON public.customer (email) WHERE email IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_customer_phone ON public.customer (phone) WHERE phone IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_customer_tier_id ON public.customer (tier_id);
-- Added during internal follow-up audit: the self-referential FK had
-- no supporting index for the reverse "who did this customer refer"
-- direction.
CREATE INDEX IF NOT EXISTS idx_customer_referred_by_customer_id ON public.customer (referred_by_customer_id) WHERE referred_by_customer_id IS NOT NULL;

DROP TRIGGER IF EXISTS trg_customer_updated_at ON public.customer;
CREATE TRIGGER trg_customer_updated_at
  BEFORE UPDATE ON public.customer
  FOR EACH ROW EXECUTE FUNCTION public.trg_set_updated_at_versioned();

DROP TRIGGER IF EXISTS trg_customer_audit ON public.customer;
CREATE TRIGGER trg_customer_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.customer
  FOR EACH ROW EXECUTE FUNCTION public.trg_audit_log();

-- Soft-delete guard reused as-is: for the customer table, "soft
-- delete" IS the anonymization marker (deleted_at). The actual nulling
-- of PII columns is performed by a dedicated anonymization procedure
-- (see app_anonymize_customer below), not by this generic guard —
-- the guard only ever prevents a literal hard DELETE.
DROP TRIGGER IF EXISTS trg_customer_soft_delete ON public.customer;
CREATE TRIGGER trg_customer_soft_delete
  BEFORE DELETE ON public.customer
  FOR EACH ROW EXECUTE FUNCTION public.trg_soft_delete_guard();

-- Explicit anonymization procedure (Architecture Review Notes Section
-- 5, Cross-Cutting Concern #3): nulls PII while retaining the row and
-- its id for referential integrity with historical orders, reviews,
-- and tailoring cases. This is the only sanctioned way to close a
-- customer account; it should be invoked by a SECURITY DEFINER edge
-- function gated behind proper authorization, never exposed as a raw
-- client-callable RPC without such a gate.
CREATE OR REPLACE FUNCTION public.app_anonymize_customer(p_customer_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
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
  'Anonymizes a customer account (nulls PII, sets deleted_at) while preserving the row and its id for referential integrity with historical orders, reviews, and tailoring cases. The sanctioned alternative to hard deletion.';

ALTER TABLE public.customer ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer FORCE ROW LEVEL SECURITY;


-- =====================================================================
-- TABLE: address
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.address (
  id           uuid                       NOT NULL DEFAULT gen_random_uuid(),
  customer_id  uuid                       NOT NULL,
  label        text                       NULL,
  line1        text                       NOT NULL,
  line2        text                       NULL,
  city         text                       NOT NULL,
  state        text                       NOT NULL,
  postal_code  text                       NOT NULL,
  country      public.app_iso_country_code NOT NULL DEFAULT 'IN',
  is_default   boolean                    NOT NULL DEFAULT false,
  created_at   timestamptz                NOT NULL DEFAULT now(),
  updated_at   timestamptz                NOT NULL DEFAULT now(),
  deleted_at   timestamptz                NULL,
  created_by   uuid                       NULL,
  updated_by   uuid                       NULL,
  version      integer                    NOT NULL DEFAULT 1,
  CONSTRAINT address_pkey PRIMARY KEY (id),
  CONSTRAINT address_customer_id_fkey FOREIGN KEY (customer_id)
    REFERENCES public.customer (id) ON DELETE RESTRICT,
  CONSTRAINT address_created_by_fkey FOREIGN KEY (created_by)
    REFERENCES public.admin_user (id) ON DELETE RESTRICT,
  CONSTRAINT address_updated_by_fkey FOREIGN KEY (updated_by)
    REFERENCES public.admin_user (id) ON DELETE RESTRICT
);

COMMENT ON TABLE public.address IS
  'One or more shipping/billing addresses per customer. state is required for tax_rule region matching at checkout.';

CREATE INDEX IF NOT EXISTS idx_address_customer_id ON public.address (customer_id);
CREATE INDEX IF NOT EXISTS idx_address_default
  ON public.address (customer_id) WHERE is_default AND deleted_at IS NULL;

DROP TRIGGER IF EXISTS trg_address_updated_at ON public.address;
CREATE TRIGGER trg_address_updated_at
  BEFORE UPDATE ON public.address
  FOR EACH ROW EXECUTE FUNCTION public.trg_set_updated_at_versioned();

DROP TRIGGER IF EXISTS trg_address_soft_delete ON public.address;
CREATE TRIGGER trg_address_soft_delete
  BEFORE DELETE ON public.address
  FOR EACH ROW EXECUTE FUNCTION public.trg_soft_delete_guard();

DROP TRIGGER IF EXISTS trg_address_single_default ON public.address;
CREATE TRIGGER trg_address_single_default
  BEFORE INSERT OR UPDATE OF is_default ON public.address
  FOR EACH ROW EXECUTE FUNCTION public.trg_enforce_single_flag('is_default', 'customer_id');

ALTER TABLE public.address ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.address FORCE ROW LEVEL SECURITY;


-- =====================================================================
-- TABLE: wishlist
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.wishlist (
  id           uuid        NOT NULL DEFAULT gen_random_uuid(),
  customer_id  uuid        NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT wishlist_pkey PRIMARY KEY (id),
  CONSTRAINT wishlist_customer_id_key UNIQUE (customer_id),
  CONSTRAINT wishlist_customer_id_fkey FOREIGN KEY (customer_id)
    REFERENCES public.customer (id) ON DELETE RESTRICT
);

COMMENT ON TABLE public.wishlist IS
  'Container for a customer''s saved-for-later products. One-to-one with customer, created lazily on first use. UNIQUE(customer_id) enforces the one-wishlist-per-customer rule at the DB level.';

DROP TRIGGER IF EXISTS trg_wishlist_updated_at ON public.wishlist;
CREATE TRIGGER trg_wishlist_updated_at
  BEFORE UPDATE ON public.wishlist
  FOR EACH ROW EXECUTE FUNCTION public.trg_set_updated_at();

ALTER TABLE public.wishlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wishlist FORCE ROW LEVEL SECURITY;


-- =====================================================================
-- TABLE: wishlist_item
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.wishlist_item (
  id           uuid        NOT NULL DEFAULT gen_random_uuid(),
  wishlist_id  uuid        NOT NULL,
  product_id   uuid        NOT NULL,
  variant_id   uuid        NULL,
  added_at     timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT wishlist_item_pkey PRIMARY KEY (id),
  CONSTRAINT wishlist_item_wishlist_id_fkey FOREIGN KEY (wishlist_id)
    REFERENCES public.wishlist (id) ON DELETE CASCADE,
  CONSTRAINT wishlist_item_product_id_fkey FOREIGN KEY (product_id)
    REFERENCES public.product (id) ON DELETE CASCADE,
  CONSTRAINT wishlist_item_variant_id_fkey FOREIGN KEY (variant_id)
    REFERENCES public.product_variant (id) ON DELETE SET NULL
);

COMMENT ON TABLE public.wishlist_item IS
  'An individual saved product (optionally a specific variant) within a customer wishlist. added_at doubles as created_at — items are added or removed, never edited.';

-- Prevent duplicate saves of the exact same product+variant, treating
-- NULL variant_id as a distinct "no specific variant" value equal to
-- itself via COALESCE, mirroring the product_variant uniqueness
-- pattern in 006_inventory.sql.
CREATE UNIQUE INDEX IF NOT EXISTS uq_wishlist_item_wishlist_product_variant
  ON public.wishlist_item (wishlist_id, product_id, COALESCE(variant_id, '00000000-0000-0000-0000-000000000000'::uuid));
CREATE INDEX IF NOT EXISTS idx_wishlist_item_wishlist_id ON public.wishlist_item (wishlist_id);
CREATE INDEX IF NOT EXISTS idx_wishlist_item_product_id ON public.wishlist_item (product_id);

ALTER TABLE public.wishlist_item ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wishlist_item FORCE ROW LEVEL SECURITY;


-- =====================================================================
-- TABLE: loyalty_account
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.loyalty_account (
  id              uuid        NOT NULL DEFAULT gen_random_uuid(),
  customer_id     uuid        NOT NULL,
  points_balance  integer     NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT loyalty_account_pkey PRIMARY KEY (id),
  CONSTRAINT loyalty_account_customer_id_key UNIQUE (customer_id),
  CONSTRAINT loyalty_account_customer_id_fkey FOREIGN KEY (customer_id)
    REFERENCES public.customer (id) ON DELETE RESTRICT,
  CONSTRAINT loyalty_account_points_nonneg_check CHECK (points_balance >= 0)
);

COMMENT ON TABLE public.loyalty_account IS
  'Tracks a customer points balance. points_balance is a denormalized running total, always derivable by summing loyalty_transaction.points_delta, maintained exclusively by trg_loyalty_transaction_apply_balance below — never written to directly.';

DROP TRIGGER IF EXISTS trg_loyalty_account_updated_at ON public.loyalty_account;
CREATE TRIGGER trg_loyalty_account_updated_at
  BEFORE UPDATE ON public.loyalty_account
  FOR EACH ROW EXECUTE FUNCTION public.trg_set_updated_at();

ALTER TABLE public.loyalty_account ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_account FORCE ROW LEVEL SECURITY;


-- =====================================================================
-- TABLE: loyalty_transaction
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.loyalty_transaction (
  id                   uuid        NOT NULL DEFAULT gen_random_uuid(),
  loyalty_account_id   uuid        NOT NULL,
  points_delta         integer     NOT NULL,
  reason               text        NOT NULL,
  reference_order_id   uuid        NULL, -- FK deferred to 009_orders.sql (order)
  created_at           timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT loyalty_transaction_pkey PRIMARY KEY (id),
  CONSTRAINT loyalty_transaction_loyalty_account_id_fkey FOREIGN KEY (loyalty_account_id)
    REFERENCES public.loyalty_account (id) ON DELETE RESTRICT,
  CONSTRAINT loyalty_transaction_points_delta_nonzero_check CHECK (points_delta <> 0)
);

COMMENT ON TABLE public.loyalty_transaction IS
  'Immutable, itemized ledger of every points earn/redeem event — the true source of truth for loyalty_account.points_balance.';

CREATE INDEX IF NOT EXISTS idx_loyalty_transaction_account_created
  ON public.loyalty_transaction (loyalty_account_id, created_at DESC);

-- Balance-maintenance trigger: keeps loyalty_account.points_balance in
-- sync with the sum of its transactions (Data Dictionary 04,
-- loyalty_account Section 10 / loyalty_transaction Section 10).
CREATE OR REPLACE FUNCTION public.trg_loyalty_transaction_apply_balance()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.loyalty_account
  SET points_balance = points_balance + NEW.points_delta
  WHERE id = NEW.loyalty_account_id;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.trg_loyalty_transaction_apply_balance() IS
  'Applies points_delta to the parent loyalty_account.points_balance whenever a loyalty_transaction is inserted.';

DROP TRIGGER IF EXISTS trg_loyalty_transaction_apply_balance_trigger ON public.loyalty_transaction;
CREATE TRIGGER trg_loyalty_transaction_apply_balance_trigger
  AFTER INSERT ON public.loyalty_transaction
  FOR EACH ROW EXECUTE FUNCTION public.trg_loyalty_transaction_apply_balance();

ALTER TABLE public.loyalty_transaction ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_transaction FORCE ROW LEVEL SECURITY;


-- =====================================================================
-- TABLE: referral
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.referral (
  id                     uuid        NOT NULL DEFAULT gen_random_uuid(),
  referrer_customer_id   uuid        NOT NULL,
  referred_customer_id   uuid        NOT NULL,
  code                   text        NOT NULL,
  status                 text        NOT NULL DEFAULT 'pending',
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT referral_pkey PRIMARY KEY (id),
  CONSTRAINT referral_code_key UNIQUE (code),
  CONSTRAINT referral_referrer_customer_id_fkey FOREIGN KEY (referrer_customer_id)
    REFERENCES public.customer (id) ON DELETE RESTRICT,
  CONSTRAINT referral_referred_customer_id_fkey FOREIGN KEY (referred_customer_id)
    REFERENCES public.customer (id) ON DELETE RESTRICT,
  CONSTRAINT referral_status_check CHECK (status IN ('pending', 'rewarded', 'expired')),
  CONSTRAINT referral_no_self_referral_check CHECK (referrer_customer_id <> referred_customer_id)
);

COMMENT ON TABLE public.referral IS
  'Tracks a referral relationship between two customers and the reward status. Assumes referred_customer_id is known at row-creation time (the row is created once someone signs up using a code) rather than modeling an un-redeemed-code pending state.';

CREATE UNIQUE INDEX IF NOT EXISTS uq_referral_code ON public.referral (code);
CREATE INDEX IF NOT EXISTS idx_referral_referrer ON public.referral (referrer_customer_id);
-- Added during internal follow-up audit: referral_owner_read
-- (016_rls.sql) filters on referrer_customer_id OR referred_customer_id
-- — only the former had a supporting index.
CREATE INDEX IF NOT EXISTS idx_referral_referred ON public.referral (referred_customer_id);

DROP TRIGGER IF EXISTS trg_referral_updated_at ON public.referral;
CREATE TRIGGER trg_referral_updated_at
  BEFORE UPDATE ON public.referral
  FOR EACH ROW EXECUTE FUNCTION public.trg_set_updated_at();

ALTER TABLE public.referral ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral FORCE ROW LEVEL SECURITY;


-- =====================================================================
-- TABLE: communication_preference
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.communication_preference (
  id           uuid              NOT NULL DEFAULT gen_random_uuid(),
  customer_id  uuid              NOT NULL,
  channel      public.app_channel NOT NULL,
  opt_in       boolean           NOT NULL DEFAULT true,
  created_at   timestamptz       NOT NULL DEFAULT now(),
  updated_at   timestamptz       NOT NULL DEFAULT now(),
  CONSTRAINT communication_preference_pkey PRIMARY KEY (id),
  CONSTRAINT communication_preference_customer_channel_key UNIQUE (customer_id, channel),
  CONSTRAINT communication_preference_customer_id_fkey FOREIGN KEY (customer_id)
    REFERENCES public.customer (id) ON DELETE RESTRICT
);

COMMENT ON TABLE public.communication_preference IS
  'Per-channel opt-in/opt-out granularity, consulted by the Notifications domain before any non-transactional send. Distinct from customer.marketing_opt_in (the master switch) — a customer may be opted in overall but have disabled one specific channel.';

DROP TRIGGER IF EXISTS trg_communication_preference_updated_at ON public.communication_preference;
CREATE TRIGGER trg_communication_preference_updated_at
  BEFORE UPDATE ON public.communication_preference
  FOR EACH ROW EXECUTE FUNCTION public.trg_set_updated_at();

ALTER TABLE public.communication_preference ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.communication_preference FORCE ROW LEVEL SECURITY;


-- =====================================================================
-- TABLE: customer_device
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.customer_device (
  id            uuid        NOT NULL DEFAULT gen_random_uuid(),
  customer_id   uuid        NOT NULL,
  platform      text        NOT NULL,
  push_token    text        NOT NULL,
  last_seen_at  timestamptz NOT NULL DEFAULT now(),
  is_active     boolean     NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT customer_device_pkey PRIMARY KEY (id),
  CONSTRAINT customer_device_push_token_key UNIQUE (push_token),
  CONSTRAINT customer_device_customer_id_fkey FOREIGN KEY (customer_id)
    REFERENCES public.customer (id) ON DELETE RESTRICT,
  CONSTRAINT customer_device_platform_check CHECK (platform IN ('ios', 'android', 'web'))
);

COMMENT ON TABLE public.customer_device IS
  'Registers a customer device for push notification delivery, supporting the platform''s future React Native app requirement. Added during the Data Dictionary self-review. is_active is set false on hard delivery failure (e.g. FCM NotRegistered) rather than deleting the row, preserving device history.';

CREATE INDEX IF NOT EXISTS idx_customer_device_customer_id ON public.customer_device (customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_device_active
  ON public.customer_device (customer_id) WHERE is_active;

DROP TRIGGER IF EXISTS trg_customer_device_updated_at ON public.customer_device;
CREATE TRIGGER trg_customer_device_updated_at
  BEFORE UPDATE ON public.customer_device
  FOR EACH ROW EXECUTE FUNCTION public.trg_set_updated_at();

ALTER TABLE public.customer_device ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_device FORCE ROW LEVEL SECURITY;


-- =====================================================================
-- TABLE: inquiry
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.inquiry (
  id             uuid             NOT NULL DEFAULT gen_random_uuid(),
  customer_id    uuid             NULL,
  order_id       uuid             NULL, -- FK deferred to 009_orders.sql (order)
  inquiry_type   text             NOT NULL DEFAULT 'general',
  name           text             NOT NULL,
  email          public.app_email NOT NULL,
  phone          public.app_phone NULL,
  subject        text             NOT NULL,
  message        text             NOT NULL,
  status         text             NOT NULL DEFAULT 'new',
  handled_by     uuid             NULL,
  source_page    text             NULL,
  created_at     timestamptz      NOT NULL DEFAULT now(),
  updated_at     timestamptz      NOT NULL DEFAULT now(),
  deleted_at     timestamptz      NULL,
  created_by     uuid             NULL,
  updated_by     uuid             NULL,
  version        integer          NOT NULL DEFAULT 1,
  CONSTRAINT inquiry_pkey PRIMARY KEY (id),
  CONSTRAINT inquiry_customer_id_fkey FOREIGN KEY (customer_id)
    REFERENCES public.customer (id) ON DELETE RESTRICT,
  CONSTRAINT inquiry_handled_by_fkey FOREIGN KEY (handled_by)
    REFERENCES public.admin_user (id) ON DELETE SET NULL,
  CONSTRAINT inquiry_created_by_fkey FOREIGN KEY (created_by)
    REFERENCES public.admin_user (id) ON DELETE RESTRICT,
  CONSTRAINT inquiry_updated_by_fkey FOREIGN KEY (updated_by)
    REFERENCES public.admin_user (id) ON DELETE RESTRICT,
  CONSTRAINT inquiry_type_check CHECK (inquiry_type IN ('general', 'order_support', 'product_question')),
  CONSTRAINT inquiry_status_check CHECK (status IN ('new', 'contacted', 'closed'))
);

COMMENT ON TABLE public.inquiry IS
  'Captures the /contact page form submission. Extended per Architecture Review Notes Section 2.5 to also serve as a lightweight post-purchase support contact point via an optional order_id. Relocated to its canonical home here during the Senior Architect Review.';

CREATE INDEX IF NOT EXISTS idx_inquiry_status ON public.inquiry (status);
CREATE INDEX IF NOT EXISTS idx_inquiry_created_at ON public.inquiry (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inquiry_order_id
  ON public.inquiry (order_id) WHERE order_id IS NOT NULL;
-- Added during internal follow-up audit: customer_id is the exact
-- column the inquiry_owner_read RLS policy filters on for every
-- customer-facing query (016_rls.sql) — an unindexed RLS filter
-- column is a well-known real-world Postgres/Supabase performance
-- pitfall. handled_by supports a realistic "my assigned inquiries"
-- staff queue query.
CREATE INDEX IF NOT EXISTS idx_inquiry_customer_id ON public.inquiry (customer_id);
CREATE INDEX IF NOT EXISTS idx_inquiry_handled_by ON public.inquiry (handled_by);

DROP TRIGGER IF EXISTS trg_inquiry_updated_at ON public.inquiry;
CREATE TRIGGER trg_inquiry_updated_at
  BEFORE UPDATE ON public.inquiry
  FOR EACH ROW EXECUTE FUNCTION public.trg_set_updated_at_versioned();

DROP TRIGGER IF EXISTS trg_inquiry_audit ON public.inquiry;
CREATE TRIGGER trg_inquiry_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.inquiry
  FOR EACH ROW EXECUTE FUNCTION public.trg_audit_log();

DROP TRIGGER IF EXISTS trg_inquiry_soft_delete ON public.inquiry;
CREATE TRIGGER trg_inquiry_soft_delete
  BEFORE DELETE ON public.inquiry
  FOR EACH ROW EXECUTE FUNCTION public.trg_soft_delete_guard();

ALTER TABLE public.inquiry ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inquiry FORCE ROW LEVEL SECURITY;


-- =====================================================================
-- Finalize deferred FK from 005_catalog.sql now that customer exists.
-- =====================================================================
ALTER TABLE public.product_review
  DROP CONSTRAINT IF EXISTS product_review_customer_id_fkey;
ALTER TABLE public.product_review
  ADD CONSTRAINT product_review_customer_id_fkey FOREIGN KEY (customer_id)
    REFERENCES public.customer (id) ON DELETE RESTRICT;
