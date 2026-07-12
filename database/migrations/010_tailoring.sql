-- =====================================================================
-- Migration: 010_tailoring.sql
-- Purpose:   Tailoring domain (Data Dictionary 03): garment_type,
--            garment_measurement_template, measurement_profile,
--            tailoring_request, appointment, fabric_selection,
--            design_brief, reference_image, quotation,
--            quotation_line_item, production_stage,
--            tailoring_order_stage_history,
--            tailoring_order_status_history. (13 tables)
-- Target:    PostgreSQL 15+, Supabase-compatible.
-- Idempotent: Yes.
-- Depends on: 001-009 (extensions, types, functions, auth, catalog,
--            inventory, customers, cart, orders)
--
-- Cross-domain forward references: fabric_selection.swatch_media_asset_id
-- and reference_image.media_asset_id reference public.media_asset
-- (CMS domain, 011_cms.sql) and are declared as plain uuid with no
-- inline FK; the FK constraints are added via ALTER TABLE at the end
-- of 011_cms.sql. This file also finalizes the deferred FKs from
-- 008_cart.sql (cart_item.tailoring_request_id) and 009_orders.sql
-- (order_item.tailoring_request_id).
-- =====================================================================


-- =====================================================================
-- TABLE: garment_type
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.garment_type (
  id         uuid        NOT NULL DEFAULT gen_random_uuid(),
  name       text        NOT NULL,
  gender_id  uuid        NULL,
  is_active  boolean     NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT garment_type_pkey PRIMARY KEY (id),
  CONSTRAINT garment_type_name_key UNIQUE (name),
  CONSTRAINT garment_type_gender_id_fkey FOREIGN KEY (gender_id)
    REFERENCES public.gender_tag (id) ON DELETE SET NULL
);

COMMENT ON TABLE public.garment_type IS
  'Canonical list of garment categories relevant to bespoke work (Sherwani, Lehenga, Bandhgala), referenced by both garment_measurement_template and design_brief. Added per Architecture Review Notes Section 3, resolving an ambiguous double-duty reference in the originally approved ER Diagram — a structural clarification, not a new capability.';

CREATE INDEX IF NOT EXISTS idx_garment_type_gender_id ON public.garment_type (gender_id);

DROP TRIGGER IF EXISTS trg_garment_type_updated_at ON public.garment_type;
CREATE TRIGGER trg_garment_type_updated_at
  BEFORE UPDATE ON public.garment_type
  FOR EACH ROW EXECUTE FUNCTION public.trg_set_updated_at();

ALTER TABLE public.garment_type ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.garment_type FORCE ROW LEVEL SECURITY;


-- =====================================================================
-- TABLE: garment_measurement_template
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.garment_measurement_template (
  id               uuid                    NOT NULL DEFAULT gen_random_uuid(),
  garment_type_id  uuid                    NOT NULL,
  name             text                    NOT NULL,
  fields           public.app_jsonb_array  NOT NULL,
  is_active        boolean                 NOT NULL DEFAULT true,
  created_at       timestamptz             NOT NULL DEFAULT now(),
  updated_at       timestamptz             NOT NULL DEFAULT now(),
  deleted_at       timestamptz             NULL,
  created_by       uuid                    NULL,
  updated_by       uuid                    NULL,
  version          integer                 NOT NULL DEFAULT 1,
  CONSTRAINT garment_measurement_template_pkey PRIMARY KEY (id),
  CONSTRAINT garment_measurement_template_garment_type_id_fkey FOREIGN KEY (garment_type_id)
    REFERENCES public.garment_type (id) ON DELETE RESTRICT,
  CONSTRAINT garment_measurement_template_created_by_fkey FOREIGN KEY (created_by)
    REFERENCES public.admin_user (id) ON DELETE RESTRICT,
  CONSTRAINT garment_measurement_template_updated_by_fkey FOREIGN KEY (updated_by)
    REFERENCES public.admin_user (id) ON DELETE RESTRICT
);

COMMENT ON TABLE public.garment_measurement_template IS
  'Defines which measurement fields apply to a garment_type, so measurement_profile.measurements has a self-describing schema per garment type rather than a rigid fixed-column table. Pattern A: template changes affect how historical measurement data should be interpreted.';
COMMENT ON COLUMN public.garment_measurement_template.fields IS
  'JSON array of field definitions, e.g. [{"key":"chest","label":"Chest","unit":"in"}, ...]. Validated at the application layer for expected shape beyond the app_jsonb_array domain''s top-level-array guarantee.';

CREATE INDEX IF NOT EXISTS idx_garment_measurement_template_garment_type_id
  ON public.garment_measurement_template (garment_type_id);

DROP TRIGGER IF EXISTS trg_garment_measurement_template_updated_at ON public.garment_measurement_template;
CREATE TRIGGER trg_garment_measurement_template_updated_at
  BEFORE UPDATE ON public.garment_measurement_template
  FOR EACH ROW EXECUTE FUNCTION public.trg_set_updated_at_versioned();

