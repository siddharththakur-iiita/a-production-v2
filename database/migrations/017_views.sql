-- =====================================================================
-- Migration: 017_views.sql
-- Purpose:   Read-optimized views for storefront and admin dashboard
--            consumption, built on top of the domain tables from
--            004-014. Every view is declared WITH (security_invoker =
--            true) — a PostgreSQL 15+ feature that makes the view
--            evaluate RLS using the QUERYING role's policies rather
--            than the view owner's. This is not optional: without
--            security_invoker, a view created by a superuser would
--            silently bypass every RLS policy in this schema for
--            anyone granted SELECT on the view, which would undo the
--            entire RLS model built in 016_rls.sql.
-- Target:    PostgreSQL 15+ (security_invoker requires 15+),
--            Supabase-compatible.
-- Idempotent: Yes — CREATE OR REPLACE VIEW throughout.
-- Depends on: 001-016 (all prior migrations)
-- =====================================================================


-- ---------------------------------------------------------------------
-- v_product_catalog
-- Public-facing product listing/search projection: core product
-- fields, resolved department/category names, primary image, and
-- rating aggregate — the shape actually needed by Home/department/
-- Collections/Search pages, sparing every consumer from re-deriving
-- the "primary image" join by hand.
-- ---------------------------------------------------------------------
CREATE OR REPLACE VIEW public.v_product_catalog
WITH (security_invoker = true)
AS
SELECT
  p.id,
  p.slug,
  p.name,
  p.description,
  pt.code AS product_type_code,
  d.slug AS department_slug,
  d.name AS department_name,
  c.slug AS category_slug,
  c.name AS category_name,
  p.price,
  p.compare_at_price,
  p.currency,
  p.lead_time_days_min,
  p.lead_time_days_max,
  p.is_featured,
  p.is_trending,
  p.is_new_arrival,
  p.average_rating,
  p.review_count,
  pi.storage_path AS primary_image_storage_path,
  pi.alt_text AS primary_image_alt_text
FROM public.product p
JOIN public.product_type pt ON pt.id = p.product_type_id
JOIN public.department d ON d.id = p.department_id
LEFT JOIN public.category c ON c.id = p.category_id
LEFT JOIN LATERAL (
  SELECT ma.storage_path, ma.alt_text
  FROM public.product_image img
  JOIN public.media_asset ma ON ma.id = img.media_asset_id
  WHERE img.product_id = p.id
  ORDER BY img.is_primary DESC, img.sort_order ASC
  LIMIT 1
) pi ON true
WHERE p.status = 'published'
  AND p.deleted_at IS NULL
  AND p.visibility IN ('public', 'search_only');

COMMENT ON VIEW public.v_product_catalog IS
  'Public product listing projection with resolved department/category names and primary image, for Home/department/Collections/Search pages. RLS-respecting via security_invoker.';

GRANT SELECT ON public.v_product_catalog TO anon, authenticated;


-- ---------------------------------------------------------------------
-- v_product_variant_availability
-- Per-variant availability, implementing the "available to sell =
-- on_hand_qty - reserved_qty" computation described throughout the
-- Data Dictionary as a query-time concern, never a stored column.
-- ---------------------------------------------------------------------
CREATE OR REPLACE VIEW public.v_product_variant_availability
WITH (security_invoker = true)
AS
SELECT
  pv.id AS variant_id,
  pv.product_id,
  pv.size,
  pv.color,
  pv.sku,
  pt.code AS product_type_code,
  CASE
    WHEN pt.code = 'ready_made' THEN GREATEST(COALESCE(ii.on_hand_qty, 0) - COALESCE(ii.reserved_qty, 0), 0)
    ELSE NULL
  END AS available_qty,
  CASE
    WHEN pt.code = 'ready_made' AND COALESCE(ii.on_hand_qty, 0) - COALESCE(ii.reserved_qty, 0) > 0 THEN 'in_stock'
    WHEN pt.code = 'ready_made' THEN 'out_of_stock'
    WHEN pt.code = 'made_to_order' THEN 'made_to_order'
    ELSE 'consultation_required'
  END AS availability_status,
  p.lead_time_days_min,
  p.lead_time_days_max
FROM public.product_variant pv
JOIN public.product p ON p.id = pv.product_id
JOIN public.product_type pt ON pt.id = p.product_type_id
LEFT JOIN public.warehouse w ON w.is_default
LEFT JOIN public.inventory_item ii ON ii.variant_id = pv.id AND ii.warehouse_id = w.id
WHERE pv.status = 'active' AND pv.deleted_at IS NULL;

COMMENT ON VIEW public.v_product_variant_availability IS
  'Per-variant availability status (in_stock/out_of_stock/made_to_order/consultation_required) and available_qty, computed at query time from the default warehouse''s inventory_item — never stored.';

