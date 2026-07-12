-- =====================================================================
-- Migration: 004_auth.sql
-- Purpose:   Admin / Identity domain (Data Dictionary 09): admin_user,
--            role, permission, role_permission, admin_user_role,
--            audit_log. This is the RBAC and audit-logging foundation
--            every later domain migration's RLS policies and
--            TRG-AUDIT-LOG triggers depend on.
-- Target:    PostgreSQL 15+, Supabase-compatible.
-- Idempotent: Yes — CREATE TABLE IF NOT EXISTS, CREATE INDEX IF NOT
--            EXISTS, triggers dropped and recreated by name.
-- Depends on: 001_extensions.sql, 002_types.sql, 003_functions.sql
-- =====================================================================


-- =====================================================================
-- TABLE: audit_log
-- Created first in this file (even though it is conceptually the
-- "last" table in Data Dictionary 09) because trg_audit_log() and
-- trg_audit_log_composite() (003_functions.sql) insert into it, and
-- every other table created below attaches those triggers immediately
-- upon creation.
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.audit_log (
  id             uuid        NOT NULL DEFAULT gen_random_uuid(),
  admin_user_id  uuid        NULL,
  action         text        NOT NULL,
  entity_type    text        NOT NULL,
  entity_id      uuid        NOT NULL,
  before         jsonb       NULL,
  after          jsonb       NULL,
  created_at     timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT audit_log_pkey PRIMARY KEY (id)
);

COMMENT ON TABLE public.audit_log IS
  'Immutable, platform-wide record of sensitive administrative actions. Populated exclusively by trg_audit_log()/trg_audit_log_composite() triggers across every domain. Pattern C (append-only, no updated_at, no soft delete).';
COMMENT ON COLUMN public.audit_log.admin_user_id IS 'NULL = system-initiated action, not a staff action.';
COMMENT ON COLUMN public.audit_log.entity_id IS 'Polymorphic by necessity — spans every audited table in the schema. No native FK.';

