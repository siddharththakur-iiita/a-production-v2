-- =====================================================================
-- Migration: 001_extensions.sql
-- Purpose:   Enable all PostgreSQL extensions required by the A Productions
--            backend schema (Catalog, Inventory, Tailoring, Customer,
--            Orders, CMS, Analytics, Notifications, Admin domains).
-- Target:    PostgreSQL 15+, Supabase-compatible.
-- Idempotent: Yes — safe to re-run; all statements use IF NOT EXISTS.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Supabase convention: extensions are installed into a dedicated
-- "extensions" schema rather than "public", to keep the public schema
-- free of extension-owned objects and avoid search_path collisions.
-- ---------------------------------------------------------------------
CREATE SCHEMA IF NOT EXISTS extensions;

-- ---------------------------------------------------------------------
-- pgcrypto
-- Provides gen_random_uuid(), used as the default PK generation
-- strategy on every uuid primary key across every domain
-- (Conventions 0.2: "every table's PK column is named id, type uuid,
-- default gen_random_uuid()").
-- ---------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- ---------------------------------------------------------------------
-- pg_trgm
-- Trigram matching, used for:
--   - fuzzy/typo-tolerant ILIKE search support as a complement to
--     product.search_vector full-text search (Conventions 0.9),
--   - GIN trigram indexes on slug/name lookups where partial matching
--     is useful (e.g. admin catalog search-as-you-type).
-- ---------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA extensions;

-- ---------------------------------------------------------------------
-- unaccent
-- Removes diacritics for search normalization (e.g. matching "cafe"
-- against "café" in product names/descriptions), used in conjunction
-- with product.search_vector maintenance (Conventions 0.9).
-- ---------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS unaccent WITH SCHEMA extensions;

-- ---------------------------------------------------------------------
-- btree_gin
-- Allows combining equality (btree-style) columns with jsonb/tsvector
-- columns inside a single composite GIN index, used by later migrations
-- for tables such as analytics_event (event_type + metadata) and
-- product (status + search_vector) where a mixed index is beneficial.
-- ---------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS btree_gin WITH SCHEMA extensions;

-- ---------------------------------------------------------------------
-- citext
-- Case-insensitive text type, used by later migrations for
-- customer.email, admin_user.email, and coupon.code uniqueness
-- (Data Dictionary: "code" convention is uppercase, but the underlying
-- column type enforces case-insensitive comparison at the DB level
-- rather than relying solely on application-layer normalization).
-- ---------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS citext WITH SCHEMA extensions;

-- ---------------------------------------------------------------------
-- pg_stat_statements
-- Query performance monitoring, required to validate the indexing
-- strategy specified throughout the Data Dictionary (Conventions 0.8)
-- once real traffic exists (Backend Readiness Report: Performance,
-- Scalability — "specified, not yet load-tested").
-- Supabase enables this by default on most plans; declared here
-- explicitly so this migration set is self-contained and portable to
-- any PostgreSQL 15+ target, not only Supabase-managed instances.
-- ---------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS pg_stat_statements WITH SCHEMA extensions;

-- ---------------------------------------------------------------------
-- pgjwt
-- JWT parsing/verification helpers, used by RLS policies (migration
-- 016_rls.sql) that need to read claims (role, admin_user_id) out of
-- the current request's JWT via auth.jwt() / current_setting(...).
-- Supabase ships this by default; declared explicitly for portability.
-- ---------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS pgjwt WITH SCHEMA extensions;

-- ---------------------------------------------------------------------
-- Ensure the extensions schema is on the default search_path for the
-- roles that need to call these functions unqualified (gen_random_uuid(),
-- etc.) without every later migration needing to schema-qualify calls.
-- This mirrors Supabase's own default project configuration.
-- ---------------------------------------------------------------------
DO $$
BEGIN
  EXECUTE format(
    'ALTER DATABASE %I SET search_path TO public, extensions',
    current_database()
  );
END
$$;

-- NOTE: A `COMMENT ON SCHEMA extensions` used to live here. Removed deliberately:
-- COMMENT ON is an ownership-only operation (no GRANT can enable it), and on
-- Supabase the `extensions` schema is owned by supabase_admin, not by the
-- `postgres` role that runs migrations. It fails with:
--     ERROR: 42501: must be owner of schema extensions
-- Documentation-only, no functional effect. Intent:
--   The `extensions` schema holds all PostgreSQL extensions used by the
--   A Productions backend (pgcrypto, pg_trgm, unaccent, btree_gin, citext,
--   pg_stat_statements, pgjwt), kept separate from `public` per Supabase
--   convention.