GRANT SELECT ON public.v_product_variant_availability TO anon, authenticated;


-- ---------------------------------------------------------------------
-- v_featured_products
-- Resolves featured_placement into ready-to-render rows for the
-- homepage/department/collection-page featured product rails.
-- ---------------------------------------------------------------------
CREATE OR REPLACE VIEW public.v_featured_products
WITH (security_invoker = true)
AS
SELECT
  fp.id AS placement_id,
  fp.placement_context,
  fp.context_ref_id,
  fp.placement_type,
  fp.sort_order,
  pc.*
FROM public.featured_placement fp
JOIN public.v_product_catalog pc ON pc.id = fp.product_id
WHERE (fp.starts_at IS NULL OR fp.starts_at <= now())
  AND (fp.ends_at IS NULL OR fp.ends_at >= now())
ORDER BY fp.placement_context, fp.context_ref_id, fp.sort_order;

COMMENT ON VIEW public.v_featured_products IS
  'Resolved, currently-active featured/trending product placements joined to the public catalog projection, ready for direct rendering.';

GRANT SELECT ON public.v_featured_products TO anon, authenticated;


-- ---------------------------------------------------------------------
-- v_my_orders
-- Customer-facing order history projection with item counts, sparing
-- the client from a manual order/order_item aggregation.
-- ---------------------------------------------------------------------
CREATE OR REPLACE VIEW public.v_my_orders
WITH (security_invoker = true)
AS
SELECT
  o.id,
  o.order_number,
  o.order_type,
  o.status,
  o.grand_total,
  o.currency,
  o.placed_at,
  count(oi.id) AS item_count
FROM public."order" o
LEFT JOIN public.order_item oi ON oi.order_id = o.id
WHERE o.deleted_at IS NULL
GROUP BY o.id;

COMMENT ON VIEW public.v_my_orders IS
  'Order history with item counts. Relies entirely on the underlying order RLS-5 owner-read policy via security_invoker — a customer querying this view only ever sees their own orders.';

GRANT SELECT ON public.v_my_orders TO authenticated;


-- ---------------------------------------------------------------------
-- v_staff_order_queue
-- Admin order queue projection with customer display name, item
-- count, and outstanding-payment flag — the shape an order-management
-- dashboard actually renders as a list.
-- ---------------------------------------------------------------------
CREATE OR REPLACE VIEW public.v_staff_order_queue
WITH (security_invoker = true)
AS
SELECT
  o.id,
  o.order_number,
  o.order_type,
  o.status,
  o.grand_total,
  o.currency,
  o.placed_at,
  COALESCE(c.full_name, 'Guest') AS customer_display_name,
  c.email AS customer_email,
  count(oi.id) AS item_count
FROM public."order" o
LEFT JOIN public.customer c ON c.id = o.customer_id
LEFT JOIN public.order_item oi ON oi.order_id = o.id
WHERE o.deleted_at IS NULL
GROUP BY o.id, c.full_name, c.email
ORDER BY o.placed_at DESC;

COMMENT ON VIEW public.v_staff_order_queue IS
  'Admin dashboard order queue projection. Relies on the order_staff_all RLS policy via security_invoker — only staff holding orders.manage see any rows here.';

GRANT SELECT ON public.v_staff_order_queue TO authenticated;


-- ---------------------------------------------------------------------
-- v_staff_tailoring_pipeline
-- Staff-facing bespoke case pipeline: request status, current
-- production stage (if any), assigned staff name, and customer
-- display name — the shape a concierge/atelier dashboard renders as
-- a kanban or queue.
-- ---------------------------------------------------------------------
CREATE OR REPLACE VIEW public.v_staff_tailoring_pipeline
WITH (security_invoker = true)
AS
SELECT
  tr.id,
  tr.status,
  tr.source,
  COALESCE(c.full_name, tr.guest_name) AS customer_display_name,
  COALESCE(c.email::text, tr.guest_email::text) AS customer_contact_email,
  au.full_name AS assigned_to_name,
  gt.name AS reference_garment_type,
  ps.name AS current_production_stage,
  tr.created_at
FROM public.tailoring_request tr
LEFT JOIN public.customer c ON c.id = tr.customer_id
LEFT JOIN public.admin_user au ON au.id = tr.assigned_to
LEFT JOIN public.design_brief db ON db.tailoring_request_id = tr.id
LEFT JOIN public.garment_type gt ON gt.id = db.garment_type_id
LEFT JOIN LATERAL (
  SELECT stg.name
  FROM public.tailoring_order_stage_history h
  JOIN public.production_stage stg ON stg.id = h.production_stage_id
  WHERE h.tailoring_request_id = tr.id AND h.exited_at IS NULL
  ORDER BY h.entered_at DESC
  LIMIT 1
) ps ON true
WHERE tr.deleted_at IS NULL
ORDER BY tr.created_at DESC;

