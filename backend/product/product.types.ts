/**
 * src/features/product/product.types.ts
 *
 * Domain types for the Product module. Two read shapes are exposed
 * deliberately, matching two different real query paths against the
 * frozen schema:
 *   - `ProductSummary`  — the v_product_catalog view (017_views.sql),
 *     used for browse/search/collection grids.
 *   - `ProductDetail`   — a richer, multi-query assembly (base product
 *     row + images + specifications + variant availability + related
 *     products), used for the single Product Detail page.
 * These are NOT the same shape with optional fields bolted on — they
 * correspond to genuinely different query costs, and callers should
 * consciously choose which one they need.
 */
import type {
  ProductRow,
  VProductCatalogRow,
  ProductImageRow,
  ProductSpecificationRow,
  VProductVariantAvailabilityRow,
  ProductTypeCode,
  ProductStatus,
  ProductVisibility,
} from '../../lib/supabase/database.types';
import { getCatalogPublicUrl } from '../../lib/supabase/storage';

// ---------------------------------------------------------------------
// ProductSummary (browse/search/collection grid — v_product_catalog)
// ---------------------------------------------------------------------

export interface ProductSummary {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  productTypeCode: ProductTypeCode;
  departmentSlug: string;
  departmentName: string;
  categorySlug: string | null;
  categoryName: string | null;
  price: number | null;
  compareAtPrice: number | null;
  currency: string;
  leadTimeDaysMin: number | null;
  leadTimeDaysMax: number | null;
  isFeatured: boolean;
  isTrending: boolean;
  isNewArrival: boolean;
  averageRating: number | null;
  reviewCount: number;
  imageUrl: string | null;
  imageAltText: string | null;
}

export function mapProductSummary(row: VProductCatalogRow): ProductSummary {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    productTypeCode: row.product_type_code,
    departmentSlug: row.department_slug,
    departmentName: row.department_name,
    categorySlug: row.category_slug,
    categoryName: row.category_name,
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
    imageUrl: row.primary_image_storage_path ? getCatalogPublicUrl(row.primary_image_storage_path) : null,
    imageAltText: row.primary_image_alt_text,
  };
}

// ---------------------------------------------------------------------
// ProductDetail (single Product Detail page)
// ---------------------------------------------------------------------

export interface ProductImage {
  id: string;
  url: string;
  altText: string | null;
  isPrimary: boolean;
  sortOrder: number;
}

export function mapProductImage(row: ProductImageRow, storagePath: string): ProductImage {
  return {
    id: row.id,
    url: getCatalogPublicUrl(storagePath),
    altText: row.alt_text,
    isPrimary: row.is_primary,
    sortOrder: row.sort_order,
  };
}

export interface ProductSpecification {
  key: string;
  value: string;
  sortOrder: number;
}

export function mapProductSpecification(row: ProductSpecificationRow): ProductSpecification {
  return { key: row.spec_key, value: row.spec_value, sortOrder: row.sort_order };
}

export type VariantAvailabilityStatus = VProductVariantAvailabilityRow['availability_status'];

export interface VariantAvailability {
  variantId: string;
  size: string | null;
  color: string | null;
  sku: string;
  availableQty: number | null;
  status: VariantAvailabilityStatus;
}

export function mapVariantAvailability(row: VProductVariantAvailabilityRow): VariantAvailability {
  return {
    variantId: row.variant_id,
    size: row.size,
    color: row.color,
    sku: row.sku,
    availableQty: row.available_qty,
    status: row.availability_status,
  };
}

export interface ProductDetail {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  productTypeCode: ProductTypeCode;
  status: ProductStatus;
  visibility: ProductVisibility;
  departmentId: string;
  categoryId: string | null;
  brandId: string | null;
  price: number | null;
  compareAtPrice: number | null;
  currency: string;
  leadTimeDaysMin: number | null;
  leadTimeDaysMax: number | null;
  fabric: string | null;
  craftsmanship: string | null;
  careInstructions: string | null;
  shippingInfo: string | null;
  returnPolicy: string | null;
  averageRating: number | null;
  reviewCount: number;
  images: ProductImage[];
  specifications: ProductSpecification[];
  variants: VariantAvailability[];
  relatedProducts: ProductSummary[];
}

export function mapProductDetail(
  row: ProductRow,
  productTypeCode: ProductTypeCode,
  images: ProductImage[],
  specifications: ProductSpecification[],
  variants: VariantAvailability[],
  relatedProducts: ProductSummary[]
): ProductDetail {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    productTypeCode,
    status: row.status,
    visibility: row.visibility,
    departmentId: row.department_id,
    categoryId: row.category_id,
    brandId: row.brand_id,
    price: row.price !== null ? Number(row.price) : null,
    compareAtPrice: row.compare_at_price !== null ? Number(row.compare_at_price) : null,
    currency: row.currency,
    leadTimeDaysMin: row.lead_time_days_min,
    leadTimeDaysMax: row.lead_time_days_max,
    fabric: row.fabric,
    craftsmanship: row.craftsmanship,
    careInstructions: row.care_instructions,
    shippingInfo: row.shipping_info,
    returnPolicy: row.return_policy,
    averageRating: row.average_rating !== null ? Number(row.average_rating) : null,
    reviewCount: row.review_count,
    images,
    specifications,
    variants,
    relatedProducts,
  };
}

// ---------------------------------------------------------------------
// Filters / inputs
// ---------------------------------------------------------------------

export type ProductSortColumn = 'created_at' | 'price' | 'name';

export interface ListProductsParams {
  departmentSlug?: string;
  categorySlug?: string;
  isFeatured?: boolean;
  isTrending?: boolean;
  isNewArrival?: boolean;
  sort?: { column: ProductSortColumn; direction?: 'asc' | 'desc' };
  page?: number;
  pageSize?: number;
}

export interface SearchProductsParams {
  query: string;
  page?: number;
  pageSize?: number;
}

export interface CreateProductInput {
  slug: string;
  name: string;
  description?: string;
  productTypeId: string;
  departmentId: string;
  categoryId?: string;
  brandId?: string;
  genderId?: string;
  ageGroupId?: string;
  price?: number;
  compareAtPrice?: number;
  currency?: string;
  leadTimeDaysMin?: number;
  leadTimeDaysMax?: number;
  fabric?: string;
  craftsmanship?: string;
  careInstructions?: string;
  shippingInfo?: string;
  returnPolicy?: string;
}

export interface UpdateProductInput {
  name?: string;
  description?: string | null;
  categoryId?: string | null;
  brandId?: string | null;
  genderId?: string | null;
  ageGroupId?: string | null;
  price?: number | null;
  compareAtPrice?: number | null;
  leadTimeDaysMin?: number | null;
  leadTimeDaysMax?: number | null;
  fabric?: string | null;
  craftsmanship?: string | null;
  careInstructions?: string | null;
  shippingInfo?: string | null;
  returnPolicy?: string | null;
}

export interface AddProductImageInput {
  productId: string;
  mediaAssetId: string;
  sortOrder?: number;
  isPrimary?: boolean;
  altText?: string;
}

export interface AddProductSpecificationInput {
  productId: string;
  key: string;
  value: string;
  sortOrder?: number;
}
