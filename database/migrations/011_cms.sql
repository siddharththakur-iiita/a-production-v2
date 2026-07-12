-- =====================================================================
-- Migration: 011_cms.sql
-- Purpose:   CMS domain (Data Dictionary 06): media_asset, page,
--            content_block, hero_banner, featured_placement,
--            gallery_item, testimonial, announcement, navigation_menu,
--            navigation_item, mega_menu_promo, social_link,
--            contact_info, seo_redirect, site_setting. (15 tables)
-- Target:    PostgreSQL 15+, Supabase-compatible.
-- Idempotent: Yes.
-- Depends on: 001-010 (extensions, types, functions, auth, catalog,
--            inventory, customers, cart, orders, tailoring)
--
-- media_asset is created first in this file (even though CMS is
-- conceptually its own domain) because it is the single shared media
-- table referenced by Catalog, CMS, and Tailoring alike. This file
-- finalizes every FK deferred from those earlier migrations
-- (brand.logo_media_asset_id, seo_meta.og_image_media_asset_id,
-- product_image.media_asset_id, product_video.media_asset_id/
-- thumbnail_media_asset_id, collection.hero_media_asset_id,
-- fabric_selection.swatch_media_asset_id, reference_image.media_asset_id,
-- invoice.pdf_media_asset_id) at the end of this file.
-- =====================================================================


-- =====================================================================
-- TABLE: media_asset
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.media_asset (
  id           uuid        NOT NULL DEFAULT gen_random_uuid(),
  storage_path text        NOT NULL,
  is_private   boolean     NOT NULL DEFAULT false,
  alt_text     text        NULL,
  tags         text[]      NULL,
  uploaded_by  uuid        NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT media_asset_pkey PRIMARY KEY (id),
  CONSTRAINT media_asset_uploaded_by_fkey FOREIGN KEY (uploaded_by)
    REFERENCES public.admin_user (id) ON DELETE SET NULL
);

COMMENT ON TABLE public.media_asset IS
  'The single shared media library referenced across Catalog, CMS, and Tailoring — one upload, reusable everywhere. Stores metadata only; actual file bytes live in Supabase Storage, bridged via storage_path. is_private governs which storage bucket/RLS applies.';

CREATE INDEX IF NOT EXISTS idx_media_asset_uploaded_by ON public.media_asset (uploaded_by);
CREATE INDEX IF NOT EXISTS idx_media_asset_tags ON public.media_asset USING gin (tags);
CREATE INDEX IF NOT EXISTS idx_media_asset_created_at ON public.media_asset (created_at DESC);

DROP TRIGGER IF EXISTS trg_media_asset_updated_at ON public.media_asset;
CREATE TRIGGER trg_media_asset_updated_at
  BEFORE UPDATE ON public.media_asset
  FOR EACH ROW EXECUTE FUNCTION public.trg_set_updated_at();

