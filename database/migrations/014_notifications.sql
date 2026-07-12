-- =====================================================================
-- Migration: 014_notifications.sql
-- Purpose:   Notifications domain (Data Dictionary 08):
--            notification_template, notification_log. Also defines
--            app_enqueue_notification(), the function referenced
--            (forward-called) by trigger functions defined in
--            009_orders.sql, 010_tailoring.sql, and 012_contact.sql.
--            This is the migration that makes all of those earlier
--            PERFORM calls resolve to real behavior.
-- Target:    PostgreSQL 15+, Supabase-compatible.
-- Idempotent: Yes.
-- Depends on: 001-013 (extensions, types, functions, auth, catalog,
--            inventory, customers, cart, orders, tailoring, cms,
--            contact, newsletter)
--
-- Design note: actual delivery (calling SendGrid/Twilio/WhatsApp
-- Cloud API/FCM) cannot happen from plain SQL — this domain only
-- enqueues intent (one notification_log row per active template
-- matching a key, for whichever channels have templates), and marks
-- status='queued'. A separate, application-layer worker (or a
-- Supabase Edge Function on a schedule/webhook) is responsible for
-- picking up 'queued' rows, resolving final delivery details, calling
-- the provider, and updating status/provider_response/sent_at. This
-- boundary is deliberate and matches BRS v2.0 Section 8's framing of
-- this domain ("not built from scratch" for the actual channel
-- integration).
-- =====================================================================


-- =====================================================================
-- TABLE: notification_template
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.notification_template (
  id                      uuid              NOT NULL DEFAULT gen_random_uuid(),
  key                     text              NOT NULL,
  channel                 public.app_channel NOT NULL,
  subject                 text              NULL,
  body_template           text              NOT NULL,
  variables               jsonb             NULL,
  provider_template_id    text              NULL,
  status                  text              NOT NULL DEFAULT 'active',
  created_at              timestamptz       NOT NULL DEFAULT now(),
  updated_at              timestamptz       NOT NULL DEFAULT now(),
  deleted_at              timestamptz       NULL,
  created_by              uuid              NULL,
  updated_by              uuid              NULL,
  version                 integer           NOT NULL DEFAULT 1,
  CONSTRAINT notification_template_pkey PRIMARY KEY (id),
  CONSTRAINT notification_template_key_channel_key UNIQUE (key, channel),
  CONSTRAINT notification_template_created_by_fkey FOREIGN KEY (created_by)
    REFERENCES public.admin_user (id) ON DELETE RESTRICT,
  CONSTRAINT notification_template_updated_by_fkey FOREIGN KEY (updated_by)
    REFERENCES public.admin_user (id) ON DELETE RESTRICT,
  CONSTRAINT notification_template_status_check CHECK (status IN ('active', 'disabled'))
);

COMMENT ON TABLE public.notification_template IS
  'Admin-editable templates for every outbound message the platform sends, keyed and versioned rather than hardcoded as strings in application code. The same logical event typically needs one row per channel.';
COMMENT ON COLUMN public.notification_template.provider_template_id IS
  'Meta-approved WhatsApp Business Platform template name/ID, required (application-enforced) when channel=whatsapp — WhatsApp Cloud API requires pre-approved templates for business-initiated messages.';

CREATE UNIQUE INDEX IF NOT EXISTS uq_notification_template_key_channel
  ON public.notification_template (key, channel);
CREATE INDEX IF NOT EXISTS idx_notification_template_active
  ON public.notification_template (key) WHERE status = 'active' AND deleted_at IS NULL;

DROP TRIGGER IF EXISTS trg_notification_template_updated_at ON public.notification_template;
CREATE TRIGGER trg_notification_template_updated_at
  BEFORE UPDATE ON public.notification_template
  FOR EACH ROW EXECUTE FUNCTION public.trg_set_updated_at_versioned();

DROP TRIGGER IF EXISTS trg_notification_template_audit ON public.notification_template;
CREATE TRIGGER trg_notification_template_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.notification_template
  FOR EACH ROW EXECUTE FUNCTION public.trg_audit_log();

DROP TRIGGER IF EXISTS trg_notification_template_soft_delete ON public.notification_template;
CREATE TRIGGER trg_notification_template_soft_delete
  BEFORE DELETE ON public.notification_template
  FOR EACH ROW EXECUTE FUNCTION public.trg_soft_delete_guard();

