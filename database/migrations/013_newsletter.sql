-- =====================================================================
-- Migration: 013_newsletter.sql
-- Purpose:   Newsletter subscription capability.
--
-- IMPLEMENTATION NOTE: newsletter_subscriber does not appear in the
-- frozen Data Dictionary (files 00-10) — it was not part of the
-- originally approved BRS v2.0 / ER Diagram entity set. It is added
-- here solely because it was explicitly named in the requested
-- migration file order (013_newsletter.sql). This is treated as a
-- small, isolated, additive capability, not an architectural
-- redesign: it touches no existing table, follows every established
-- convention in 00_Data-Dictionary-Conventions.md (Pattern B audit,
-- RLS-3 insert-only, function-mediated writes) exactly as if it had
-- been specified from the start, and can be removed or extended
-- later without affecting any other domain. If it should instead be
-- absorbed into communication_preference/customer at review time,
-- that is a one-table, non-breaking follow-up — not a reason to omit
-- it now given it was explicitly requested.
--
-- Target:    PostgreSQL 15+, Supabase-compatible.
-- Idempotent: Yes.
-- Depends on: 001-012 (extensions, types, functions, auth, catalog,
--            inventory, customers, cart, orders, tailoring, cms,
--            contact)
-- =====================================================================


-- =====================================================================
-- TABLE: newsletter_subscriber
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.newsletter_subscriber (
  id                   uuid              NOT NULL DEFAULT gen_random_uuid(),
  email                public.app_email  NOT NULL,
  customer_id          uuid              NULL,
  status               text              NOT NULL DEFAULT 'subscribed',
  source_page          text              NULL,
  unsubscribe_token    uuid              NOT NULL DEFAULT gen_random_uuid(),
  subscribed_at        timestamptz       NOT NULL DEFAULT now(),
  unsubscribed_at      timestamptz       NULL,
  created_at           timestamptz       NOT NULL DEFAULT now(),
  updated_at           timestamptz       NOT NULL DEFAULT now(),
  CONSTRAINT newsletter_subscriber_pkey PRIMARY KEY (id),
  CONSTRAINT newsletter_subscriber_email_key UNIQUE (email),
  CONSTRAINT newsletter_subscriber_unsubscribe_token_key UNIQUE (unsubscribe_token),
  CONSTRAINT newsletter_subscriber_customer_id_fkey FOREIGN KEY (customer_id)
    REFERENCES public.customer (id) ON DELETE SET NULL,
  CONSTRAINT newsletter_subscriber_status_check CHECK (status IN ('subscribed', 'unsubscribed'))
);

COMMENT ON TABLE public.newsletter_subscriber IS
  'Newsletter mailing list, independent of full customer account creation (guest email signup supported). customer_id is an optional link when the subscribing email matches a registered customer. Not part of the originally frozen Data Dictionary; added per explicit migration-order request — see file header.';
COMMENT ON COLUMN public.newsletter_subscriber.unsubscribe_token IS
  'Opaque token embedded in unsubscribe links, consumed by app_unsubscribe_newsletter() below rather than requiring authentication to unsubscribe.';

CREATE UNIQUE INDEX IF NOT EXISTS uq_newsletter_subscriber_email ON public.newsletter_subscriber (email);
CREATE UNIQUE INDEX IF NOT EXISTS uq_newsletter_subscriber_unsubscribe_token ON public.newsletter_subscriber (unsubscribe_token);
CREATE INDEX IF NOT EXISTS idx_newsletter_subscriber_status ON public.newsletter_subscriber (status);
CREATE INDEX IF NOT EXISTS idx_newsletter_subscriber_customer_id ON public.newsletter_subscriber (customer_id);

DROP TRIGGER IF EXISTS trg_newsletter_subscriber_updated_at ON public.newsletter_subscriber;
CREATE TRIGGER trg_newsletter_subscriber_updated_at
  BEFORE UPDATE ON public.newsletter_subscriber
  FOR EACH ROW EXECUTE FUNCTION public.trg_set_updated_at();

-- RLS: enabled here, policies in 016_rls.sql (RLS-3-style: no direct
-- anon/authenticated SELECT/INSERT/UPDATE against this table at all;
-- every interaction goes through the SECURITY DEFINER functions below,
-- which is stricter than plain RLS-3 specifically because unsubscribe
-- must work for an unauthenticated visitor via token alone, which a
-- row-level policy keyed on auth.uid() cannot express).
ALTER TABLE public.newsletter_subscriber ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.newsletter_subscriber FORCE ROW LEVEL SECURITY;


-- ---------------------------------------------------------------------
-- app_subscribe_newsletter(p_email, p_source_page)
-- Idempotent subscribe: inserts a new subscriber, or re-activates an
-- existing unsubscribed row for the same email rather than erroring.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.app_subscribe_newsletter(
  p_email        public.app_email,
  p_source_page  text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_customer_id uuid := public.app_current_customer_id();
  v_id uuid;
BEGIN
  INSERT INTO public.newsletter_subscriber (email, customer_id, source_page, status, subscribed_at, unsubscribed_at)
  VALUES (p_email, v_customer_id, p_source_page, 'subscribed', now(), NULL)
  ON CONFLICT (email) DO UPDATE
    SET status = 'subscribed',
        subscribed_at = now(),
        unsubscribed_at = NULL,
        source_page = COALESCE(EXCLUDED.source_page, public.newsletter_subscriber.source_page),
        customer_id = COALESCE(public.newsletter_subscriber.customer_id, EXCLUDED.customer_id)
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

COMMENT ON FUNCTION public.app_subscribe_newsletter(public.app_email, text) IS
  'Idempotently subscribes an email address to the newsletter, re-activating a previously unsubscribed row rather than erroring on conflict.';

GRANT EXECUTE ON FUNCTION public.app_subscribe_newsletter(public.app_email, text) TO anon, authenticated;


-- ---------------------------------------------------------------------
-- app_unsubscribe_newsletter(p_token)
-- Token-based unsubscribe, callable by anyone holding the token from
-- an email link — deliberately not gated by auth.uid(), since the
-- unsubscribing visitor is very often not authenticated at all.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.app_unsubscribe_newsletter(p_token uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_updated integer;
BEGIN
  UPDATE public.newsletter_subscriber
  SET status = 'unsubscribed',
      unsubscribed_at = now()
  WHERE unsubscribe_token = p_token
    AND status = 'subscribed';

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated > 0;
END;
$$;

COMMENT ON FUNCTION public.app_unsubscribe_newsletter(uuid) IS
  'Unsubscribes the newsletter_subscriber row matching the given unsubscribe_token. Returns true if a row was updated, false if the token was invalid or already unsubscribed.';

GRANT EXECUTE ON FUNCTION public.app_unsubscribe_newsletter(uuid) TO anon, authenticated;
