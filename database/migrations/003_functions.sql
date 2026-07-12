-- =====================================================================
-- Migration: 003_functions.sql
-- Purpose:   Shared, reusable helper functions and generic trigger
--            functions used across every domain migration that
--            follows (004-018). Nothing in this file is table-specific;
--            table-specific triggers are attached to these functions
--            in each domain's own migration file.
-- Target:    PostgreSQL 15+, Supabase-compatible.
-- Idempotent: Yes — every function uses CREATE OR REPLACE FUNCTION.
-- Depends on: 001_extensions.sql, 002_types.sql
--
-- Note on ordering: several functions below reference tables
-- (admin_user, role, permission, role_permission, admin_user_role,
-- audit_log) that are not created until 004_auth.sql. This is safe:
-- PL/pgSQL function bodies are not validated against the catalog at
-- CREATE FUNCTION time, only at first execution, so defining these
-- generic helpers before their referenced tables exist is standard
-- practice and does not break migration ordering.
-- =====================================================================


-- =====================================================================
-- SECTION 1 — RBAC / IDENTITY HELPER FUNCTIONS
-- Referenced by RLS policies platform-wide (016_rls.sql) and by the
-- audit trigger in Section 2 below. Centralizing "who is calling, and
-- what are they allowed to do" here keeps every RLS policy in later
-- migrations short and consistent (Conventions 0.6).
-- =====================================================================

-- ---------------------------------------------------------------------
-- app_current_customer_id()
-- Returns the customer.id of the currently authenticated request, or
-- NULL for anonymous/service-role requests. customer.id = auth.uid()
-- by design (Data Dictionary 04, customer table, Section 2), so this
-- is a thin, semantically-named wrapper used throughout RLS-2 policies
-- rather than every policy calling auth.uid() directly.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.app_current_customer_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY INVOKER
AS $$
  SELECT auth.uid();
$$;

COMMENT ON FUNCTION public.app_current_customer_id() IS
  'Returns the auth.uid() of the current request, interpreted as a customer.id. NULL for anonymous or service_role requests.';

