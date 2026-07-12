-- =====================================================================
-- Migration: 016_rls.sql
-- Purpose:   Row-Level Security policies for every table across all
--            domains. Every table already has RLS enabled and FORCED
--            (ALTER TABLE ... ENABLE/FORCE ROW LEVEL SECURITY) in its
--            own domain migration (004-014); this file adds the
--            CREATE POLICY statements themselves, centralized here so
--            the platform's access-control model can be read and
--            audited in one place, per Data Dictionary Section 0.4's
--            five standard patterns (RLS-1 Public Read, RLS-2
--            Owner-Only, RLS-3 Insert-Only Public, RLS-4 Staff/Admin
--            Only, RLS-5 System-Managed).
-- Target:    PostgreSQL 15+, Supabase-compatible.
-- Idempotent: Yes — every policy is dropped and recreated by name.
-- Depends on: 001-015 (every prior migration; every table referenced
--            below must already exist).
-- =====================================================================


-- =====================================================================
-- SECTION A — ANALYTICS DOMAIN TABLES (Data Dictionary 07)
--
-- CORRECTIVE NOTE (Production Readiness Review, Critical Finding 3.2):
-- analytics_event, search_query_log, daily_product_metric, and
-- daily_search_term_metric were referenced in comments (001_extensions.sql,
-- 003_functions.sql) and policed by Section 8 below, but no migration
-- in the originally requested 001-018 sequence ever contained their
-- CREATE TABLE statements — the requested migration order never
-- included a dedicated analytics file. This section is the minimal,
-- surgical fix: it defines the four tables here, immediately before
-- the policies that depend on them, so this file is self-contained
-- and the migration set deploys end-to-end. No other file is changed
-- to accommodate this fix (no renumbering of 017/018).
--
-- Deliberately NOT implemented here, per the review's own "Minor
-- Issues" framing (partitioning is "not wrong for a launch-stage
-- migration set"): declarative range-partitioning of analytics_event
-- by created_at. This remains a documented, explicitly deferred
-- future enhancement (Data Dictionary 07 Section 7/18), not silently
-- added as part of this defect fix, to keep this change minimal and
-- reviewable rather than conflating "fix the missing table" with
-- "implement a partitioning strategy."
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.analytics_event (
  id           uuid        NOT NULL DEFAULT gen_random_uuid(),
  event_type   text        NOT NULL,
  entity_type  text        NULL,
  entity_id    uuid        NULL,
  customer_id  uuid        NULL,
  session_id   text        NULL,
  metadata     jsonb       NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT analytics_event_pkey PRIMARY KEY (id),
  CONSTRAINT analytics_event_customer_id_fkey FOREIGN KEY (customer_id)
    REFERENCES public.customer (id) ON DELETE SET NULL
);

COMMENT ON TABLE public.analytics_event IS
  'Generic, single-table event log (product_view, add_to_wishlist, add_to_cart, consultation_started, cart_abandoned, etc.). event_type is an open, growing vocabulary, not a fixed CHECK list. customer_id set to NULL (not the row deleted) if the customer is later anonymized, preserving historical aggregate counts.';
COMMENT ON COLUMN public.analytics_event.entity_id IS
  'Polymorphic reference paired with entity_type (e.g. product, collection); no native FK.';

