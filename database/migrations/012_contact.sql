-- =====================================================================
-- Migration: 012_contact.sql
-- Purpose:   Public-facing contact/inquiry submission surface. The
--            inquiry table itself was created in 007_customers.sql
--            (its canonical home per the Senior Architect Review) and
--            contact_info was created in 011_cms.sql. This migration
--            adds the controlled, rate-limited RPC surface that
--            anon/authenticated clients actually call, rather than
--            issuing a raw INSERT against public.inquiry directly —
--            satisfying BRS v2.0 Section 12/17's spam-protection
--            requirement for this specific public write path.
-- Target:    PostgreSQL 15+, Supabase-compatible.
-- Idempotent: Yes (CREATE OR REPLACE FUNCTION throughout).
-- Depends on: 001-011 (extensions, types, functions, auth, catalog,
--            inventory, customers, cart, orders, tailoring, cms)
-- =====================================================================

-- ---------------------------------------------------------------------
-- app_submit_inquiry(...)
-- Public RPC surface for the /contact form (and, via p_order_id, the
-- lightweight order-support path per Architecture Review Notes
-- Section 2.5). Performs basic server-side validation the original
-- v1.0 frontend never had (BRS v2.0 Ambiguity #4), plus a simple
-- sliding-window rate limit per email address as a first line of
-- defense against spam, independent of any additional edge-level
-- rate limiting the API gateway may also apply.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.app_submit_inquiry(
  p_name          text,
  p_email         public.app_email,
  p_phone         public.app_phone DEFAULT NULL,
  p_subject       text DEFAULT NULL,
  p_message       text DEFAULT NULL,
  p_source_page   text DEFAULT NULL,
  p_order_id      uuid DEFAULT NULL,
  p_inquiry_type  text DEFAULT 'general'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_customer_id uuid := public.app_current_customer_id();
  v_recent_count integer;
  v_inquiry_id uuid;
BEGIN
  IF p_name IS NULL OR length(trim(p_name)) = 0 THEN
    RAISE EXCEPTION 'name is required';
  END IF;
  IF p_subject IS NULL OR length(trim(p_subject)) = 0 THEN
    RAISE EXCEPTION 'subject is required';
  END IF;
  IF p_message IS NULL OR length(trim(p_message)) = 0 THEN
    RAISE EXCEPTION 'message is required';
  END IF;
  IF p_inquiry_type NOT IN ('general', 'order_support', 'product_question') THEN
    RAISE EXCEPTION 'invalid inquiry_type: %', p_inquiry_type;
  END IF;

  -- Simple sliding-window rate limit: reject if this email address has
  -- submitted 5 or more inquiries in the last hour. This is a coarse,
  -- database-level backstop; CAPTCHA/honeypot/edge rate limiting
  -- remain the primary defenses at the API layer (BRS v2.0 Section 17).
  SELECT count(*) INTO v_recent_count
  FROM public.inquiry
  WHERE email = p_email
    AND created_at > now() - interval '1 hour';

  IF v_recent_count >= 5 THEN
    RAISE EXCEPTION 'too many inquiries submitted recently for this email address; please try again later';
  END IF;

  INSERT INTO public.inquiry (
    customer_id, order_id, inquiry_type, name, email, phone, subject, message, source_page
  )
  VALUES (
    v_customer_id, p_order_id, p_inquiry_type, p_name, p_email, p_phone, p_subject, p_message, p_source_page
  )
  RETURNING id INTO v_inquiry_id;

  PERFORM public.app_enqueue_notification(
    p_template_key => 'inquiry_received_ack',
    p_related_entity_type => 'inquiry',
    p_related_entity_id => v_inquiry_id
  );

  RETURN v_inquiry_id;
END;
$$;

COMMENT ON FUNCTION public.app_submit_inquiry(text, public.app_email, public.app_phone, text, text, text, uuid, text) IS
  'Public-facing, SECURITY DEFINER submission surface for the /contact form and lightweight order-support inquiries. Performs basic validation and a per-email sliding-window rate limit before inserting into inquiry, then enqueues an acknowledgement notification.';

-- Explicit grants: anon and authenticated may call this function (the
-- controlled entry point), even though the underlying inquiry table
-- itself remains INSERT-only for those roles per RLS-3 in 016_rls.sql
-- — this function is additionally responsible for the rate-limit
-- logic a plain RLS INSERT policy cannot express.
GRANT EXECUTE ON FUNCTION public.app_submit_inquiry(text, public.app_email, public.app_phone, text, text, text, uuid, text)
  TO anon, authenticated;


-- ---------------------------------------------------------------------
-- app_resolve_contact_info()
-- Public read surface for the single contact_info row, so the
-- frontend never needs broader table access than "give me the current
-- published contact details."
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.app_resolve_contact_info()
RETURNS public.contact_info
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM public.contact_info WHERE label = 'default';
$$;

COMMENT ON FUNCTION public.app_resolve_contact_info() IS
  'Returns the default contact_info row for public display (phone, WhatsApp number, email, address, business hours).';

GRANT EXECUTE ON FUNCTION public.app_resolve_contact_info() TO anon, authenticated;
