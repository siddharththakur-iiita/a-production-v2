/**
 * src/features/product/product.service.ts
 */
import * as repo from './product.repository';
import {
  mapProductSummary,
  mapProductImage,
  mapProductSpecification,
  mapVariantAvailability,
  mapProductDetail,
  type ProductSummary,
  type ProductDetail,
  type ListProductsParams,
  type SearchProductsParams,
  type CreateProductInput,
  type UpdateProductInput,
  type AddProductImageInput,
  type AddProductSpecificationInput,
} from './product.types';
import {
  createProductSchema,
  updateProductSchema,
  addProductImageSchema,
  addProductSpecificationSchema,
  searchProductsSchema,
} from './product.validation';
import { mapProductPostgrestError, mapProductZodError, ProductError } from './product.errors';
import { toPaginatedResult, type PaginatedResult } from '../../lib/supabase/queryHelpers';
import type { TaxonomyTableName, ProductTypeCode } from '../../lib/supabase/database.types';

// ---------------------------------------------------------------------
// Public browse / search
// ---------------------------------------------------------------------

export async function listProducts(
  params: ListProductsParams = {}
): Promise<PaginatedResult<ProductSummary>> {
  try {
    const { rows, count } = await repo.findPublicProducts(params);
    return toPaginatedResult(rows.map(mapProductSummary), count, params);
  } catch (err) {
    throw mapProductPostgrestError(err as never);
  }
}

export async function searchProducts(
  params: SearchProductsParams
): Promise<PaginatedResult<ProductSummary>> {
  const parsed = searchProductsSchema.safeParse(params);
  if (!parsed.success) throw mapProductZodError(parsed.error);

  try {
    const { rows, count } = await repo.searchProductsByText(parsed.data.query, {
      page: parsed.data.page,
      pageSize: parsed.data.pageSize,
    });

    // Search hits the base `product` table directly (see
    // product.repository.ts) with a lightweight product_type/department/
    // category join, rather than v_product_catalog — image resolution
    // for search results is intentionally deferred to the caller
    // re-fetching a full ProductSummary/ProductDetail once a result is
    // selected, keeping the search query itself index-only and fast.
    const summaries: ProductSummary[] = rows.map((row) => ({
      id: row.id,
      slug: row.slug,
      name: row.name,
      description: row.description,
      productTypeCode: row.product_type.code as ProductTypeCode,
      departmentSlug: row.department?.slug ?? '',
      departmentName: row.department?.name ?? '',
      categorySlug: row.category?.slug ?? null,
      categoryName: row.category?.name ?? null,
      price: row.price !== null ? Number(row.price) : null,
      compareAtPrice: row.compare_at_price !== null ? Number(row.compare_at_price) : null,
      currency: row.currency,
      leadTimeDaysMin: row.lead_time_days_min,
      leadTimeDaysMax: row.lead_time_days_max,
      isFeatured: row.is_featured,
      isTrending: row.is_trending,
      isNewArrival: row.is_new_arrival,
      averageRating: row.average_rating !== null ? Number(row.average_rating) : null,
      reviewCount: row.review_count,
      imageUrl: null, // see note above — search results omit images by design, not by omission
      imageAltText: null,
    }));

    return toPaginatedResult(summaries, count, params);
  } catch (err) {
    throw mapProductPostgrestError(err as never);
  }
}

// ---------------------------------------------------------------------
// Product detail
// ---------------------------------------------------------------------

async function assembleProductDetail(
  base: NonNullable<Awaited<ReturnType<typeof repo.findProductBaseBySlug>>>
): Promise<ProductDetail> {
  const productId = base.product.id;

  const [imageRows, specRows, variantRows, relatedIds] = await Promise.all([
    repo.findProductImages(productId),
    repo.findProductSpecifications(productId),
    repo.findVariantAvailability(productId),
    repo.findRelatedProductIds(productId),
  ]);

  const relatedCatalogRows = await repo.findCatalogProductsByIds(relatedIds);
  // Preserve the curated order from product_relation, not the
  // arbitrary order the IN (...) query happens to return.
  const relatedById = new Map(relatedCatalogRows.map((r) => [r.id, r]));
  const relatedProducts = relatedIds
    .map((id) => relatedById.get(id))
    .filter((r): r is NonNullable<typeof r> => Boolean(r))
    .map(mapProductSummary);

  return mapProductDetail(
    base.product,
    base.productTypeCode as ProductTypeCode,
    imageRows.map((img) => mapProductImage(img, img.media_asset.storage_path)),
    specRows.map(mapProductSpecification),
    variantRows.map(mapVariantAvailability),
    relatedProducts
  );
}