COMMENT ON VIEW public.v_staff_tailoring_pipeline IS
  'Staff-facing bespoke case pipeline with current production stage and assignee resolved. Relies on tailoring_request_staff_all RLS policy via security_invoker.';

GRANT SELECT ON public.v_staff_tailoring_pipeline TO authenticated;


-- ---------------------------------------------------------------------
-- v_staff_low_stock
-- Low-stock admin alert view.
-- ---------------------------------------------------------------------
CREATE OR REPLACE VIEW public.v_staff_low_stock
WITH (security_invoker = true)
AS
SELECT
  ii.id AS inventory_item_id,
  w.name AS warehouse_name,
  p.name AS product_name,
  pv.sku,
  pv.size,
  pv.color,
  ii.on_hand_qty,
  ii.reserved_qty,
  ii.reorder_level
FROM public.inventory_item ii
JOIN public.product_variant pv ON pv.id = ii.variant_id
JOIN public.product p ON p.id = pv.product_id
JOIN public.warehouse w ON w.id = ii.warehouse_id
WHERE ii.on_hand_qty <= ii.reorder_level
  AND ii.deleted_at IS NULL;

COMMENT ON VIEW public.v_staff_low_stock IS
  'Admin low-stock alert projection. Relies on inventory_item_staff_read RLS policy via security_invoker.';

GRANT SELECT ON public.v_staff_low_stock TO authenticated;


-- ---------------------------------------------------------------------
-- v_customer_360
-- A lightweight, view-only "customer 360" projection aggregating
-- order history, tailoring history, and loyalty status onto one row
-- per customer. This directly addresses the CRM gap flagged in the
-- Backend Readiness Report (Task 4: "no dedicated CRM layer") without
-- introducing any new table — a query-time aggregation over data that
-- already exists is the correct, minimal response until/unless the
-- business confirms a genuine need for staff notes/follow-up tasks
-- (which would still be a small, additive table, not a redesign).
-- ---------------------------------------------------------------------
CREATE OR REPLACE VIEW public.v_customer_360
WITH (security_invoker = true)
AS
SELECT
  c.id AS customer_id,
  c.full_name,
  c.email,
  c.phone,
  ct.name AS tier_name,
  la.points_balance,
  (SELECT count(*) FROM public."order" o WHERE o.customer_id = c.id AND o.deleted_at IS NULL) AS order_count,
  (SELECT COALESCE(sum(o.grand_total), 0) FROM public."order" o
     WHERE o.customer_id = c.id AND o.status NOT IN ('cancelled') AND o.deleted_at IS NULL) AS lifetime_spend,
  (SELECT count(*) FROM public.tailoring_request tr WHERE tr.customer_id = c.id AND tr.deleted_at IS NULL) AS tailoring_request_count,
  (SELECT max(o.placed_at) FROM public."order" o WHERE o.customer_id = c.id AND o.deleted_at IS NULL) AS last_order_at,
  c.created_at AS customer_since
FROM public.customer c
LEFT JOIN public.customer_tier ct ON ct.id = c.tier_id
LEFT JOIN public.loyalty_account la ON la.customer_id = c.id
WHERE c.deleted_at IS NULL;

COMMENT ON VIEW public.v_customer_360 IS
  'Read-only, query-time customer overview (order count/spend, tailoring history, loyalty status) addressing the CRM gap noted in the Backend Readiness Report without introducing a new table. Relies on customer/order/tailoring_request RLS via security_invoker — a customer sees only their own row, staff with customers.view/orders.manage see the relevant rows per those tables'' own policies.';

GRANT SELECT ON public.v_customer_360 TO authenticated;


-- ---------------------------------------------------------------------
-- v_staff_notification_queue
-- Queued notifications awaiting pickup by the delivery worker.
-- ---------------------------------------------------------------------
CREATE OR REPLACE VIEW public.v_staff_notification_queue
WITH (security_invoker = true)
AS
SELECT
  nl.id,
  nt.key AS template_key,
  nl.channel,
  nl.recipient,
  nl.related_entity_type,
  nl.related_entity_id,
  nl.status,
  nl.created_at
FROM public.notification_log nl
JOIN public.notification_template nt ON nt.id = nl.template_id
WHERE nl.status = 'queued'
ORDER BY nl.created_at ASC;

COMMENT ON VIEW public.v_staff_notification_queue IS
  'Queued notifications for the delivery worker to pick up, resolve any NULL recipient, and send. Relies on notification_log_staff_read RLS policy via security_invoker.';

GRANT SELECT ON public.v_staff_notification_queue TO authenticated;