DROP TRIGGER IF EXISTS trg_garment_measurement_template_soft_delete ON public.garment_measurement_template;
CREATE TRIGGER trg_garment_measurement_template_soft_delete
  BEFORE DELETE ON public.garment_measurement_template
  FOR EACH ROW EXECUTE FUNCTION public.trg_soft_delete_guard();

ALTER TABLE public.garment_measurement_template ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.garment_measurement_template FORCE ROW LEVEL SECURITY;


-- =====================================================================
-- TABLE: measurement_profile
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.measurement_profile (
  id                        uuid                    NOT NULL DEFAULT gen_random_uuid(),
  customer_id               uuid                    NOT NULL,
  label                     text                    NOT NULL,
  garment_type_id           uuid                    NOT NULL,
  measurement_template_id   uuid                    NOT NULL,
  measurements              public.app_jsonb_object NOT NULL,
  taken_by                  uuid                    NULL,
  taken_at                  timestamptz             NOT NULL DEFAULT now(),
  CONSTRAINT measurement_profile_pkey PRIMARY KEY (id),
  CONSTRAINT measurement_profile_customer_id_fkey FOREIGN KEY (customer_id)
    REFERENCES public.customer (id) ON DELETE RESTRICT,
  CONSTRAINT measurement_profile_garment_type_id_fkey FOREIGN KEY (garment_type_id)
    REFERENCES public.garment_type (id) ON DELETE RESTRICT,
  CONSTRAINT measurement_profile_measurement_template_id_fkey FOREIGN KEY (measurement_template_id)
    REFERENCES public.garment_measurement_template (id) ON DELETE RESTRICT,
  CONSTRAINT measurement_profile_taken_by_fkey FOREIGN KEY (taken_by)
    REFERENCES public.admin_user (id) ON DELETE SET NULL
);

COMMENT ON TABLE public.measurement_profile IS
  'A named, IMMUTABLE snapshot of a customer body measurements for a specific garment type. Shared between Tailoring and Customer domains. Rows are never updated — a re-measurement creates a new row; "current" measurements for a label are the most recent by taken_at (resolves Architecture Review Notes Section 2.9).';

CREATE INDEX IF NOT EXISTS idx_measurement_profile_customer_garment_taken
  ON public.measurement_profile (customer_id, garment_type_id, taken_at DESC);

-- Write-once guard: no UPDATE is ever permitted on this table, at the
-- database level, as a second layer of defense beyond RLS (which also
-- grants no UPDATE policy to any role).
CREATE OR REPLACE FUNCTION public.trg_measurement_profile_reject_update()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'measurement_profile rows are immutable; insert a new row instead of updating id=%', OLD.id;
END;
$$;

COMMENT ON FUNCTION public.trg_measurement_profile_reject_update() IS
  'Unconditionally rejects any UPDATE on measurement_profile, enforcing immutability at the database level.';

DROP TRIGGER IF EXISTS trg_measurement_profile_reject_update_trigger ON public.measurement_profile;
CREATE TRIGGER trg_measurement_profile_reject_update_trigger
  BEFORE UPDATE ON public.measurement_profile
  FOR EACH ROW EXECUTE FUNCTION public.trg_measurement_profile_reject_update();

ALTER TABLE public.measurement_profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.measurement_profile FORCE ROW LEVEL SECURITY;


-- =====================================================================
-- TABLE: tailoring_request
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.tailoring_request (
  id                        uuid             NOT NULL DEFAULT gen_random_uuid(),
  customer_id               uuid             NULL,
  reference_product_id      uuid             NULL,
  measurement_profile_id    uuid             NULL,
  assigned_to               uuid             NULL,
  status                    text             NOT NULL DEFAULT 'inquiry_received',
  source                    text             NOT NULL DEFAULT 'web',
  guest_name                text             NULL,
  guest_email               public.app_email NULL,
  guest_phone                public.app_phone NULL,
  created_at                timestamptz      NOT NULL DEFAULT now(),
  updated_at                timestamptz      NOT NULL DEFAULT now(),
  deleted_at                timestamptz      NULL,
  created_by                uuid             NULL,
  updated_by                uuid             NULL,
  version                   integer          NOT NULL DEFAULT 1,
  CONSTRAINT tailoring_request_pkey PRIMARY KEY (id),
  CONSTRAINT tailoring_request_customer_id_fkey FOREIGN KEY (customer_id)
    REFERENCES public.customer (id) ON DELETE RESTRICT,
  CONSTRAINT tailoring_request_reference_product_id_fkey FOREIGN KEY (reference_product_id)
    REFERENCES public.product (id) ON DELETE SET NULL,
  CONSTRAINT tailoring_request_measurement_profile_id_fkey FOREIGN KEY (measurement_profile_id)
    REFERENCES public.measurement_profile (id) ON DELETE SET NULL,
  CONSTRAINT tailoring_request_assigned_to_fkey FOREIGN KEY (assigned_to)
    REFERENCES public.admin_user (id) ON DELETE SET NULL,
  CONSTRAINT tailoring_request_created_by_fkey FOREIGN KEY (created_by)
    REFERENCES public.admin_user (id) ON DELETE RESTRICT,
  CONSTRAINT tailoring_request_updated_by_fkey FOREIGN KEY (updated_by)
    REFERENCES public.admin_user (id) ON DELETE RESTRICT,
  CONSTRAINT tailoring_request_source_check CHECK (source IN ('web', 'whatsapp', 'in_person', 'phone')),
  CONSTRAINT tailoring_request_status_check CHECK (status IN (
    'inquiry_received', 'consultation_scheduled', 'consultation_completed',
    'measurements_captured', 'design_finalized', 'quotation_sent',
    'quotation_accepted', 'in_production', 'fitting_scheduled',
    'fitting_completed', 'ready_for_delivery', 'delivered', 'closed', 'cancelled'
  )),
  CONSTRAINT tailoring_request_identity_check CHECK (
    customer_id IS NOT NULL
    OR (guest_name IS NOT NULL AND (guest_email IS NOT NULL OR guest_phone IS NOT NULL))
  )
);