CREATE INDEX IF NOT EXISTS idx_analytics_event_type_created ON public.analytics_event (event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_event_entity ON public.analytics_event (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_analytics_event_customer_id ON public.analytics_event (customer_id);

ALTER TABLE public.analytics_event ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_event FORCE ROW LEVEL SECURITY;


CREATE TABLE IF NOT EXISTS public.search_query_log (
  id             uuid        NOT NULL DEFAULT gen_random_uuid(),
  query_text     text        NOT NULL,
  results_count  integer     NOT NULL,
  customer_id    uuid        NULL,
  session_id     text        NULL,
  created_at     timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT search_query_log_pkey PRIMARY KEY (id),
  CONSTRAINT search_query_log_customer_id_fkey FOREIGN KEY (customer_id)
    REFERENCES public.customer (id) ON DELETE SET NULL,
  CONSTRAINT search_query_log_results_count_nonneg_check CHECK (results_count >= 0)
);

COMMENT ON TABLE public.search_query_log IS
  'Logs every storefront search query and its result count, powering "Search Terms" reporting and zero-result-search investigation.';

CREATE INDEX IF NOT EXISTS idx_search_query_log_created_at ON public.search_query_log (created_at DESC);

ALTER TABLE public.search_query_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.search_query_log FORCE ROW LEVEL SECURITY;


CREATE TABLE IF NOT EXISTS public.daily_product_metric (
  id                   uuid        NOT NULL DEFAULT gen_random_uuid(),
  product_id           uuid        NOT NULL,
  metric_date          date        NOT NULL,
  view_count           integer     NOT NULL DEFAULT 0,
  wishlist_add_count   integer     NOT NULL DEFAULT 0,
  cart_add_count       integer     NOT NULL DEFAULT 0,
  purchase_count       integer     NOT NULL DEFAULT 0,
  updated_at           timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT daily_product_metric_pkey PRIMARY KEY (id),
  CONSTRAINT daily_product_metric_product_date_key UNIQUE (product_id, metric_date),
  CONSTRAINT daily_product_metric_product_id_fkey FOREIGN KEY (product_id)
    REFERENCES public.product (id) ON DELETE CASCADE,
  CONSTRAINT daily_product_metric_view_count_nonneg_check CHECK (view_count >= 0),
  CONSTRAINT daily_product_metric_wishlist_add_count_nonneg_check CHECK (wishlist_add_count >= 0),
  CONSTRAINT daily_product_metric_cart_add_count_nonneg_check CHECK (cart_add_count >= 0),
  CONSTRAINT daily_product_metric_purchase_count_nonneg_check CHECK (purchase_count >= 0)
);

COMMENT ON TABLE public.daily_product_metric IS
  'Pre-aggregated, nightly-computed rollup of per-product engagement, so the admin "Popular Products" dashboard never scans raw analytics_event rows live. Populated exclusively by a scheduled job (e.g. pg_cron), not by application-request-path code.';

CREATE UNIQUE INDEX IF NOT EXISTS uq_daily_product_metric_product_date ON public.daily_product_metric (product_id, metric_date);
CREATE INDEX IF NOT EXISTS idx_daily_product_metric_date_views ON public.daily_product_metric (metric_date, view_count DESC);

DROP TRIGGER IF EXISTS trg_daily_product_metric_updated_at ON public.daily_product_metric;
CREATE TRIGGER trg_daily_product_metric_updated_at
  BEFORE UPDATE ON public.daily_product_metric
  FOR EACH ROW EXECUTE FUNCTION public.trg_set_updated_at();

ALTER TABLE public.daily_product_metric ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_product_metric FORCE ROW LEVEL SECURITY;


CREATE TABLE IF NOT EXISTS public.daily_search_term_metric (
  id                       uuid          NOT NULL DEFAULT gen_random_uuid(),
  query_text_normalized    text          NOT NULL,
  metric_date              date          NOT NULL,
  search_count             integer       NOT NULL DEFAULT 0,
  avg_results_count        numeric(6,2)  NOT NULL DEFAULT 0,
  updated_at               timestamptz   NOT NULL DEFAULT now(),
  CONSTRAINT daily_search_term_metric_pkey PRIMARY KEY (id),
  CONSTRAINT daily_search_term_metric_term_date_key UNIQUE (query_text_normalized, metric_date),
  CONSTRAINT daily_search_term_metric_search_count_nonneg_check CHECK (search_count >= 0),
  CONSTRAINT daily_search_term_metric_avg_results_nonneg_check CHECK (avg_results_count >= 0)
);

COMMENT ON TABLE public.daily_search_term_metric IS
  'Same rollup pattern as daily_product_metric, for search term reporting. Low avg_results_count combined with high search_count is the "unmet catalog demand" signal this table surfaces.';

CREATE UNIQUE INDEX IF NOT EXISTS uq_daily_search_term_metric_term_date ON public.daily_search_term_metric (query_text_normalized, metric_date);
CREATE INDEX IF NOT EXISTS idx_daily_search_term_metric_date_count ON public.daily_search_term_metric (metric_date, search_count DESC);

DROP TRIGGER IF EXISTS trg_daily_search_term_metric_updated_at ON public.daily_search_term_metric;
CREATE TRIGGER trg_daily_search_term_metric_updated_at
  BEFORE UPDATE ON public.daily_search_term_metric
  FOR EACH ROW EXECUTE FUNCTION public.trg_set_updated_at();

ALTER TABLE public.daily_search_term_metric ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_search_term_metric FORCE ROW LEVEL SECURITY;


-- =====================================================================
-- SECTION 0 — SECURITY DEFINER ELEVATION FOR CROSS-TABLE TRIGGER WRITES
--
-- Because every table has FORCE ROW LEVEL SECURITY, a trigger function
-- running with the *invoking* role's privileges (the default for a
-- plain, non-SECURITY-DEFINER trigger function) is itself subject to
-- RLS on any table it writes to — including tables OTHER than the one
-- the original statement targeted. Several trigger functions defined
-- in earlier migrations perform exactly this kind of cross-table
-- write (e.g. updating `product.average_rating` from a trigger that
-- fired because a customer inserted their own `product_review`, where
-- the customer plainly does not hold `catalog.write`).
--
-- Rather than granting broad, hard-to-reason-about direct table
-- privileges to make these succeed, the correct and standard fix is
-- to elevate these specific, narrowly-scoped, already-reviewed
-- trigger functions to SECURITY DEFINER, so they run with the
-- privileges of their (superuser) owner regardless of who fired the
-- trigger — identical in spirit to how app_convert_quotation_to_order
-- and app_enqueue_notification were already defined as SECURITY
-- DEFINER from the start. This section is the consolidated fix point
-- for every trigger function that needed it, found during this final
-- RLS pass.
-- =====================================================================

ALTER FUNCTION public.trg_order_status_change() SECURITY DEFINER;
ALTER FUNCTION public.trg_order_status_change() SET search_path = public;

ALTER FUNCTION public.trg_shipment_status_change() SECURITY DEFINER;
ALTER FUNCTION public.trg_shipment_status_change() SET search_path = public;

ALTER FUNCTION public.trg_refund_status_change() SECURITY DEFINER;
ALTER FUNCTION public.trg_refund_status_change() SET search_path = public;

ALTER FUNCTION public.trg_tailoring_request_status_change() SECURITY DEFINER;
ALTER FUNCTION public.trg_tailoring_request_status_change() SET search_path = public;

ALTER FUNCTION public.trg_product_review_rating_aggregate() SECURITY DEFINER;
ALTER FUNCTION public.trg_product_review_rating_aggregate() SET search_path = public;

ALTER FUNCTION public.trg_loyalty_transaction_apply_balance() SECURITY DEFINER;
ALTER FUNCTION public.trg_loyalty_transaction_apply_balance() SET search_path = public;

ALTER FUNCTION public.trg_quotation_line_item_recompute_subtotal() SECURITY DEFINER;
ALTER FUNCTION public.trg_quotation_line_item_recompute_subtotal() SET search_path = public;

ALTER FUNCTION public.trg_inventory_item_log_movement() SECURITY DEFINER;
ALTER FUNCTION public.trg_inventory_item_log_movement() SET search_path = public;

ALTER FUNCTION public.trg_close_previous_open_period() SECURITY DEFINER;
ALTER FUNCTION public.trg_close_previous_open_period() SET search_path = public;

ALTER FUNCTION public.trg_quotation_status_change() SECURITY DEFINER;
ALTER FUNCTION public.trg_quotation_status_change() SET search_path = public;

ALTER FUNCTION public.trg_payment_propagate_order_status() SECURITY DEFINER;
ALTER FUNCTION public.trg_payment_propagate_order_status() SET search_path = public;

ALTER FUNCTION public.trg_order_item_derive_order_type() SECURITY DEFINER;
ALTER FUNCTION public.trg_order_item_derive_order_type() SET search_path = public;

ALTER FUNCTION public.app_touch_parent(text, uuid) SECURITY DEFINER;
ALTER FUNCTION public.app_touch_parent(text, uuid) SET search_path = public;


-- =====================================================================
-- SECTION 1 — CATALOG DOMAIN (RLS-1 unless noted)
-- =====================================================================

DROP POLICY IF EXISTS department_read ON public.department;
CREATE POLICY department_read ON public.department FOR SELECT TO anon, authenticated
  USING (is_active);
DROP POLICY IF EXISTS department_write ON public.department;
CREATE POLICY department_write ON public.department FOR ALL TO authenticated
  USING (public.app_has_permission('catalog.write')) WITH CHECK (public.app_has_permission('catalog.write'));

DROP POLICY IF EXISTS category_read ON public.category;
CREATE POLICY category_read ON public.category FOR SELECT TO anon, authenticated USING (is_active);
DROP POLICY IF EXISTS category_write ON public.category;
CREATE POLICY category_write ON public.category FOR ALL TO authenticated
  USING (public.app_has_permission('catalog.write')) WITH CHECK (public.app_has_permission('catalog.write'));

DROP POLICY IF EXISTS brand_read ON public.brand;
CREATE POLICY brand_read ON public.brand FOR SELECT TO anon, authenticated USING (is_active);
DROP POLICY IF EXISTS brand_write ON public.brand;
CREATE POLICY brand_write ON public.brand FOR ALL TO authenticated
  USING (public.app_has_permission('catalog.write')) WITH CHECK (public.app_has_permission('catalog.write'));

DROP POLICY IF EXISTS gender_tag_read ON public.gender_tag;
CREATE POLICY gender_tag_read ON public.gender_tag FOR SELECT TO anon, authenticated USING (is_active);
DROP POLICY IF EXISTS gender_tag_write ON public.gender_tag;
CREATE POLICY gender_tag_write ON public.gender_tag FOR ALL TO authenticated
  USING (public.app_has_permission('catalog.write')) WITH CHECK (public.app_has_permission('catalog.write'));

DROP POLICY IF EXISTS age_group_read ON public.age_group;
CREATE POLICY age_group_read ON public.age_group FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS age_group_write ON public.age_group;
CREATE POLICY age_group_write ON public.age_group FOR ALL TO authenticated
  USING (public.app_has_permission('catalog.write')) WITH CHECK (public.app_has_permission('catalog.write'));

DROP POLICY IF EXISTS product_type_read ON public.product_type;
CREATE POLICY product_type_read ON public.product_type FOR SELECT TO anon, authenticated USING (is_active);
DROP POLICY IF EXISTS product_type_write ON public.product_type;
CREATE POLICY product_type_write ON public.product_type FOR ALL TO authenticated
  USING (public.app_has_permission('catalog.manage_taxonomy')) WITH CHECK (public.app_has_permission('catalog.manage_taxonomy'));

DROP POLICY IF EXISTS product_read ON public.product;
CREATE POLICY product_read ON public.product FOR SELECT TO anon, authenticated
  USING (status = 'published' AND deleted_at IS NULL AND visibility IN ('public', 'search_only'));
DROP POLICY IF EXISTS product_staff_read ON public.product;
CREATE POLICY product_staff_read ON public.product FOR SELECT TO authenticated
  USING (public.app_has_permission('catalog.write'));
DROP POLICY IF EXISTS product_write ON public.product;
CREATE POLICY product_write ON public.product FOR ALL TO authenticated
  USING (public.app_has_permission('catalog.write')) WITH CHECK (public.app_has_permission('catalog.write'));

-- Six taxonomy lookups: identical pattern.
DROP POLICY IF EXISTS material_read ON public.material;
CREATE POLICY material_read ON public.material FOR SELECT TO anon, authenticated USING (is_active);
DROP POLICY IF EXISTS material_write ON public.material;
CREATE POLICY material_write ON public.material FOR ALL TO authenticated
  USING (public.app_has_permission('catalog.write')) WITH CHECK (public.app_has_permission('catalog.write'));

DROP POLICY IF EXISTS fabric_type_read ON public.fabric_type;
CREATE POLICY fabric_type_read ON public.fabric_type FOR SELECT TO anon, authenticated USING (is_active);
DROP POLICY IF EXISTS fabric_type_write ON public.fabric_type;
CREATE POLICY fabric_type_write ON public.fabric_type FOR ALL TO authenticated
  USING (public.app_has_permission('catalog.write')) WITH CHECK (public.app_has_permission('catalog.write'));

DROP POLICY IF EXISTS embroidery_type_read ON public.embroidery_type;
CREATE POLICY embroidery_type_read ON public.embroidery_type FOR SELECT TO anon, authenticated USING (is_active);
DROP POLICY IF EXISTS embroidery_type_write ON public.embroidery_type;
CREATE POLICY embroidery_type_write ON public.embroidery_type FOR ALL TO authenticated
  USING (public.app_has_permission('catalog.write')) WITH CHECK (public.app_has_permission('catalog.write'));

DROP POLICY IF EXISTS occasion_read ON public.occasion;
CREATE POLICY occasion_read ON public.occasion FOR SELECT TO anon, authenticated USING (is_active);
DROP POLICY IF EXISTS occasion_write ON public.occasion;
CREATE POLICY occasion_write ON public.occasion FOR ALL TO authenticated
  USING (public.app_has_permission('catalog.write')) WITH CHECK (public.app_has_permission('catalog.write'));

DROP POLICY IF EXISTS season_read ON public.season;
CREATE POLICY season_read ON public.season FOR SELECT TO anon, authenticated USING (is_active);
DROP POLICY IF EXISTS season_write ON public.season;
CREATE POLICY season_write ON public.season FOR ALL TO authenticated
  USING (public.app_has_permission('catalog.write')) WITH CHECK (public.app_has_permission('catalog.write'));

DROP POLICY IF EXISTS tag_read ON public.tag;
CREATE POLICY tag_read ON public.tag FOR SELECT TO anon, authenticated USING (is_active);
DROP POLICY IF EXISTS tag_write ON public.tag;
CREATE POLICY tag_write ON public.tag FOR ALL TO authenticated
  USING (public.app_has_permission('catalog.write')) WITH CHECK (public.app_has_permission('catalog.write'));

-- Six product-tag join tables: identical pattern (public read, staff write).
DROP POLICY IF EXISTS product_material_read ON public.product_material;
CREATE POLICY product_material_read ON public.product_material FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS product_material_write ON public.product_material;
CREATE POLICY product_material_write ON public.product_material FOR ALL TO authenticated
  USING (public.app_has_permission('catalog.write')) WITH CHECK (public.app_has_permission('catalog.write'));

DROP POLICY IF EXISTS product_fabric_type_read ON public.product_fabric_type;
CREATE POLICY product_fabric_type_read ON public.product_fabric_type FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS product_fabric_type_write ON public.product_fabric_type;
CREATE POLICY product_fabric_type_write ON public.product_fabric_type FOR ALL TO authenticated
  USING (public.app_has_permission('catalog.write')) WITH CHECK (public.app_has_permission('catalog.write'));

DROP POLICY IF EXISTS product_embroidery_type_read ON public.product_embroidery_type;
CREATE POLICY product_embroidery_type_read ON public.product_embroidery_type FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS product_embroidery_type_write ON public.product_embroidery_type;
CREATE POLICY product_embroidery_type_write ON public.product_embroidery_type FOR ALL TO authenticated
  USING (public.app_has_permission('catalog.write')) WITH CHECK (public.app_has_permission('catalog.write'));

DROP POLICY IF EXISTS product_occasion_read ON public.product_occasion;
CREATE POLICY product_occasion_read ON public.product_occasion FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS product_occasion_write ON public.product_occasion;
CREATE POLICY product_occasion_write ON public.product_occasion FOR ALL TO authenticated
  USING (public.app_has_permission('catalog.write')) WITH CHECK (public.app_has_permission('catalog.write'));

DROP POLICY IF EXISTS product_season_read ON public.product_season;
CREATE POLICY product_season_read ON public.product_season FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS product_season_write ON public.product_season;
CREATE POLICY product_season_write ON public.product_season FOR ALL TO authenticated
  USING (public.app_has_permission('catalog.write')) WITH CHECK (public.app_has_permission('catalog.write'));

DROP POLICY IF EXISTS product_tag_read ON public.product_tag;
CREATE POLICY product_tag_read ON public.product_tag FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS product_tag_write ON public.product_tag;
CREATE POLICY product_tag_write ON public.product_tag FOR ALL TO authenticated
  USING (public.app_has_permission('catalog.write')) WITH CHECK (public.app_has_permission('catalog.write'));

DROP POLICY IF EXISTS product_specification_read ON public.product_specification;
CREATE POLICY product_specification_read ON public.product_specification FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS product_specification_write ON public.product_specification;
CREATE POLICY product_specification_write ON public.product_specification FOR ALL TO authenticated
  USING (public.app_has_permission('catalog.write')) WITH CHECK (public.app_has_permission('catalog.write'));

DROP POLICY IF EXISTS seo_meta_read ON public.seo_meta;
CREATE POLICY seo_meta_read ON public.seo_meta FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS seo_meta_write ON public.seo_meta;
CREATE POLICY seo_meta_write ON public.seo_meta FOR ALL TO authenticated
  USING (public.app_has_permission('catalog.write') OR public.app_has_permission('cms.write'))
  WITH CHECK (public.app_has_permission('catalog.write') OR public.app_has_permission('cms.write'));

DROP POLICY IF EXISTS product_image_read ON public.product_image;
CREATE POLICY product_image_read ON public.product_image FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS product_image_write ON public.product_image;
CREATE POLICY product_image_write ON public.product_image FOR ALL TO authenticated
  USING (public.app_has_permission('catalog.write')) WITH CHECK (public.app_has_permission('catalog.write'));

DROP POLICY IF EXISTS product_video_read ON public.product_video;
CREATE POLICY product_video_read ON public.product_video FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS product_video_write ON public.product_video;
CREATE POLICY product_video_write ON public.product_video FOR ALL TO authenticated
  USING (public.app_has_permission('catalog.write')) WITH CHECK (public.app_has_permission('catalog.write'));

DROP POLICY IF EXISTS collection_read ON public.collection;
CREATE POLICY collection_read ON public.collection FOR SELECT TO anon, authenticated
  USING (status = 'published' AND deleted_at IS NULL);
DROP POLICY IF EXISTS collection_staff_read ON public.collection;
CREATE POLICY collection_staff_read ON public.collection FOR SELECT TO authenticated
  USING (public.app_has_permission('catalog.write'));
DROP POLICY IF EXISTS collection_write ON public.collection;
CREATE POLICY collection_write ON public.collection FOR ALL TO authenticated
  USING (public.app_has_permission('catalog.write')) WITH CHECK (public.app_has_permission('catalog.write'));

DROP POLICY IF EXISTS product_collection_read ON public.product_collection;
CREATE POLICY product_collection_read ON public.product_collection FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS product_collection_write ON public.product_collection;
CREATE POLICY product_collection_write ON public.product_collection FOR ALL TO authenticated
  USING (public.app_has_permission('catalog.write')) WITH CHECK (public.app_has_permission('catalog.write'));

DROP POLICY IF EXISTS product_relation_read ON public.product_relation;
CREATE POLICY product_relation_read ON public.product_relation FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS product_relation_write ON public.product_relation;
CREATE POLICY product_relation_write ON public.product_relation FOR ALL TO authenticated
  USING (public.app_has_permission('catalog.write')) WITH CHECK (public.app_has_permission('catalog.write'));

-- product_review: RLS-2 owner + public read of approved + staff moderation.
DROP POLICY IF EXISTS product_review_public_read ON public.product_review;
CREATE POLICY product_review_public_read ON public.product_review FOR SELECT TO anon, authenticated
  USING (status = 'approved' AND deleted_at IS NULL);
DROP POLICY IF EXISTS product_review_owner_read ON public.product_review;
CREATE POLICY product_review_owner_read ON public.product_review FOR SELECT TO authenticated
  USING (customer_id = public.app_current_customer_id());
DROP POLICY IF EXISTS product_review_owner_insert ON public.product_review;
CREATE POLICY product_review_owner_insert ON public.product_review FOR INSERT TO authenticated
  WITH CHECK (customer_id = public.app_current_customer_id());
DROP POLICY IF EXISTS product_review_staff_moderate ON public.product_review;
CREATE POLICY product_review_staff_moderate ON public.product_review FOR ALL TO authenticated
  USING (public.app_has_permission('catalog.moderate_reviews')) WITH CHECK (public.app_has_permission('catalog.moderate_reviews'));

DROP POLICY IF EXISTS size_chart_read ON public.size_chart;
CREATE POLICY size_chart_read ON public.size_chart FOR SELECT TO anon, authenticated USING (is_active);
DROP POLICY IF EXISTS size_chart_write ON public.size_chart;
CREATE POLICY size_chart_write ON public.size_chart FOR ALL TO authenticated
  USING (public.app_has_permission('catalog.write')) WITH CHECK (public.app_has_permission('catalog.write'));

DROP POLICY IF EXISTS size_chart_entry_read ON public.size_chart_entry;
CREATE POLICY size_chart_entry_read ON public.size_chart_entry FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS size_chart_entry_write ON public.size_chart_entry;
CREATE POLICY size_chart_entry_write ON public.size_chart_entry FOR ALL TO authenticated
  USING (public.app_has_permission('catalog.write')) WITH CHECK (public.app_has_permission('catalog.write'));


-- =====================================================================
-- SECTION 2 — INVENTORY DOMAIN (RLS-4, product_variant is RLS-1 read)
-- =====================================================================

DROP POLICY IF EXISTS warehouse_staff_all ON public.warehouse;
CREATE POLICY warehouse_staff_all ON public.warehouse FOR ALL TO authenticated
  USING (public.app_has_permission('inventory.manage')) WITH CHECK (public.app_has_permission('inventory.manage'));

DROP POLICY IF EXISTS product_variant_read ON public.product_variant;
CREATE POLICY product_variant_read ON public.product_variant FOR SELECT TO anon, authenticated
  USING (status = 'active' AND deleted_at IS NULL);
DROP POLICY IF EXISTS product_variant_staff_read ON public.product_variant;
CREATE POLICY product_variant_staff_read ON public.product_variant FOR SELECT TO authenticated
  USING (public.app_has_permission('catalog.write') OR public.app_has_permission('inventory.manage'));
DROP POLICY IF EXISTS product_variant_write ON public.product_variant;
CREATE POLICY product_variant_write ON public.product_variant FOR ALL TO authenticated
  USING (public.app_has_permission('catalog.write') OR public.app_has_permission('inventory.manage'))
  WITH CHECK (public.app_has_permission('catalog.write') OR public.app_has_permission('inventory.manage'));

DROP POLICY IF EXISTS inventory_item_staff_read ON public.inventory_item;
CREATE POLICY inventory_item_staff_read ON public.inventory_item FOR SELECT TO authenticated
  USING (public.app_has_permission('inventory.view') OR public.app_has_permission('inventory.manage'));
DROP POLICY IF EXISTS inventory_item_staff_write ON public.inventory_item;
CREATE POLICY inventory_item_staff_write ON public.inventory_item FOR ALL TO authenticated
  USING (public.app_has_permission('inventory.manage')) WITH CHECK (public.app_has_permission('inventory.manage'));

DROP POLICY IF EXISTS stock_movement_staff_read ON public.stock_movement;
CREATE POLICY stock_movement_staff_read ON public.stock_movement FOR SELECT TO authenticated
  USING (public.app_has_permission('inventory.view') OR public.app_has_permission('inventory.manage'));
-- No INSERT/UPDATE/DELETE policy for any client role: stock_movement
-- is written exclusively by trg_inventory_item_log_movement (now
-- SECURITY DEFINER, Section 0 above).


-- =====================================================================
-- SECTION 3 — TAILORING DOMAIN
-- =====================================================================

DROP POLICY IF EXISTS garment_type_read ON public.garment_type;
CREATE POLICY garment_type_read ON public.garment_type FOR SELECT TO anon, authenticated USING (is_active);
DROP POLICY IF EXISTS garment_type_write ON public.garment_type;
CREATE POLICY garment_type_write ON public.garment_type FOR ALL TO authenticated
  USING (public.app_has_permission('tailoring.manage_taxonomy')) WITH CHECK (public.app_has_permission('tailoring.manage_taxonomy'));

DROP POLICY IF EXISTS garment_measurement_template_read ON public.garment_measurement_template;
CREATE POLICY garment_measurement_template_read ON public.garment_measurement_template FOR SELECT TO anon, authenticated
  USING (is_active AND deleted_at IS NULL);
DROP POLICY IF EXISTS garment_measurement_template_write ON public.garment_measurement_template;
CREATE POLICY garment_measurement_template_write ON public.garment_measurement_template FOR ALL TO authenticated
  USING (public.app_has_permission('tailoring.manage_taxonomy')) WITH CHECK (public.app_has_permission('tailoring.manage_taxonomy'));

DROP POLICY IF EXISTS measurement_profile_owner_read ON public.measurement_profile;
CREATE POLICY measurement_profile_owner_read ON public.measurement_profile FOR SELECT TO authenticated
  USING (customer_id = public.app_current_customer_id());
DROP POLICY IF EXISTS measurement_profile_owner_insert ON public.measurement_profile;
CREATE POLICY measurement_profile_owner_insert ON public.measurement_profile FOR INSERT TO authenticated
  WITH CHECK (customer_id = public.app_current_customer_id());
DROP POLICY IF EXISTS measurement_profile_staff_all ON public.measurement_profile;
CREATE POLICY measurement_profile_staff_all ON public.measurement_profile FOR ALL TO authenticated
  USING (public.app_has_permission('tailoring.manage')) WITH CHECK (public.app_has_permission('tailoring.manage'));
-- Note: no UPDATE policy exists for any role (including staff via the
-- ALL policy above, which PostgreSQL evaluates per-command — an
-- explicit UPDATE is additionally blocked at the trigger level by
-- trg_measurement_profile_reject_update_trigger regardless).

DROP POLICY IF EXISTS tailoring_request_public_insert ON public.tailoring_request;
CREATE POLICY tailoring_request_public_insert ON public.tailoring_request FOR INSERT TO anon, authenticated
  WITH CHECK (true);
DROP POLICY IF EXISTS tailoring_request_owner_read ON public.tailoring_request;
CREATE POLICY tailoring_request_owner_read ON public.tailoring_request FOR SELECT TO authenticated
  USING (customer_id = public.app_current_customer_id());
DROP POLICY IF EXISTS tailoring_request_staff_all ON public.tailoring_request;
CREATE POLICY tailoring_request_staff_all ON public.tailoring_request FOR ALL TO authenticated
  USING (public.app_has_permission('tailoring.view') OR public.app_has_permission('tailoring.manage'))
  WITH CHECK (public.app_has_permission('tailoring.manage'));

DROP POLICY IF EXISTS appointment_owner_read ON public.appointment;
CREATE POLICY appointment_owner_read ON public.appointment FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.tailoring_request tr WHERE tr.id = appointment.tailoring_request_id AND tr.customer_id = public.app_current_customer_id()));
DROP POLICY IF EXISTS appointment_public_insert ON public.appointment;
CREATE POLICY appointment_public_insert ON public.appointment FOR INSERT TO anon, authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tailoring_request tr
      WHERE tr.id = appointment.tailoring_request_id
        AND (tr.customer_id = public.app_current_customer_id() OR tr.customer_id IS NULL)
    )
  );
