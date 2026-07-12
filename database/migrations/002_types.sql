-- =====================================================================
-- Migration: 002_types.sql
-- Purpose:   Shared domains (reusable, constrained column types) used
--            across multiple tables in later migrations.
-- Target:    PostgreSQL 15+, Supabase-compatible.
-- Idempotent: Yes — each domain is created only if it does not already
--            exist (checked via pg_type), so this file may be re-run
--            safely.
-- Depends on: 001_extensions.sql (citext, pgcrypto)
--
-- Design note (binding, per the frozen Data Dictionary, Conventions
-- 0.2): workflow/status columns ("status", "order_type", etc.) are
-- deliberately implemented as `text` + table-local `CHECK` constraints,
-- NOT as native PostgreSQL ENUM types. Native enums are expensive to
-- evolve (adding a value is safe, but renaming or removing one is not
-- possible without a full type rebuild), which conflicts with the
-- explicit design goal of never requiring architectural redesign as
-- the business grows. This migration therefore defines NO enum types
-- for workflow states. It defines only cross-cutting DOMAINS for
-- genuinely fixed, shared, low-level value shapes (slugs, currency
-- codes, percentages, money, email, phone, channel, jsonb shape
-- guards) that are reused identically across many tables and whose
-- validation rule itself is part of the frozen contract.
-- =====================================================================