CREATE INDEX IF NOT EXISTS idx_audit_log_entity
  ON public.audit_log (entity_type, entity_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_admin_user
  ON public.audit_log (admin_user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at
  ON public.audit_log (created_at DESC);

-- RLS: enabled here, policies defined centrally in 016_rls.sql
-- (RLS-4, narrowed further to a dedicated staff.view_audit_log
-- permission; append-only, no UPDATE/DELETE policy for any role).
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log FORCE ROW LEVEL SECURITY;


-- =====================================================================
-- TABLE: admin_user
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.admin_user (
  id          uuid        NOT NULL, -- supplied = auth.users.id, not generated here
  email       public.app_email NOT NULL,
  full_name   text        NOT NULL,
  status      text        NOT NULL DEFAULT 'active',
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  deleted_at  timestamptz NULL,
  created_by  uuid        NULL,
  updated_by  uuid        NULL,
  version     integer     NOT NULL DEFAULT 1,
  CONSTRAINT admin_user_pkey PRIMARY KEY (id),
  CONSTRAINT admin_user_email_key UNIQUE (email),
  CONSTRAINT admin_user_status_check CHECK (status IN ('active', 'suspended')),
  CONSTRAINT admin_user_created_by_fkey FOREIGN KEY (created_by)
    REFERENCES public.admin_user (id) ON DELETE RESTRICT,
  CONSTRAINT admin_user_updated_by_fkey FOREIGN KEY (updated_by)
    REFERENCES public.admin_user (id) ON DELETE RESTRICT
);

COMMENT ON TABLE public.admin_user IS
  'Internal staff/operator identity. id equals the auth-provider user id for the admin auth realm (kept separate from the customer auth realm per BRS v2.0 Section 12/Ambiguity #11). Pattern A: status=suspended is the offboarding action, never a hard delete.';
COMMENT ON COLUMN public.admin_user.status IS
  'suspended admin_users retain all historical created_by/updated_by/assigned_to references platform-wide but cannot authenticate.';

CREATE INDEX IF NOT EXISTS idx_admin_user_email ON public.admin_user (email);

DROP TRIGGER IF EXISTS trg_admin_user_updated_at ON public.admin_user;
CREATE TRIGGER trg_admin_user_updated_at
  BEFORE UPDATE ON public.admin_user
  FOR EACH ROW EXECUTE FUNCTION public.trg_set_updated_at_versioned();

DROP TRIGGER IF EXISTS trg_admin_user_audit ON public.admin_user;
CREATE TRIGGER trg_admin_user_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.admin_user
  FOR EACH ROW EXECUTE FUNCTION public.trg_audit_log();

DROP TRIGGER IF EXISTS trg_admin_user_soft_delete ON public.admin_user;
CREATE TRIGGER trg_admin_user_soft_delete
  BEFORE DELETE ON public.admin_user
  FOR EACH ROW EXECUTE FUNCTION public.trg_soft_delete_guard();

-- RLS: enabled here, policies defined centrally in 016_rls.sql
-- (RLS-2 self-service for own profile; status/role changes require
-- staff.manage held by a super_admin-tier role).
ALTER TABLE public.admin_user ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_user FORCE ROW LEVEL SECURITY;


-- =====================================================================
-- TABLE: role
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.role (
  id             uuid        NOT NULL DEFAULT gen_random_uuid(),
  name           text        NOT NULL,
  description    text        NULL,
  is_system_role boolean     NOT NULL DEFAULT false,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  deleted_at     timestamptz NULL,
  created_by     uuid        NULL,
  updated_by     uuid        NULL,
  version        integer     NOT NULL DEFAULT 1,
  CONSTRAINT role_pkey PRIMARY KEY (id),
  CONSTRAINT role_name_key UNIQUE (name),
  CONSTRAINT role_created_by_fkey FOREIGN KEY (created_by)
    REFERENCES public.admin_user (id) ON DELETE RESTRICT,
  CONSTRAINT role_updated_by_fkey FOREIGN KEY (updated_by)
    REFERENCES public.admin_user (id) ON DELETE RESTRICT
);

COMMENT ON TABLE public.role IS
  'Named collections of permissions assignable to staff (Catalog Manager, Concierge Agent, Inventory Staff, Content Editor, Order Manager, Super Admin). Admin-manageable so new roles can be introduced without a code change.';
COMMENT ON COLUMN public.role.is_system_role IS
  'true only for the seeded Super Admin role; protected from modification/deletion by trg_role_protect_system below.';

CREATE INDEX IF NOT EXISTS idx_role_name ON public.role (name);

DROP TRIGGER IF EXISTS trg_role_updated_at ON public.role;
CREATE TRIGGER trg_role_updated_at
  BEFORE UPDATE ON public.role
  FOR EACH ROW EXECUTE FUNCTION public.trg_set_updated_at_versioned();

DROP TRIGGER IF EXISTS trg_role_audit ON public.role;
CREATE TRIGGER trg_role_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.role
  FOR EACH ROW EXECUTE FUNCTION public.trg_audit_log();

DROP TRIGGER IF EXISTS trg_role_soft_delete ON public.role;
CREATE TRIGGER trg_role_soft_delete
  BEFORE DELETE ON public.role
  FOR EACH ROW EXECUTE FUNCTION public.trg_soft_delete_guard();

-- System-role protection trigger (Data Dictionary 09, role table,
-- Section 10): rejects UPDATE/DELETE on rows where is_system_role is
-- true, except via the app.allow_hard_delete / a designated
-- break-glass procedure equivalent for updates
-- (app.allow_system_role_edit).
CREATE OR REPLACE FUNCTION public.trg_role_protect_system()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.is_system_role IS TRUE
     AND current_setting('app.allow_system_role_edit', true) IS DISTINCT FROM 'true' THEN
    RAISE EXCEPTION 'role "%": system roles cannot be modified or deleted through normal operation', OLD.name;
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.trg_role_protect_system() IS
  'Rejects UPDATE/DELETE on role rows where is_system_role = true, unless the session GUC app.allow_system_role_edit is set to true.';

DROP TRIGGER IF EXISTS trg_role_protect_system_trigger ON public.role;
CREATE TRIGGER trg_role_protect_system_trigger
  BEFORE UPDATE OR DELETE ON public.role
  FOR EACH ROW EXECUTE FUNCTION public.trg_role_protect_system();

-- RLS: enabled here, policies defined centrally in 016_rls.sql
-- (RLS-4; write requires staff.manage_roles).
ALTER TABLE public.role ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role FORCE ROW LEVEL SECURITY;


-- =====================================================================
-- TABLE: permission
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.permission (
  id          uuid        NOT NULL DEFAULT gen_random_uuid(),
  key         text        NOT NULL,
  description text        NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT permission_pkey PRIMARY KEY (id),
  CONSTRAINT permission_key_key UNIQUE (key)
);

COMMENT ON TABLE public.permission IS
  'Fine-grained, resource.action-scoped permission keys (e.g. orders.refund, tailoring.assign), referenced by app_has_permission() and every staff-scoped RLS policy in 016_rls.sql. Pattern B (no soft delete/versioning — role_permission carries the security-sensitive audit burden instead).';

CREATE INDEX IF NOT EXISTS idx_permission_key ON public.permission (key);

DROP TRIGGER IF EXISTS trg_permission_updated_at ON public.permission;
CREATE TRIGGER trg_permission_updated_at
  BEFORE UPDATE ON public.permission
  FOR EACH ROW EXECUTE FUNCTION public.trg_set_updated_at();

-- RLS: enabled here, policies defined centrally in 016_rls.sql
-- (RLS-4; write requires staff.manage_roles).
ALTER TABLE public.permission ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permission FORCE ROW LEVEL SECURITY;


-- =====================================================================
-- TABLE: role_permission
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.role_permission (
  role_id       uuid        NOT NULL,
  permission_id uuid        NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT role_permission_pkey PRIMARY KEY (role_id, permission_id),
  CONSTRAINT role_permission_role_id_fkey FOREIGN KEY (role_id)
    REFERENCES public.role (id) ON DELETE CASCADE,
  CONSTRAINT role_permission_permission_id_fkey FOREIGN KEY (permission_id)
    REFERENCES public.permission (id) ON DELETE CASCADE
);

COMMENT ON TABLE public.role_permission IS
  'Many-to-many join granting a permission to a role. Pattern C, with the explicit stated exception of also carrying TRG-AUDIT-LOG (via trg_audit_log_composite) given this table is, in effect, the entire authorization system.';

CREATE INDEX IF NOT EXISTS idx_role_permission_permission_id
  ON public.role_permission (permission_id);

DROP TRIGGER IF EXISTS trg_role_permission_audit ON public.role_permission;
CREATE TRIGGER trg_role_permission_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.role_permission
  FOR EACH ROW EXECUTE FUNCTION public.trg_audit_log_composite('role_id', 'permission_id');

-- RLS: enabled here, policies defined centrally in 016_rls.sql
-- (RLS-4; write requires staff.manage_roles).
ALTER TABLE public.role_permission ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permission FORCE ROW LEVEL SECURITY;


-- =====================================================================
-- TABLE: admin_user_role
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.admin_user_role (
  admin_user_id uuid        NOT NULL,
  role_id       uuid        NOT NULL,
  granted_at    timestamptz NOT NULL DEFAULT now(),
  granted_by    uuid        NULL,
  CONSTRAINT admin_user_role_pkey PRIMARY KEY (admin_user_id, role_id),
  CONSTRAINT admin_user_role_admin_user_id_fkey FOREIGN KEY (admin_user_id)
    REFERENCES public.admin_user (id) ON DELETE CASCADE,
  CONSTRAINT admin_user_role_role_id_fkey FOREIGN KEY (role_id)
    REFERENCES public.role (id) ON DELETE CASCADE,
  CONSTRAINT admin_user_role_granted_by_fkey FOREIGN KEY (granted_by)
    REFERENCES public.admin_user (id) ON DELETE SET NULL
);

COMMENT ON TABLE public.admin_user_role IS
  'Many-to-many join assigning one or more roles to an admin_user, allowing a single staff member to hold multiple roles. Pattern C, with the same TRG-AUDIT-LOG exception as role_permission — who has admin access, and who granted it, must be reconstructable.';

CREATE INDEX IF NOT EXISTS idx_admin_user_role_role_id
  ON public.admin_user_role (role_id);

DROP TRIGGER IF EXISTS trg_admin_user_role_audit ON public.admin_user_role;
CREATE TRIGGER trg_admin_user_role_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.admin_user_role
  FOR EACH ROW EXECUTE FUNCTION public.trg_audit_log_composite('admin_user_id', 'role_id');

-- RLS: enabled here, policies defined centrally in 016_rls.sql
-- (RLS-4; write requires staff.manage_roles).
ALTER TABLE public.admin_user_role ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_user_role FORCE ROW LEVEL SECURITY;


-- =====================================================================
-- Now that audit_log exists with its final structure, attach its FK
-- to admin_user (deferred to the end of this file since admin_user is
-- created after audit_log above).
-- =====================================================================
ALTER TABLE public.audit_log
  DROP CONSTRAINT IF EXISTS audit_log_admin_user_id_fkey;
ALTER TABLE public.audit_log
  ADD CONSTRAINT audit_log_admin_user_id_fkey FOREIGN KEY (admin_user_id)
    REFERENCES public.admin_user (id) ON DELETE RESTRICT;
