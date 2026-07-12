/**
 * src/features/category/category.types.ts
 *
 * Domain types for the Category module, mapped from the raw
 * database.types.ts row shapes (category table, 005_catalog.sql).
 */
import type { CategoryRow } from '../../lib/supabase/database.types';

export interface Category {
  id: string;
  parentCategoryId: string | null;
  departmentId: string;
  name: string;
  slug: string;
  sortOrder: number;
  isActive: boolean;
}

/** A Category with its immediate children nested, built client-side from a flat list (Data Dictionary 01: category is self-referential, unlimited depth). */
export interface CategoryTreeNode extends Category {
  children: CategoryTreeNode[];
}

export function mapCategoryRow(row: CategoryRow): Category {
  return {
    id: row.id,
    parentCategoryId: row.parent_category_id,
    departmentId: row.department_id,
    name: row.name,
    slug: row.slug,
    sortOrder: row.sort_order,
    isActive: row.is_active,
  };
}

export interface CreateCategoryInput {
  departmentId: string;
  parentCategoryId?: string | null;
  name: string;
  slug: string;
  sortOrder?: number;
}

export interface UpdateCategoryInput {
  name?: string;
  slug?: string;
  parentCategoryId?: string | null;
  sortOrder?: number;
}

export interface ListCategoriesParams {
  departmentId?: string;
  parentCategoryId?: string | null;
}
