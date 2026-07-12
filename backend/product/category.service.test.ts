/**
 * src/features/category/__tests__/category.service.test.ts
 *
 * Unit tests for the service layer, with the repository layer mocked
 * — these tests verify business logic (validation, tree assembly,
 * error mapping) without needing a real Supabase connection. Written
 * for Vitest (matches the Vite toolchain), but the mocking pattern
 * translates directly to Jest if the project standardizes on that
 * instead.
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import * as repo from '../category.repository';
import * as service from '../category.service';
import { CategoryError } from '../category.errors';
import type { CategoryRow } from '../../../lib/supabase/database.types';

vi.mock('../category.repository');

function makeCategoryRow(overrides: Partial<CategoryRow> = {}): CategoryRow {
  return {
    id: 'cat-1',
    parent_category_id: null,
    department_id: 'dept-women',
    name: 'Lehengas',
    slug: 'lehengas',
    sort_order: 0,
    is_active: true,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

describe('category.service', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('listCategories', () => {
    it('maps repository rows to domain Category objects', async () => {
      vi.mocked(repo.findActiveCategories).mockResolvedValue([makeCategoryRow()]);

      const result = await service.listCategories({ departmentId: 'dept-women' });

      expect(repo.findActiveCategories).toHaveBeenCalledWith({
        departmentId: 'dept-women',
        parentCategoryId: undefined,
      });
      expect(result).toEqual([
        {
          id: 'cat-1',
          parentCategoryId: null,
          departmentId: 'dept-women',
          name: 'Lehengas',
          slug: 'lehengas',
          sortOrder: 0,
          isActive: true,
        },
      ]);
    });
  });

  describe('getCategoryTree', () => {
    it('assembles a flat list into a nested tree by parentCategoryId', async () => {
      vi.mocked(repo.findActiveCategories).mockResolvedValue([
        makeCategoryRow({ id: 'root', slug: 'lehengas', parent_category_id: null, sort_order: 0 }),
        makeCategoryRow({ id: 'child-1', slug: 'bridal-lehengas', parent_category_id: 'root', sort_order: 0 }),
        makeCategoryRow({ id: 'child-2', slug: 'festive-lehengas', parent_category_id: 'root', sort_order: 1 }),
        makeCategoryRow({ id: 'other-root', slug: 'sarees', parent_category_id: null, sort_order: 1 }),
      ]);

      const tree = await service.getCategoryTree('dept-women');

      expect(tree).toHaveLength(2);
      expect(tree[0].id).toBe('root');
      expect(tree[0].children).toHaveLength(2);
      expect(tree[0].children.map((c) => c.id)).toEqual(['child-1', 'child-2']);
      expect(tree[1].id).toBe('other-root');
      expect(tree[1].children).toHaveLength(0);
    });
  });

  describe('createCategory', () => {
    it('rejects invalid input before calling the repository', async () => {
      await expect(
        service.createCategory({
          departmentId: 'not-a-uuid',
          name: 'Lehengas',
          slug: 'Lehengas', // invalid: uppercase not allowed by the slug schema
        })
      ).rejects.toThrow(CategoryError);

      expect(repo.insertCategory).not.toHaveBeenCalled();
    });

    it('passes validated input through to the repository on success', async () => {
      vi.mocked(repo.insertCategory).mockResolvedValue(
        makeCategoryRow({ id: 'new-cat', slug: 'kurtis' })
      );

      const result = await service.createCategory({
        departmentId: '11111111-1111-1111-1111-111111111111',
        name: 'Kurtis',
        slug: 'kurtis',
      });

      expect(repo.insertCategory).toHaveBeenCalledWith(
        expect.objectContaining({
          department_id: '11111111-1111-1111-1111-111111111111',
          name: 'Kurtis',
          slug: 'kurtis',
        })
      );
      expect(result.id).toBe('new-cat');
    });
  });

  describe('updateCategory', () => {
    it('rejects setting a category as its own parent without calling the repository', async () => {
      await expect(
        service.updateCategory('cat-1', { parentCategoryId: 'cat-1' })
      ).rejects.toThrow(/cannot be its own parent/);

      expect(repo.updateCategoryRow).not.toHaveBeenCalled();
    });
  });
});