ALTER TABLE public.notification_template ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_template FORCE ROW LEVEL SECURITY;


-- =====================================================================
-- TABLE: notification_log
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.notification_log (
  id                     uuid        NOT NULL DEFAULT gen_random_uuid(),
  template_id            uuid        NOT NULL,
  channel                public.app_channel NOT NULL,
  recipient              text        NULL,
  related_entity_type    text        NULL,
  related_entity_id      uuid        NULL,
  status                 text        NOT NULL DEFAULT 'queued',
  provider_response      jsonb       NULL,
  sent_at                timestamptz NULL,
  created_at             timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT notification_log_pkey PRIMARY KEY (id),
  CONSTRAINT notification_log_template_id_fkey FOREIGN KEY (template_id)
    REFERENCES public.notification_template (id) ON DELETE RESTRICT,
  CONSTRAINT notification_log_status_check CHECK (status IN ('queued', 'sent', 'delivered', 'failed'))
);

COMMENT ON TABLE public.notification_log IS
  'Immutable-in-practice record of every notification enqueued/sent. recipient may be NULL immediately after enqueue when it could not be resolved synchronously (e.g. a guest order with no stored contact); the delivery worker is responsible for resolving it before send, or flagging for manual follow-up.';

CREATE INDEX IF NOT EXISTS idx_notification_log_related
  ON public.notification_log (related_entity_type, related_entity_id);
CREATE INDEX IF NOT EXISTS idx_notification_log_status
  ON public.notification_log (status);
CREATE INDEX IF NOT EXISTS idx_notification_log_queued
  ON public.notification_log (created_at) WHERE status = 'queued';
-- Added during internal follow-up audit: template_id had no index
-- despite this being an append-only, growing-over-time log table
-- where "how many times has template X been sent" is a realistic
-- reporting query.
CREATE INDEX IF NOT EXISTS idx_notification_log_template_id ON public.notification_log (template_id);

-- RLS: enabled here, policies in 016_rls.sql (RLS-4: admin/support
-- read only; write happens via app_enqueue_notification below and via
-- the delivery worker using service_role, never a direct client write).
ALTER TABLE public.notification_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_log FORCE ROW LEVEL SECURITY;


-- ---------------------------------------------------------------------
-- app_resolve_notification_recipient(entity_type, entity_id, channel)
-- Best-effort resolution of a recipient address/number for a given
-- related entity and channel. Returns NULL when it cannot be resolved
-- synchronously (e.g. a guest order with no stored contact) — the
-- delivery worker is expected to handle NULL recipients by either
-- resolving them through another path or flagging for manual staff
-- follow-up, rather than this function raising an error and blocking
-- the caller's transaction.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.app_resolve_notification_recipient(
  p_entity_type text,
  p_entity_id uuid,
  p_channel text
)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_recipient text;
BEGIN
  IF p_entity_type = 'order' THEN
    SELECT CASE p_channel
             WHEN 'email' THEN c.email::text
             WHEN 'sms' THEN c.phone::text
             WHEN 'whatsapp' THEN c.phone::text
             ELSE NULL
           END
    INTO v_recipient
    FROM public."order" o
    LEFT JOIN public.customer c ON c.id = o.customer_id
    WHERE o.id = p_entity_id;

  ELSIF p_entity_type = 'refund' THEN
    SELECT CASE p_channel
             WHEN 'email' THEN c.email::text
             WHEN 'sms' THEN c.phone::text
             WHEN 'whatsapp' THEN c.phone::text
             ELSE NULL
           END
    INTO v_recipient
    FROM public.refund r
    JOIN public."order" o ON o.id = r.order_id
    LEFT JOIN public.customer c ON c.id = o.customer_id
    WHERE r.id = p_entity_id;

  ELSIF p_entity_type = 'return_request' THEN
    SELECT CASE p_channel
             WHEN 'email' THEN c.email::text
             WHEN 'sms' THEN c.phone::text
             WHEN 'whatsapp' THEN c.phone::text
             ELSE NULL
           END
    INTO v_recipient
    FROM public.return_request rr
    JOIN public.customer c ON c.id = rr.customer_id
    WHERE rr.id = p_entity_id;

  ELSIF p_entity_type = 'tailoring_request' THEN
    SELECT CASE p_channel
             WHEN 'email' THEN COALESCE(c.email::text, tr.guest_email::text)
             WHEN 'sms' THEN COALESCE(c.phone::text, tr.guest_phone::text)
             WHEN 'whatsapp' THEN COALESCE(c.phone::text, tr.guest_phone::text)
             ELSE NULL
           END
    INTO v_recipient
    FROM public.tailoring_request tr
    LEFT JOIN public.customer c ON c.id = tr.customer_id
    WHERE tr.id = p_entity_id;

  ELSIF p_entity_type = 'inquiry' THEN
    SELECT CASE p_channel
             WHEN 'email' THEN i.email::text
             WHEN 'sms' THEN i.phone::text
             WHEN 'whatsapp' THEN i.phone::text
             ELSE NULL
           END
    INTO v_recipient
    FROM public.inquiry i
    WHERE i.id = p_entity_id;
  END IF;

  RETURN v_recipient;
