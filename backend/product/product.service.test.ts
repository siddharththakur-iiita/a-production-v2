/**
 * src/features/product/__tests__/product.service.test.ts
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import * as repo from '../product.repository';
import * as service from '../product.service';
import { ProductError } from '../product.errors';
import type { ProductRow, VProductCatalogRow, ProductImageRow } from '../../../lib/supabase/database.types';

vi.mock('../product.repository');

function makeCatalogRow(overrides: Partial<VProductCatalogRow> = {}): VProductCatalogRow {
  return {
    id: 'prod-1',
    slug: 'ivory-zardosi-sherwani',
    name: 'The Ivory Zardosi Sherwani',
    description: 'A hand-embroidered sherwani.',
    product_type_code: 'made_to_order',
    department_slug: 'men',
    department_name: 'Men',
    category_slug: 'sherwani',
    category_name: 'Sherwani',
    price: '45000.00',
    compare_at_price: '52000.00',
    currency: 'INR',
    lead_time_days_min: 42,
    lead_time_days_max: 56,
    is_featured: true,
    is_trending: false,
    is_new_arrival: false,
    average_rating: '4.8',
    review_count: 23,
    primary_image_storage_path: 'products/sherwani-1.jpg',
    primary_image_alt_text: 'Front view of ivory sherwani',
    ...overrides,
  };
}

function makeProductRow(overrides: Partial<ProductRow> = {}): ProductRow {
  return {
    id: 'prod-1',
    slug: 'ivory-zardosi-sherwani',
    name: 'The Ivory Zardosi Sherwani',
    description: 'A hand-embroidered sherwani.',
    product_type_id: 'pt-made-to-order',
    department_id: 'dept-men',
    category_id: 'cat-sherwani',
    brand_id: null,
    gender_id: null,
    age_group_id: null,
    status: 'published',
    visibility: 'public',
    is_featured: true,
    is_trending: false,
    is_new_arrival: false,
    price: '45000.00',
    compare_at_price: '52000.00',
    currency: 'INR',
    lead_time_days_min: 42,
    lead_time_days_max: 56,
    fabric: 'Raw Silk',
    craftsmanship: 'Hand-embroidered Zardosi',
    care_instructions: null,
    shipping_info: null,
    return_policy: null,
    average_rating: '4.8',
    review_count: 23,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    deleted_at: null,
    created_by: null,
    updated_by: null,
    version: 1,
    ...overrides,
  };
}

describe('product.service', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('listProducts', () => {
    it('maps view rows to ProductSummary and wraps them in pagination metadata', async () => {
      vi.mocked(repo.findPublicProducts).mockResolvedValue({
        rows: [makeCatalogRow()],
        count: 1,
      });

      const result = await service.listProducts({ departmentSlug: 'men', page: 1, pageSize: 24 });

      expect(repo.findPublicProducts).toHaveBeenCalledWith({ departmentSlug: 'men', page: 1, pageSize: 24 });
      expect(result.totalCount).toBe(1);
      expect(result.items[0].price).toBe(45000);
      expect(result.items[0].compareAtPrice).toBe(52000);
      expect(result.items[0].averageRating).toBe(4.8);
    });
  });

  describe('searchProducts', () => {
    it('rejects an empty query before calling the repository', async () => {
      await expect(service.searchProducts({ query: '' })).rejects.toThrow(ProductError);
      expect(repo.searchProductsByText).not.toHaveBeenCalled();
    });

    it('resolves the real product_type code from the join rather than assuming one', async () => {
      vi.mocked(repo.searchProductsByText).mockResolvedValue({
        rows: [
          {
            ...makeProductRow(),
            product_type: { code: 'bespoke_template' },
            department: { slug: 'men', name: 'Men' },
            category: { slug: 'sherwani', name: 'Sherwani' },
          } as never,
        ],
        count: 1,
      });

      const result = await service.searchProducts({ query: 'sherwani' });

      expect(result.items[0].productTypeCode).toBe('bespoke_template');
    });
  });

  describe('getProductBySlug', () => {
    it('returns null when the product does not exist (or is not published/public)', async () => {
      vi.mocked(repo.findProductBaseBySlug).mockResolvedValue(null);

      const result = await service.getProductBySlug('does-not-exist');

      expect(result).toBeNull();
    });

    it('assembles images, specifications, variants, and related products, preserving curated related-product order', async () => {
      vi.mocked(repo.findProductBaseBySlug).mockResolvedValue({
        product: makeProductRow(),
        productTypeCode: 'made_to_order',
      });
      vi.mocked(repo.findProductImages).mockResolvedValue([
        {
          id: 'img-1',
          product_id: 'prod-1',
          media_asset_id: 'ma-1',
          sort_order: 0,
          is_primary: true,
          alt_text: 'Front',
          created_at: '2026-01-01T00:00:00Z',
          updated_at: '2026-01-01T00:00:00Z',
          media_asset: { storage_path: 'products/sherwani-1.jpg' },
        } as ProductImageRow & { media_asset: { storage_path: string } },
      ]);
      vi.mocked(repo.findProductSpecifications).mockResolvedValue([]);
      vi.mocked(repo.findVariantAvailability).mockResolvedValue([]);
      // Curated order is [related-2, related-1] — the assembly must
      // preserve this, not the order findCatalogProductsByIds returns.
      vi.mocked(repo.findRelatedProductIds).mockResolvedValue(['related-2', 'related-1']);
      vi.mocked(repo.findCatalogProductsByIds).mockResolvedValue([
        makeCatalogRow({ id: 'related-1', slug: 'related-one' }),
        makeCatalogRow({ id: 'related-2', slug: 'related-two' }),
      ]);

      const result = await service.getProductBySlug('ivory-zardosi-sherwani');

      expect(result).not.toBeNull();
      expect(result!.productTypeCode).toBe('made_to_order');
      expect(result!.images).toHaveLength(1);
      expect(result!.images[0].isPrimary).toBe(true);
      expect(result!.relatedProducts.map((p) => p.slug)).toEqual(['related-two', 'related-one']);
    });
  });

  describe('createProduct', () => {
    it('rejects compareAtPrice below price before calling the repository', async () => {
      await expect(
        service.createProduct({
          slug: 'test-product',
          name: 'Test Product',
          productTypeId: '11111111-1111-1111-1111-111111111111',
          departmentId: '22222222-2222-2222-2222-222222222222',
          price: 1000,
          compareAtPrice: 500,
        })
      ).rejects.toThrow(ProductError);

      expect(repo.insertProduct).not.toHaveBeenCalled();
    });

    it('rejects leadTimeDaysMax below leadTimeDaysMin before calling the repository', async () => {
      await expect(
        service.createProduct({
          slug: 'test-product',
          name: 'Test Product',
          productTypeId: '11111111-1111-1111-1111-111111111111',
          departmentId: '22222222-2222-2222-2222-222222222222',
          leadTimeDaysMin: 60,
          leadTimeDaysMax: 30,
        })
      ).rejects.toThrow(ProductError);

      expect(repo.insertProduct).not.toHaveBeenCalled();
    });
  });
});