-- NOTE (Production Readiness Review, Major Finding 4.2 — fixed): this
-- closes the more severe half of the original gap, where any
-- authenticated caller could insert against ANY tailoring_request_id,
-- including another identified customer's private case. The
-- remaining edge case — one anonymous (anon-role) guest inserting
-- against a DIFFERENT guest's request — cannot be closed by RLS alone,
-- since a genuinely anonymous caller has no auth.uid() to key a policy
-- on; this is the same, already-documented limitation as the guest-cart
-- case in 008_cart.sql, and would require the same signed
-- session-token mechanism to fully close. Not silently overclaimed as
-- fixed here.
DROP POLICY IF EXISTS appointment_staff_all ON public.appointment;
CREATE POLICY appointment_staff_all ON public.appointment FOR ALL TO authenticated
  USING (public.app_has_permission('tailoring.manage')) WITH CHECK (public.app_has_permission('tailoring.manage'));

DROP POLICY IF EXISTS fabric_selection_owner_read ON public.fabric_selection;
CREATE POLICY fabric_selection_owner_read ON public.fabric_selection FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.tailoring_request tr WHERE tr.id = fabric_selection.tailoring_request_id AND tr.customer_id = public.app_current_customer_id()));
DROP POLICY IF EXISTS fabric_selection_public_insert ON public.fabric_selection;
CREATE POLICY fabric_selection_public_insert ON public.fabric_selection FOR INSERT TO anon, authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tailoring_request tr
      WHERE tr.id = fabric_selection.tailoring_request_id
        AND (tr.customer_id = public.app_current_customer_id() OR tr.customer_id IS NULL)
    )
  );
