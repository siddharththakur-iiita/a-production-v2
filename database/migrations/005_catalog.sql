-- =====================================================================
-- Migration: 005_catalog.sql
-- Purpose:   Catalog domain (Data Dictionary 01): department, category,
--            brand, gender_tag, age_group, product_type, product,
--            material, fabric_type, embroidery_type, occasion, season,
--            tag, product_material, product_fabric_type,
--            product_embroidery_type, product_occasion, product_season,
--            product_tag, product_specification, seo_meta,
--            product_image, product_video, collection,
--            product_collection, product_relation, product_review,
--            size_chart, size_chart_entry. (29 tables)
-- Target:    PostgreSQL 15+, Supabase-compatible.
-- Idempotent: Yes.
-- Depends on: 001_extensions.sql, 002_types.sql, 003_functions.sql,
--            004_auth.sql
--
-- Cross-domain forward references: several columns below reference
-- tables created in later migrations (media_asset in 011_cms.sql,
-- customer in 007_customers.sql, order_item in 009_orders.sql). These
-- columns are declared here as plain uuid with NO inline FK, and the
-- FK constraint is added via ALTER TABLE in the migration where the
-- target table is created. Each such column is marked "-- FK deferred"
-- below with a pointer to where it is finalized.
-- =====================================================================


-- =====================================================================
-- TABLE: department
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.department (
  id          uuid           NOT NULL DEFAULT gen_random_uuid(),
  name        text           NOT NULL,
  slug        public.app_slug NOT NULL,
  sort_order  integer        NOT NULL DEFAULT 0,
  is_active   boolean        NOT NULL DEFAULT true,
  created_at  timestamptz    NOT NULL DEFAULT now(),
  updated_at  timestamptz    NOT NULL DEFAULT now(),
  CONSTRAINT department_pkey PRIMARY KEY (id),
  CONSTRAINT department_name_key UNIQUE (name),
  CONSTRAINT department_slug_key UNIQUE (slug)
);

COMMENT ON TABLE public.department IS
  'Top-level product classification (Women/Men/Kids). Anchors every product and drives primary navigation. Pattern B lookup table — new departments can be added without a migration.';

CREATE UNIQUE INDEX IF NOT EXISTS uq_department_slug ON public.department (slug);
CREATE INDEX IF NOT EXISTS idx_department_sort_order_active
  ON public.department (sort_order) WHERE is_active;

DROP TRIGGER IF EXISTS trg_department_updated_at ON public.department;
CREATE TRIGGER trg_department_updated_at
  BEFORE UPDATE ON public.department
  FOR EACH ROW EXECUTE FUNCTION public.trg_set_updated_at();

ALTER TABLE public.department ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.department FORCE ROW LEVEL SECURITY;


-- =====================================================================
-- TABLE: category
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.category (
  id                  uuid            NOT NULL DEFAULT gen_random_uuid(),
  parent_category_id  uuid            NULL,
  department_id       uuid            NOT NULL,
  name                text            NOT NULL,
  slug                public.app_slug NOT NULL,
  sort_order          integer         NOT NULL DEFAULT 0,
  is_active           boolean         NOT NULL DEFAULT true,
  created_at          timestamptz     NOT NULL DEFAULT now(),
  updated_at          timestamptz     NOT NULL DEFAULT now(),
  CONSTRAINT category_pkey PRIMARY KEY (id),
  CONSTRAINT category_parent_category_id_fkey FOREIGN KEY (parent_category_id)
    REFERENCES public.category (id) ON DELETE RESTRICT,
  CONSTRAINT category_department_id_fkey FOREIGN KEY (department_id)
    REFERENCES public.department (id) ON DELETE RESTRICT,
  CONSTRAINT category_no_self_parent_check CHECK (parent_category_id IS NULL OR parent_category_id <> id),
  CONSTRAINT category_dept_parent_slug_key UNIQUE (department_id, parent_category_id, slug)
);

COMMENT ON TABLE public.category IS
  'Hierarchical product categorization within a department, self-referential for unlimited depth. Cycle prevention beyond direct self-parenting is an application-layer responsibility (Conventions 0.10).';

CREATE INDEX IF NOT EXISTS idx_category_department_id ON public.category (department_id);
CREATE INDEX IF NOT EXISTS idx_category_parent_category_id ON public.category (parent_category_id);

DROP TRIGGER IF EXISTS trg_category_updated_at ON public.category;
CREATE TRIGGER trg_category_updated_at
  BEFORE UPDATE ON public.category
  FOR EACH ROW EXECUTE FUNCTION public.trg_set_updated_at();

ALTER TABLE public.category ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.category FORCE ROW LEVEL SECURITY;


-- =====================================================================
-- TABLE: brand
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.brand (
  id                    uuid            NOT NULL DEFAULT gen_random_uuid(),
  name                  text            NOT NULL,
  slug                  public.app_slug NOT NULL,
  logo_media_asset_id   uuid            NULL, -- FK deferred to 011_cms.sql (media_asset)
  is_active             boolean         NOT NULL DEFAULT true,
  created_at            timestamptz     NOT NULL DEFAULT now(),
  updated_at            timestamptz     NOT NULL DEFAULT now(),
  CONSTRAINT brand_pkey PRIMARY KEY (id),
  CONSTRAINT brand_name_key UNIQUE (name),
  CONSTRAINT brand_slug_key UNIQUE (slug)
);

COMMENT ON TABLE public.brand IS
  'Reserved for future multi-brand support (BRS v2.0 Section 3.1). Today A Productions is the only implicit brand; product.brand_id may remain NULL platform-wide without functional loss.';

CREATE UNIQUE INDEX IF NOT EXISTS uq_brand_slug ON public.brand (slug);

DROP TRIGGER IF EXISTS trg_brand_updated_at ON public.brand;
CREATE TRIGGER trg_brand_updated_at
  BEFORE UPDATE ON public.brand
  FOR EACH ROW EXECUTE FUNCTION public.trg_set_updated_at();

ALTER TABLE public.brand ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brand FORCE ROW LEVEL SECURITY;


