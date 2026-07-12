/**
 * src/features/category/category.service.ts
 *
 * Business logic layer: validates input (category.validation.ts),
 * calls the repository (category.repository.ts), maps errors
 * (category.errors.ts), and maps raw rows to domain types
 * (category.types.ts). This is the layer React Query hooks and any
 * other module consumer should call — never the repository directly.
 */
import * as repo from './category.repository';
import {
  mapCategoryRow,
  type Category,
  type CategoryTreeNode,
  type CreateCategoryInput,
  type UpdateCategoryInput,
  type ListCategoriesParams,
} from './category.types';
import { createCategorySchema, updateCategorySchema } from './category.validation';
import { CategoryError, mapCategoryPostgrestError, mapCategoryZodError } from './category.errors';

/** Lists active categories, optionally filtered by department and/or parent. */
export async function listCategories(params: ListCategoriesParams = {}): Promise<Category[]> {
  try {
    const rows = await repo.findActiveCategories({
      departmentId: params.departmentId,
      parentCategoryId: params.parentCategoryId,
    });
    return rows.map(mapCategoryRow);
  } catch (err) {
    throw mapCategoryPostgrestError(err as never);
  }
}

/**
 * Fetches every active category for a department and assembles it
 * into a tree client-side. category is self-referential with
 * unlimited depth (Data Dictionary 01) — PostgREST cannot express a
 * recursive CTE, so the flat-list-then-assemble approach here is the
 * correct query shape for this schema, not a workaround.
 */
export async function getCategoryTree(departmentId: string): Promise<CategoryTreeNode[]> {
  const flat = await listCategories({ departmentId });
  return buildTree(flat, null);
}

function buildTree(flat: Category[], parentId: string | null): CategoryTreeNode[] {
  return flat
    .filter((c) => c.parentCategoryId === parentId)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((c) => ({ ...c, children: buildTree(flat, c.id) }));
}

export async function getCategoryById(id: string): Promise<Category | null> {
  try {
    const row = await repo.findCategoryById(id);
    return row ? mapCategoryRow(row) : null;
  } catch (err) {
    throw mapCategoryPostgrestError(err as never);
  }
}

export async function getCategoryBySlug(
  departmentSlug: string,
  categorySlug: string
): Promise<Category | null> {
  try {
    const row = await repo.findCategoryBySlug(departmentSlug, categorySlug);
    return row ? mapCategoryRow(row) : null;
  } catch (err) {
    throw mapCategoryPostgrestError(err as never);
  }
}

/** Creates a category. Requires the caller to hold catalog.write (enforced by category_write RLS policy). */
export async function createCategory(input: CreateCategoryInput): Promise<Category> {
  const parsed = createCategorySchema.safeParse(input);
  if (!parsed.success) throw mapCategoryZodError(parsed.error);

  try {
    const row = await repo.insertCategory({
      department_id: parsed.data.departmentId,
      parent_category_id: parsed.data.parentCategoryId ?? null,
      name: parsed.data.name,
      slug: parsed.data.slug,
      sort_order: parsed.data.sortOrder,
    });
    return mapCategoryRow(row);
  } catch (err) {
    throw mapCategoryPostgrestError(err as never);
  }
}

/** Updates a category. Requires catalog.write. Rejects setting a category as its own parent before it ever reaches the database. */
export async function updateCategory(id: string, input: UpdateCategoryInput): Promise<Category> {
  const parsed = updateCategorySchema.safeParse(input);
  if (!parsed.success) throw mapCategoryZodError(parsed.error);

  if (parsed.data.parentCategoryId === id) {
    throw new CategoryError('self_parent_not_allowed', 'A category cannot be its own parent.');
  }

  try {
    const row = await repo.updateCategoryRow(id, {
      name: parsed.data.name,
      slug: parsed.data.slug,
      parent_category_id: parsed.data.parentCategoryId,
      sort_order: parsed.data.sortOrder,
    });
    return mapCategoryRow(row);
  } catch (err) {
    throw mapCategoryPostgrestError(err as never);
  }
}

export async function deactivateCategory(id: string): Promise<Category> {
  try {
    const row = await repo.setCategoryActive(id, false);
    return mapCategoryRow(row);
  } catch (err) {
    throw mapCategoryPostgrestError(err as never);
  }
}

export async function reactivateCategory(id: string): Promise<Category> {
  try {
    const row = await repo.setCategoryActive(id, true);
    return mapCategoryRow(row);
  } catch (err) {
    throw mapCategoryPostgrestError(err as never);
  }
}