-- See the note on appointment_public_insert above — same fix, same
-- documented residual limitation for anon-vs-anon guest cases.
DROP POLICY IF EXISTS fabric_selection_staff_all ON public.fabric_selection;
CREATE POLICY fabric_selection_staff_all ON public.fabric_selection FOR ALL TO authenticated
  USING (public.app_has_permission('tailoring.manage')) WITH CHECK (public.app_has_permission('tailoring.manage'));

DROP POLICY IF EXISTS design_brief_owner_read ON public.design_brief;
CREATE POLICY design_brief_owner_read ON public.design_brief FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.tailoring_request tr WHERE tr.id = design_brief.tailoring_request_id AND tr.customer_id = public.app_current_customer_id()));
DROP POLICY IF EXISTS design_brief_staff_all ON public.design_brief;
CREATE POLICY design_brief_staff_all ON public.design_brief FOR ALL TO authenticated
  USING (public.app_has_permission('tailoring.manage')) WITH CHECK (public.app_has_permission('tailoring.manage'));

DROP POLICY IF EXISTS reference_image_owner_read ON public.reference_image;
CREATE POLICY reference_image_owner_read ON public.reference_image FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.tailoring_request tr WHERE tr.id = reference_image.tailoring_request_id AND tr.customer_id = public.app_current_customer_id()));
DROP POLICY IF EXISTS reference_image_owner_insert ON public.reference_image;
CREATE POLICY reference_image_owner_insert ON public.reference_image FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.tailoring_request tr WHERE tr.id = reference_image.tailoring_request_id AND tr.customer_id = public.app_current_customer_id()));
DROP POLICY IF EXISTS reference_image_staff_all ON public.reference_image;
CREATE POLICY reference_image_staff_all ON public.reference_image FOR ALL TO authenticated
  USING (public.app_has_permission('tailoring.manage')) WITH CHECK (public.app_has_permission('tailoring.manage'));