COMMENT ON TABLE public.tailoring_request IS
  'The case file anchoring an entire bespoke engagement. Supersedes v1.0''s ConsultationRequest entirely (absorbed, not duplicated). A request reaching cancelled/closed without ever hitting quotation_accepted is a normal, expected outcome (pure consultation, no commitment), per Architecture Review Notes v2.0-A.';

CREATE INDEX IF NOT EXISTS idx_tailoring_request_customer_id ON public.tailoring_request (customer_id);
CREATE INDEX IF NOT EXISTS idx_tailoring_request_status ON public.tailoring_request (status);
CREATE INDEX IF NOT EXISTS idx_tailoring_request_assigned_to ON public.tailoring_request (assigned_to);
CREATE INDEX IF NOT EXISTS idx_tailoring_request_created_at ON public.tailoring_request (created_at DESC);

DROP TRIGGER IF EXISTS trg_tailoring_request_updated_at ON public.tailoring_request;
CREATE TRIGGER trg_tailoring_request_updated_at
  BEFORE UPDATE ON public.tailoring_request
  FOR EACH ROW EXECUTE FUNCTION public.trg_set_updated_at_versioned();

DROP TRIGGER IF EXISTS trg_tailoring_request_audit ON public.tailoring_request;
CREATE TRIGGER trg_tailoring_request_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.tailoring_request
  FOR EACH ROW EXECUTE FUNCTION public.trg_audit_log();

DROP TRIGGER IF EXISTS trg_tailoring_request_soft_delete ON public.tailoring_request;
CREATE TRIGGER trg_tailoring_request_soft_delete
  BEFORE DELETE ON public.tailoring_request
  FOR EACH ROW EXECUTE FUNCTION public.trg_soft_delete_guard();

-- Status-change trigger: logs to tailoring_order_status_history
-- (created later in this file — safe forward reference) and enqueues
-- a notification.
CREATE OR REPLACE FUNCTION public.trg_tailoring_request_status_change()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.tailoring_order_status_history (tailoring_request_id, status, changed_by)
    VALUES (NEW.id, NEW.status, public.app_current_admin_user_id());

    PERFORM public.app_enqueue_notification(
      p_template_key => 'tailoring_' || NEW.status,
      p_related_entity_type => 'tailoring_request',
      p_related_entity_id => NEW.id
    );
  END IF;
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.trg_tailoring_request_status_change() IS
  'On tailoring_request.status change, logs to tailoring_order_status_history and enqueues a status-appropriate notification.';

DROP TRIGGER IF EXISTS trg_tailoring_request_status_change_trigger ON public.tailoring_request;
CREATE TRIGGER trg_tailoring_request_status_change_trigger
  AFTER UPDATE OF status ON public.tailoring_request
  FOR EACH ROW EXECUTE FUNCTION public.trg_tailoring_request_status_change();

ALTER TABLE public.tailoring_request ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tailoring_request FORCE ROW LEVEL SECURITY;