export async function getProductBySlug(slug: string): Promise<ProductDetail | null> {
  try {
    const base = await repo.findProductBaseBySlug(slug);
    if (!base) return null;
    return assembleProductDetail(base);
  } catch (err) {
    throw mapProductPostgrestError(err as never);
  }
}

/** Admin detail fetch by id — sees any status via product_staff_read RLS (requires catalog.write). */
export async function getProductByIdForStaff(id: string): Promise<ProductDetail | null> {
  try {
    const base = await repo.findProductBaseById(id);
    if (!base) return null;
    return assembleProductDetail(base);
  } catch (err) {
    throw mapProductPostgrestError(err as never);
  }
}

// ---------------------------------------------------------------------
// Admin: core product CRUD
// ---------------------------------------------------------------------

export async function createProduct(input: CreateProductInput): Promise<ProductDetail> {
  const parsed = createProductSchema.safeParse(input);
  if (!parsed.success) throw mapProductZodError(parsed.error);

  try {
    const row = await repo.insertProduct({
      slug: parsed.data.slug,
      name: parsed.data.name,
      description: parsed.data.description,
      product_type_id: parsed.data.productTypeId,
      department_id: parsed.data.departmentId,
      category_id: parsed.data.categoryId,
      brand_id: parsed.data.brandId,
      gender_id: parsed.data.genderId,
      age_group_id: parsed.data.ageGroupId,
      price: parsed.data.price?.toFixed(2),
      compare_at_price: parsed.data.compareAtPrice?.toFixed(2),
      currency: parsed.data.currency,
      lead_time_days_min: parsed.data.leadTimeDaysMin,
      lead_time_days_max: parsed.data.leadTimeDaysMax,
      fabric: parsed.data.fabric,
      craftsmanship: parsed.data.craftsmanship,
      care_instructions: parsed.data.careInstructions,
      shipping_info: parsed.data.shippingInfo,
      return_policy: parsed.data.returnPolicy,
    });

    const base = await repo.findProductBaseById(row.id);
    if (!base) throw new ProductError('product_not_found', 'Product was created but could not be re-fetched.');
    return assembleProductDetail(base);
  } catch (err) {
    if (err instanceof ProductError) throw err;
    throw mapProductPostgrestError(err as never);
  }
}

export async function updateProduct(id: string, input: UpdateProductInput): Promise<ProductDetail> {
  const parsed = updateProductSchema.safeParse(input);
  if (!parsed.success) throw mapProductZodError(parsed.error);

  try {
    await repo.updateProductRow(id, {
      name: parsed.data.name,
      description: parsed.data.description,
      category_id: parsed.data.categoryId,
      brand_id: parsed.data.brandId,
      gender_id: parsed.data.genderId,
      age_group_id: parsed.data.ageGroupId,
      price: parsed.data.price === null ? null : parsed.data.price?.toFixed(2),
      compare_at_price: parsed.data.compareAtPrice === null ? null : parsed.data.compareAtPrice?.toFixed(2),
      lead_time_days_min: parsed.data.leadTimeDaysMin,
      lead_time_days_max: parsed.data.leadTimeDaysMax,
      fabric: parsed.data.fabric,
      craftsmanship: parsed.data.craftsmanship,
      care_instructions: parsed.data.careInstructions,
      shipping_info: parsed.data.shippingInfo,
      return_policy: parsed.data.returnPolicy,
    });

    const base = await repo.findProductBaseById(id);
    if (!base) throw new ProductError('product_not_found', 'Product not found after update.');
    return assembleProductDetail(base);
  } catch (err) {
    if (err instanceof ProductError) throw err;
    throw mapProductPostgrestError(err as never);
  }
}

export async function publishProduct(id: string) {
  try {
    return await repo.setProductStatus(id, 'published');
  } catch (err) {
    throw mapProductPostgrestError(err as never);
  }
}

export async function archiveProduct(id: string) {
  try {
    return await repo.setProductStatus(id, 'archived');
  } catch (err) {
    throw mapProductPostgrestError(err as never);
  }
}