DROP POLICY IF EXISTS quotation_owner_read ON public.quotation;
CREATE POLICY quotation_owner_read ON public.quotation FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.tailoring_request tr WHERE tr.id = quotation.tailoring_request_id AND tr.customer_id = public.app_current_customer_id()));
DROP POLICY IF EXISTS quotation_owner_accept ON public.quotation;
CREATE POLICY quotation_owner_accept ON public.quotation FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.tailoring_request tr WHERE tr.id = quotation.tailoring_request_id AND tr.customer_id = public.app_current_customer_id()))
  WITH CHECK (status IN ('accepted', 'rejected'));
DROP POLICY IF EXISTS quotation_staff_all ON public.quotation;
CREATE POLICY quotation_staff_all ON public.quotation FOR ALL TO authenticated
  USING (public.app_has_permission('tailoring.quote')) WITH CHECK (public.app_has_permission('tailoring.quote'));

DROP POLICY IF EXISTS quotation_line_item_owner_read ON public.quotation_line_item;
CREATE POLICY quotation_line_item_owner_read ON public.quotation_line_item FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.quotation q
    JOIN public.tailoring_request tr ON tr.id = q.tailoring_request_id
    WHERE q.id = quotation_line_item.quotation_id AND tr.customer_id = public.app_current_customer_id()
  ));
DROP POLICY IF EXISTS quotation_line_item_staff_all ON public.quotation_line_item;
CREATE POLICY quotation_line_item_staff_all ON public.quotation_line_item FOR ALL TO authenticated
  USING (public.app_has_permission('tailoring.quote')) WITH CHECK (public.app_has_permission('tailoring.quote'));

DROP POLICY IF EXISTS production_stage_read ON public.production_stage;
CREATE POLICY production_stage_read ON public.production_stage FOR SELECT TO anon, authenticated USING (is_active);
DROP POLICY IF EXISTS production_stage_write ON public.production_stage;
CREATE POLICY production_stage_write ON public.production_stage FOR ALL TO authenticated
  USING (public.app_has_permission('tailoring.manage_taxonomy')) WITH CHECK (public.app_has_permission('tailoring.manage_taxonomy'));

DROP POLICY IF EXISTS tailoring_order_stage_history_staff_all ON public.tailoring_order_stage_history;
CREATE POLICY tailoring_order_stage_history_staff_all ON public.tailoring_order_stage_history FOR ALL TO authenticated
  USING (public.app_has_permission('tailoring.manage')) WITH CHECK (public.app_has_permission('tailoring.manage'));

DROP POLICY IF EXISTS tailoring_order_status_history_owner_read ON public.tailoring_order_status_history;
CREATE POLICY tailoring_order_status_history_owner_read ON public.tailoring_order_status_history FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.tailoring_request tr WHERE tr.id = tailoring_order_status_history.tailoring_request_id AND tr.customer_id = public.app_current_customer_id()));
DROP POLICY IF EXISTS tailoring_order_status_history_staff_read ON public.tailoring_order_status_history;
CREATE POLICY tailoring_order_status_history_staff_read ON public.tailoring_order_status_history FOR SELECT TO authenticated
  USING (public.app_has_permission('tailoring.manage'));
-- No INSERT policy for any client role: populated exclusively by
-- trg_tailoring_request_status_change (SECURITY DEFINER, Section 0).


-- =====================================================================
-- SECTION 4 — CUSTOMER DOMAIN (RLS-2 unless noted)
-- =====================================================================

DROP POLICY IF EXISTS customer_tier_read ON public.customer_tier;
CREATE POLICY customer_tier_read ON public.customer_tier FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS customer_tier_write ON public.customer_tier;
CREATE POLICY customer_tier_write ON public.customer_tier FOR ALL TO authenticated
  USING (public.app_has_permission('customers.manage_taxonomy')) WITH CHECK (public.app_has_permission('customers.manage_taxonomy'));

DROP POLICY IF EXISTS customer_self_read ON public.customer;
CREATE POLICY customer_self_read ON public.customer FOR SELECT TO authenticated
  USING (id = public.app_current_customer_id());
DROP POLICY IF EXISTS customer_self_update ON public.customer;
CREATE POLICY customer_self_update ON public.customer FOR UPDATE TO authenticated
  USING (id = public.app_current_customer_id()) WITH CHECK (id = public.app_current_customer_id());
DROP POLICY IF EXISTS customer_staff_read ON public.customer;
CREATE POLICY customer_staff_read ON public.customer FOR SELECT TO authenticated
  USING (public.app_has_permission('customers.view') OR public.app_has_permission('customers.manage'));
DROP POLICY IF EXISTS customer_staff_write ON public.customer;
CREATE POLICY customer_staff_write ON public.customer FOR UPDATE TO authenticated
  USING (public.app_has_permission('customers.manage')) WITH CHECK (public.app_has_permission('customers.manage'));

DROP POLICY IF EXISTS address_owner_all ON public.address;
CREATE POLICY address_owner_all ON public.address FOR ALL TO authenticated
  USING (customer_id = public.app_current_customer_id()) WITH CHECK (customer_id = public.app_current_customer_id());
DROP POLICY IF EXISTS address_staff_read ON public.address;
CREATE POLICY address_staff_read ON public.address FOR SELECT TO authenticated
  USING (public.app_has_permission('customers.view') OR public.app_has_permission('customers.manage'));

DROP POLICY IF EXISTS wishlist_owner_all ON public.wishlist;
CREATE POLICY wishlist_owner_all ON public.wishlist FOR ALL TO authenticated
  USING (customer_id = public.app_current_customer_id()) WITH CHECK (customer_id = public.app_current_customer_id());

DROP POLICY IF EXISTS wishlist_item_owner_all ON public.wishlist_item;
CREATE POLICY wishlist_item_owner_all ON public.wishlist_item FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.wishlist w WHERE w.id = wishlist_item.wishlist_id AND w.customer_id = public.app_current_customer_id()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.wishlist w WHERE w.id = wishlist_item.wishlist_id AND w.customer_id = public.app_current_customer_id()));

DROP POLICY IF EXISTS loyalty_account_owner_read ON public.loyalty_account;
CREATE POLICY loyalty_account_owner_read ON public.loyalty_account FOR SELECT TO authenticated
  USING (customer_id = public.app_current_customer_id());
DROP POLICY IF EXISTS loyalty_account_staff_all ON public.loyalty_account;
CREATE POLICY loyalty_account_staff_all ON public.loyalty_account FOR ALL TO authenticated
  USING (public.app_has_permission('customers.manage')) WITH CHECK (public.app_has_permission('customers.manage'));

DROP POLICY IF EXISTS loyalty_transaction_owner_read ON public.loyalty_transaction;
CREATE POLICY loyalty_transaction_owner_read ON public.loyalty_transaction FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.loyalty_account la WHERE la.id = loyalty_transaction.loyalty_account_id AND la.customer_id = public.app_current_customer_id()));
DROP POLICY IF EXISTS loyalty_transaction_staff_all ON public.loyalty_transaction;
CREATE POLICY loyalty_transaction_staff_all ON public.loyalty_transaction FOR ALL TO authenticated
  USING (public.app_has_permission('customers.manage')) WITH CHECK (public.app_has_permission('customers.manage'));

DROP POLICY IF EXISTS referral_owner_read ON public.referral;
CREATE POLICY referral_owner_read ON public.referral FOR SELECT TO authenticated
  USING (referrer_customer_id = public.app_current_customer_id() OR referred_customer_id = public.app_current_customer_id());
DROP POLICY IF EXISTS referral_staff_all ON public.referral;
CREATE POLICY referral_staff_all ON public.referral FOR ALL TO authenticated
  USING (public.app_has_permission('customers.manage')) WITH CHECK (public.app_has_permission('customers.manage'));

DROP POLICY IF EXISTS communication_preference_owner_all ON public.communication_preference;
CREATE POLICY communication_preference_owner_all ON public.communication_preference FOR ALL TO authenticated
  USING (customer_id = public.app_current_customer_id()) WITH CHECK (customer_id = public.app_current_customer_id());

DROP POLICY IF EXISTS customer_device_owner_all ON public.customer_device;
CREATE POLICY customer_device_owner_all ON public.customer_device FOR ALL TO authenticated
  USING (customer_id = public.app_current_customer_id()) WITH CHECK (customer_id = public.app_current_customer_id());

DROP POLICY IF EXISTS inquiry_public_insert ON public.inquiry;
CREATE POLICY inquiry_public_insert ON public.inquiry FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS inquiry_owner_read ON public.inquiry;
CREATE POLICY inquiry_owner_read ON public.inquiry FOR SELECT TO authenticated
  USING (customer_id = public.app_current_customer_id());
