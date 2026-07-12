/**
 * src/features/category/category.repository.ts
 *
 * Repository layer: every function here is a thin, direct wrapper
 * around exactly one Supabase query against public.category
 * (005_catalog.sql). No business logic, no validation, no error
 * mapping — that belongs in category.service.ts. Kept separate so the
 * service layer (and its unit tests) can mock this module's functions
 * without needing a real Supabase client.
 *
 * RLS reminder (016_rls.sql):
 *   category_read:  anon/authenticated SELECT WHERE is_active
 *   category_write: authenticated ALL, gated on app_has_permission('catalog.write')
 * These repository functions issue plain queries; RLS is what
 * actually enforces the read/write boundary at the database level.
 */
import { supabase } from '../../lib/supabase/client';
import type {
  CategoryRow,
  CategoryInsert,
  CategoryUpdate,
} from '../../lib/supabase/database.types';

/**
 * SELECT * FROM category WHERE is_active
 *   [AND department_id = :departmentId]
 *   [AND parent_category_id = :parentCategoryId | IS NULL]
 * ORDER BY sort_order
 */
export async function findActiveCategories(params: {
  departmentId?: string;
  parentCategoryId?: string | null;
}): Promise<CategoryRow[]> {
  let query = supabase.from('category').select('*').eq('is_active', true).order('sort_order', { ascending: true });

  if (params.departmentId) {
    query = query.eq('department_id', params.departmentId);
  }
  if (params.parentCategoryId === null) {
    query = query.is('parent_category_id', null);
  } else if (params.parentCategoryId !== undefined) {
    query = query.eq('parent_category_id', params.parentCategoryId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

/** SELECT * FROM category WHERE id = :id LIMIT 1 */
export async function findCategoryById(id: string): Promise<CategoryRow | null> {
  const { data, error } = await supabase.from('category').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data;
}

/**
 * SELECT category.* FROM category
 *   JOIN department ON department.id = category.department_id
 * WHERE department.slug = :departmentSlug AND category.slug = :categorySlug
 * LIMIT 1
 *
 * category.slug is only unique within (department_id, parent_category_id)
 * per the frozen schema, so a global slug-only lookup is not a valid
 * query shape — department context is always required.
 */
export async function findCategoryBySlug(
  departmentSlug: string,
  categorySlug: string
): Promise<CategoryRow | null> {
  const { data, error } = await supabase
    .from('category')
    .select('*, department!inner(slug)')
    .eq('slug', categorySlug)
    .eq('department.slug', departmentSlug)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  // Strip the joined department relation back out — callers only need
  // the CategoryRow shape; the join above exists purely to filter.
  const { department: _department, ...category } = data as CategoryRow & {
    department: { slug: string };
  };
  return category;
}

/** INSERT INTO category (...) VALUES (...) RETURNING * */
export async function insertCategory(input: CategoryInsert): Promise<CategoryRow> {
  const { data, error } = await supabase.from('category').insert(input).select('*').single();
  if (error) throw error;
  return data;
}

/** UPDATE category SET ... WHERE id = :id RETURNING * */
export async function updateCategoryRow(id: string, patch: CategoryUpdate): Promise<CategoryRow> {
  const { data, error } = await supabase.from('category').update(patch).eq('id', id).select('*').single();
  if (error) throw error;
  return data;
}

/**
 * Deactivation, not deletion — category is a Pattern B lookup table
 * with no soft-delete column; is_active is the sanctioned way to hide
 * a category from the public catalog while preserving any product
 * rows that still reference it (category_id uses ON DELETE RESTRICT,
 * so a hard delete would be rejected by the FK anyway if any product
 * still references this category).
 */
export async function setCategoryActive(id: string, isActive: boolean): Promise<CategoryRow> {
  return updateCategoryRow(id, { is_active: isActive });
}