export async function revertProductToDraft(id: string) {
  try {
    return await repo.setProductStatus(id, 'draft');
  } catch (err) {
    throw mapProductPostgrestError(err as never);
  }
}

export async function setProductFeatured(id: string, isFeatured: boolean) {
  try {
    return await repo.setProductFlags(id, { is_featured: isFeatured });
  } catch (err) {
    throw mapProductPostgrestError(err as never);
  }
}

export async function setProductTrending(id: string, isTrending: boolean) {
  try {
    return await repo.setProductFlags(id, { is_trending: isTrending });
  } catch (err) {
    throw mapProductPostgrestError(err as never);
  }
}

export async function deleteProduct(id: string): Promise<void> {
  try {
    await repo.softDeleteProduct(id);
  } catch (err) {
    throw mapProductPostgrestError(err as never);
  }
}

// ---------------------------------------------------------------------
// Admin: images
// ---------------------------------------------------------------------

export async function addProductImage(input: AddProductImageInput) {
  const parsed = addProductImageSchema.safeParse(input);
  if (!parsed.success) throw mapProductZodError(parsed.error);

  try {
    const row = await repo.insertProductImage({
      product_id: parsed.data.productId,
      media_asset_id: parsed.data.mediaAssetId,
      sort_order: parsed.data.sortOrder,
      is_primary: parsed.data.isPrimary,
      alt_text: parsed.data.altText,
    });
    return mapProductImage(row, row.media_asset.storage_path);
  } catch (err) {
    throw mapProductPostgrestError(err as never);
  }
}

export async function removeProductImage(imageId: string): Promise<void> {
  try {
    await repo.deleteProductImage(imageId);
  } catch (err) {
    throw mapProductPostgrestError(err as never);
  }
}

export async function setPrimaryImage(imageId: string): Promise<void> {
  try {
    await repo.setPrimaryProductImage(imageId);
  } catch (err) {
    throw mapProductPostgrestError(err as never);
  }
}

export async function reorderImage(imageId: string, sortOrder: number): Promise<void> {
  try {
    await repo.reorderProductImage(imageId, sortOrder);
  } catch (err) {
    throw mapProductPostgrestError(err as never);
  }
}

// ---------------------------------------------------------------------
// Admin: specifications
// ---------------------------------------------------------------------

export async function addProductSpecification(input: AddProductSpecificationInput) {
  const parsed = addProductSpecificationSchema.safeParse(input);
  if (!parsed.success) throw mapProductZodError(parsed.error);

  try {
    const row = await repo.insertProductSpecification({
      product_id: parsed.data.productId,
      spec_key: parsed.data.key,
      spec_value: parsed.data.value,
      sort_order: parsed.data.sortOrder,
    });
    return mapProductSpecification(row);
  } catch (err) {
    throw mapProductPostgrestError(err as never);
  }
}

export async function removeProductSpecification(specificationId: string): Promise<void> {
  try {
    await repo.deleteProductSpecification(specificationId);
  } catch (err) {
    throw mapProductPostgrestError(err as never);
  }
}

// ---------------------------------------------------------------------
// Admin: taxonomy assignment
// ---------------------------------------------------------------------

export async function assignTaxonomy(
  taxonomy: TaxonomyTableName,
  productId: string,
  taxonomyId: string
): Promise<void> {
  try {
    await repo.assignProductTaxonomy(repo.TAXONOMY_JOIN_TABLE[taxonomy], productId, taxonomyId);
  } catch (err) {
    throw mapProductPostgrestError(err as never);
  }
}

export async function unassignTaxonomy(
  taxonomy: TaxonomyTableName,
  productId: string,
  taxonomyId: string
): Promise<void> {
  try {
    await repo.unassignProductTaxonomy(repo.TAXONOMY_JOIN_TABLE[taxonomy], productId, taxonomyId);
  } catch (err) {
    throw mapProductPostgrestError(err as never);
  }
}

export async function getProductTaxonomyIds(
  taxonomy: TaxonomyTableName,
  productId: string
): Promise<string[]> {
  try {
    return await repo.findProductTaxonomyIds(repo.TAXONOMY_JOIN_TABLE[taxonomy], productId);
  } catch (err) {
    throw mapProductPostgrestError(err as never);
  }
}