-- RLS: enabled here, policies in 016_rls.sql. Split by is_private:
-- false rows follow RLS-1 (public read), true rows are owner/context
-- scoped via a join through the referencing table (reference_image's
-- parent tailoring_request, invoice's parent order, etc.), since
-- media_asset itself has no customer_id column.
ALTER TABLE public.media_asset ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_asset FORCE ROW LEVEL SECURITY;


-- =====================================================================
-- TABLE: page
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.page (
  id         uuid        NOT NULL DEFAULT gen_random_uuid(),
  key        text        NOT NULL,
  name       text        NOT NULL,
  is_active  boolean     NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT page_pkey PRIMARY KEY (id),
  CONSTRAINT page_key_key UNIQUE (key)
);

COMMENT ON TABLE public.page IS
  'One row per admin-manageable page (home, about, women, men, kids, custom_tailoring, custom_design, contact, collections). Replaces a free-text page_key string with a real, referenceable list.';

CREATE UNIQUE INDEX IF NOT EXISTS uq_page_key ON public.page (key);

DROP TRIGGER IF EXISTS trg_page_updated_at ON public.page;
CREATE TRIGGER trg_page_updated_at
  BEFORE UPDATE ON public.page
  FOR EACH ROW EXECUTE FUNCTION public.trg_set_updated_at();

ALTER TABLE public.page ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.page FORCE ROW LEVEL SECURITY;


-- =====================================================================
-- TABLE: content_block
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.content_block (
  id            uuid        NOT NULL DEFAULT gen_random_uuid(),
  page_id       uuid        NOT NULL,
  section_key   text        NOT NULL,
  content       jsonb       NOT NULL,
  sort_order    integer     NOT NULL DEFAULT 0,
  status        text        NOT NULL DEFAULT 'draft',
  published_at  timestamptz NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  deleted_at    timestamptz NULL,
  created_by    uuid        NULL,
  updated_by    uuid        NULL,
  version       integer     NOT NULL DEFAULT 1,
  CONSTRAINT content_block_pkey PRIMARY KEY (id),
  CONSTRAINT content_block_page_id_fkey FOREIGN KEY (page_id)
    REFERENCES public.page (id) ON DELETE CASCADE,
  CONSTRAINT content_block_created_by_fkey FOREIGN KEY (created_by)
    REFERENCES public.admin_user (id) ON DELETE RESTRICT,
  CONSTRAINT content_block_updated_by_fkey FOREIGN KEY (updated_by)
    REFERENCES public.admin_user (id) ON DELETE RESTRICT,
  CONSTRAINT content_block_status_check CHECK (status IN ('draft', 'published'))
);

COMMENT ON TABLE public.content_block IS
  'Generalized, schema-per-section-type content unit (Hero statement, Quote, Process Steps, Feature Grid, FAQ, Promise Grid, Showcase Tiles) rendered into a page''s sections. content shape varies per section_key, validated at the application layer.';

CREATE INDEX IF NOT EXISTS idx_content_block_page_sort ON public.content_block (page_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_content_block_published
  ON public.content_block (page_id) WHERE status = 'published' AND deleted_at IS NULL;

-- Publish-aware updated_at trigger: refreshes updated_at always, and
-- additionally stamps published_at the moment status transitions to
-- 'published' (a small addition beyond the standard TRG-UPDATED-AT
-- behavior, per Data Dictionary 06 Section 10).
CREATE OR REPLACE FUNCTION public.trg_content_block_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  NEW.version := OLD.version + 1;
  IF NEW.status = 'published' AND OLD.status IS DISTINCT FROM 'published' THEN
    NEW.published_at := now();
  END IF;
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.trg_content_block_updated_at() IS
  'Standard versioned updated_at maintenance, plus stamps published_at when status transitions to published.';

DROP TRIGGER IF EXISTS trg_content_block_updated_at_trigger ON public.content_block;
CREATE TRIGGER trg_content_block_updated_at_trigger
  BEFORE UPDATE ON public.content_block
  FOR EACH ROW EXECUTE FUNCTION public.trg_content_block_updated_at();

DROP TRIGGER IF EXISTS trg_content_block_audit ON public.content_block;
CREATE TRIGGER trg_content_block_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.content_block
  FOR EACH ROW EXECUTE FUNCTION public.trg_audit_log();

DROP TRIGGER IF EXISTS trg_content_block_soft_delete ON public.content_block;
CREATE TRIGGER trg_content_block_soft_delete
  BEFORE DELETE ON public.content_block
  FOR EACH ROW EXECUTE FUNCTION public.trg_soft_delete_guard();

ALTER TABLE public.content_block ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_block FORCE ROW LEVEL SECURITY;


-- =====================================================================
-- TABLE: hero_banner
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.hero_banner (
  id              uuid        NOT NULL DEFAULT gen_random_uuid(),
  page_id         uuid        NOT NULL,
  media_asset_id  uuid        NULL,
  headline        text        NULL,
  subheadline     text        NULL,
  cta_label       text        NULL,
  cta_url         text        NULL,
  starts_at       timestamptz NULL,
  ends_at         timestamptz NULL,
  sort_order      integer     NOT NULL DEFAULT 0,
  status          text        NOT NULL DEFAULT 'draft',
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  deleted_at      timestamptz NULL,
  created_by      uuid        NULL,
  updated_by      uuid        NULL,
  version         integer     NOT NULL DEFAULT 1,
  CONSTRAINT hero_banner_pkey PRIMARY KEY (id),
  CONSTRAINT hero_banner_page_id_fkey FOREIGN KEY (page_id)
    REFERENCES public.page (id) ON DELETE CASCADE,
  CONSTRAINT hero_banner_media_asset_id_fkey FOREIGN KEY (media_asset_id)
    REFERENCES public.media_asset (id) ON DELETE SET NULL,
  CONSTRAINT hero_banner_created_by_fkey FOREIGN KEY (created_by)
    REFERENCES public.admin_user (id) ON DELETE RESTRICT,
  CONSTRAINT hero_banner_updated_by_fkey FOREIGN KEY (updated_by)
    REFERENCES public.admin_user (id) ON DELETE RESTRICT,
  CONSTRAINT hero_banner_status_check CHECK (status IN ('draft', 'published')),
  CONSTRAINT hero_banner_dates_check CHECK (ends_at IS NULL OR starts_at IS NULL OR ends_at >= starts_at)
);

COMMENT ON TABLE public.hero_banner IS
  'Scheduled, campaign-aware hero banners for a page — separated from generic content_block because banners need starts_at/ends_at scheduling that ordinary content blocks do not.';

CREATE INDEX IF NOT EXISTS idx_hero_banner_page_sort ON public.hero_banner (page_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_hero_banner_published
  ON public.hero_banner (page_id) WHERE status = 'published' AND deleted_at IS NULL;

DROP TRIGGER IF EXISTS trg_hero_banner_updated_at ON public.hero_banner;
CREATE TRIGGER trg_hero_banner_updated_at
  BEFORE UPDATE ON public.hero_banner
  FOR EACH ROW EXECUTE FUNCTION public.trg_set_updated_at_versioned();

DROP TRIGGER IF EXISTS trg_hero_banner_audit ON public.hero_banner;
CREATE TRIGGER trg_hero_banner_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.hero_banner
  FOR EACH ROW EXECUTE FUNCTION public.trg_audit_log();

DROP TRIGGER IF EXISTS trg_hero_banner_soft_delete ON public.hero_banner;
CREATE TRIGGER trg_hero_banner_soft_delete
  BEFORE DELETE ON public.hero_banner
  FOR EACH ROW EXECUTE FUNCTION public.trg_soft_delete_guard();

ALTER TABLE public.hero_banner ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hero_banner FORCE ROW LEVEL SECURITY;


-- =====================================================================
-- TABLE: featured_placement
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.featured_placement (
  id                  uuid        NOT NULL DEFAULT gen_random_uuid(),
  placement_context   text        NOT NULL,
  context_ref_id      uuid        NULL,
  product_id          uuid        NOT NULL,
  placement_type      text        NOT NULL,
  sort_order          integer     NOT NULL DEFAULT 0,
  starts_at           timestamptz NULL,
  ends_at             timestamptz NULL,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT featured_placement_pkey PRIMARY KEY (id),
  CONSTRAINT featured_placement_product_id_fkey FOREIGN KEY (product_id)
    REFERENCES public.product (id) ON DELETE CASCADE,
  CONSTRAINT featured_placement_context_check CHECK (placement_context IN ('homepage', 'department', 'collection_page')),
  CONSTRAINT featured_placement_type_check CHECK (placement_type IN ('featured', 'trending')),
  CONSTRAINT featured_placement_dates_check CHECK (ends_at IS NULL OR starts_at IS NULL OR ends_at >= starts_at)
);

COMMENT ON TABLE public.featured_placement IS
  'The curation layer on top of product.is_featured/is_trending eligibility flags — controls where and in what order eligible products appear. context_ref_id is polymorphic (department or collection), no native FK.';

CREATE INDEX IF NOT EXISTS idx_featured_placement_lookup
  ON public.featured_placement (placement_context, context_ref_id, placement_type, sort_order);

-- Validation trigger: the referenced product's corresponding
-- eligibility flag must be true for the given placement_type.
CREATE OR REPLACE FUNCTION public.trg_featured_placement_validate()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_is_featured boolean;
  v_is_trending boolean;
BEGIN
  SELECT is_featured, is_trending INTO v_is_featured, v_is_trending
  FROM public.product WHERE id = NEW.product_id;

  IF NEW.placement_type = 'featured' AND NOT v_is_featured THEN
    RAISE EXCEPTION 'product % is not flagged is_featured; cannot create a featured placement', NEW.product_id;
  ELSIF NEW.placement_type = 'trending' AND NOT v_is_trending THEN
    RAISE EXCEPTION 'product % is not flagged is_trending; cannot create a trending placement', NEW.product_id;
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.trg_featured_placement_validate() IS
  'Ensures a featured_placement row''s product actually has the corresponding eligibility flag (is_featured/is_trending) set on product.';

DROP TRIGGER IF EXISTS trg_featured_placement_validate_trigger ON public.featured_placement;
CREATE TRIGGER trg_featured_placement_validate_trigger
  BEFORE INSERT OR UPDATE ON public.featured_placement
  FOR EACH ROW EXECUTE FUNCTION public.trg_featured_placement_validate();

DROP TRIGGER IF EXISTS trg_featured_placement_updated_at ON public.featured_placement;
CREATE TRIGGER trg_featured_placement_updated_at
  BEFORE UPDATE ON public.featured_placement
  FOR EACH ROW EXECUTE FUNCTION public.trg_set_updated_at();

ALTER TABLE public.featured_placement ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.featured_placement FORCE ROW LEVEL SECURITY;


-- =====================================================================
-- TABLE: gallery_item
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.gallery_item (
  id              uuid        NOT NULL DEFAULT gen_random_uuid(),
  media_asset_id  uuid        NOT NULL,
  caption         text        NULL,
  source_url      text        NULL,
  sort_order      integer     NOT NULL DEFAULT 0,
  status          text        NOT NULL DEFAULT 'published',
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT gallery_item_pkey PRIMARY KEY (id),
  CONSTRAINT gallery_item_media_asset_id_fkey FOREIGN KEY (media_asset_id)
    REFERENCES public.media_asset (id) ON DELETE RESTRICT,
  CONSTRAINT gallery_item_status_check CHECK (status IN ('draft', 'published'))
);

COMMENT ON TABLE public.gallery_item IS
  'CMS-managed image gallery, formally resurrecting the dead InstagramGallery.jsx frontend section as a real, admin-manageable feature. Manual upload at launch; a live Instagram Graph API sync is a possible future integration writing into this same table, not a schema change.';

CREATE INDEX IF NOT EXISTS idx_gallery_item_sort_published
  ON public.gallery_item (sort_order) WHERE status = 'published';

DROP TRIGGER IF EXISTS trg_gallery_item_updated_at ON public.gallery_item;
CREATE TRIGGER trg_gallery_item_updated_at
  BEFORE UPDATE ON public.gallery_item
  FOR EACH ROW EXECUTE FUNCTION public.trg_set_updated_at();

ALTER TABLE public.gallery_item ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gallery_item FORCE ROW LEVEL SECURITY;


-- =====================================================================
-- TABLE: testimonial
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.testimonial (
  id                             uuid        NOT NULL DEFAULT gen_random_uuid(),
  customer_name                  text        NOT NULL,
  customer_photo_media_asset_id  uuid        NULL,
  quote                          text        NOT NULL,
  rating                         smallint    NULL,
  product_id                     uuid        NULL,
  status                         text        NOT NULL DEFAULT 'draft',
  sort_order                     integer     NOT NULL DEFAULT 0,
  created_at                     timestamptz NOT NULL DEFAULT now(),
  updated_at                     timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT testimonial_pkey PRIMARY KEY (id),
  CONSTRAINT testimonial_customer_photo_media_asset_id_fkey FOREIGN KEY (customer_photo_media_asset_id)
    REFERENCES public.media_asset (id) ON DELETE SET NULL,
  CONSTRAINT testimonial_product_id_fkey FOREIGN KEY (product_id)
    REFERENCES public.product (id) ON DELETE SET NULL,
  CONSTRAINT testimonial_rating_range_check CHECK (rating IS NULL OR (rating BETWEEN 1 AND 5)),
  CONSTRAINT testimonial_status_check CHECK (status IN ('draft', 'published'))
);

COMMENT ON TABLE public.testimonial IS
  'Staff-curated marketing testimonials/quotes — editorial content, explicitly distinct from the customer-generated, moderated product_review table (Catalog domain). Must not be conflated with product_review.';

CREATE INDEX IF NOT EXISTS idx_testimonial_sort_published
  ON public.testimonial (sort_order) WHERE status = 'published';
CREATE INDEX IF NOT EXISTS idx_testimonial_product_id ON public.testimonial (product_id);

DROP TRIGGER IF EXISTS trg_testimonial_updated_at ON public.testimonial;
CREATE TRIGGER trg_testimonial_updated_at
  BEFORE UPDATE ON public.testimonial
  FOR EACH ROW EXECUTE FUNCTION public.trg_set_updated_at();

ALTER TABLE public.testimonial ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.testimonial FORCE ROW LEVEL SECURITY;


-- =====================================================================
-- TABLE: announcement
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.announcement (
  id          uuid        NOT NULL DEFAULT gen_random_uuid(),
  message     text        NOT NULL,
  link_url    text        NULL,
  starts_at   timestamptz NULL,
  ends_at     timestamptz NULL,
  status      text        NOT NULL DEFAULT 'draft',
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT announcement_pkey PRIMARY KEY (id),
  CONSTRAINT announcement_status_check CHECK (status IN ('draft', 'published')),
  CONSTRAINT announcement_dates_check CHECK (ends_at IS NULL OR starts_at IS NULL OR ends_at >= starts_at)
);

COMMENT ON TABLE public.announcement IS
  'Site-wide scheduled banner messages (e.g. "Now Shipping Worldwide"). Tie-break when multiple published rows overlap in date window is an application/frontend concern, not enforced here.';

CREATE INDEX IF NOT EXISTS idx_announcement_published
  ON public.announcement (id) WHERE status = 'published';

DROP TRIGGER IF EXISTS trg_announcement_updated_at ON public.announcement;
CREATE TRIGGER trg_announcement_updated_at
  BEFORE UPDATE ON public.announcement
  FOR EACH ROW EXECUTE FUNCTION public.trg_set_updated_at();

ALTER TABLE public.announcement ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcement FORCE ROW LEVEL SECURITY;


-- =====================================================================
-- TABLE: navigation_menu
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.navigation_menu (
  id   uuid NOT NULL DEFAULT gen_random_uuid(),
  key  text NOT NULL,
  name text NOT NULL,
  CONSTRAINT navigation_menu_pkey PRIMARY KEY (id),
  CONSTRAINT navigation_menu_key_key UNIQUE (key)
);

COMMENT ON TABLE public.navigation_menu IS
  'Formalizes the hardcoded navData.jsx (NAV_LINKS/MEGA_MENUS) into a DB-managed structure. Seed two rows at launch: primary and footer — the footer reuses this same menu/item structure rather than a separate parallel schema (BRS v2.0 Section 6).';

CREATE UNIQUE INDEX IF NOT EXISTS uq_navigation_menu_key ON public.navigation_menu (key);

ALTER TABLE public.navigation_menu ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.navigation_menu FORCE ROW LEVEL SECURITY;


-- =====================================================================
-- TABLE: navigation_item
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.navigation_item (
  id               uuid        NOT NULL DEFAULT gen_random_uuid(),
  menu_id          uuid        NOT NULL,
  parent_item_id   uuid        NULL,
  label            text        NOT NULL,
  url              text        NULL,
  category_id      uuid        NULL,
  sort_order       integer     NOT NULL DEFAULT 0,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT navigation_item_pkey PRIMARY KEY (id),
  CONSTRAINT navigation_item_menu_id_fkey FOREIGN KEY (menu_id)
    REFERENCES public.navigation_menu (id) ON DELETE CASCADE,
  CONSTRAINT navigation_item_parent_item_id_fkey FOREIGN KEY (parent_item_id)
    REFERENCES public.navigation_item (id) ON DELETE CASCADE,
  CONSTRAINT navigation_item_category_id_fkey FOREIGN KEY (category_id)
    REFERENCES public.category (id) ON DELETE SET NULL,
  CONSTRAINT navigation_item_no_self_parent_check CHECK (parent_item_id IS NULL OR parent_item_id <> id)
);

COMMENT ON TABLE public.navigation_item IS
  'A single link (or parent link with children) within a navigation_menu — self-referential to model the MegaMenu''s category-list structure and footer link groupings with one schema. When category_id is set, the frontend should prefer resolving the URL from category.slug/department.slug over this row''s own url.';

CREATE INDEX IF NOT EXISTS idx_navigation_item_tree
  ON public.navigation_item (menu_id, parent_item_id, sort_order);

DROP TRIGGER IF EXISTS trg_navigation_item_updated_at ON public.navigation_item;
CREATE TRIGGER trg_navigation_item_updated_at
  BEFORE UPDATE ON public.navigation_item
  FOR EACH ROW EXECUTE FUNCTION public.trg_set_updated_at();

ALTER TABLE public.navigation_item ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.navigation_item FORCE ROW LEVEL SECURITY;


-- =====================================================================
-- TABLE: mega_menu_promo
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.mega_menu_promo (
  id                    uuid        NOT NULL DEFAULT gen_random_uuid(),
  navigation_item_id    uuid        NOT NULL,
  media_asset_id        uuid        NULL,
  title                 text        NULL,
  subtitle              text        NULL,
  cta_url               text        NULL,
  CONSTRAINT mega_menu_promo_pkey PRIMARY KEY (id),
  CONSTRAINT mega_menu_promo_navigation_item_id_key UNIQUE (navigation_item_id),
  CONSTRAINT mega_menu_promo_navigation_item_id_fkey FOREIGN KEY (navigation_item_id)
    REFERENCES public.navigation_item (id) ON DELETE CASCADE,
  CONSTRAINT mega_menu_promo_media_asset_id_fkey FOREIGN KEY (media_asset_id)
    REFERENCES public.media_asset (id) ON DELETE SET NULL
);

COMMENT ON TABLE public.mega_menu_promo IS
  'The promotional tile shown within a department''s MegaMenu dropdown (e.g. "Bridal Couture 2026") — kept separate from navigation_item since it is a rich promo unit, not a simple link.';

CREATE UNIQUE INDEX IF NOT EXISTS uq_mega_menu_promo_navigation_item_id ON public.mega_menu_promo (navigation_item_id);

ALTER TABLE public.mega_menu_promo ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mega_menu_promo FORCE ROW LEVEL SECURITY;


-- =====================================================================
-- TABLE: social_link
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.social_link (
  id          uuid        NOT NULL DEFAULT gen_random_uuid(),
  platform    text        NOT NULL,
  url         text        NOT NULL,
  sort_order  integer     NOT NULL DEFAULT 0,
  status      text        NOT NULL DEFAULT 'published',
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT social_link_pkey PRIMARY KEY (id),
  CONSTRAINT social_link_status_check CHECK (status IN ('draft', 'published'))
);

COMMENT ON TABLE public.social_link IS
  'Footer/contact-page social media links, admin-manageable rather than hardcoded.';

CREATE INDEX IF NOT EXISTS idx_social_link_published
  ON public.social_link (sort_order) WHERE status = 'published';

DROP TRIGGER IF EXISTS trg_social_link_updated_at ON public.social_link;
CREATE TRIGGER trg_social_link_updated_at
  BEFORE UPDATE ON public.social_link
  FOR EACH ROW EXECUTE FUNCTION public.trg_set_updated_at();

ALTER TABLE public.social_link ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_link FORCE ROW LEVEL SECURITY;


-- =====================================================================
-- TABLE: contact_info
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.contact_info (
  id                uuid              NOT NULL DEFAULT gen_random_uuid(),
  label             text              NOT NULL DEFAULT 'default',
  phone             public.app_phone  NULL,
  whatsapp_number   public.app_phone  NULL,
  email             public.app_email  NULL,
  address           text              NULL,
  business_hours    text              NULL,
  created_at        timestamptz       NOT NULL DEFAULT now(),
  updated_at        timestamptz       NOT NULL DEFAULT now(),
  CONSTRAINT contact_info_pkey PRIMARY KEY (id),
  CONSTRAINT contact_info_label_key UNIQUE (label)
);

COMMENT ON TABLE public.contact_info IS
  'Single source of truth for phone/WhatsApp/email/address/hours, directly resolving the v1.0 audit finding of three different hardcoded phone numbers scattered across frontend files. Seed exactly one row (label=default) with the business''s actual confirmed number.';

CREATE UNIQUE INDEX IF NOT EXISTS uq_contact_info_label ON public.contact_info (label);

DROP TRIGGER IF EXISTS trg_contact_info_updated_at ON public.contact_info;
CREATE TRIGGER trg_contact_info_updated_at
  BEFORE UPDATE ON public.contact_info
  FOR EACH ROW EXECUTE FUNCTION public.trg_set_updated_at();

ALTER TABLE public.contact_info ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_info FORCE ROW LEVEL SECURITY;


-- =====================================================================
-- TABLE: seo_redirect
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.seo_redirect (
  id              uuid        NOT NULL DEFAULT gen_random_uuid(),
  from_path       text        NOT NULL,
  to_path         text        NOT NULL,
  redirect_type   text        NOT NULL DEFAULT '301',
  status          text        NOT NULL DEFAULT 'active',
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT seo_redirect_pkey PRIMARY KEY (id),
  CONSTRAINT seo_redirect_from_path_key UNIQUE (from_path),
  CONSTRAINT seo_redirect_from_path_format_check CHECK (from_path ~ '^/'),
  CONSTRAINT seo_redirect_to_path_format_check CHECK (to_path ~ '^/'),
  CONSTRAINT seo_redirect_type_check CHECK (redirect_type IN ('301', '302')),
  CONSTRAINT seo_redirect_status_check CHECK (status IN ('active', 'disabled'))
);

COMMENT ON TABLE public.seo_redirect IS
  'URL redirect management, necessary once real slugs/URLs go live and inevitably change. When a collection slug is changed, the admin flow should prompt for/auto-create a corresponding row from the old path.';

CREATE UNIQUE INDEX IF NOT EXISTS uq_seo_redirect_from_path ON public.seo_redirect (from_path);

DROP TRIGGER IF EXISTS trg_seo_redirect_updated_at ON public.seo_redirect;
CREATE TRIGGER trg_seo_redirect_updated_at
  BEFORE UPDATE ON public.seo_redirect
  FOR EACH ROW EXECUTE FUNCTION public.trg_set_updated_at();

ALTER TABLE public.seo_redirect ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seo_redirect FORCE ROW LEVEL SECURITY;


-- =====================================================================
-- TABLE: site_setting
-- Natural key (key), no surrogate id, per Data Dictionary 06 Section 2
-- rationale (a singleton config store, not an entity with a lifecycle).
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.site_setting (
  key         text        NOT NULL,
  value       jsonb       NOT NULL,
  is_public   boolean     NOT NULL DEFAULT false,
  updated_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT site_setting_pkey PRIMARY KEY (key)
);

COMMENT ON TABLE public.site_setting IS
  'Generic key/value store for platform-wide toggles not individually worth a dedicated table (e.g. maintenance_mode, default_currency). is_public governs RLS read access per key, added during the Data Dictionary self-review. Any setting that grows real structure of its own should graduate into its own proper table rather than being crammed in here.';

DROP TRIGGER IF EXISTS trg_site_setting_updated_at ON public.site_setting;
CREATE TRIGGER trg_site_setting_updated_at
  BEFORE UPDATE ON public.site_setting
  FOR EACH ROW EXECUTE FUNCTION public.trg_set_updated_at();

ALTER TABLE public.site_setting ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_setting FORCE ROW LEVEL SECURITY;


-- =====================================================================
-- Finalize deferred FKs from earlier migrations now that media_asset
-- exists.
-- =====================================================================
ALTER TABLE public.brand
  DROP CONSTRAINT IF EXISTS brand_logo_media_asset_id_fkey;
ALTER TABLE public.brand
  ADD CONSTRAINT brand_logo_media_asset_id_fkey FOREIGN KEY (logo_media_asset_id)
    REFERENCES public.media_asset (id) ON DELETE SET NULL;

ALTER TABLE public.seo_meta
  DROP CONSTRAINT IF EXISTS seo_meta_og_image_media_asset_id_fkey;
ALTER TABLE public.seo_meta
  ADD CONSTRAINT seo_meta_og_image_media_asset_id_fkey FOREIGN KEY (og_image_media_asset_id)
    REFERENCES public.media_asset (id) ON DELETE SET NULL;

ALTER TABLE public.product_image
  DROP CONSTRAINT IF EXISTS product_image_media_asset_id_fkey;
ALTER TABLE public.product_image
  ADD CONSTRAINT product_image_media_asset_id_fkey FOREIGN KEY (media_asset_id)
    REFERENCES public.media_asset (id) ON DELETE RESTRICT;

ALTER TABLE public.product_video
  DROP CONSTRAINT IF EXISTS product_video_media_asset_id_fkey;
ALTER TABLE public.product_video
  ADD CONSTRAINT product_video_media_asset_id_fkey FOREIGN KEY (media_asset_id)
    REFERENCES public.media_asset (id) ON DELETE RESTRICT;

ALTER TABLE public.product_video
  DROP CONSTRAINT IF EXISTS product_video_thumbnail_media_asset_id_fkey;
ALTER TABLE public.product_video
  ADD CONSTRAINT product_video_thumbnail_media_asset_id_fkey FOREIGN KEY (thumbnail_media_asset_id)
    REFERENCES public.media_asset (id) ON DELETE SET NULL;

ALTER TABLE public.collection
  DROP CONSTRAINT IF EXISTS collection_hero_media_asset_id_fkey;
ALTER TABLE public.collection
  ADD CONSTRAINT collection_hero_media_asset_id_fkey FOREIGN KEY (hero_media_asset_id)
    REFERENCES public.media_asset (id) ON DELETE SET NULL;

ALTER TABLE public.fabric_selection
  DROP CONSTRAINT IF EXISTS fabric_selection_swatch_media_asset_id_fkey;
ALTER TABLE public.fabric_selection
  ADD CONSTRAINT fabric_selection_swatch_media_asset_id_fkey FOREIGN KEY (swatch_media_asset_id)
    REFERENCES public.media_asset (id) ON DELETE SET NULL;

ALTER TABLE public.reference_image
  DROP CONSTRAINT IF EXISTS reference_image_media_asset_id_fkey;
ALTER TABLE public.reference_image
  ADD CONSTRAINT reference_image_media_asset_id_fkey FOREIGN KEY (media_asset_id)
    REFERENCES public.media_asset (id) ON DELETE RESTRICT;

ALTER TABLE public.invoice
  DROP CONSTRAINT IF EXISTS invoice_pdf_media_asset_id_fkey;
ALTER TABLE public.invoice
  ADD CONSTRAINT invoice_pdf_media_asset_id_fkey FOREIGN KEY (pdf_media_asset_id)
    REFERENCES public.media_asset (id) ON DELETE RESTRICT;
