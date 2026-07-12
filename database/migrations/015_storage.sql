-- =====================================================================
-- Migration: 015_storage.sql
-- Purpose:   Supabase Storage bucket provisioning and RLS policies on
--            storage.objects, per BRS v2.0 Section 11/16: a public
--            bucket for published catalog/CMS media, and a private
--            bucket for customer-supplied or financially sensitive
--            assets (tailoring reference images, invoice PDFs).
-- Target:    PostgreSQL 15+, Supabase-compatible (this migration is
--            Supabase-specific: it relies on the storage.buckets and
--            storage.objects tables Supabase provisions automatically;
--            it is not portable to a vanilla PostgreSQL target without
--            an equivalent object-storage integration).
-- Idempotent: Yes — bucket inserts use ON CONFLICT DO NOTHING, and
--            every policy is dropped and recreated by name.
-- Depends on: 001-014 (all prior migrations; policies below reference
--            public.tailoring_request, public."order", and the RBAC
--            helper functions from 003_functions.sql)
-- =====================================================================


-- =====================================================================
-- BUCKETS
-- =====================================================================

-- Public bucket: published product/collection/CMS media (product
-- images/videos, hero banners, gallery items, testimonials photos,
-- mega menu promos, brand logos). Readable by anyone; write requires
-- the relevant catalog.write/cms.write permission.
INSERT INTO storage.buckets (id, name, public)
VALUES ('catalog-public', 'catalog-public', true)
ON CONFLICT (id) DO NOTHING;

-- Private bucket: customer-supplied inspiration photos
-- (reference_image) and invoice PDFs — never public-read, access
-- scoped by folder-path convention and ownership checks below.
INSERT INTO storage.buckets (id, name, public)
VALUES ('private-media', 'private-media', false)
ON CONFLICT (id) DO NOTHING;

-- NOTE: A `COMMENT ON COLUMN storage.buckets.public` used to live here. It has
-- been removed deliberately: COMMENT ON requires OWNERSHIP of the relation, and
-- storage.buckets is owned by supabase_storage_admin, not by the `postgres` role
-- that runs migrations. It therefore fails with:
--     ERROR: 42501: must be owner of relation buckets
-- The statement was pure documentation with no functional effect, so it is
-- recorded here as an ordinary SQL comment instead. Bucket semantics:
--   catalog-public: public=true  (RLS-1 style read)
--   private-media : public=false; all access mediated by the RLS policies
--                   defined below on storage.objects.


-- =====================================================================
-- STORAGE PATH CONVENTIONS (enforced by application code at upload
-- time, and relied upon by the RLS policies below via
-- storage.foldername(name)):
--   catalog-public:
--     products/{product_id}/{filename}
--     cms/{context}/{filename}
--   private-media:
--     reference-images/{tailoring_request_id}/{filename}
--     invoices/{order_id}/{filename}
-- =====================================================================


-- =====================================================================
-- RLS POLICIES: catalog-public bucket
-- =====================================================================

DROP POLICY IF EXISTS catalog_public_read ON storage.objects;
CREATE POLICY catalog_public_read
  ON storage.objects
  FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'catalog-public');

DROP POLICY IF EXISTS catalog_public_staff_write ON storage.objects;
CREATE POLICY catalog_public_staff_write
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'catalog-public'
    AND (public.app_has_permission('catalog.write') OR public.app_has_permission('cms.write'))
  );

DROP POLICY IF EXISTS catalog_public_staff_update ON storage.objects;
CREATE POLICY catalog_public_staff_update
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'catalog-public'
    AND (public.app_has_permission('catalog.write') OR public.app_has_permission('cms.write'))
  )
  WITH CHECK (
    bucket_id = 'catalog-public'
    AND (public.app_has_permission('catalog.write') OR public.app_has_permission('cms.write'))
  );

DROP POLICY IF EXISTS catalog_public_staff_delete ON storage.objects;
CREATE POLICY catalog_public_staff_delete
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'catalog-public'
    AND (public.app_has_permission('catalog.write') OR public.app_has_permission('cms.write'))
  );


-- =====================================================================
-- RLS POLICIES: private-media bucket — reference-images/{tailoring_request_id}/...
-- =====================================================================

DROP POLICY IF EXISTS private_media_reference_images_owner_read ON storage.objects;
CREATE POLICY private_media_reference_images_owner_read
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'private-media'
    AND (storage.foldername(name))[1] = 'reference-images'
    AND (
      public.app_has_permission('tailoring.manage')
      OR EXISTS (
        SELECT 1 FROM public.tailoring_request tr
        WHERE tr.id::text = (storage.foldername(name))[2]
          AND tr.customer_id = public.app_current_customer_id()
      )
    )
  );

DROP POLICY IF EXISTS private_media_reference_images_owner_write ON storage.objects;
CREATE POLICY private_media_reference_images_owner_write
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'private-media'
    AND (storage.foldername(name))[1] = 'reference-images'
    AND (
      public.app_has_permission('tailoring.manage')
      OR EXISTS (
        SELECT 1 FROM public.tailoring_request tr
        WHERE tr.id::text = (storage.foldername(name))[2]
          AND tr.customer_id = public.app_current_customer_id()
      )
    )
  );

-- Guest-submitted tailoring requests (customer_id IS NULL) upload
-- reference images through a SECURITY DEFINER edge function using the
-- service_role key instead of this policy path, since there is no
-- auth.uid() to check ownership against for an unauthenticated guest.


-- =====================================================================
-- RLS POLICIES: private-media bucket — invoices/{order_id}/...
-- =====================================================================

DROP POLICY IF EXISTS private_media_invoices_owner_read ON storage.objects;
CREATE POLICY private_media_invoices_owner_read
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'private-media'
    AND (storage.foldername(name))[1] = 'invoices'
    AND (
      public.app_has_permission('orders.manage')
      OR EXISTS (
        SELECT 1 FROM public."order" o
        WHERE o.id::text = (storage.foldername(name))[2]
          AND o.customer_id = public.app_current_customer_id()
      )
    )
  );

-- Invoice PDFs are written exclusively by the trusted invoice-
-- generation server function (service_role), never by any client
-- role directly — no INSERT/UPDATE/DELETE policy is granted to
-- authenticated or anon for the invoices/ path.

DROP POLICY IF EXISTS private_media_staff_manage ON storage.objects;
CREATE POLICY private_media_staff_manage
  ON storage.objects
  FOR ALL
  TO authenticated
  USING (
    bucket_id = 'private-media'
    AND (public.app_has_permission('tailoring.manage') OR public.app_has_permission('orders.manage'))
  )
  WITH CHECK (
    bucket_id = 'private-media'
    AND (public.app_has_permission('tailoring.manage') OR public.app_has_permission('orders.manage'))
  );

-- NOTE: A `COMMENT ON POLICY private_media_staff_manage ON storage.objects` used
-- to live here. Removed for the same reason as the storage.buckets comment above:
-- COMMENT ON requires ownership of storage.objects (owned by
-- supabase_storage_admin), so it fails with "must be owner of relation objects".
-- Documentation-only, no functional effect. Intent of that policy:
--   Staff holding tailoring.manage or orders.manage may read/write/delete any
--   object in private-media, covering both the reference-images and invoices
--   path prefixes and any future ones added to this bucket.