-- =====================================================================
-- TABLE: appointment
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.appointment (
  id                     uuid        NOT NULL DEFAULT gen_random_uuid(),
  tailoring_request_id   uuid        NOT NULL,
  type                   text        NOT NULL,
  mode                   text        NOT NULL DEFAULT 'in_person',
  scheduled_at           timestamptz NOT NULL,
  duration_minutes       integer     NOT NULL DEFAULT 60,
  status                 text        NOT NULL DEFAULT 'requested',
  location               text        NULL,
  notes                  text        NULL,
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now(),
  deleted_at             timestamptz NULL,
  created_by             uuid        NULL,
  updated_by             uuid        NULL,
  version                integer     NOT NULL DEFAULT 1,
  CONSTRAINT appointment_pkey PRIMARY KEY (id),
  CONSTRAINT appointment_tailoring_request_id_fkey FOREIGN KEY (tailoring_request_id)
    REFERENCES public.tailoring_request (id) ON DELETE CASCADE,
  CONSTRAINT appointment_created_by_fkey FOREIGN KEY (created_by)
    REFERENCES public.admin_user (id) ON DELETE RESTRICT,
  CONSTRAINT appointment_updated_by_fkey FOREIGN KEY (updated_by)
    REFERENCES public.admin_user (id) ON DELETE RESTRICT,
  CONSTRAINT appointment_type_check CHECK (type IN ('consultation', 'measurement', 'fitting', 'final_fitting', 'delivery')),
  CONSTRAINT appointment_mode_check CHECK (mode IN ('in_person', 'virtual')),
  CONSTRAINT appointment_status_check CHECK (status IN ('requested', 'confirmed', 'completed', 'no_show', 'cancelled')),
  CONSTRAINT appointment_duration_positive_check CHECK (duration_minutes > 0)
);

COMMENT ON TABLE public.appointment IS
  'A scheduled time slot against a tailoring_request — consultation, measurement, fitting(s), delivery — sharing identical scheduling mechanics under one type discriminator. Multiple appointments per request are expected and normal.';
COMMENT ON COLUMN public.appointment.location IS
  'Physical address or virtual meeting link — application layer should only populate/display once status=confirmed.';

CREATE INDEX IF NOT EXISTS idx_appointment_tailoring_request_id ON public.appointment (tailoring_request_id);
CREATE INDEX IF NOT EXISTS idx_appointment_scheduled_at ON public.appointment (scheduled_at);

DROP TRIGGER IF EXISTS trg_appointment_updated_at ON public.appointment;
CREATE TRIGGER trg_appointment_updated_at
  BEFORE UPDATE ON public.appointment
  FOR EACH ROW EXECUTE FUNCTION public.trg_set_updated_at_versioned();

DROP TRIGGER IF EXISTS trg_appointment_soft_delete ON public.appointment;
CREATE TRIGGER trg_appointment_soft_delete
  BEFORE DELETE ON public.appointment
  FOR EACH ROW EXECUTE FUNCTION public.trg_soft_delete_guard();

-- Note: a 24-hours-before-scheduled_at reminder cannot be expressed as
-- a row-event trigger; it must be a scheduled job (e.g. pg_cron
-- querying upcoming appointments) implemented outside this migration.
ALTER TABLE public.appointment ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointment FORCE ROW LEVEL SECURITY;


-- =====================================================================
-- TABLE: fabric_selection
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.fabric_selection (
  id                          uuid        NOT NULL DEFAULT gen_random_uuid(),
  tailoring_request_id        uuid        NOT NULL,
  fabric_type_id              uuid        NULL,
  material_id                 uuid        NULL,
  custom_fabric_description   text        NULL,
  swatch_media_asset_id        uuid        NULL, -- FK deferred to 011_cms.sql
  created_at                  timestamptz NOT NULL DEFAULT now(),
  updated_at                  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fabric_selection_pkey PRIMARY KEY (id),
  CONSTRAINT fabric_selection_tailoring_request_id_fkey FOREIGN KEY (tailoring_request_id)
    REFERENCES public.tailoring_request (id) ON DELETE CASCADE,
  CONSTRAINT fabric_selection_fabric_type_id_fkey FOREIGN KEY (fabric_type_id)
    REFERENCES public.fabric_type (id) ON DELETE SET NULL,
  CONSTRAINT fabric_selection_material_id_fkey FOREIGN KEY (material_id)
    REFERENCES public.material (id) ON DELETE SET NULL,
  CONSTRAINT fabric_selection_description_present_check CHECK (
    fabric_type_id IS NOT NULL OR material_id IS NOT NULL OR custom_fabric_description IS NOT NULL
  )
);

COMMENT ON TABLE public.fabric_selection IS
  'Records the fabric(s) chosen for a bespoke request. A tailoring_request may have more than one row (e.g. main garment plus lining) — one-to-many by design.';

CREATE INDEX IF NOT EXISTS idx_fabric_selection_tailoring_request_id ON public.fabric_selection (tailoring_request_id);

DROP TRIGGER IF EXISTS trg_fabric_selection_updated_at ON public.fabric_selection;
CREATE TRIGGER trg_fabric_selection_updated_at
  BEFORE UPDATE ON public.fabric_selection
  FOR EACH ROW EXECUTE FUNCTION public.trg_set_updated_at();

ALTER TABLE public.fabric_selection ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fabric_selection FORCE ROW LEVEL SECURITY;


