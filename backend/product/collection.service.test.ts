/**
 * src/features/collection/__tests__/collection.service.test.ts
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import * as repo from '../collection.repository';
import * as service from '../collection.service';
import { CollectionError } from '../collection.errors';
import type { CollectionRow, ProductCollectionRow, VProductCatalogRow } from '../../../lib/supabase/database.types';

vi.mock('../collection.repository');

function makeCollectionRow(overrides: Partial<CollectionRow> = {}): CollectionRow {
  return {
    id: 'col-1',
    slug: 'bridal-couture',
    title: 'Bridal Couture',
    label: 'The Heritage',
    description: null,
    hero_media_asset_id: null,
    status: 'published',
    sort_order: 0,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    deleted_at: null,
    created_by: null,
    updated_by: null,
    version: 1,
    ...overrides,
  };
}

function makeCatalogRow(overrides: Partial<VProductCatalogRow> = {}): VProductCatalogRow {
  return {
    id: 'prod-1',
    slug: 'ivory-zardosi-sherwani',
    name: 'The Ivory Zardosi Sherwani',
    description: null,
    product_type_code: 'made_to_order',
    department_slug: 'men',
    department_name: 'Men',
    category_slug: null,
    category_name: null,
    price: '45000.00',
    compare_at_price: null,
    currency: 'INR',
    lead_time_days_min: 42,
    lead_time_days_max: 56,
    is_featured: false,
    is_trending: false,
    is_new_arrival: false,
    average_rating: null,
    review_count: 0,
    primary_image_storage_path: 'products/sherwani-1.jpg',
    primary_image_alt_text: 'Front view',
    ...overrides,
  };
}

describe('collection.service', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('createCollection', () => {
    it('rejects an invalid slug before calling the repository', async () => {
      await expect(
        service.createCollection({ slug: 'Bridal Couture!', title: 'Bridal Couture' })
      ).rejects.toThrow(CollectionError);

      expect(repo.insertCollection).not.toHaveBeenCalled();
    });

    it('creates a collection with valid input', async () => {
      vi.mocked(repo.insertCollection).mockResolvedValue(makeCollectionRow());

      const result = await service.createCollection({
        slug: 'bridal-couture',
        title: 'Bridal Couture',
      });

      expect(repo.insertCollection).toHaveBeenCalledWith(
        expect.objectContaining({ slug: 'bridal-couture', title: 'Bridal Couture' })
      );
      expect(result.slug).toBe('bridal-couture');
    });
  });

  describe('getCollectionProducts', () => {
    it('returns an empty array without querying the catalog view when the collection has no members', async () => {
      vi.mocked(repo.findProductCollectionRows).mockResolvedValue([]);

      const result = await service.getCollectionProducts('col-1');

      expect(result).toEqual([]);
      expect(repo.findCatalogProductsByIds).not.toHaveBeenCalled();
    });

    it('merges membership rows with the catalog projection, in curated sort order', async () => {
      const memberships: ProductCollectionRow[] = [
        { product_id: 'prod-2', collection_id: 'col-1', sort_order: 1, created_at: '2026-01-01T00:00:00Z' },
        { product_id: 'prod-1', collection_id: 'col-1', sort_order: 0, created_at: '2026-01-01T00:00:00Z' },
      ];
      vi.mocked(repo.findProductCollectionRows).mockResolvedValue(memberships);
      vi.mocked(repo.findCatalogProductsByIds).mockResolvedValue([
        makeCatalogRow({ id: 'prod-1', slug: 'product-one' }),
        makeCatalogRow({ id: 'prod-2', slug: 'product-two' }),
      ]);

      const result = await service.getCollectionProducts('col-1');

      expect(repo.findCatalogProductsByIds).toHaveBeenCalledWith(['prod-2', 'prod-1']);
      expect(result.map((p) => p.slug)).toEqual(['product-one', 'product-two']); // sorted by sort_order, not query order
      expect(result[0].price).toBe(45000);
    });

    it('silently omits a member product missing from the catalog projection (e.g. unpublished)', async () => {
      vi.mocked(repo.findProductCollectionRows).mockResolvedValue([
        { product_id: 'prod-1', collection_id: 'col-1', sort_order: 0, created_at: '2026-01-01T00:00:00Z' },
      ]);
      vi.mocked(repo.findCatalogProductsByIds).mockResolvedValue([]); // product exists but isn't published

      const result = await service.getCollectionProducts('col-1');

      expect(result).toEqual([]);
    });
  });

  describe('addProductToCollection', () => {
    it('rejects a non-UUID productId before calling the repository', async () => {
      await expect(
        service.addProductToCollection({ collectionId: 'col-1', productId: 'not-a-uuid' })
      ).rejects.toThrow(CollectionError);

      expect(repo.insertProductCollection).not.toHaveBeenCalled();
    });
  });
});