-- ---------------------------------------------------------------------
-- app_slug
-- URL-safe slug: lowercase alphanumeric segments separated by single
-- hyphens. Used by: department, category, brand, product, collection,
-- page. (Conventions 0.2: "Slugs: text, always UNIQUE, always with a
-- CHECK constraint restricting to lowercase alphanumeric + hyphen".)
-- ---------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_slug') THEN
    CREATE DOMAIN public.app_slug AS text
      CHECK (VALUE ~ '^[a-z0-9]+(-[a-z0-9]+)*$');
  END IF;
END
$$;

COMMENT ON DOMAIN public.app_slug IS
  'URL-safe slug: lowercase alphanumeric segments separated by single hyphens. Used for all catalog/CMS slug columns.';

-- ---------------------------------------------------------------------
-- app_email
-- Case-insensitive email address with a basic format check. Backed by
-- citext (001_extensions.sql) so uniqueness comparisons and lookups
-- are inherently case-insensitive at the database level, not just by
-- application-layer normalization. Used by: customer.email,
-- admin_user.email, inquiry.email.
-- ---------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_email') THEN
    CREATE DOMAIN public.app_email AS extensions.citext
      CHECK (VALUE ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');
  END IF;
END
$$;

COMMENT ON DOMAIN public.app_email IS
  'Case-insensitive email address with basic format validation. Backed by citext.';

-- ---------------------------------------------------------------------
-- app_phone
-- Loosely validated phone number (E.164-leaning, but intentionally
-- permissive since exact carrier/country formatting rules vary and
-- strict validation belongs at the application layer per BRS v2.0).
-- Used by: customer.phone, address (contact numbers, if added later),
-- inquiry.phone.
-- ---------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_phone') THEN
    CREATE DOMAIN public.app_phone AS text
      CHECK (VALUE ~ '^\+?[0-9]{7,15}$');
  END IF;
END
$$;

COMMENT ON DOMAIN public.app_phone IS
  'Loosely validated phone number, digits only with optional leading +, 7-15 digits.';

-- ---------------------------------------------------------------------
-- app_currency_code
-- ISO-4217 three-letter currency code, always upper-case. Used by:
-- product.currency, order.currency, payment.currency.
-- (Conventions 0.2: "Currency: char(3) ISO-4217 code".)
-- ---------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_currency_code') THEN
    CREATE DOMAIN public.app_currency_code AS char(3)
      CHECK (VALUE ~ '^[A-Z]{3}$');
  END IF;
END
$$;

COMMENT ON DOMAIN public.app_currency_code IS
  'ISO-4217 three-letter currency code, upper-case only, e.g. INR, USD.';

-- ---------------------------------------------------------------------
-- app_percentage
-- Percentage rate, 0-100 inclusive, two decimal places. Used by:
-- coupon.value (when discount_type='percent'), tax_rule.rate.
-- (Conventions 0.2: "numeric(5,2) for percentage rates".)
-- ---------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_percentage') THEN
    CREATE DOMAIN public.app_percentage AS numeric(5,2)
      CHECK (VALUE >= 0 AND VALUE <= 100);
  END IF;
END
$$;

COMMENT ON DOMAIN public.app_percentage IS
  'Percentage rate between 0 and 100 inclusive, two decimal places.';

-- ---------------------------------------------------------------------
-- app_money
-- Non-negative monetary amount, two decimal places. Applied only to
-- columns that are always non-negative by business rule (e.g. prices,
-- payment amounts, invoice totals). NOT applied to columns that must
-- allow negative values by design (e.g. quotation_line_item.amount,
-- which permits negative discount lines per the Data Dictionary) —
-- those remain plain numeric(12,2) without this domain.
-- (Conventions 0.2: "numeric(12,2) for all monetary amounts".)
-- ---------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_money') THEN
    CREATE DOMAIN public.app_money AS numeric(12,2)
      CHECK (VALUE >= 0);
  END IF;
END
$$;

COMMENT ON DOMAIN public.app_money IS
  'Non-negative monetary amount with two decimal places. Use plain numeric(12,2) instead where negative values are a valid business case (e.g. discount line items).';

-- ---------------------------------------------------------------------
-- app_channel
-- Fixed communication channel vocabulary shared identically by
-- notification_template.channel and communication_preference.channel
-- (Data Dictionary: both tables independently specify
-- CHECK IN ('email','sms','whatsapp','push') — expressed once here as
-- a shared domain so the two tables can never drift out of agreement
-- on the channel vocabulary).
-- ---------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_channel') THEN
    CREATE DOMAIN public.app_channel AS text
      CHECK (VALUE IN ('email', 'sms', 'whatsapp', 'push'));
  END IF;
END
$$;

COMMENT ON DOMAIN public.app_channel IS
  'Shared communication channel vocabulary: email, sms, whatsapp, push. Used by notification_template and communication_preference.';

-- ---------------------------------------------------------------------
-- app_jsonb_object
-- Guards a jsonb column to always contain a JSON object (not an array,
-- scalar, or null-as-JSON). Used by columns such as
-- content_block.content, size_chart_entry.measurements,
-- measurement_profile.measurements where the Data Dictionary specifies
-- "must be a JSON object" as a stated validation rule.
-- ---------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_jsonb_object') THEN
    CREATE DOMAIN public.app_jsonb_object AS jsonb
      CHECK (jsonb_typeof(VALUE) = 'object');
  END IF;
END
$$;

COMMENT ON DOMAIN public.app_jsonb_object IS
  'jsonb value constrained to be a JSON object at the top level.';

-- ---------------------------------------------------------------------
-- app_jsonb_array
-- Guards a jsonb column to always contain a JSON array. Used by
-- columns such as garment_measurement_template.fields where the Data
-- Dictionary specifies "must be a JSON array of objects".
-- ---------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_jsonb_array') THEN
    CREATE DOMAIN public.app_jsonb_array AS jsonb
      CHECK (jsonb_typeof(VALUE) = 'array');
  END IF;
END
$$;

COMMENT ON DOMAIN public.app_jsonb_array IS
  'jsonb value constrained to be a JSON array at the top level.';

-- ---------------------------------------------------------------------
-- app_iso_country_code
-- Two-letter ISO-3166-1 alpha-2 country code, upper-case. Used by:
-- address.country.
-- ---------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_iso_country_code') THEN
    CREATE DOMAIN public.app_iso_country_code AS char(2)
      CHECK (VALUE ~ '^[A-Z]{2}$');
  END IF;
END
$$;

COMMENT ON DOMAIN public.app_iso_country_code IS
  'ISO-3166-1 alpha-2 country code, upper-case only, e.g. IN, US.';