END;
$$;

COMMENT ON FUNCTION public.app_resolve_notification_recipient(text, uuid, text) IS
  'Best-effort recipient resolution per related_entity_type/channel. Returns NULL when unresolvable (e.g. guest order with no customer record); the delivery worker must handle that case rather than assuming a recipient is always present.';


-- ---------------------------------------------------------------------
-- app_enqueue_notification(template_key, related_entity_type, related_entity_id)
-- Enqueues one notification_log row per active notification_template
-- matching the given key (across whichever channels have templates
-- defined), resolving a recipient per channel where possible, and
-- respecting communication_preference opt-outs for non-transactional
-- channels. Called from trigger functions defined in 009_orders.sql,
-- 010_tailoring.sql, and 012_contact.sql.
--
-- If no active template exists for the given key (e.g. the business
-- has not yet configured that particular notification), this function
-- silently does nothing rather than raising an exception — a missing
-- template must never fail the calling business transaction (e.g. an
-- order status update should never roll back because a notification
-- template hasn't been authored yet).
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.app_enqueue_notification(
  p_template_key text,
  p_related_entity_type text,
  p_related_entity_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_template record;
  v_recipient text;
  v_customer_id uuid;
  v_opt_in boolean;
BEGIN
  FOR v_template IN
    SELECT * FROM public.notification_template
    WHERE key = p_template_key AND status = 'active' AND deleted_at IS NULL
  LOOP
    v_recipient := public.app_resolve_notification_recipient(
      p_related_entity_type, p_related_entity_id, v_template.channel
    );

    -- Respect per-channel communication_preference opt-outs for
    -- non-transactional sends. Transactional keys (order/tailoring
    -- status, payment, refund, return, inquiry acknowledgements) are
    -- sent regardless per standard e-commerce practice; this
    -- distinction is made by a simple naming convention: keys
    -- prefixed 'marketing_' are subject to opt-out, all others are
    -- treated as transactional.
    IF p_template_key LIKE 'marketing_%' THEN
      v_customer_id := NULL;
      IF p_related_entity_type = 'order' THEN
        SELECT customer_id INTO v_customer_id FROM public."order" WHERE id = p_related_entity_id;
      ELSIF p_related_entity_type = 'tailoring_request' THEN
        SELECT customer_id INTO v_customer_id FROM public.tailoring_request WHERE id = p_related_entity_id;
      END IF;

      IF v_customer_id IS NOT NULL THEN
        SELECT opt_in INTO v_opt_in
        FROM public.communication_preference
        WHERE customer_id = v_customer_id AND channel = v_template.channel;

        IF v_opt_in IS FALSE THEN
          CONTINUE; -- skip this channel for this customer
        END IF;
      END IF;
    END IF;

    INSERT INTO public.notification_log (
      template_id, channel, recipient, related_entity_type, related_entity_id, status
    )
    VALUES (
      v_template.id, v_template.channel, v_recipient, p_related_entity_type, p_related_entity_id, 'queued'
    );
  END LOOP;
END;
$$;

COMMENT ON FUNCTION public.app_enqueue_notification(text, text, uuid) IS
  'Enqueues one notification_log row per active template matching the given key, across all channels that have a template defined, resolving recipients best-effort and respecting communication_preference opt-outs for keys prefixed marketing_. Silently no-ops if no template exists for the key — a missing template must never fail the calling transaction.';