-- =====================================================================
-- TABLE: design_brief
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.design_brief (
  id                     uuid        NOT NULL DEFAULT gen_random_uuid(),
  tailoring_request_id   uuid        NOT NULL,
  garment_type_id        uuid        NOT NULL,
  embroidery_type_id     uuid        NULL,
  style_notes            text        NULL,
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT design_brief_pkey PRIMARY KEY (id),
  CONSTRAINT design_brief_tailoring_request_id_key UNIQUE (tailoring_request_id),
  CONSTRAINT design_brief_tailoring_request_id_fkey FOREIGN KEY (tailoring_request_id)
    REFERENCES public.tailoring_request (id) ON DELETE CASCADE,
  CONSTRAINT design_brief_garment_type_id_fkey FOREIGN KEY (garment_type_id)
    REFERENCES public.garment_type (id) ON DELETE RESTRICT,
  CONSTRAINT design_brief_embroidery_type_id_fkey FOREIGN KEY (embroidery_type_id)
    REFERENCES public.embroidery_type (id) ON DELETE SET NULL
);

COMMENT ON TABLE public.design_brief IS
  'The design/style discussion outcome for a bespoke request. UNIQUE(tailoring_request_id): exactly one design brief per request — if the design changes, this row is updated, not duplicated.';

DROP TRIGGER IF EXISTS trg_design_brief_updated_at ON public.design_brief;
CREATE TRIGGER trg_design_brief_updated_at
  BEFORE UPDATE ON public.design_brief
  FOR EACH ROW EXECUTE FUNCTION public.trg_set_updated_at();

ALTER TABLE public.design_brief ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.design_brief FORCE ROW LEVEL SECURITY;


-- =====================================================================
-- TABLE: reference_image
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.reference_image (
  id                     uuid        NOT NULL DEFAULT gen_random_uuid(),
  tailoring_request_id   uuid        NOT NULL,
  media_asset_id         uuid        NOT NULL, -- FK deferred to 011_cms.sql
  caption                text        NULL,
  uploaded_by            text        NOT NULL,
  uploaded_at            timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT reference_image_pkey PRIMARY KEY (id),
  CONSTRAINT reference_image_tailoring_request_id_fkey FOREIGN KEY (tailoring_request_id)
    REFERENCES public.tailoring_request (id) ON DELETE CASCADE,
  CONSTRAINT reference_image_uploaded_by_check CHECK (uploaded_by IN ('customer', 'staff'))
);

COMMENT ON TABLE public.reference_image IS
  'Customer-uploaded inspiration photos against a bespoke request — the real, working implementation of the "Send Inspiration Photos" step. Stored in the private media bucket, not the public catalog bucket.';

CREATE INDEX IF NOT EXISTS idx_reference_image_tailoring_request_id ON public.reference_image (tailoring_request_id);

ALTER TABLE public.reference_image ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reference_image FORCE ROW LEVEL SECURITY;


-- =====================================================================
-- TABLE: quotation
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.quotation (
  id                     uuid          NOT NULL DEFAULT gen_random_uuid(),
  tailoring_request_id   uuid          NOT NULL,
  version_number         integer       NOT NULL,
  status                 text          NOT NULL DEFAULT 'draft',
  valid_until            timestamptz   NULL,
  subtotal               numeric(12,2) NOT NULL DEFAULT 0,
  tax_total              numeric(12,2) NOT NULL DEFAULT 0,
  total                  numeric(12,2) NOT NULL DEFAULT 0,
  created_at             timestamptz   NOT NULL DEFAULT now(),
  updated_at             timestamptz   NOT NULL DEFAULT now(),
  deleted_at             timestamptz   NULL,
  created_by             uuid          NULL,
  updated_by             uuid          NULL,
  version                integer       NOT NULL DEFAULT 1,
  CONSTRAINT quotation_pkey PRIMARY KEY (id),
  CONSTRAINT quotation_tailoring_request_version_key UNIQUE (tailoring_request_id, version_number),
  CONSTRAINT quotation_tailoring_request_id_fkey FOREIGN KEY (tailoring_request_id)
    REFERENCES public.tailoring_request (id) ON DELETE CASCADE,
  CONSTRAINT quotation_created_by_fkey FOREIGN KEY (created_by)
    REFERENCES public.admin_user (id) ON DELETE RESTRICT,
  CONSTRAINT quotation_updated_by_fkey FOREIGN KEY (updated_by)
    REFERENCES public.admin_user (id) ON DELETE RESTRICT,
  CONSTRAINT quotation_status_check CHECK (status IN ('draft', 'sent', 'accepted', 'rejected', 'expired')),
  CONSTRAINT quotation_subtotal_nonneg_check CHECK (subtotal >= 0),
  CONSTRAINT quotation_tax_total_nonneg_check CHECK (tax_total >= 0)
);

COMMENT ON TABLE public.quotation IS
  'A priced, versioned proposal for a tailoring_request. Versioned because bespoke quotes are commonly revised — each revision is a new row, preserving negotiation history. Only one accepted quotation should exist per request, enforced by trg_quotation_status_change below.';

