-- =====================================================================
-- Migration: 018_seed.sql
-- Purpose:   Baseline reference data required for the platform to
--            function on day one: taxonomy lookups, RBAC roles and
--            permissions, production stages, navigation shells,
--            default warehouse, contact info row, site settings, and
--            a baseline notification template set covering every key
--            referenced by the trigger functions defined in
--            009_orders.sql, 010_tailoring.sql, and 012_contact.sql.
-- Target:    PostgreSQL 15+, Supabase-compatible.
-- Idempotent: Yes — every INSERT uses ON CONFLICT DO NOTHING (or DO
--            UPDATE where a value should be kept current on re-run).
-- Depends on: 001-017 (all prior migrations)
--
-- NOT seeded here, by design:
--   - admin_user: rows must equal a real auth-provider user id, which
--     does not exist until an actual admin account is created through
--     the auth system. Create the first Super Admin via the normal
--     signup flow, then assign the 'Super Admin' role seeded below
--     (INSERT INTO admin_user_role ...) as a manual post-deploy step.
--   - customer: same reasoning — customer identity rows are created
--     by the auth system, not seeded.
--   - tax_rule: seeding real GST slabs requires legal/finance sign-off
--     per Data Dictionary 05 Section 11 — deliberately left empty here
--     rather than seeding a guessed, possibly-wrong tax configuration.
--   - contact_info.phone/whatsapp_number/email: inserted as NULL below
--     (a valid, complete row satisfying the UNIQUE(label) constraint
--     app_resolve_contact_info() depends on) — the business must enter
--     the real, confirmed values via the admin dashboard before launch
--     (BRS v2.0's still-open Ambiguity #19).
-- =====================================================================


-- =====================================================================
-- product_type — exactly three rows, per Data Dictionary 01 Section 11.
-- =====================================================================
INSERT INTO public.product_type (code, name, requires_inventory, is_active) VALUES
  ('ready_made', 'Ready Made', true, true),
  ('made_to_order', 'Made To Order', false, true),
  ('bespoke_template', 'Bespoke', false, true)
ON CONFLICT (code) DO NOTHING;


-- =====================================================================
-- gender_tag
-- =====================================================================
INSERT INTO public.gender_tag (name, is_active) VALUES
  ('Women', true),
  ('Men', true),
  ('Kids', true),
  ('Unisex', true)
ON CONFLICT (name) DO NOTHING;


-- =====================================================================
-- age_group
-- =====================================================================
INSERT INTO public.age_group (name, min_age_months, max_age_months, sort_order) VALUES
  ('Infant', 0, 24, 1),
  ('Toddler', 25, 48, 2),
  ('Child', 49, 144, 3),
  ('Teen', 145, 216, 4)
ON CONFLICT (name) DO NOTHING;


-- =====================================================================
-- department — the three departments found in the original frontend
-- audit (Women/Men/Kids).
-- =====================================================================
INSERT INTO public.department (name, slug, sort_order, is_active) VALUES
  ('Women', 'women', 1, true),
  ('Men', 'men', 2, true),
  ('Kids', 'kids', 3, true)
ON CONFLICT (slug) DO NOTHING;


-- =====================================================================
-- customer_tier — illustrative thresholds; business should review and
-- adjust min_spend_threshold values before relying on tier-gated
-- benefits in production.
-- =====================================================================
INSERT INTO public.customer_tier (name, min_spend_threshold, benefits, sort_order) VALUES
  ('Bronze', 0, '{"description": "Entry tier"}', 1),
  ('Silver', 50000, '{"description": "Priority consultation booking"}', 2),
  ('Gold', 150000, '{"description": "Complimentary alterations"}', 3),
  ('Platinum', 400000, '{"description": "Dedicated concierge, priority production slots"}', 4)
ON CONFLICT (name) DO NOTHING;


-- =====================================================================
-- production_stage — the atelier's default internal workflow;
-- admin-editable thereafter.
-- =====================================================================
INSERT INTO public.production_stage (name, sort_order, is_active) VALUES
  ('Pattern Making', 1, true),
  ('Cutting', 2, true),
  ('Stitching', 3, true),
  ('Embroidery', 4, true),
  ('Fitting Adjustment', 5, true),
  ('Finishing', 6, true),
  ('Quality Check', 7, true),
  ('Ready for Delivery', 8, true)
ON CONFLICT (name) DO NOTHING;


-- =====================================================================
-- garment_type — common bespoke garment categories, linked to
-- gender_tag where clearly applicable.
-- =====================================================================
INSERT INTO public.garment_type (name, gender_id, is_active)
SELECT v.name, gt.id, true
FROM (VALUES
  ('Sherwani', 'Men'),
  ('Bandhgala', 'Men'),
  ('Kurta', 'Unisex'),
  ('Lehenga', 'Women'),
  ('Saree Blouse', 'Women'),
  ('Gown', 'Women')
) AS v(name, gender_name)
JOIN public.gender_tag gt ON gt.name = v.gender_name
ON CONFLICT (name) DO NOTHING;


-- =====================================================================
-- warehouse — single default location at launch.
-- =====================================================================
INSERT INTO public.warehouse (name, is_default, is_active) VALUES
  ('Main Atelier', true, true)
ON CONFLICT (name) DO NOTHING;


-- =====================================================================
-- navigation_menu — primary and footer, replacing the hardcoded
-- navData.jsx structure per BRS v2.0 Section 6.
-- =====================================================================
INSERT INTO public.navigation_menu (key, name) VALUES
  ('primary', 'Primary Navigation'),
  ('footer', 'Footer Navigation')
ON CONFLICT (key) DO NOTHING;


-- =====================================================================
-- contact_info — single placeholder row; business must supply real
-- values via the admin dashboard before launch.
-- =====================================================================
INSERT INTO public.contact_info (label, phone, whatsapp_number, email, address, business_hours) VALUES
  ('default', NULL, NULL, NULL, NULL, 'By Appointment Only')
ON CONFLICT (label) DO NOTHING;


-- =====================================================================
-- site_setting
-- =====================================================================
INSERT INTO public.site_setting (key, value, is_public) VALUES
  ('maintenance_mode', '{"enabled": false}', false),
  ('default_currency', '{"code": "INR"}', true),
  ('default_page_size', '{"value": 24}', true)
ON CONFLICT (key) DO UPDATE SET value = public.site_setting.value; -- keep existing value if already set; no-op on re-run


-- =====================================================================
-- permission — the full registry referenced throughout 016_rls.sql.
-- =====================================================================
INSERT INTO public.permission (key, description) VALUES
  ('catalog.write', 'Create/edit/archive products, categories, collections, and catalog taxonomy'),
  ('catalog.manage_taxonomy', 'Manage logic-critical catalog lookups such as product_type'),
  ('catalog.moderate_reviews', 'Approve/reject customer product reviews'),
  ('inventory.manage', 'Adjust stock levels, warehouses, and variants'),
  ('inventory.view', 'Read-only visibility into stock levels'),
  ('tailoring.view', 'Read-only visibility into bespoke tailoring cases'),
  ('tailoring.manage', 'Manage bespoke tailoring cases end-to-end'),
  ('tailoring.manage_taxonomy', 'Manage garment types and measurement templates'),
  ('tailoring.assign', 'Assign tailoring cases to staff'),
  ('tailoring.quote', 'Create and send quotations for tailoring cases'),
  ('orders.manage', 'Manage orders end-to-end'),
  ('orders.refund', 'Issue refunds against orders/payments'),
  ('orders.fulfill', 'Manage shipments and fulfillment'),
  ('orders.manage_returns', 'Process return requests'),
  ('orders.view_payment_details', 'View raw payment/payment_transaction records'),
  ('customers.view', 'Read-only visibility into customer accounts'),
  ('customers.manage', 'Edit customer accounts, issue loyalty adjustments'),
  ('customers.manage_taxonomy', 'Manage customer tiers'),
  ('cms.write', 'Edit CMS content blocks, banners, and site content'),
  ('cms.manage_pages', 'Add/remove manageable pages'),
  ('cms.manage_notifications', 'Manage notification templates'),
  ('marketing.manage', 'Manage coupons and promotions'),
  ('finance.manage_tax_rules', 'Manage tax rule configuration'),
  ('analytics.view', 'View analytics dashboards'),
  ('staff.manage', 'Manage admin_user accounts'),
  ('staff.manage_roles', 'Manage roles and permission assignments'),
  ('staff.view_audit_log', 'View the platform audit log'),
  ('support.manage', 'Manage customer inquiries and support contacts')
ON CONFLICT (key) DO NOTHING;


-- =====================================================================
-- role
-- =====================================================================
INSERT INTO public.role (name, description, is_system_role) VALUES
  ('Super Admin', 'Full platform access, including staff and role management', true),
  ('Catalog Manager', 'Manages products, taxonomy, and review moderation', false),
  ('Inventory Staff', 'Manages stock levels and warehouses', false),
  ('Concierge Agent', 'Manages bespoke tailoring cases and consultations', false),
  ('Content Editor', 'Manages CMS content and notification templates', false),
  ('Order Manager', 'Manages orders, fulfillment, refunds, and returns', false),
  ('Support Agent', 'Manages customer inquiries', false),
  ('Marketing Manager', 'Manages coupons, promotions, and tax configuration', false)
ON CONFLICT (name) DO NOTHING;


-- =====================================================================
-- role_permission — Super Admin gets every permission; other roles
-- get the scoped subset matching their responsibilities.
-- =====================================================================
INSERT INTO public.role_permission (role_id, permission_id)
SELECT r.id, p.id FROM public.role r CROSS JOIN public.permission p WHERE r.name = 'Super Admin'
ON CONFLICT DO NOTHING;

INSERT INTO public.role_permission (role_id, permission_id)
SELECT r.id, p.id FROM public.role r JOIN public.permission p ON p.key IN (
  'catalog.write', 'catalog.manage_taxonomy', 'catalog.moderate_reviews', 'inventory.view'
) WHERE r.name = 'Catalog Manager'
ON CONFLICT DO NOTHING;

INSERT INTO public.role_permission (role_id, permission_id)
SELECT r.id, p.id FROM public.role r JOIN public.permission p ON p.key IN (
  'inventory.manage', 'inventory.view'
) WHERE r.name = 'Inventory Staff'
ON CONFLICT DO NOTHING;

INSERT INTO public.role_permission (role_id, permission_id)
SELECT r.id, p.id FROM public.role r JOIN public.permission p ON p.key IN (
  'tailoring.view', 'tailoring.manage', 'tailoring.manage_taxonomy', 'tailoring.assign', 'tailoring.quote', 'customers.view'
) WHERE r.name = 'Concierge Agent'
ON CONFLICT DO NOTHING;

INSERT INTO public.role_permission (role_id, permission_id)
SELECT r.id, p.id FROM public.role r JOIN public.permission p ON p.key IN (
  'cms.write', 'cms.manage_pages', 'cms.manage_notifications'
) WHERE r.name = 'Content Editor'
ON CONFLICT DO NOTHING;

INSERT INTO public.role_permission (role_id, permission_id)
SELECT r.id, p.id FROM public.role r JOIN public.permission p ON p.key IN (
  'orders.manage', 'orders.refund', 'orders.fulfill', 'orders.manage_returns', 'orders.view_payment_details', 'customers.view'
) WHERE r.name = 'Order Manager'
ON CONFLICT DO NOTHING;

INSERT INTO public.role_permission (role_id, permission_id)
SELECT r.id, p.id FROM public.role r JOIN public.permission p ON p.key IN (
  'support.manage', 'customers.view'
) WHERE r.name = 'Support Agent'
ON CONFLICT DO NOTHING;

INSERT INTO public.role_permission (role_id, permission_id)
SELECT r.id, p.id FROM public.role r JOIN public.permission p ON p.key IN (
  'marketing.manage', 'finance.manage_tax_rules', 'analytics.view'
) WHERE r.name = 'Marketing Manager'
ON CONFLICT DO NOTHING;


-- =====================================================================
-- notification_template — baseline email-channel set covering every
-- key referenced by app_enqueue_notification() call sites in
-- 009_orders.sql, 010_tailoring.sql, and 012_contact.sql. Additional
-- channels (sms/whatsapp/push) can be added per key by Content Editors
-- through the admin dashboard once those integrations are confirmed
-- (BRS v2.0 Ambiguity v2.0-B).
--
-- NOTE: both trg_shipment_status_change (on reaching 'delivered') and
-- the order.status trigger enqueue under related keys when an order is
-- marked delivered — this can result in two related notification_log
-- rows for a single delivery event. Flagged here for the delivery
-- worker/Content Editor's awareness; not a structural defect, and not
-- addressed by altering trigger logic at this stage per the frozen-
-- architecture directive.
-- =====================================================================
INSERT INTO public.notification_template (key, channel, subject, body_template, variables, status) VALUES
  ('order_pending_payment', 'email', 'Complete your A Productions order', 'Hi {{customer_name}}, your order {{order_number}} is awaiting payment.', '["customer_name","order_number"]', 'active'),
  ('order_paid', 'email', 'Your A Productions order is confirmed', 'Hi {{customer_name}}, your order {{order_number}} has been confirmed.', '["customer_name","order_number"]', 'active'),
  ('order_in_fulfillment', 'email', 'Your order is being prepared', 'Hi {{customer_name}}, order {{order_number}} is now being prepared for shipment.', '["customer_name","order_number"]', 'active'),
  ('order_shipped', 'email', 'Your order has shipped', 'Hi {{customer_name}}, order {{order_number}} is on its way.', '["customer_name","order_number"]', 'active'),
  ('order_delivered', 'email', 'Your order has been delivered', 'Hi {{customer_name}}, order {{order_number}} has been delivered. We hope you love it.', '["customer_name","order_number"]', 'active'),
  ('order_closed', 'email', 'Order complete', 'Hi {{customer_name}}, order {{order_number}} is now complete. Thank you for shopping with us.', '["customer_name","order_number"]', 'active'),
  ('order_returned', 'email', 'Your return has been received', 'Hi {{customer_name}}, we have received your return for order {{order_number}}.', '["customer_name","order_number"]', 'active'),
  ('order_refunded', 'email', 'Your refund has been processed', 'Hi {{customer_name}}, your refund for order {{order_number}} has been processed.', '["customer_name","order_number"]', 'active'),
  ('order_cancelled', 'email', 'Your order has been cancelled', 'Hi {{customer_name}}, order {{order_number}} has been cancelled.', '["customer_name","order_number"]', 'active'),
  ('payment_failed', 'email', 'Payment issue with your order', 'Hi {{customer_name}}, we were unable to process payment for order {{order_number}}. Please try again.', '["customer_name","order_number"]', 'active'),
  ('refund_processed', 'email', 'Your refund has been processed', 'Hi {{customer_name}}, your refund has been processed.', '["customer_name"]', 'active'),
  ('tailoring_inquiry_received', 'email', 'We''ve received your bespoke tailoring inquiry', 'Hi {{customer_name}}, thank you for your interest in our bespoke tailoring service. Our concierge team will be in touch shortly.', '["customer_name"]', 'active'),
  ('tailoring_consultation_scheduled', 'email', 'Your consultation is scheduled', 'Hi {{customer_name}}, your consultation has been scheduled.', '["customer_name"]', 'active'),
  ('tailoring_consultation_completed', 'email', 'Thank you for your consultation', 'Hi {{customer_name}}, thank you for meeting with our team.', '["customer_name"]', 'active'),
  ('tailoring_measurements_captured', 'email', 'Your measurements have been recorded', 'Hi {{customer_name}}, your measurements have been recorded for your bespoke garment.', '["customer_name"]', 'active'),
  ('tailoring_design_finalized', 'email', 'Your design has been finalized', 'Hi {{customer_name}}, your bespoke design has been finalized.', '["customer_name"]', 'active'),
  ('tailoring_quotation_sent', 'email', 'Your quotation is ready', 'Hi {{customer_name}}, your bespoke tailoring quotation is ready for review.', '["customer_name"]', 'active'),
  ('tailoring_quotation_accepted', 'email', 'Thank you for accepting your quotation', 'Hi {{customer_name}}, thank you for confirming your bespoke commission. Production will begin shortly.', '["customer_name"]', 'active'),
  ('tailoring_in_production', 'email', 'Your bespoke garment is in production', 'Hi {{customer_name}}, your garment has entered production.', '["customer_name"]', 'active'),
  ('tailoring_fitting_scheduled', 'email', 'Your fitting is scheduled', 'Hi {{customer_name}}, your fitting appointment has been scheduled.', '["customer_name"]', 'active'),
  ('tailoring_fitting_completed', 'email', 'Thank you for your fitting', 'Hi {{customer_name}}, thank you for attending your fitting.', '["customer_name"]', 'active'),
  ('tailoring_ready_for_delivery', 'email', 'Your bespoke garment is ready', 'Hi {{customer_name}}, your garment is ready for delivery.', '["customer_name"]', 'active'),
  ('tailoring_delivered', 'email', 'Your bespoke garment has been delivered', 'Hi {{customer_name}}, we hope you love your new garment.', '["customer_name"]', 'active'),
  ('tailoring_closed', 'email', 'Your bespoke case is now complete', 'Hi {{customer_name}}, your case has been closed. Thank you.', '["customer_name"]', 'active'),
  ('tailoring_cancelled', 'email', 'Your bespoke request has been cancelled', 'Hi {{customer_name}}, your request has been cancelled as requested.', '["customer_name"]', 'active'),
  ('return_requested', 'email', 'We''ve received your return request', 'Hi {{customer_name}}, we have received your return request.', '["customer_name"]', 'active'),
  ('return_approved', 'email', 'Your return has been approved', 'Hi {{customer_name}}, your return request has been approved. Please ship the item back to us.', '["customer_name"]', 'active'),
  ('return_rejected', 'email', 'Update on your return request', 'Hi {{customer_name}}, unfortunately we are unable to process your return request. Please contact us for details.', '["customer_name"]', 'active'),
  ('return_item_received', 'email', 'We''ve received your returned item', 'Hi {{customer_name}}, we have received your returned item and will inspect it shortly.', '["customer_name"]', 'active'),
  ('return_inspected', 'email', 'Your return has been inspected', 'Hi {{customer_name}}, your returned item has been inspected.', '["customer_name"]', 'active'),
  ('return_refund_issued', 'email', 'Your refund has been issued', 'Hi {{customer_name}}, your refund has been issued.', '["customer_name"]', 'active'),
  ('return_exchanged', 'email', 'Your exchange is on its way', 'Hi {{customer_name}}, your replacement item is on its way.', '["customer_name"]', 'active'),
  ('inquiry_received_ack', 'email', 'We''ve received your message', 'Hi {{name}}, thank you for contacting A Productions. We will respond to your inquiry shortly.', '["name"]', 'active')
ON CONFLICT (key, channel) DO NOTHING;