DROP POLICY IF EXISTS inquiry_staff_all ON public.inquiry;
CREATE POLICY inquiry_staff_all ON public.inquiry FOR ALL TO authenticated
  USING (public.app_has_permission('support.manage')) WITH CHECK (public.app_has_permission('support.manage'));


-- =====================================================================
-- SECTION 5 — CART DOMAIN (RLS-2; guest carts additionally gated at
-- the API layer via signed session token per 008_cart.sql comments)
-- =====================================================================

DROP POLICY IF EXISTS cart_owner_all ON public.cart;
CREATE POLICY cart_owner_all ON public.cart FOR ALL TO authenticated
  USING (customer_id = public.app_current_customer_id()) WITH CHECK (customer_id = public.app_current_customer_id());

DROP POLICY IF EXISTS cart_item_owner_all ON public.cart_item;
CREATE POLICY cart_item_owner_all ON public.cart_item FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.cart c WHERE c.id = cart_item.cart_id AND c.customer_id = public.app_current_customer_id()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.cart c WHERE c.id = cart_item.cart_id AND c.customer_id = public.app_current_customer_id()));


-- =====================================================================
-- SECTION 6 — ORDERS / COMMERCE DOMAIN (RLS-5 unless noted)
-- =====================================================================

DROP POLICY IF EXISTS order_owner_read ON public."order";
CREATE POLICY order_owner_read ON public."order" FOR SELECT TO authenticated
  USING (customer_id = public.app_current_customer_id());
DROP POLICY IF EXISTS order_staff_all ON public."order";
CREATE POLICY order_staff_all ON public."order" FOR ALL TO authenticated
  USING (public.app_has_permission('orders.manage')) WITH CHECK (public.app_has_permission('orders.manage'));
-- No INSERT policy for anon/authenticated customers: orders are
-- created exclusively via a trusted SECURITY DEFINER checkout
-- function (superuser-owned, bypasses RLS), never a raw client INSERT.

DROP POLICY IF EXISTS order_item_owner_read ON public.order_item;
CREATE POLICY order_item_owner_read ON public.order_item FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public."order" o WHERE o.id = order_item.order_id AND o.customer_id = public.app_current_customer_id()));
DROP POLICY IF EXISTS order_item_staff_all ON public.order_item;
CREATE POLICY order_item_staff_all ON public.order_item FOR ALL TO authenticated
  USING (public.app_has_permission('orders.manage')) WITH CHECK (public.app_has_permission('orders.manage'));

DROP POLICY IF EXISTS payment_owner_read ON public.payment;
CREATE POLICY payment_owner_read ON public.payment FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public."order" o WHERE o.id = payment.order_id AND o.customer_id = public.app_current_customer_id()));
DROP POLICY IF EXISTS payment_staff_read ON public.payment;
CREATE POLICY payment_staff_read ON public.payment FOR SELECT TO authenticated
  USING (public.app_has_permission('orders.view_payment_details') OR public.app_has_permission('orders.manage'));
DROP POLICY IF EXISTS payment_staff_write ON public.payment;
CREATE POLICY payment_staff_write ON public.payment FOR ALL TO authenticated
  USING (public.app_has_permission('orders.manage')) WITH CHECK (public.app_has_permission('orders.manage'));

DROP POLICY IF EXISTS payment_transaction_staff_read ON public.payment_transaction;
CREATE POLICY payment_transaction_staff_read ON public.payment_transaction FOR SELECT TO authenticated
  USING (public.app_has_permission('orders.view_payment_details'));
-- No client write policy at all — written by the payment
-- gateway/webhook integration via service_role.

DROP POLICY IF EXISTS shipment_owner_read ON public.shipment;
CREATE POLICY shipment_owner_read ON public.shipment FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public."order" o WHERE o.id = shipment.order_id AND o.customer_id = public.app_current_customer_id()));
DROP POLICY IF EXISTS shipment_staff_all ON public.shipment;
CREATE POLICY shipment_staff_all ON public.shipment FOR ALL TO authenticated
  USING (public.app_has_permission('orders.fulfill')) WITH CHECK (public.app_has_permission('orders.fulfill'));

DROP POLICY IF EXISTS shipment_tracking_event_owner_read ON public.shipment_tracking_event;
CREATE POLICY shipment_tracking_event_owner_read ON public.shipment_tracking_event FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.shipment s JOIN public."order" o ON o.id = s.order_id
    WHERE s.id = shipment_tracking_event.shipment_id AND o.customer_id = public.app_current_customer_id()
  ));
DROP POLICY IF EXISTS shipment_tracking_event_staff_all ON public.shipment_tracking_event;
CREATE POLICY shipment_tracking_event_staff_all ON public.shipment_tracking_event FOR ALL TO authenticated
  USING (public.app_has_permission('orders.fulfill')) WITH CHECK (public.app_has_permission('orders.fulfill'));

DROP POLICY IF EXISTS coupon_staff_all ON public.coupon;
CREATE POLICY coupon_staff_all ON public.coupon FOR ALL TO authenticated
  USING (public.app_has_permission('marketing.manage')) WITH CHECK (public.app_has_permission('marketing.manage'));
-- Public validation goes through app_validate_coupon() (SECURITY
-- DEFINER, 009_orders.sql), not direct table access.

DROP POLICY IF EXISTS coupon_redemption_owner_read ON public.coupon_redemption;
CREATE POLICY coupon_redemption_owner_read ON public.coupon_redemption FOR SELECT TO authenticated
  USING (customer_id = public.app_current_customer_id());
DROP POLICY IF EXISTS coupon_redemption_staff_all ON public.coupon_redemption;
CREATE POLICY coupon_redemption_staff_all ON public.coupon_redemption FOR ALL TO authenticated
  USING (public.app_has_permission('orders.manage') OR public.app_has_permission('marketing.manage'))
  WITH CHECK (public.app_has_permission('orders.manage') OR public.app_has_permission('marketing.manage'));

DROP POLICY IF EXISTS promotion_staff_all ON public.promotion;
CREATE POLICY promotion_staff_all ON public.promotion FOR ALL TO authenticated
  USING (public.app_has_permission('marketing.manage')) WITH CHECK (public.app_has_permission('marketing.manage'));

DROP POLICY IF EXISTS promotion_application_owner_read ON public.promotion_application;
CREATE POLICY promotion_application_owner_read ON public.promotion_application FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public."order" o WHERE o.id = promotion_application.order_id AND o.customer_id = public.app_current_customer_id()));
DROP POLICY IF EXISTS promotion_application_staff_all ON public.promotion_application;
CREATE POLICY promotion_application_staff_all ON public.promotion_application FOR ALL TO authenticated
  USING (public.app_has_permission('orders.manage') OR public.app_has_permission('marketing.manage'))
  WITH CHECK (public.app_has_permission('orders.manage') OR public.app_has_permission('marketing.manage'));

DROP POLICY IF EXISTS tax_rule_staff_all ON public.tax_rule;
CREATE POLICY tax_rule_staff_all ON public.tax_rule FOR ALL TO authenticated
  USING (public.app_has_permission('finance.manage_tax_rules')) WITH CHECK (public.app_has_permission('finance.manage_tax_rules'));

-- invoice_sequence: no client policy of any kind — written exclusively
-- by app_generate_invoice_number() (invoker rights, but only ever
-- called from within invoice.invoice_number's DEFAULT expression
-- during a trusted server-side insert path); staff read via
-- orders.manage for support/audit purposes.
DROP POLICY IF EXISTS invoice_sequence_staff_read ON public.invoice_sequence;
CREATE POLICY invoice_sequence_staff_read ON public.invoice_sequence FOR SELECT TO authenticated
  USING (public.app_has_permission('orders.manage'));

DROP POLICY IF EXISTS invoice_owner_read ON public.invoice;
CREATE POLICY invoice_owner_read ON public.invoice FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public."order" o WHERE o.id = invoice.order_id AND o.customer_id = public.app_current_customer_id()));
DROP POLICY IF EXISTS invoice_staff_all ON public.invoice;
CREATE POLICY invoice_staff_all ON public.invoice FOR ALL TO authenticated
  USING (public.app_has_permission('orders.manage')) WITH CHECK (public.app_has_permission('orders.manage'));

DROP POLICY IF EXISTS return_request_owner_read ON public.return_request;
CREATE POLICY return_request_owner_read ON public.return_request FOR SELECT TO authenticated
  USING (customer_id = public.app_current_customer_id());
DROP POLICY IF EXISTS return_request_owner_insert ON public.return_request;
CREATE POLICY return_request_owner_insert ON public.return_request FOR INSERT TO authenticated
  WITH CHECK (customer_id = public.app_current_customer_id());