-- ---------------------------------------------------------------------
-- app_current_admin_user_id()
-- Returns the admin_user.id of the currently authenticated request, or
-- NULL if the caller is not a recognized, active admin_user. Distinct
-- from app_current_customer_id() in name (even though both currently
-- resolve from auth.uid()) so that staff-scoped RLS policies read
-- unambiguously and so the two auth realms can be split onto separate
-- Supabase projects later (BRS v2.0 Ambiguity #11) without renaming
-- every policy that calls this function.
-- ---------------------------------------------------------------------
-- NOTE: LANGUAGE plpgsql (not sql) is deliberate. This function forward-
-- references public.admin_user, which is created later in 004_auth.sql.
-- PostgreSQL parse-analyzes LANGUAGE sql bodies at CREATE time, which would
-- fail here; plpgsql bodies are parsed at execution time, by which point
-- 004_auth.sql has run. Semantics, volatility, and security context are
-- otherwise identical.
CREATE OR REPLACE FUNCTION public.app_current_admin_user_id()
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  SELECT id
  INTO v_id
  FROM public.admin_user
  WHERE id = auth.uid()
    AND status = 'active'
    AND deleted_at IS NULL;

  RETURN v_id;
END;
$$;

COMMENT ON FUNCTION public.app_current_admin_user_id() IS
  'Returns the current request''s admin_user.id if it corresponds to an active, non-deleted admin_user row; otherwise NULL.';

-- ---------------------------------------------------------------------
-- app_is_admin()
-- Boolean convenience wrapper around app_current_admin_user_id(), used
-- in RLS policies that only need a yes/no staff check without needing
-- the id itself.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.app_is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
AS $$
  SELECT public.app_current_admin_user_id() IS NOT NULL;
$$;

COMMENT ON FUNCTION public.app_is_admin() IS
  'Returns true if the current request is an authenticated, active admin_user.';

-- ---------------------------------------------------------------------
-- app_has_permission(permission_key text)
-- The RBAC enforcement mechanism specified in Data Dictionary 00,
-- Section 0.6: checks whether the current admin_user holds the given
-- permission via admin_user_role -> role_permission -> permission.
-- Used throughout 016_rls.sql as the single source of truth for every
-- staff-scoped write policy, so a permission's meaning is defined once
-- here rather than re-derived per policy.
-- ---------------------------------------------------------------------
-- NOTE: LANGUAGE plpgsql (not sql) is deliberate — same reason as
-- app_current_admin_user_id() above: admin_user_role, role_permission, and
-- permission are all created later in 004_auth.sql, so the body must not be
-- parse-analyzed at CREATE time. Logic is unchanged.
CREATE OR REPLACE FUNCTION public.app_has_permission(p_permission_key text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_exists boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM public.admin_user_role aur
    JOIN public.role_permission rp ON rp.role_id = aur.role_id
    JOIN public.permission perm ON perm.id = rp.permission_id
    WHERE aur.admin_user_id = public.app_current_admin_user_id()
      AND perm.key = p_permission_key
  )
  INTO v_exists;

  RETURN v_exists;
END;
$$;

COMMENT ON FUNCTION public.app_has_permission(text) IS
  'Returns true if the current admin_user holds the given permission.key through any of their assigned roles. The single authoritative RBAC check used by every staff-scoped RLS policy.';


-- =====================================================================
-- SECTION 2 — AUDIT AND TIMESTAMP MAINTENANCE TRIGGER FUNCTIONS
-- Implements TRG-UPDATED-AT, TRG-AUDIT-LOG, and TRG-SOFT-DELETE-GUARD
-- as generic, reusable trigger functions (Data Dictionary 00, Section
-- 0.5), attached to individual tables in their respective domain
-- migrations.
-- =====================================================================

-- ---------------------------------------------------------------------
-- trg_set_updated_at()
-- TRG-UPDATED-AT for Pattern B tables (Conventions 0.3): refreshes
-- updated_at only. Attach as: BEFORE UPDATE FOR EACH ROW.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trg_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.trg_set_updated_at() IS
  'Generic BEFORE UPDATE trigger: sets NEW.updated_at = now(). Used on Pattern B (standard audit) tables.';

-- ---------------------------------------------------------------------
-- trg_set_updated_at_versioned()
-- TRG-UPDATED-AT for Pattern A tables (Conventions 0.3): refreshes
-- updated_at AND increments the optimistic-concurrency version
-- counter. Attach as: BEFORE UPDATE FOR EACH ROW.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trg_set_updated_at_versioned()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  NEW.version := OLD.version + 1;
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.trg_set_updated_at_versioned() IS
  'Generic BEFORE UPDATE trigger: sets NEW.updated_at = now() and increments NEW.version. Used on Pattern A (full audit) tables that carry a version column.';

-- ---------------------------------------------------------------------
-- trg_soft_delete_guard()
-- TRG-SOFT-DELETE-GUARD (Conventions 0.5): converts a hard DELETE
-- attempt into a soft delete (sets deleted_at = now() via an UPDATE)
-- for any role other than a designated cleanup/migration role. The
-- bypass is controlled by a session-local GUC (app.allow_hard_delete)
-- that only trusted maintenance scripts should ever set, never
-- application code. Attach as: BEFORE DELETE FOR EACH ROW.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trg_soft_delete_guard()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF current_setting('app.allow_hard_delete', true) = 'true' THEN
    RETURN OLD;
  END IF;

  EXECUTE format(
    'UPDATE %I.%I SET deleted_at = now() WHERE id = $1 AND deleted_at IS NULL',
    TG_TABLE_SCHEMA, TG_TABLE_NAME
  ) USING OLD.id;

  RETURN NULL; -- cancels the original DELETE
END;
$$;

COMMENT ON FUNCTION public.trg_soft_delete_guard() IS
  'Generic BEFORE DELETE trigger: converts a hard DELETE into a soft delete (deleted_at = now()) unless the session GUC app.allow_hard_delete is set to true. Used on all Pattern A tables.';

-- ---------------------------------------------------------------------
-- trg_audit_log()
-- TRG-AUDIT-LOG (Conventions 0.5): writes an immutable row to
-- audit_log capturing the before/after state of any INSERT, UPDATE,
-- or DELETE on the attached table, along with the acting admin_user_id
-- (NULL for system-initiated changes). Attach as:
-- AFTER INSERT OR UPDATE OR DELETE FOR EACH ROW.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trg_audit_log()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_entity_id uuid;
  v_before jsonb;
  v_after jsonb;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_entity_id := OLD.id;
    v_before := to_jsonb(OLD);
    v_after := NULL;
  ELSIF TG_OP = 'INSERT' THEN
    v_entity_id := NEW.id;
    v_before := NULL;
    v_after := to_jsonb(NEW);
  ELSE -- UPDATE
    v_entity_id := NEW.id;
    v_before := to_jsonb(OLD);
    v_after := to_jsonb(NEW);
  END IF;

  INSERT INTO public.audit_log (
    admin_user_id, action, entity_type, entity_id, before, after
  )
  VALUES (
    public.app_current_admin_user_id(),
    lower(TG_OP),
    TG_TABLE_NAME,
    v_entity_id,
    v_before,
    v_after
  );

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.trg_audit_log() IS
  'Generic AFTER INSERT/UPDATE/DELETE trigger: logs a before/after snapshot of the row to audit_log, tagged with the acting admin_user_id (NULL if system-initiated). Used on every TRG-AUDIT-LOG-tagged table across all domains.';


-- ---------------------------------------------------------------------
-- trg_audit_log_composite(VARIADIC key columns via TG_ARGV)
-- TRG-AUDIT-LOG variant for tables whose identity is NOT a single
-- surrogate "id" uuid column — i.e. the composite-PK join tables
-- (role_permission, admin_user_role) and any table wanting an explicit
-- key-column list. Behaves exactly like trg_audit_log() except for how
-- audit_log.entity_id is derived.
--
-- audit_log.entity_id is uuid NOT NULL, but a composite-key row has no
-- single uuid to put there. So entity_id is a DETERMINISTIC digest of
-- TG_TABLE_NAME plus the values of the key columns named in TG_ARGV:
-- the same logical row always maps to the same entity_id, which keeps
-- an audit trail for that row correlatable over time (and keeps the
-- existing idx_audit_log_entity lookups working unchanged).
--
-- Attach as:
--   AFTER INSERT OR UPDATE OR DELETE FOR EACH ROW
--   EXECUTE FUNCTION public.trg_audit_log_composite('col_a', 'col_b');
-- Accepts one or more key column names (005_catalog.sql passes a single
-- column; 004_auth.sql passes two).
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trg_audit_log_composite()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_entity_id uuid;
  v_before    jsonb;
  v_after     jsonb;
  v_row       jsonb;
  v_key       text;
  v_parts     text := '';
  v_hash      bytea;
  i           int;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_before := to_jsonb(OLD);
    v_after  := NULL;
    v_row    := v_before;
  ELSIF TG_OP = 'INSERT' THEN
    v_before := NULL;
    v_after  := to_jsonb(NEW);
    v_row    := v_after;
  ELSE -- UPDATE
    v_before := to_jsonb(OLD);
    v_after  := to_jsonb(NEW);
    v_row    := v_after;
  END IF;

  IF TG_NARGS < 1 THEN
    RAISE EXCEPTION
      'trg_audit_log_composite() on %: at least one key column name must be passed as a trigger argument',
      TG_TABLE_NAME;
  END IF;

  -- Build a stable, order-sensitive key string: table|col=val|col=val...
  v_parts := TG_TABLE_NAME;
  FOR i IN 0 .. TG_NARGS - 1 LOOP
    v_key   := TG_ARGV[i];
    v_parts := v_parts || '|' || v_key || '=' || COALESCE(v_row ->> v_key, '');
  END LOOP;

  -- Deterministic uuid from the key string (uuid v5-style: sha1 the key,
  -- truncate to the 16 bytes a uuid holds, then stamp the version and
  -- variant bits so the result is a well-formed uuid).
  v_hash := substring(extensions.digest(v_parts, 'sha1'::text) FROM 1 FOR 16);
  v_hash := overlay(
              v_hash
              PLACING set_byte(
                substring(v_hash FROM 7 FOR 1),
                0,
                (get_byte(substring(v_hash FROM 7 FOR 1), 0) & 15) | 80  -- version 5
              )
              FROM 7 FOR 1
            );
  v_hash := set_bit(set_bit(v_hash, 71, 0), 70, 1);                      -- RFC 4122 variant
  v_entity_id := encode(v_hash, 'hex')::uuid;

  INSERT INTO public.audit_log (
    admin_user_id, action, entity_type, entity_id, before, after
  )
  VALUES (
    public.app_current_admin_user_id(),
    lower(TG_OP),
    TG_TABLE_NAME,
    v_entity_id,
    v_before,
    v_after
  );

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.trg_audit_log_composite() IS
  'Generic AFTER INSERT/UPDATE/DELETE trigger for tables without a single uuid id column (composite-PK join tables such as role_permission and admin_user_role). Identical to trg_audit_log() except audit_log.entity_id is a deterministic uuid digest of TG_TABLE_NAME plus the key columns named in TG_ARGV, so repeated changes to the same logical row share one entity_id.';


-- =====================================================================
-- SECTION 3 — GENERIC BUSINESS-RULE TRIGGER FUNCTIONS
-- Reusable trigger logic referenced by name in multiple Data
-- Dictionary tables (e.g. warehouse.is_default, address.is_default,
-- product_image.is_primary all use the same "only one flagged row per
-- scope" rule).
-- =====================================================================

-- ---------------------------------------------------------------------
-- trg_enforce_single_flag()
-- Generic "only one TRUE per scope" guard. Configured via trigger
-- arguments:
--   TG_ARGV[0] = name of the boolean flag column (e.g. 'is_default')
--   TG_ARGV[1] = name of the scope column to partition by, or the
--                literal string '__none__' if the flag is table-wide
--                with no partition column (e.g. warehouse.is_default).
-- When a row is inserted or updated with the flag column set true,
-- every sibling row in the same scope is set false first.
-- Attach as: BEFORE INSERT OR UPDATE OF <flag_column> FOR EACH ROW.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trg_enforce_single_flag()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_flag_column text := TG_ARGV[0];
  v_scope_column text := TG_ARGV[1];
  v_flag_value boolean;
  v_scope_value text;
BEGIN
  EXECUTE format('SELECT ($1).%I', v_flag_column) INTO v_flag_value USING NEW;

  IF v_flag_value IS NOT TRUE THEN
    RETURN NEW;
  END IF;

  IF v_scope_column = '__none__' THEN
    EXECUTE format(
      'UPDATE %I.%I SET %I = false WHERE id <> $1 AND %I = true',
      TG_TABLE_SCHEMA, TG_TABLE_NAME, v_flag_column, v_flag_column
    ) USING NEW.id;
  ELSE
    EXECUTE format('SELECT ($1).%I::text', v_scope_column) INTO v_scope_value USING NEW;
    EXECUTE format(
      'UPDATE %I.%I SET %I = false WHERE id <> $1 AND %I::text = $2 AND %I = true',
      TG_TABLE_SCHEMA, TG_TABLE_NAME, v_flag_column, v_scope_column, v_flag_column
    ) USING NEW.id, v_scope_value;
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.trg_enforce_single_flag() IS
  'Generic trigger: when a row''s boolean flag column (TG_ARGV[0]) is set true, unsets that same flag on all sibling rows within the given scope column (TG_ARGV[1], or __none__ for table-wide). Used by warehouse.is_default, address.is_default, product_image.is_primary.';

-- ---------------------------------------------------------------------
-- trg_close_previous_open_period()
-- Generic "only one open period per parent" guard, used by history
-- tables that track entering/exiting a state over time (e.g.
-- tailoring_order_stage_history: entered_at/exited_at). Configured via
-- trigger arguments:
--   TG_ARGV[0] = name of the parent-scope foreign key column
--                (e.g. 'tailoring_request_id')
--   TG_ARGV[1] = name of the "exited_at" / period-end timestamp column
-- Before inserting a new row, closes (sets the exit timestamp to now())
-- on the most recent still-open row for the same parent scope.
-- Attach as: BEFORE INSERT FOR EACH ROW.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trg_close_previous_open_period()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_scope_column text := TG_ARGV[0];
  v_end_column text := TG_ARGV[1];
  v_scope_value uuid;
BEGIN
  EXECUTE format('SELECT ($1).%I', v_scope_column) INTO v_scope_value USING NEW;

  EXECUTE format(
    'UPDATE %I.%I
       SET %I = now()
     WHERE %I = $1
       AND %I IS NULL',
    TG_TABLE_SCHEMA, TG_TABLE_NAME, v_end_column, v_scope_column, v_end_column
  ) USING v_scope_value;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.trg_close_previous_open_period() IS
  'Generic trigger: before inserting a new period row, closes (sets the end-timestamp column to now()) any still-open period row for the same parent scope. Used by tailoring_order_stage_history.';

-- ---------------------------------------------------------------------
-- trg_validate_polymorphic_reference()
-- Substitutes for a native foreign key where a column pair is
-- polymorphic (an entity_type/entity_id-style reference that may point
-- at one of several possible tables), per the Data Dictionary's stated
-- pattern for seo_meta, featured_placement.context_ref_id,
-- analytics_event, notification_log, and audit_log-adjacent columns.
-- Configured via trigger arguments:
--   TG_ARGV[0] = name of the column holding the discriminator value
--                (e.g. 'entity_type'); the discriminator's value is
--                assumed to equal the target table's literal name
--                (e.g. 'product', 'collection', 'page'), consistent
--                with how every polymorphic column in the Data
--                Dictionary is actually populated.
--   TG_ARGV[1] = name of the column holding the referenced id
--                (e.g. 'entity_id').
-- Raises an exception if no row with that id exists in the named
-- table. Skips validation entirely if the id column is NULL.
-- Attach as: BEFORE INSERT OR UPDATE FOR EACH ROW.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trg_validate_polymorphic_reference()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_type_column text := TG_ARGV[0];
  v_id_column text := TG_ARGV[1];
  v_target_table text;
  v_target_id uuid;
  v_found boolean;
BEGIN
  EXECUTE format('SELECT ($1).%I', v_type_column) INTO v_target_table USING NEW;
  EXECUTE format('SELECT ($1).%I', v_id_column) INTO v_target_id USING NEW;

  IF v_target_id IS NULL OR v_target_table IS NULL THEN
    RETURN NEW;
  END IF;

  EXECUTE format(
    'SELECT EXISTS (SELECT 1 FROM %I.%I WHERE id = $1)',
    TG_TABLE_SCHEMA, v_target_table
  ) INTO v_found USING v_target_id;

  IF NOT v_found THEN
    RAISE EXCEPTION
      'Polymorphic reference validation failed on %.%: no row with id % in table %',
      TG_TABLE_NAME, v_id_column, v_target_id, v_target_table;
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.trg_validate_polymorphic_reference() IS
  'Generic trigger: validates that a polymorphic (entity_type, entity_id) column pair references an existing row in the table named by entity_type, substituting for a native foreign key. Used by seo_meta and similar polymorphic tables.';


-- =====================================================================
-- SECTION 4 — GENERAL-PURPOSE UTILITY FUNCTIONS
-- =====================================================================

-- ---------------------------------------------------------------------
-- app_slugify(input text)
-- Converts arbitrary text into an app_slug-compliant value: lower-
-- cases, strips diacritics (via unaccent), replaces any run of
-- non-alphanumeric characters with a single hyphen, and trims leading/
-- trailing hyphens. Used by admin-side auto-slug generation (e.g. when
-- a catalog manager creates a new product/collection/category without
-- manually typing a slug).
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.app_slugify(input text)
RETURNS public.app_slug
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT trim(both '-' from
    regexp_replace(
      lower(extensions.unaccent(input)),
      '[^a-z0-9]+', '-', 'g'
    )
  )::public.app_slug;
$$;

COMMENT ON FUNCTION public.app_slugify(text) IS
  'Converts arbitrary text into a lower-case, hyphen-separated, diacritic-free slug suitable for the app_slug domain.';

-- ---------------------------------------------------------------------
-- app_touch_parent(parent_table text, parent_id uuid)
-- Generic helper to bump a parent row's updated_at from a child-table
-- trigger, without requiring the child trigger to know the parent
-- table's full trigger machinery. Used by cart_item's AFTER INSERT
-- trigger (008_cart.sql) to refresh cart.updated_at so the abandoned-
-- cart detection window resets correctly when an item is added.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.app_touch_parent(parent_table text, parent_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  EXECUTE format(
    'UPDATE public.%I SET updated_at = now() WHERE id = $1',
    parent_table
  ) USING parent_id;
END;
$$;

COMMENT ON FUNCTION public.app_touch_parent(text, uuid) IS
  'Updates updated_at = now() on the named parent table for the given id. Used by child-table triggers that must refresh a parent''s freshness timestamp (e.g. cart_item -> cart).';