-- =====================================================================
-- TABLE: gender_tag
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.gender_tag (
  id         uuid        NOT NULL DEFAULT gen_random_uuid(),
  name       text        NOT NULL,
  is_active  boolean     NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT gender_tag_pkey PRIMARY KEY (id),
  CONSTRAINT gender_tag_name_key UNIQUE (name)
);

COMMENT ON TABLE public.gender_tag IS
  'Lookup of audience targeting values (Women/Men/Kids/Unisex), distinct from department: department drives navigation/URL structure, gender_tag is an independently filterable product attribute.';

DROP TRIGGER IF EXISTS trg_gender_tag_updated_at ON public.gender_tag;
CREATE TRIGGER trg_gender_tag_updated_at
  BEFORE UPDATE ON public.gender_tag
  FOR EACH ROW EXECUTE FUNCTION public.trg_set_updated_at();

ALTER TABLE public.gender_tag ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gender_tag FORCE ROW LEVEL SECURITY;


-- =====================================================================
-- TABLE: age_group
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.age_group (
  id              uuid        NOT NULL DEFAULT gen_random_uuid(),
  name            text        NOT NULL,
  min_age_months  integer     NULL,
  max_age_months  integer     NULL,
  sort_order      integer     NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT age_group_pkey PRIMARY KEY (id),
  CONSTRAINT age_group_name_key UNIQUE (name),
  CONSTRAINT age_group_min_nonneg_check CHECK (min_age_months IS NULL OR min_age_months >= 0),
  CONSTRAINT age_group_range_check CHECK (
    max_age_months IS NULL OR min_age_months IS NULL OR max_age_months >= min_age_months
  )
);

COMMENT ON TABLE public.age_group IS
  'Lookup for Kids-department age segmentation. Only meaningful for products under department=Kids; enforced at the application/admin-form layer, not by a DB constraint.';

DROP TRIGGER IF EXISTS trg_age_group_updated_at ON public.age_group;
CREATE TRIGGER trg_age_group_updated_at
  BEFORE UPDATE ON public.age_group
  FOR EACH ROW EXECUTE FUNCTION public.trg_set_updated_at();

ALTER TABLE public.age_group ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.age_group FORCE ROW LEVEL SECURITY;


-- =====================================================================
-- TABLE: product_type
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.product_type (
  id                  uuid        NOT NULL DEFAULT gen_random_uuid(),
  code                text        NOT NULL,
  name                text        NOT NULL,
  requires_inventory  boolean     NOT NULL,
  is_active           boolean     NOT NULL DEFAULT true,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT product_type_pkey PRIMARY KEY (id),
  CONSTRAINT product_type_code_key UNIQUE (code)
);

COMMENT ON TABLE public.product_type IS
  'The single most important classification on the platform: ready_made | made_to_order | bespoke_template. Application code branches on code, never on id or ordinal position.';

DROP TRIGGER IF EXISTS trg_product_type_updated_at ON public.product_type;
CREATE TRIGGER trg_product_type_updated_at
  BEFORE UPDATE ON public.product_type
  FOR EACH ROW EXECUTE FUNCTION public.trg_set_updated_at();

DROP TRIGGER IF EXISTS trg_product_type_audit ON public.product_type;
CREATE TRIGGER trg_product_type_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.product_type
  FOR EACH ROW EXECUTE FUNCTION public.trg_audit_log_composite('id');

ALTER TABLE public.product_type ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_type FORCE ROW LEVEL SECURITY;


-- =====================================================================
-- TABLE: product
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.product (
  id                  uuid                    NOT NULL DEFAULT gen_random_uuid(),
  slug                public.app_slug         NOT NULL,
  name                text                    NOT NULL,
  description         text                    NULL,
  product_type_id     uuid                    NOT NULL,
  department_id       uuid                    NOT NULL,
  category_id         uuid                    NULL,
  brand_id            uuid                    NULL,
  gender_id           uuid                    NULL,
  age_group_id        uuid                    NULL,
  status              text                    NOT NULL DEFAULT 'draft',
  visibility          text                    NOT NULL DEFAULT 'public',
  is_featured         boolean                 NOT NULL DEFAULT false,
  is_trending         boolean                 NOT NULL DEFAULT false,
  is_new_arrival      boolean                 NOT NULL DEFAULT false,
  price               numeric(12,2)           NULL,
  compare_at_price    numeric(12,2)           NULL,
  currency            public.app_currency_code NOT NULL DEFAULT 'INR',
  lead_time_days_min  integer                 NULL,
  lead_time_days_max  integer                 NULL,
  fabric              text                    NULL,
  craftsmanship       text                    NULL,
  care_instructions   text                    NULL,
  shipping_info       text                    NULL,
  return_policy       text                    NULL,
  search_vector       tsvector                NULL,
  average_rating      numeric(2,1)            NULL,
  review_count        integer                 NOT NULL DEFAULT 0,
  created_at          timestamptz             NOT NULL DEFAULT now(),
  updated_at          timestamptz             NOT NULL DEFAULT now(),
  deleted_at          timestamptz             NULL,
  created_by          uuid                    NULL,
  updated_by          uuid                    NULL,
  version             integer                 NOT NULL DEFAULT 1,
  CONSTRAINT product_pkey PRIMARY KEY (id),
  CONSTRAINT product_slug_key UNIQUE (slug),
  CONSTRAINT product_product_type_id_fkey FOREIGN KEY (product_type_id)
    REFERENCES public.product_type (id) ON DELETE RESTRICT,
  CONSTRAINT product_department_id_fkey FOREIGN KEY (department_id)
    REFERENCES public.department (id) ON DELETE RESTRICT,
  CONSTRAINT product_category_id_fkey FOREIGN KEY (category_id)
    REFERENCES public.category (id) ON DELETE RESTRICT,
  CONSTRAINT product_brand_id_fkey FOREIGN KEY (brand_id)
    REFERENCES public.brand (id) ON DELETE RESTRICT,
  CONSTRAINT product_gender_id_fkey FOREIGN KEY (gender_id)
    REFERENCES public.gender_tag (id) ON DELETE RESTRICT,
  CONSTRAINT product_age_group_id_fkey FOREIGN KEY (age_group_id)
    REFERENCES public.age_group (id) ON DELETE RESTRICT,
  CONSTRAINT product_created_by_fkey FOREIGN KEY (created_by)
    REFERENCES public.admin_user (id) ON DELETE RESTRICT,
  CONSTRAINT product_updated_by_fkey FOREIGN KEY (updated_by)
    REFERENCES public.admin_user (id) ON DELETE RESTRICT,
  CONSTRAINT product_status_check CHECK (status IN ('draft', 'published', 'archived')),
  CONSTRAINT product_visibility_check CHECK (visibility IN ('public', 'hidden', 'search_only', 'private')),
  CONSTRAINT product_compare_at_price_check CHECK (compare_at_price IS NULL OR price IS NULL OR compare_at_price >= price),
  CONSTRAINT product_lead_time_range_check CHECK (
    lead_time_days_max IS NULL OR lead_time_days_min IS NULL OR lead_time_days_max >= lead_time_days_min
  ),
  CONSTRAINT product_review_count_nonneg_check CHECK (review_count >= 0),
  CONSTRAINT product_average_rating_range_check CHECK (average_rating IS NULL OR (average_rating >= 0 AND average_rating <= 5))
);