CREATE INDEX IF NOT EXISTS idx_quotation_tailoring_request_version
  ON public.quotation (tailoring_request_id, version_number DESC);

-- Version-assignment: auto-computes version_number for a given
-- tailoring_request_id.
CREATE OR REPLACE FUNCTION public.trg_quotation_assign_version()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.version_number IS NULL THEN
    SELECT COALESCE(MAX(version_number), 0) + 1
    INTO NEW.version_number
    FROM public.quotation
    WHERE tailoring_request_id = NEW.tailoring_request_id;
  END IF;
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.trg_quotation_assign_version() IS
  'Auto-computes quotation.version_number as the next sequential value for the given tailoring_request_id when not explicitly supplied.';

DROP TRIGGER IF EXISTS trg_quotation_assign_version_trigger ON public.quotation;
CREATE TRIGGER trg_quotation_assign_version_trigger
  BEFORE INSERT ON public.quotation
  FOR EACH ROW EXECUTE FUNCTION public.trg_quotation_assign_version();

-- Total computation: authoritative total = subtotal + tax_total.
CREATE OR REPLACE FUNCTION public.trg_quotation_compute_total()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.total := NEW.subtotal + NEW.tax_total;
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.trg_quotation_compute_total() IS
  'Authoritatively computes quotation.total = subtotal + tax_total.';

DROP TRIGGER IF EXISTS trg_quotation_compute_total_trigger ON public.quotation;
CREATE TRIGGER trg_quotation_compute_total_trigger
  BEFORE INSERT OR UPDATE OF subtotal, tax_total ON public.quotation
  FOR EACH ROW EXECUTE FUNCTION public.trg_quotation_compute_total();

DROP TRIGGER IF EXISTS trg_quotation_updated_at ON public.quotation;
CREATE TRIGGER trg_quotation_updated_at
  BEFORE UPDATE ON public.quotation
  FOR EACH ROW EXECUTE FUNCTION public.trg_set_updated_at_versioned();

DROP TRIGGER IF EXISTS trg_quotation_audit ON public.quotation;
CREATE TRIGGER trg_quotation_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.quotation
  FOR EACH ROW EXECUTE FUNCTION public.trg_audit_log();

DROP TRIGGER IF EXISTS trg_quotation_soft_delete ON public.quotation;
CREATE TRIGGER trg_quotation_soft_delete
  BEFORE DELETE ON public.quotation
  FOR EACH ROW EXECUTE FUNCTION public.trg_soft_delete_guard();