DROP POLICY IF EXISTS return_request_staff_all ON public.return_request;
CREATE POLICY return_request_staff_all ON public.return_request FOR ALL TO authenticated
  USING (public.app_has_permission('orders.manage_returns')) WITH CHECK (public.app_has_permission('orders.manage_returns'));

DROP POLICY IF EXISTS refund_owner_read ON public.refund;
CREATE POLICY refund_owner_read ON public.refund FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public."order" o WHERE o.id = refund.order_id AND o.customer_id = public.app_current_customer_id()));
DROP POLICY IF EXISTS refund_staff_all ON public.refund;
CREATE POLICY refund_staff_all ON public.refund FOR ALL TO authenticated
  USING (public.app_has_permission('orders.refund')) WITH CHECK (public.app_has_permission('orders.refund'));

DROP POLICY IF EXISTS refund_item_owner_read ON public.refund_item;
CREATE POLICY refund_item_owner_read ON public.refund_item FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.refund r JOIN public."order" o ON o.id = r.order_id
    WHERE r.id = refund_item.refund_id AND o.customer_id = public.app_current_customer_id()
  ));
DROP POLICY IF EXISTS refund_item_staff_all ON public.refund_item;
CREATE POLICY refund_item_staff_all ON public.refund_item FOR ALL TO authenticated
  USING (public.app_has_permission('orders.refund')) WITH CHECK (public.app_has_permission('orders.refund'));

DROP POLICY IF EXISTS order_status_history_owner_read ON public.order_status_history;
CREATE POLICY order_status_history_owner_read ON public.order_status_history FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public."order" o WHERE o.id = order_status_history.order_id AND o.customer_id = public.app_current_customer_id()));
DROP POLICY IF EXISTS order_status_history_staff_read ON public.order_status_history;
CREATE POLICY order_status_history_staff_read ON public.order_status_history FOR SELECT TO authenticated
  USING (public.app_has_permission('orders.manage'));
-- No INSERT policy for any client role: populated exclusively by
-- trg_order_status_change (SECURITY DEFINER, Section 0).


-- =====================================================================
-- SECTION 7 — CMS DOMAIN (RLS-1 unless noted)
-- =====================================================================

DROP POLICY IF EXISTS media_asset_public_read ON public.media_asset;
CREATE POLICY media_asset_public_read ON public.media_asset FOR SELECT TO anon, authenticated
  USING (NOT is_private);
DROP POLICY IF EXISTS media_asset_owner_read_private ON public.media_asset;
CREATE POLICY media_asset_owner_read_private ON public.media_asset FOR SELECT TO authenticated
  USING (
    is_private AND (
      EXISTS (SELECT 1 FROM public.reference_image ri JOIN public.tailoring_request tr ON tr.id = ri.tailoring_request_id
              WHERE ri.media_asset_id = media_asset.id AND tr.customer_id = public.app_current_customer_id())
      OR EXISTS (SELECT 1 FROM public.invoice inv JOIN public."order" o ON o.id = inv.order_id
                 WHERE inv.pdf_media_asset_id = media_asset.id AND o.customer_id = public.app_current_customer_id())
    )
  );
DROP POLICY IF EXISTS media_asset_write ON public.media_asset;
CREATE POLICY media_asset_write ON public.media_asset FOR ALL TO authenticated
  USING (public.app_has_permission('cms.write') OR public.app_has_permission('catalog.write'))
  WITH CHECK (public.app_has_permission('cms.write') OR public.app_has_permission('catalog.write'));
DROP POLICY IF EXISTS media_asset_authenticated_upload_private ON public.media_asset;
CREATE POLICY media_asset_authenticated_upload_private ON public.media_asset FOR INSERT TO authenticated
  WITH CHECK (is_private);

DROP POLICY IF EXISTS page_read ON public.page;
CREATE POLICY page_read ON public.page FOR SELECT TO anon, authenticated USING (is_active);
DROP POLICY IF EXISTS page_write ON public.page;
CREATE POLICY page_write ON public.page FOR ALL TO authenticated
  USING (public.app_has_permission('cms.manage_pages')) WITH CHECK (public.app_has_permission('cms.manage_pages'));

DROP POLICY IF EXISTS content_block_read ON public.content_block;
CREATE POLICY content_block_read ON public.content_block FOR SELECT TO anon, authenticated
  USING (status = 'published' AND deleted_at IS NULL);
DROP POLICY IF EXISTS content_block_staff_read ON public.content_block;
CREATE POLICY content_block_staff_read ON public.content_block FOR SELECT TO authenticated
  USING (public.app_has_permission('cms.write'));
DROP POLICY IF EXISTS content_block_write ON public.content_block;
CREATE POLICY content_block_write ON public.content_block FOR ALL TO authenticated
  USING (public.app_has_permission('cms.write')) WITH CHECK (public.app_has_permission('cms.write'));

DROP POLICY IF EXISTS hero_banner_read ON public.hero_banner;
CREATE POLICY hero_banner_read ON public.hero_banner FOR SELECT TO anon, authenticated
  USING (status = 'published' AND deleted_at IS NULL AND (starts_at IS NULL OR starts_at <= now()) AND (ends_at IS NULL OR ends_at >= now()));
DROP POLICY IF EXISTS hero_banner_staff_read ON public.hero_banner;
CREATE POLICY hero_banner_staff_read ON public.hero_banner FOR SELECT TO authenticated
  USING (public.app_has_permission('cms.write'));
DROP POLICY IF EXISTS hero_banner_write ON public.hero_banner;
CREATE POLICY hero_banner_write ON public.hero_banner FOR ALL TO authenticated
  USING (public.app_has_permission('cms.write')) WITH CHECK (public.app_has_permission('cms.write'));

DROP POLICY IF EXISTS featured_placement_read ON public.featured_placement;
CREATE POLICY featured_placement_read ON public.featured_placement FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS featured_placement_write ON public.featured_placement;
CREATE POLICY featured_placement_write ON public.featured_placement FOR ALL TO authenticated
  USING (public.app_has_permission('cms.write')) WITH CHECK (public.app_has_permission('cms.write'));

DROP POLICY IF EXISTS gallery_item_read ON public.gallery_item;
CREATE POLICY gallery_item_read ON public.gallery_item FOR SELECT TO anon, authenticated USING (status = 'published');
DROP POLICY IF EXISTS gallery_item_write ON public.gallery_item;
CREATE POLICY gallery_item_write ON public.gallery_item FOR ALL TO authenticated
  USING (public.app_has_permission('cms.write')) WITH CHECK (public.app_has_permission('cms.write'));

DROP POLICY IF EXISTS testimonial_read ON public.testimonial;
CREATE POLICY testimonial_read ON public.testimonial FOR SELECT TO anon, authenticated USING (status = 'published');
DROP POLICY IF EXISTS testimonial_write ON public.testimonial;
CREATE POLICY testimonial_write ON public.testimonial FOR ALL TO authenticated
  USING (public.app_has_permission('cms.write')) WITH CHECK (public.app_has_permission('cms.write'));

DROP POLICY IF EXISTS announcement_read ON public.announcement;
CREATE POLICY announcement_read ON public.announcement FOR SELECT TO anon, authenticated USING (status = 'published');
DROP POLICY IF EXISTS announcement_write ON public.announcement;
CREATE POLICY announcement_write ON public.announcement FOR ALL TO authenticated
  USING (public.app_has_permission('cms.write')) WITH CHECK (public.app_has_permission('cms.write'));

DROP POLICY IF EXISTS navigation_menu_read ON public.navigation_menu;
CREATE POLICY navigation_menu_read ON public.navigation_menu FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS navigation_menu_write ON public.navigation_menu;
CREATE POLICY navigation_menu_write ON public.navigation_menu FOR ALL TO authenticated
  USING (public.app_has_permission('cms.write')) WITH CHECK (public.app_has_permission('cms.write'));

DROP POLICY IF EXISTS navigation_item_read ON public.navigation_item;
CREATE POLICY navigation_item_read ON public.navigation_item FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS navigation_item_write ON public.navigation_item;
CREATE POLICY navigation_item_write ON public.navigation_item FOR ALL TO authenticated
  USING (public.app_has_permission('cms.write')) WITH CHECK (public.app_has_permission('cms.write'));

DROP POLICY IF EXISTS mega_menu_promo_read ON public.mega_menu_promo;
CREATE POLICY mega_menu_promo_read ON public.mega_menu_promo FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS mega_menu_promo_write ON public.mega_menu_promo;
CREATE POLICY mega_menu_promo_write ON public.mega_menu_promo FOR ALL TO authenticated
  USING (public.app_has_permission('cms.write')) WITH CHECK (public.app_has_permission('cms.write'));