COMMENT ON TABLE public.product IS
  'The anchor entity of the entire catalog. product_type_id determines whether this follows the ready-made (inventory-tracked), made-to-order (lead-time, no stock), or bespoke-template (Tailoring entry point) workflow. Pattern A (full audit).';
COMMENT ON COLUMN public.product.price IS
  'NULL permitted only for bespoke_template rows where price is consultation-only; enforced by trg_product_validate_price below (a cross-table CHECK is not expressible as a plain CHECK constraint).';
COMMENT ON COLUMN public.product.average_rating IS
  'Denormalized, maintained exclusively by trg_product_review_rating_aggregate (defined after product_review below). Never written directly by application code.';
COMMENT ON COLUMN public.product.search_vector IS
  'Maintained exclusively by trg_product_search_vector below, combining name+description+fabric+craftsmanship.';

CREATE UNIQUE INDEX IF NOT EXISTS uq_product_slug ON public.product (slug);
CREATE INDEX IF NOT EXISTS idx_product_department_id ON public.product (department_id);
CREATE INDEX IF NOT EXISTS idx_product_category_id ON public.product (category_id);
CREATE INDEX IF NOT EXISTS idx_product_brand_id ON public.product (brand_id);
CREATE INDEX IF NOT EXISTS idx_product_gender_id ON public.product (gender_id);
CREATE INDEX IF NOT EXISTS idx_product_age_group_id ON public.product (age_group_id);
CREATE INDEX IF NOT EXISTS idx_product_product_type_id ON public.product (product_type_id);
CREATE INDEX IF NOT EXISTS idx_product_published
  ON public.product (id) WHERE status = 'published' AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_product_is_featured
  ON public.product (id) WHERE is_featured AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_product_is_trending
  ON public.product (id) WHERE is_trending AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_product_is_new_arrival
  ON public.product (id) WHERE is_new_arrival AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_product_created_at ON public.product (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_product_search_vector ON public.product USING gin (search_vector);

DROP TRIGGER IF EXISTS trg_product_updated_at ON public.product;
CREATE TRIGGER trg_product_updated_at
  BEFORE UPDATE ON public.product
  FOR EACH ROW EXECUTE FUNCTION public.trg_set_updated_at_versioned();

DROP TRIGGER IF EXISTS trg_product_audit ON public.product;
CREATE TRIGGER trg_product_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.product
  FOR EACH ROW EXECUTE FUNCTION public.trg_audit_log();

DROP TRIGGER IF EXISTS trg_product_soft_delete ON public.product;
CREATE TRIGGER trg_product_soft_delete
  BEFORE DELETE ON public.product
  FOR EACH ROW EXECUTE FUNCTION public.trg_soft_delete_guard();

-- Price/product_type cross-table validation (Data Dictionary 01,
-- product table, Section 6): price may be NULL only for bespoke_template.
CREATE OR REPLACE FUNCTION public.trg_product_validate_price()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_code text;
BEGIN
  IF NEW.price IS NOT NULL THEN
    RETURN NEW;
  END IF;

  SELECT code INTO v_code FROM public.product_type WHERE id = NEW.product_type_id;

  IF v_code IS DISTINCT FROM 'bespoke_template' THEN
    RAISE EXCEPTION 'product "%": price is required unless product_type is bespoke_template', NEW.slug;
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.trg_product_validate_price() IS
  'Enforces that product.price is NULL only when product_type_id resolves to code=bespoke_template.';

DROP TRIGGER IF EXISTS trg_product_validate_price_trigger ON public.product;
CREATE TRIGGER trg_product_validate_price_trigger
  BEFORE INSERT OR UPDATE ON public.product
  FOR EACH ROW EXECUTE FUNCTION public.trg_product_validate_price();

-- Full-text search vector maintenance (Data Dictionary 01, product
-- table, Section 10 / Conventions 0.9).
CREATE OR REPLACE FUNCTION public.trg_product_search_vector()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', unaccent(coalesce(NEW.name, ''))), 'A') ||
    setweight(to_tsvector('english', unaccent(coalesce(NEW.fabric, ''))), 'B') ||
    setweight(to_tsvector('english', unaccent(coalesce(NEW.craftsmanship, ''))), 'B') ||
    setweight(to_tsvector('english', unaccent(coalesce(NEW.description, ''))), 'C');
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.trg_product_search_vector() IS
  'Maintains product.search_vector from name (weight A), fabric/craftsmanship (weight B), description (weight C).';

DROP TRIGGER IF EXISTS trg_product_search_vector_trigger ON public.product;
CREATE TRIGGER trg_product_search_vector_trigger
  BEFORE INSERT OR UPDATE OF name, description, fabric, craftsmanship ON public.product
  FOR EACH ROW EXECUTE FUNCTION public.trg_product_search_vector();

ALTER TABLE public.product ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product FORCE ROW LEVEL SECURITY;


-- =====================================================================
-- TABLES: material, fabric_type, embroidery_type, occasion, season, tag
-- Six structurally identical taxonomy lookup tables (Data Dictionary
-- 01: kept separate rather than a generic EAV table per the explicit,
-- reviewed normalization decision in BRS v2.0 Section 20).
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.material (
  id         uuid            NOT NULL DEFAULT gen_random_uuid(),
  name       text            NOT NULL,
  slug       public.app_slug NOT NULL,
  is_active  boolean         NOT NULL DEFAULT true,
  created_at timestamptz     NOT NULL DEFAULT now(),
  updated_at timestamptz     NOT NULL DEFAULT now(),
  CONSTRAINT material_pkey PRIMARY KEY (id),
  CONSTRAINT material_name_key UNIQUE (name),
  CONSTRAINT material_slug_key UNIQUE (slug)
);
COMMENT ON TABLE public.material IS 'Admin-managed lookup of fabric materials, shared verbatim between Catalog (product tagging) and Tailoring (fabric_selection).';
DROP TRIGGER IF EXISTS trg_material_updated_at ON public.material;
CREATE TRIGGER trg_material_updated_at BEFORE UPDATE ON public.material
  FOR EACH ROW EXECUTE FUNCTION public.trg_set_updated_at();
ALTER TABLE public.material ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.material FORCE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.fabric_type (
  id         uuid            NOT NULL DEFAULT gen_random_uuid(),
  name       text            NOT NULL,
  slug       public.app_slug NOT NULL,
  is_active  boolean         NOT NULL DEFAULT true,
  created_at timestamptz     NOT NULL DEFAULT now(),
  updated_at timestamptz     NOT NULL DEFAULT now(),
  CONSTRAINT fabric_type_pkey PRIMARY KEY (id),
  CONSTRAINT fabric_type_name_key UNIQUE (name),
  CONSTRAINT fabric_type_slug_key UNIQUE (slug)
);
COMMENT ON TABLE public.fabric_type IS 'Fabric classification distinct from material (e.g. "Italian Linen" vs. material "Linen"), kept separate per the frontend audit finding this is a distinct marketing concept.';
DROP TRIGGER IF EXISTS trg_fabric_type_updated_at ON public.fabric_type;
CREATE TRIGGER trg_fabric_type_updated_at BEFORE UPDATE ON public.fabric_type
  FOR EACH ROW EXECUTE FUNCTION public.trg_set_updated_at();
ALTER TABLE public.fabric_type ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fabric_type FORCE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.embroidery_type (
  id         uuid            NOT NULL DEFAULT gen_random_uuid(),
  name       text            NOT NULL,
  slug       public.app_slug NOT NULL,
  is_active  boolean         NOT NULL DEFAULT true,
  created_at timestamptz     NOT NULL DEFAULT now(),
  updated_at timestamptz     NOT NULL DEFAULT now(),
  CONSTRAINT embroidery_type_pkey PRIMARY KEY (id),
  CONSTRAINT embroidery_type_name_key UNIQUE (name),
  CONSTRAINT embroidery_type_slug_key UNIQUE (slug)
);
COMMENT ON TABLE public.embroidery_type IS 'Lookup of embroidery techniques (Zardosi, Aari, Gota Patti).';
DROP TRIGGER IF EXISTS trg_embroidery_type_updated_at ON public.embroidery_type;
CREATE TRIGGER trg_embroidery_type_updated_at BEFORE UPDATE ON public.embroidery_type
  FOR EACH ROW EXECUTE FUNCTION public.trg_set_updated_at();
ALTER TABLE public.embroidery_type ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.embroidery_type FORCE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.occasion (
  id         uuid            NOT NULL DEFAULT gen_random_uuid(),
  name       text            NOT NULL,
  slug       public.app_slug NOT NULL,
  is_active  boolean         NOT NULL DEFAULT true,
  created_at timestamptz     NOT NULL DEFAULT now(),
  updated_at timestamptz     NOT NULL DEFAULT now(),
  CONSTRAINT occasion_pkey PRIMARY KEY (id),
  CONSTRAINT occasion_name_key UNIQUE (name),
  CONSTRAINT occasion_slug_key UNIQUE (slug)
);
COMMENT ON TABLE public.occasion IS 'Filterable occasion tagging (Wedding, Festive, Casual, Formal), distinct from collection: occasion is a bulk filterable attribute, collection is editorially curated.';
DROP TRIGGER IF EXISTS trg_occasion_updated_at ON public.occasion;
CREATE TRIGGER trg_occasion_updated_at BEFORE UPDATE ON public.occasion
  FOR EACH ROW EXECUTE FUNCTION public.trg_set_updated_at();
ALTER TABLE public.occasion ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.occasion FORCE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.season (
  id         uuid            NOT NULL DEFAULT gen_random_uuid(),
  name       text            NOT NULL,
  slug       public.app_slug NOT NULL,
  is_active  boolean         NOT NULL DEFAULT true,
  created_at timestamptz     NOT NULL DEFAULT now(),
  updated_at timestamptz     NOT NULL DEFAULT now(),
  CONSTRAINT season_pkey PRIMARY KEY (id),
  CONSTRAINT season_name_key UNIQUE (name),
  CONSTRAINT season_slug_key UNIQUE (slug)
);
COMMENT ON TABLE public.season IS 'Filterable seasonal tagging (Spring/Summer, Festive/Winter).';
DROP TRIGGER IF EXISTS trg_season_updated_at ON public.season;
CREATE TRIGGER trg_season_updated_at BEFORE UPDATE ON public.season
  FOR EACH ROW EXECUTE FUNCTION public.trg_set_updated_at();
ALTER TABLE public.season ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.season FORCE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.tag (
  id         uuid            NOT NULL DEFAULT gen_random_uuid(),
  name       text            NOT NULL,
  slug       public.app_slug NOT NULL,
  is_active  boolean         NOT NULL DEFAULT true,
  created_at timestamptz     NOT NULL DEFAULT now(),
  updated_at timestamptz     NOT NULL DEFAULT now(),
  CONSTRAINT tag_pkey PRIMARY KEY (id),
  CONSTRAINT tag_name_key UNIQUE (name),
  CONSTRAINT tag_slug_key UNIQUE (slug)
);
COMMENT ON TABLE public.tag IS 'Free-form, admin-defined tags (e.g. "Limited Edition") — the deliberate flexible escape hatch complementing the six structured taxonomy tables.';
DROP TRIGGER IF EXISTS trg_tag_updated_at ON public.tag;
CREATE TRIGGER trg_tag_updated_at BEFORE UPDATE ON public.tag
  FOR EACH ROW EXECUTE FUNCTION public.trg_set_updated_at();
ALTER TABLE public.tag ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tag FORCE ROW LEVEL SECURITY;


-- =====================================================================
-- TABLES: product_material, product_fabric_type, product_embroidery_type,
--         product_occasion, product_season, product_tag
-- Six pure many-to-many join tables, composite PK, no surrogate id
-- (Conventions 0.2 exception), Pattern C.
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.product_material (
  product_id  uuid        NOT NULL,
  material_id uuid        NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT product_material_pkey PRIMARY KEY (product_id, material_id),
  CONSTRAINT product_material_product_id_fkey FOREIGN KEY (product_id)
    REFERENCES public.product (id) ON DELETE CASCADE,
  CONSTRAINT product_material_material_id_fkey FOREIGN KEY (material_id)
    REFERENCES public.material (id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_product_material_material_id ON public.product_material (material_id);
ALTER TABLE public.product_material ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_material FORCE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.product_fabric_type (
  product_id     uuid        NOT NULL,
  fabric_type_id uuid        NOT NULL,
  created_at     timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT product_fabric_type_pkey PRIMARY KEY (product_id, fabric_type_id),
  CONSTRAINT product_fabric_type_product_id_fkey FOREIGN KEY (product_id)
    REFERENCES public.product (id) ON DELETE CASCADE,
  CONSTRAINT product_fabric_type_fabric_type_id_fkey FOREIGN KEY (fabric_type_id)
    REFERENCES public.fabric_type (id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_product_fabric_type_fabric_type_id ON public.product_fabric_type (fabric_type_id);
ALTER TABLE public.product_fabric_type ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_fabric_type FORCE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.product_embroidery_type (
  product_id         uuid        NOT NULL,
  embroidery_type_id uuid        NOT NULL,
  created_at         timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT product_embroidery_type_pkey PRIMARY KEY (product_id, embroidery_type_id),
  CONSTRAINT product_embroidery_type_product_id_fkey FOREIGN KEY (product_id)
    REFERENCES public.product (id) ON DELETE CASCADE,
  CONSTRAINT product_embroidery_type_embroidery_type_id_fkey FOREIGN KEY (embroidery_type_id)
    REFERENCES public.embroidery_type (id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_product_embroidery_type_embroidery_type_id ON public.product_embroidery_type (embroidery_type_id);
ALTER TABLE public.product_embroidery_type ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_embroidery_type FORCE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.product_occasion (
  product_id  uuid        NOT NULL,
  occasion_id uuid        NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT product_occasion_pkey PRIMARY KEY (product_id, occasion_id),
  CONSTRAINT product_occasion_product_id_fkey FOREIGN KEY (product_id)
    REFERENCES public.product (id) ON DELETE CASCADE,
  CONSTRAINT product_occasion_occasion_id_fkey FOREIGN KEY (occasion_id)
    REFERENCES public.occasion (id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_product_occasion_occasion_id ON public.product_occasion (occasion_id);
ALTER TABLE public.product_occasion ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_occasion FORCE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.product_season (
  product_id uuid        NOT NULL,
  season_id  uuid        NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT product_season_pkey PRIMARY KEY (product_id, season_id),
  CONSTRAINT product_season_product_id_fkey FOREIGN KEY (product_id)
    REFERENCES public.product (id) ON DELETE CASCADE,
  CONSTRAINT product_season_season_id_fkey FOREIGN KEY (season_id)
    REFERENCES public.season (id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_product_season_season_id ON public.product_season (season_id);
ALTER TABLE public.product_season ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_season FORCE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.product_tag (
  product_id uuid        NOT NULL,
  tag_id     uuid        NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT product_tag_pkey PRIMARY KEY (product_id, tag_id),
  CONSTRAINT product_tag_product_id_fkey FOREIGN KEY (product_id)
    REFERENCES public.product (id) ON DELETE CASCADE,
  CONSTRAINT product_tag_tag_id_fkey FOREIGN KEY (tag_id)
    REFERENCES public.tag (id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_product_tag_tag_id ON public.product_tag (tag_id);
ALTER TABLE public.product_tag ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_tag FORCE ROW LEVEL SECURITY;


-- =====================================================================
-- TABLE: product_specification
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.product_specification (
  id          uuid        NOT NULL DEFAULT gen_random_uuid(),
  product_id  uuid        NOT NULL,
  spec_key    text        NOT NULL,
  spec_value  text        NOT NULL,
  sort_order  integer     NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT product_specification_pkey PRIMARY KEY (id),
  CONSTRAINT product_specification_product_id_fkey FOREIGN KEY (product_id)
    REFERENCES public.product (id) ON DELETE CASCADE
);

COMMENT ON TABLE public.product_specification IS
  'Free-form key/value specification rows per product, avoiding a schema change for every new spec type.';

CREATE INDEX IF NOT EXISTS idx_product_specification_product_sort
  ON public.product_specification (product_id, sort_order);

DROP TRIGGER IF EXISTS trg_product_specification_updated_at ON public.product_specification;
CREATE TRIGGER trg_product_specification_updated_at
  BEFORE UPDATE ON public.product_specification
  FOR EACH ROW EXECUTE FUNCTION public.trg_set_updated_at();

ALTER TABLE public.product_specification ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_specification FORCE ROW LEVEL SECURITY;


-- =====================================================================
-- TABLE: seo_meta
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.seo_meta (
  id                       uuid        NOT NULL DEFAULT gen_random_uuid(),
  entity_type              text        NOT NULL,
  entity_id                uuid        NOT NULL,
  meta_title               text        NULL,
  meta_description         text        NULL,
  og_image_media_asset_id  uuid        NULL, -- FK deferred to 011_cms.sql (media_asset)
  canonical_url            text        NULL,
  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT seo_meta_pkey PRIMARY KEY (id),
  CONSTRAINT seo_meta_entity_key UNIQUE (entity_type, entity_id),
  CONSTRAINT seo_meta_entity_type_check CHECK (entity_type IN ('product', 'collection', 'page'))
);

COMMENT ON TABLE public.seo_meta IS
  'Generic, polymorphic SEO metadata for product/collection/page — one table instead of three, per BRS v2.0 Section 3.3. entity_id has no native FK (polymorphic); validated by trg_validate_polymorphic_reference below.';

CREATE UNIQUE INDEX IF NOT EXISTS uq_seo_meta_entity ON public.seo_meta (entity_type, entity_id);

DROP TRIGGER IF EXISTS trg_seo_meta_updated_at ON public.seo_meta;
CREATE TRIGGER trg_seo_meta_updated_at
  BEFORE UPDATE ON public.seo_meta
  FOR EACH ROW EXECUTE FUNCTION public.trg_set_updated_at();

DROP TRIGGER IF EXISTS trg_seo_meta_validate_reference ON public.seo_meta;
CREATE TRIGGER trg_seo_meta_validate_reference
  BEFORE INSERT OR UPDATE ON public.seo_meta
  FOR EACH ROW EXECUTE FUNCTION public.trg_validate_polymorphic_reference('entity_type', 'entity_id');

ALTER TABLE public.seo_meta ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seo_meta FORCE ROW LEVEL SECURITY;


-- =====================================================================
-- TABLE: product_image
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.product_image (
  id              uuid        NOT NULL DEFAULT gen_random_uuid(),
  product_id      uuid        NOT NULL,
  media_asset_id  uuid        NOT NULL, -- FK deferred to 011_cms.sql (media_asset)
  sort_order      integer     NOT NULL DEFAULT 0,
  is_primary      boolean     NOT NULL DEFAULT false,
  alt_text        text        NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT product_image_pkey PRIMARY KEY (id),
  CONSTRAINT product_image_product_id_fkey FOREIGN KEY (product_id)
    REFERENCES public.product (id) ON DELETE CASCADE,
  CONSTRAINT product_image_product_sort_key UNIQUE (product_id, sort_order) DEFERRABLE INITIALLY IMMEDIATE
);

COMMENT ON TABLE public.product_image IS
  'Ordered gallery of images per product, referencing shared media_asset rows for reuse across products.';
COMMENT ON CONSTRAINT product_image_product_sort_key ON public.product_image IS
  'DEFERRABLE so a batch re-order transaction can temporarily violate uniqueness mid-transaction; set to DEFERRED explicitly by the reordering transaction.';

CREATE INDEX IF NOT EXISTS idx_product_image_product_sort ON public.product_image (product_id, sort_order);

DROP TRIGGER IF EXISTS trg_product_image_updated_at ON public.product_image;
CREATE TRIGGER trg_product_image_updated_at
  BEFORE UPDATE ON public.product_image
  FOR EACH ROW EXECUTE FUNCTION public.trg_set_updated_at();

DROP TRIGGER IF EXISTS trg_product_image_single_primary ON public.product_image;
CREATE TRIGGER trg_product_image_single_primary
  BEFORE INSERT OR UPDATE OF is_primary ON public.product_image
  FOR EACH ROW EXECUTE FUNCTION public.trg_enforce_single_flag('is_primary', 'product_id');

ALTER TABLE public.product_image ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_image FORCE ROW LEVEL SECURITY;


-- =====================================================================
-- TABLE: product_video
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.product_video (
  id                        uuid        NOT NULL DEFAULT gen_random_uuid(),
  product_id                uuid        NOT NULL,
  media_asset_id            uuid        NOT NULL, -- FK deferred to 011_cms.sql
  thumbnail_media_asset_id  uuid        NULL,      -- FK deferred to 011_cms.sql
  sort_order                integer     NOT NULL DEFAULT 0,
  created_at                timestamptz NOT NULL DEFAULT now(),
  updated_at                timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT product_video_pkey PRIMARY KEY (id),
  CONSTRAINT product_video_product_id_fkey FOREIGN KEY (product_id)
    REFERENCES public.product (id) ON DELETE CASCADE
);

COMMENT ON TABLE public.product_video IS
  'Kept separate from product_image because videos need duration/thumbnail metadata images do not.';

CREATE INDEX IF NOT EXISTS idx_product_video_product_sort ON public.product_video (product_id, sort_order);

DROP TRIGGER IF EXISTS trg_product_video_updated_at ON public.product_video;
CREATE TRIGGER trg_product_video_updated_at
  BEFORE UPDATE ON public.product_video
  FOR EACH ROW EXECUTE FUNCTION public.trg_set_updated_at();

ALTER TABLE public.product_video ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_video FORCE ROW LEVEL SECURITY;


-- =====================================================================
-- TABLE: collection
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.collection (
  id                    uuid            NOT NULL DEFAULT gen_random_uuid(),
  slug                  public.app_slug NOT NULL,
  title                 text            NOT NULL,
  label                 text            NULL,
  description           text            NULL,
  hero_media_asset_id   uuid            NULL, -- FK deferred to 011_cms.sql
  status                text            NOT NULL DEFAULT 'draft',
  sort_order            integer         NOT NULL DEFAULT 0,
  created_at            timestamptz     NOT NULL DEFAULT now(),
  updated_at            timestamptz     NOT NULL DEFAULT now(),
  deleted_at            timestamptz     NULL,
  created_by            uuid            NULL,
  updated_by            uuid            NULL,
  version               integer         NOT NULL DEFAULT 1,
  CONSTRAINT collection_pkey PRIMARY KEY (id),
  CONSTRAINT collection_slug_key UNIQUE (slug),
  CONSTRAINT collection_status_check CHECK (status IN ('draft', 'published', 'archived')),
  CONSTRAINT collection_created_by_fkey FOREIGN KEY (created_by)
    REFERENCES public.admin_user (id) ON DELETE RESTRICT,
  CONSTRAINT collection_updated_by_fkey FOREIGN KEY (updated_by)
    REFERENCES public.admin_user (id) ON DELETE RESTRICT
);

COMMENT ON TABLE public.collection IS
  'Editorially curated groupings of products (Bridal, Festive, Wedding), distinct from occasion/tag. slug is the single canonical source — the frontend must never regenerate a slug client-side (resolves v1.0 Ambiguity #2).';

CREATE UNIQUE INDEX IF NOT EXISTS uq_collection_slug ON public.collection (slug);
CREATE INDEX IF NOT EXISTS idx_collection_sort_order_published
  ON public.collection (sort_order) WHERE status = 'published';

DROP TRIGGER IF EXISTS trg_collection_updated_at ON public.collection;
CREATE TRIGGER trg_collection_updated_at
  BEFORE UPDATE ON public.collection
  FOR EACH ROW EXECUTE FUNCTION public.trg_set_updated_at_versioned();

DROP TRIGGER IF EXISTS trg_collection_audit ON public.collection;
CREATE TRIGGER trg_collection_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.collection
  FOR EACH ROW EXECUTE FUNCTION public.trg_audit_log();

DROP TRIGGER IF EXISTS trg_collection_soft_delete ON public.collection;
CREATE TRIGGER trg_collection_soft_delete
  BEFORE DELETE ON public.collection
  FOR EACH ROW EXECUTE FUNCTION public.trg_soft_delete_guard();

ALTER TABLE public.collection ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collection FORCE ROW LEVEL SECURITY;


-- =====================================================================
-- TABLE: product_collection
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.product_collection (
  product_id     uuid        NOT NULL,
  collection_id  uuid        NOT NULL,
  sort_order     integer     NOT NULL DEFAULT 0,
  created_at     timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT product_collection_pkey PRIMARY KEY (product_id, collection_id),
  CONSTRAINT product_collection_product_id_fkey FOREIGN KEY (product_id)
    REFERENCES public.product (id) ON DELETE CASCADE,
  CONSTRAINT product_collection_collection_id_fkey FOREIGN KEY (collection_id)
    REFERENCES public.collection (id) ON DELETE CASCADE
);

COMMENT ON TABLE public.product_collection IS
  'Many-to-many join placing products into collections, with explicit ordering for merchandising control.';

CREATE INDEX IF NOT EXISTS idx_product_collection_collection_sort
  ON public.product_collection (collection_id, sort_order);

ALTER TABLE public.product_collection ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_collection FORCE ROW LEVEL SECURITY;


-- =====================================================================
-- TABLE: product_relation
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.product_relation (
  id                  uuid        NOT NULL DEFAULT gen_random_uuid(),
  product_id          uuid        NOT NULL,
  related_product_id  uuid        NOT NULL,
  relation_type       text        NOT NULL,
  sort_order          integer     NOT NULL DEFAULT 0,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT product_relation_pkey PRIMARY KEY (id),
  CONSTRAINT product_relation_product_id_fkey FOREIGN KEY (product_id)
    REFERENCES public.product (id) ON DELETE CASCADE,
  CONSTRAINT product_relation_related_product_id_fkey FOREIGN KEY (related_product_id)
    REFERENCES public.product (id) ON DELETE CASCADE,
  CONSTRAINT product_relation_type_check CHECK (relation_type IN ('related', 'recommended', 'cross_sell', 'upsell')),
  CONSTRAINT product_relation_no_self_check CHECK (product_id <> related_product_id),
  CONSTRAINT product_relation_unique_key UNIQUE (product_id, related_product_id, relation_type)
);

COMMENT ON TABLE public.product_relation IS
  'Consolidates Related/Recommended/Cross-sell/Upsell into one self-referential, typed table per BRS v2.0 Section 3.4. Directional: product_id -> related_product_id, not automatically symmetric.';

CREATE INDEX IF NOT EXISTS idx_product_relation_lookup
  ON public.product_relation (product_id, relation_type, sort_order);
CREATE INDEX IF NOT EXISTS idx_product_relation_reverse
  ON public.product_relation (related_product_id);

DROP TRIGGER IF EXISTS trg_product_relation_updated_at ON public.product_relation;
CREATE TRIGGER trg_product_relation_updated_at
  BEFORE UPDATE ON public.product_relation
  FOR EACH ROW EXECUTE FUNCTION public.trg_set_updated_at();

ALTER TABLE public.product_relation ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_relation FORCE ROW LEVEL SECURITY;


-- =====================================================================
-- TABLE: product_review
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.product_review (
  id             uuid        NOT NULL DEFAULT gen_random_uuid(),
  product_id     uuid        NOT NULL,
  customer_id    uuid        NOT NULL, -- FK deferred to 007_customers.sql (customer)
  order_item_id  uuid        NULL,     -- FK deferred to 009_orders.sql (order_item)
  rating         smallint    NOT NULL,
  review_text    text        NULL,
  status         text        NOT NULL DEFAULT 'pending',
  moderated_by   uuid        NULL,
  moderated_at   timestamptz NULL,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  deleted_at     timestamptz NULL,
  created_by     uuid        NULL,
  updated_by     uuid        NULL,
  version        integer     NOT NULL DEFAULT 1,
  CONSTRAINT product_review_pkey PRIMARY KEY (id),
  CONSTRAINT product_review_product_id_fkey FOREIGN KEY (product_id)
    REFERENCES public.product (id) ON DELETE CASCADE,
  CONSTRAINT product_review_moderated_by_fkey FOREIGN KEY (moderated_by)
    REFERENCES public.admin_user (id) ON DELETE SET NULL,
  CONSTRAINT product_review_created_by_fkey FOREIGN KEY (created_by)
    REFERENCES public.admin_user (id) ON DELETE RESTRICT,
  CONSTRAINT product_review_updated_by_fkey FOREIGN KEY (updated_by)
    REFERENCES public.admin_user (id) ON DELETE RESTRICT,
  CONSTRAINT product_review_rating_check CHECK (rating BETWEEN 1 AND 5),
  CONSTRAINT product_review_status_check CHECK (status IN ('pending', 'approved', 'rejected'))
);

COMMENT ON TABLE public.product_review IS
  'Customer-submitted, moderated product reviews — distinct from the CMS-curated testimonial table. Added per Architecture Review Notes Section 2.1.';

-- Partial unique index: a customer cannot leave two verified reviews
-- for the same purchased item (Data Dictionary 01, Section 6).
CREATE UNIQUE INDEX IF NOT EXISTS uq_product_review_customer_order_item
  ON public.product_review (customer_id, order_item_id) WHERE order_item_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_product_review_product_approved
  ON public.product_review (product_id) WHERE status = 'approved';
CREATE INDEX IF NOT EXISTS idx_product_review_customer_id ON public.product_review (customer_id);
CREATE INDEX IF NOT EXISTS idx_product_review_pending
  ON public.product_review (status) WHERE status = 'pending';

DROP TRIGGER IF EXISTS trg_product_review_updated_at ON public.product_review;
CREATE TRIGGER trg_product_review_updated_at
  BEFORE UPDATE ON public.product_review
  FOR EACH ROW EXECUTE FUNCTION public.trg_set_updated_at_versioned();

DROP TRIGGER IF EXISTS trg_product_review_audit ON public.product_review;
CREATE TRIGGER trg_product_review_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.product_review
  FOR EACH ROW EXECUTE FUNCTION public.trg_audit_log();

DROP TRIGGER IF EXISTS trg_product_review_soft_delete ON public.product_review;
CREATE TRIGGER trg_product_review_soft_delete
  BEFORE DELETE ON public.product_review
  FOR EACH ROW EXECUTE FUNCTION public.trg_soft_delete_guard();

-- Rating-aggregate maintenance on the parent product (Data Dictionary
-- 01, product_review, Section 10).
CREATE OR REPLACE FUNCTION public.trg_product_review_rating_aggregate()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_product_id uuid := COALESCE(NEW.product_id, OLD.product_id);
BEGIN
  UPDATE public.product p
  SET average_rating = agg.avg_rating,
      review_count = agg.cnt
  FROM (
    SELECT
      round(avg(rating)::numeric, 1) AS avg_rating,
      count(*) AS cnt
    FROM public.product_review
    WHERE product_id = v_product_id
      AND status = 'approved'
      AND deleted_at IS NULL
  ) agg
  WHERE p.id = v_product_id;

  RETURN COALESCE(NEW, OLD);
END;
$$;

COMMENT ON FUNCTION public.trg_product_review_rating_aggregate() IS
  'Recomputes product.average_rating and product.review_count from approved, non-deleted product_review rows whenever a review is inserted, updated, or deleted.';

DROP TRIGGER IF EXISTS trg_product_review_rating_aggregate_trigger ON public.product_review;
CREATE TRIGGER trg_product_review_rating_aggregate_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.product_review
  FOR EACH ROW EXECUTE FUNCTION public.trg_product_review_rating_aggregate();

ALTER TABLE public.product_review ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_review FORCE ROW LEVEL SECURITY;


-- =====================================================================
-- TABLE: size_chart
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.size_chart (
  id           uuid        NOT NULL DEFAULT gen_random_uuid(),
  category_id  uuid        NULL,
  name         text        NOT NULL,
  is_active    boolean     NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT size_chart_pkey PRIMARY KEY (id),
  CONSTRAINT size_chart_category_id_fkey FOREIGN KEY (category_id)
    REFERENCES public.category (id) ON DELETE SET NULL
);

COMMENT ON TABLE public.size_chart IS
  'Defines a named size chart applicable to a category of ready-made products. Added per Architecture Review Notes Section 2.3. Only relevant for ready_made products; bespoke/made-to-order fit is handled via the Tailoring subsystem.';

CREATE INDEX IF NOT EXISTS idx_size_chart_category_id ON public.size_chart (category_id);

DROP TRIGGER IF EXISTS trg_size_chart_updated_at ON public.size_chart;
CREATE TRIGGER trg_size_chart_updated_at
  BEFORE UPDATE ON public.size_chart
  FOR EACH ROW EXECUTE FUNCTION public.trg_set_updated_at();

ALTER TABLE public.size_chart ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.size_chart FORCE ROW LEVEL SECURITY;


-- =====================================================================
-- TABLE: size_chart_entry
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.size_chart_entry (
  id             uuid                    NOT NULL DEFAULT gen_random_uuid(),
  size_chart_id  uuid                    NOT NULL,
  size_label     text                    NOT NULL,
  measurements   public.app_jsonb_object NOT NULL,
  sort_order     integer                 NOT NULL DEFAULT 0,
  created_at     timestamptz             NOT NULL DEFAULT now(),
  updated_at     timestamptz             NOT NULL DEFAULT now(),
  CONSTRAINT size_chart_entry_pkey PRIMARY KEY (id),
  CONSTRAINT size_chart_entry_size_chart_id_fkey FOREIGN KEY (size_chart_id)
    REFERENCES public.size_chart (id) ON DELETE CASCADE,
  CONSTRAINT size_chart_entry_unique_key UNIQUE (size_chart_id, size_label)
);

COMMENT ON TABLE public.size_chart_entry IS
  'Individual size rows (e.g. "M = 40in chest, 32in waist") within a size_chart. measurements uses jsonb (not fixed columns) since different garment categories need different measurement fields.';

CREATE INDEX IF NOT EXISTS idx_size_chart_entry_chart_sort
  ON public.size_chart_entry (size_chart_id, sort_order);

DROP TRIGGER IF EXISTS trg_size_chart_entry_updated_at ON public.size_chart_entry;
CREATE TRIGGER trg_size_chart_entry_updated_at
  BEFORE UPDATE ON public.size_chart_entry
  FOR EACH ROW EXECUTE FUNCTION public.trg_set_updated_at();

ALTER TABLE public.size_chart_entry ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.size_chart_entry FORCE ROW LEVEL SECURITY;