-- Converts an accepted quotation into a real order + order_item
-- (Data Dictionary 03, quotation Section 10: "implemented as a
-- function called from this trigger, not inline, for testability").
CREATE OR REPLACE FUNCTION public.app_convert_quotation_to_order(p_quotation_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_quotation public.quotation%ROWTYPE;
  v_request public.tailoring_request%ROWTYPE;
  v_order_id uuid;
BEGIN
  SELECT * INTO v_quotation FROM public.quotation WHERE id = p_quotation_id;
  SELECT * INTO v_request FROM public.tailoring_request WHERE id = v_quotation.tailoring_request_id;

  INSERT INTO public."order" (customer_id, subtotal, tax_total, discount_total, shipping_total, status)
  VALUES (v_request.customer_id, v_quotation.subtotal, v_quotation.tax_total, 0, 0, 'pending_payment')
  RETURNING id INTO v_order_id;

  INSERT INTO public.order_item (
    order_id, product_id, variant_id, tailoring_request_id,
    description_snapshot, qty, unit_price
  )
  VALUES (
    v_order_id, NULL, NULL, v_request.id,
    'Bespoke tailoring commission (request ' || v_request.id::text || ')',
    1, v_quotation.total
  );

  RETURN v_order_id;
END;
$$;

COMMENT ON FUNCTION public.app_convert_quotation_to_order(uuid) IS
  'Creates exactly one order and one order_item from an accepted quotation, linking the order_item back to the originating tailoring_request. Called by trg_quotation_status_change below.';

-- Single-accepted-quotation trigger: expires siblings and converts to
-- an order when a quotation is accepted.
CREATE OR REPLACE FUNCTION public.trg_quotation_status_change()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.status = 'accepted' AND OLD.status IS DISTINCT FROM 'accepted' THEN
    UPDATE public.quotation
    SET status = 'expired'
    WHERE tailoring_request_id = NEW.tailoring_request_id
      AND id <> NEW.id
      AND status IN ('draft', 'sent');

    PERFORM public.app_convert_quotation_to_order(NEW.id);

    UPDATE public.tailoring_request
    SET status = 'quotation_accepted'
    WHERE id = NEW.tailoring_request_id;
  END IF;
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.trg_quotation_status_change() IS
  'When a quotation is accepted: expires sibling draft/sent quotations for the same request, converts it into an order via app_convert_quotation_to_order, and advances tailoring_request.status to quotation_accepted.';

DROP TRIGGER IF EXISTS trg_quotation_status_change_trigger ON public.quotation;
CREATE TRIGGER trg_quotation_status_change_trigger
  AFTER UPDATE OF status ON public.quotation
  FOR EACH ROW EXECUTE FUNCTION public.trg_quotation_status_change();

ALTER TABLE public.quotation ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotation FORCE ROW LEVEL SECURITY;


-- =====================================================================
-- TABLE: quotation_line_item
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.quotation_line_item (
  id              uuid          NOT NULL DEFAULT gen_random_uuid(),
  quotation_id    uuid          NOT NULL,
  description     text          NOT NULL,
  amount          numeric(12,2) NOT NULL,
  sort_order      integer       NOT NULL DEFAULT 0,
  created_at      timestamptz   NOT NULL DEFAULT now(),
  updated_at      timestamptz   NOT NULL DEFAULT now(),
  CONSTRAINT quotation_line_item_pkey PRIMARY KEY (id),
  CONSTRAINT quotation_line_item_quotation_id_fkey FOREIGN KEY (quotation_id)
    REFERENCES public.quotation (id) ON DELETE CASCADE
);

COMMENT ON TABLE public.quotation_line_item IS
  'Itemized breakdown of a quotation. amount may be negative to express a discount line without needing a separate mechanism.';

CREATE INDEX IF NOT EXISTS idx_quotation_line_item_quotation_sort
  ON public.quotation_line_item (quotation_id, sort_order);

DROP TRIGGER IF EXISTS trg_quotation_line_item_updated_at ON public.quotation_line_item;
CREATE TRIGGER trg_quotation_line_item_updated_at
  BEFORE UPDATE ON public.quotation_line_item
  FOR EACH ROW EXECUTE FUNCTION public.trg_set_updated_at();

-- Recomputes the parent quotation.subtotal from the sum of its line
-- items whenever a line item changes (which in turn fires that
-- quotation's own total-computation trigger).
CREATE OR REPLACE FUNCTION public.trg_quotation_line_item_recompute_subtotal()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_quotation_id uuid := COALESCE(NEW.quotation_id, OLD.quotation_id);
BEGIN
  UPDATE public.quotation
  SET subtotal = (
    SELECT COALESCE(sum(amount), 0) FROM public.quotation_line_item WHERE quotation_id = v_quotation_id
  )
  WHERE id = v_quotation_id;

  RETURN COALESCE(NEW, OLD);
END;
$$;

COMMENT ON FUNCTION public.trg_quotation_line_item_recompute_subtotal() IS
  'Recomputes the parent quotation.subtotal as the sum of quotation_line_item.amount whenever a line item is inserted, updated, or deleted.';

DROP TRIGGER IF EXISTS trg_quotation_line_item_recompute_subtotal_trigger ON public.quotation_line_item;
CREATE TRIGGER trg_quotation_line_item_recompute_subtotal_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.quotation_line_item
  FOR EACH ROW EXECUTE FUNCTION public.trg_quotation_line_item_recompute_subtotal();

ALTER TABLE public.quotation_line_item ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotation_line_item FORCE ROW LEVEL SECURITY;


-- =====================================================================
-- TABLE: production_stage
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.production_stage (
  id          uuid        NOT NULL DEFAULT gen_random_uuid(),
  name        text        NOT NULL,
  sort_order  integer     NOT NULL DEFAULT 0,
  is_active   boolean     NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT production_stage_pkey PRIMARY KEY (id),
  CONSTRAINT production_stage_name_key UNIQUE (name)
);

COMMENT ON TABLE public.production_stage IS
  'Admin-configurable lookup of the atelier''s internal production workflow steps (Pattern Making, Cutting, Stitching, Embroidery, Fitting Adjustment, Finishing, QC, Ready for Delivery). Deliberately separate from tailoring_request.status (the coarser, customer-facing state machine).';

CREATE INDEX IF NOT EXISTS idx_production_stage_sort_order ON public.production_stage (sort_order);

DROP TRIGGER IF EXISTS trg_production_stage_updated_at ON public.production_stage;
CREATE TRIGGER trg_production_stage_updated_at
  BEFORE UPDATE ON public.production_stage
  FOR EACH ROW EXECUTE FUNCTION public.trg_set_updated_at();

ALTER TABLE public.production_stage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.production_stage FORCE ROW LEVEL SECURITY;


-- =====================================================================
-- TABLE: tailoring_order_stage_history
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.tailoring_order_stage_history (
  id                     uuid        NOT NULL DEFAULT gen_random_uuid(),
  tailoring_request_id   uuid        NOT NULL,
  production_stage_id    uuid        NOT NULL,
  entered_at             timestamptz NOT NULL DEFAULT now(),
  exited_at              timestamptz NULL,
  notes                  text        NULL,
  updated_by             uuid        NULL,
  CONSTRAINT tailoring_order_stage_history_pkey PRIMARY KEY (id),
  CONSTRAINT tailoring_order_stage_history_tailoring_request_id_fkey FOREIGN KEY (tailoring_request_id)
    REFERENCES public.tailoring_request (id) ON DELETE CASCADE,
  CONSTRAINT tailoring_order_stage_history_production_stage_id_fkey FOREIGN KEY (production_stage_id)
    REFERENCES public.production_stage (id) ON DELETE RESTRICT,
  CONSTRAINT tailoring_order_stage_history_updated_by_fkey FOREIGN KEY (updated_by)
    REFERENCES public.admin_user (id) ON DELETE SET NULL,
  CONSTRAINT tailoring_order_stage_history_exited_after_entered_check CHECK (
    exited_at IS NULL OR exited_at >= entered_at
  )
);

COMMENT ON TABLE public.tailoring_order_stage_history IS
  'Immutable audit trail of which production_stage a tailoring_request has moved through and when — granular internal-operations history, distinct from the coarser tailoring_order_status_history below.';

CREATE INDEX IF NOT EXISTS idx_tailoring_order_stage_history_request_entered
  ON public.tailoring_order_stage_history (tailoring_request_id, entered_at DESC);
CREATE INDEX IF NOT EXISTS idx_tailoring_order_stage_history_open
  ON public.tailoring_order_stage_history (production_stage_id) WHERE exited_at IS NULL;

-- Auto-close-previous-stage: ensures only one stage is ever "open" per
-- request at a time, via the generic trg_close_previous_open_period
-- helper from 003_functions.sql.
DROP TRIGGER IF EXISTS trg_tailoring_order_stage_history_close_previous ON public.tailoring_order_stage_history;
CREATE TRIGGER trg_tailoring_order_stage_history_close_previous
  BEFORE INSERT ON public.tailoring_order_stage_history
  FOR EACH ROW EXECUTE FUNCTION public.trg_close_previous_open_period('tailoring_request_id', 'exited_at');

ALTER TABLE public.tailoring_order_stage_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tailoring_order_stage_history FORCE ROW LEVEL SECURITY;


-- =====================================================================
-- TABLE: tailoring_order_status_history
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.tailoring_order_status_history (
  id                     uuid        NOT NULL DEFAULT gen_random_uuid(),
  tailoring_request_id   uuid        NOT NULL,
  status                 text        NOT NULL,
  changed_at             timestamptz NOT NULL DEFAULT now(),
  changed_by             uuid        NULL,
  note                   text        NULL,
  CONSTRAINT tailoring_order_status_history_pkey PRIMARY KEY (id),
  CONSTRAINT tailoring_order_status_history_tailoring_request_id_fkey FOREIGN KEY (tailoring_request_id)
    REFERENCES public.tailoring_request (id) ON DELETE CASCADE,
  CONSTRAINT tailoring_order_status_history_changed_by_fkey FOREIGN KEY (changed_by)
    REFERENCES public.admin_user (id) ON DELETE SET NULL
);

COMMENT ON TABLE public.tailoring_order_status_history IS
  'Immutable audit trail of the customer-facing tailoring_request.status transitions. Populated exclusively by trg_tailoring_request_status_change (defined on tailoring_request above), never written to directly.';

CREATE INDEX IF NOT EXISTS idx_tailoring_order_status_history_request_changed
  ON public.tailoring_order_status_history (tailoring_request_id, changed_at DESC);

ALTER TABLE public.tailoring_order_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tailoring_order_status_history FORCE ROW LEVEL SECURITY;


-- =====================================================================
-- Finalize deferred FKs from earlier migrations now that
-- tailoring_request exists.
-- =====================================================================
ALTER TABLE public.cart_item
  DROP CONSTRAINT IF EXISTS cart_item_tailoring_request_id_fkey;
ALTER TABLE public.cart_item
  ADD CONSTRAINT cart_item_tailoring_request_id_fkey FOREIGN KEY (tailoring_request_id)
    REFERENCES public.tailoring_request (id) ON DELETE CASCADE;

ALTER TABLE public.order_item
  DROP CONSTRAINT IF EXISTS order_item_tailoring_request_id_fkey;
ALTER TABLE public.order_item
  ADD CONSTRAINT order_item_tailoring_request_id_fkey FOREIGN KEY (tailoring_request_id)
    REFERENCES public.tailoring_request (id) ON DELETE RESTRICT;

-- The approved fix from Architecture Review Notes Section 3: prevents
-- a single tailoring_request from ever being attached to more than
-- one order_item.
CREATE UNIQUE INDEX IF NOT EXISTS uq_order_item_tailoring_request_id
  ON public.order_item (tailoring_request_id) WHERE tailoring_request_id IS NOT NULL;