DROP POLICY IF EXISTS social_link_read ON public.social_link;
CREATE POLICY social_link_read ON public.social_link FOR SELECT TO anon, authenticated USING (status = 'published');
DROP POLICY IF EXISTS social_link_write ON public.social_link;
CREATE POLICY social_link_write ON public.social_link FOR ALL TO authenticated
  USING (public.app_has_permission('cms.write')) WITH CHECK (public.app_has_permission('cms.write'));

DROP POLICY IF EXISTS contact_info_read ON public.contact_info;
CREATE POLICY contact_info_read ON public.contact_info FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS contact_info_write ON public.contact_info;
CREATE POLICY contact_info_write ON public.contact_info FOR ALL TO authenticated
  USING (public.app_has_permission('cms.write')) WITH CHECK (public.app_has_permission('cms.write'));

DROP POLICY IF EXISTS seo_redirect_read ON public.seo_redirect;
CREATE POLICY seo_redirect_read ON public.seo_redirect FOR SELECT TO anon, authenticated USING (status = 'active');
DROP POLICY IF EXISTS seo_redirect_write ON public.seo_redirect;
CREATE POLICY seo_redirect_write ON public.seo_redirect FOR ALL TO authenticated
  USING (public.app_has_permission('cms.write')) WITH CHECK (public.app_has_permission('cms.write'));

DROP POLICY IF EXISTS site_setting_public_read ON public.site_setting;
CREATE POLICY site_setting_public_read ON public.site_setting FOR SELECT TO anon, authenticated USING (is_public);
DROP POLICY IF EXISTS site_setting_staff_read ON public.site_setting;
CREATE POLICY site_setting_staff_read ON public.site_setting FOR SELECT TO authenticated
  USING (public.app_has_permission('cms.write'));
DROP POLICY IF EXISTS site_setting_write ON public.site_setting;
CREATE POLICY site_setting_write ON public.site_setting FOR ALL TO authenticated
  USING (public.app_has_permission('cms.write')) WITH CHECK (public.app_has_permission('cms.write'));


-- =====================================================================
-- SECTION 8 — ANALYTICS DOMAIN (RLS-3)
-- =====================================================================

DROP POLICY IF EXISTS analytics_event_public_insert ON public.analytics_event;
CREATE POLICY analytics_event_public_insert ON public.analytics_event FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS analytics_event_staff_read ON public.analytics_event;
CREATE POLICY analytics_event_staff_read ON public.analytics_event FOR SELECT TO authenticated
  USING (public.app_has_permission('analytics.view'));

DROP POLICY IF EXISTS search_query_log_public_insert ON public.search_query_log;
CREATE POLICY search_query_log_public_insert ON public.search_query_log FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS search_query_log_staff_read ON public.search_query_log;
CREATE POLICY search_query_log_staff_read ON public.search_query_log FOR SELECT TO authenticated
  USING (public.app_has_permission('analytics.view'));

DROP POLICY IF EXISTS daily_product_metric_staff_read ON public.daily_product_metric;
CREATE POLICY daily_product_metric_staff_read ON public.daily_product_metric FOR SELECT TO authenticated
  USING (public.app_has_permission('analytics.view'));

DROP POLICY IF EXISTS daily_search_term_metric_staff_read ON public.daily_search_term_metric;
CREATE POLICY daily_search_term_metric_staff_read ON public.daily_search_term_metric FOR SELECT TO authenticated
  USING (public.app_has_permission('analytics.view'));


-- =====================================================================
-- SECTION 9 — NOTIFICATIONS DOMAIN (RLS-4)
-- =====================================================================

DROP POLICY IF EXISTS notification_template_staff_read ON public.notification_template;
CREATE POLICY notification_template_staff_read ON public.notification_template FOR SELECT TO authenticated
  USING (public.app_has_permission('cms.manage_notifications'));
DROP POLICY IF EXISTS notification_template_staff_write ON public.notification_template;
CREATE POLICY notification_template_staff_write ON public.notification_template FOR ALL TO authenticated
  USING (public.app_has_permission('cms.manage_notifications')) WITH CHECK (public.app_has_permission('cms.manage_notifications'));

DROP POLICY IF EXISTS notification_log_staff_read ON public.notification_log;
CREATE POLICY notification_log_staff_read ON public.notification_log FOR SELECT TO authenticated
  USING (public.app_has_permission('cms.manage_notifications') OR public.app_has_permission('support.manage'));
-- No client write policy: written exclusively by app_enqueue_notification
-- (SECURITY DEFINER) and the delivery worker via service_role.


-- =====================================================================
-- SECTION 10 — ADMIN / IDENTITY DOMAIN (RLS-4)
-- =====================================================================

DROP POLICY IF EXISTS admin_user_self_read ON public.admin_user;
CREATE POLICY admin_user_self_read ON public.admin_user FOR SELECT TO authenticated
  USING (id = public.app_current_admin_user_id());
DROP POLICY IF EXISTS admin_user_self_update_name ON public.admin_user;
CREATE POLICY admin_user_self_update_name ON public.admin_user FOR UPDATE TO authenticated
  USING (id = public.app_current_admin_user_id()) WITH CHECK (id = public.app_current_admin_user_id());
DROP POLICY IF EXISTS admin_user_staff_all ON public.admin_user;
CREATE POLICY admin_user_staff_all ON public.admin_user FOR ALL TO authenticated
  USING (public.app_has_permission('staff.manage')) WITH CHECK (public.app_has_permission('staff.manage'));

DROP POLICY IF EXISTS role_staff_read ON public.role;
CREATE POLICY role_staff_read ON public.role FOR SELECT TO authenticated
  USING (public.app_has_permission('staff.manage') OR public.app_has_permission('staff.manage_roles'));
DROP POLICY IF EXISTS role_staff_write ON public.role;
CREATE POLICY role_staff_write ON public.role FOR ALL TO authenticated
  USING (public.app_has_permission('staff.manage_roles')) WITH CHECK (public.app_has_permission('staff.manage_roles'));

DROP POLICY IF EXISTS permission_staff_read ON public.permission;
CREATE POLICY permission_staff_read ON public.permission FOR SELECT TO authenticated
  USING (public.app_has_permission('staff.manage_roles'));
DROP POLICY IF EXISTS permission_staff_write ON public.permission;
CREATE POLICY permission_staff_write ON public.permission FOR ALL TO authenticated
  USING (public.app_has_permission('staff.manage_roles')) WITH CHECK (public.app_has_permission('staff.manage_roles'));

DROP POLICY IF EXISTS role_permission_staff_read ON public.role_permission;
CREATE POLICY role_permission_staff_read ON public.role_permission FOR SELECT TO authenticated
  USING (public.app_has_permission('staff.manage_roles'));
DROP POLICY IF EXISTS role_permission_staff_write ON public.role_permission;
CREATE POLICY role_permission_staff_write ON public.role_permission FOR ALL TO authenticated
  USING (public.app_has_permission('staff.manage_roles')) WITH CHECK (public.app_has_permission('staff.manage_roles'));

DROP POLICY IF EXISTS admin_user_role_staff_read ON public.admin_user_role;
CREATE POLICY admin_user_role_staff_read ON public.admin_user_role FOR SELECT TO authenticated
  USING (public.app_has_permission('staff.manage_roles') OR admin_user_id = public.app_current_admin_user_id());
DROP POLICY IF EXISTS admin_user_role_staff_write ON public.admin_user_role;
CREATE POLICY admin_user_role_staff_write ON public.admin_user_role FOR ALL TO authenticated
  USING (public.app_has_permission('staff.manage_roles')) WITH CHECK (public.app_has_permission('staff.manage_roles'));

DROP POLICY IF EXISTS audit_log_staff_read ON public.audit_log;
CREATE POLICY audit_log_staff_read ON public.audit_log FOR SELECT TO authenticated
  USING (public.app_has_permission('staff.view_audit_log'));
-- No INSERT/UPDATE/DELETE policy for any role: audit_log is written
-- exclusively by trg_audit_log()/trg_audit_log_composite() (SECURITY
-- DEFINER since their original definition in 003_functions.sql), and
-- is genuinely append-only — no legitimate application code path
-- should ever modify or delete a row here.


-- =====================================================================
-- SECTION 11 — NEWSLETTER (013_newsletter.sql)
-- =====================================================================

DROP POLICY IF EXISTS newsletter_subscriber_staff_all ON public.newsletter_subscriber;
CREATE POLICY newsletter_subscriber_staff_all ON public.newsletter_subscriber FOR ALL TO authenticated
  USING (public.app_has_permission('marketing.manage')) WITH CHECK (public.app_has_permission('marketing.manage'));
-- No anon/authenticated direct SELECT/INSERT/UPDATE policy: all
-- subscribe/unsubscribe traffic goes through app_subscribe_newsletter()/
-- app_unsubscribe_newsletter() (SECURITY DEFINER, 013_newsletter.sql),
-- deliberately stricter than plain RLS-3 since unsubscribe must work
-- for an unauthenticated visitor via token alone.
