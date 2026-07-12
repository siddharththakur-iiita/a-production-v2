/**
 * src/features/product/product.repository.ts
 *
 * RLS reminder (016_rls.sql):
 *   product_read:        anon/authenticated SELECT WHERE status='published'
 *                         AND deleted_at IS NULL AND visibility IN ('public','search_only')
 *   product_staff_read:  authenticated SELECT, gated on catalog.write (sees everything)
 *   product_write:       authenticated ALL, gated on catalog.write
 *   product_image_read / product_specification_read / product_variant_read: public SELECT
 *   product_image_write / product_specification_write / product_variant_write: catalog.write
 *   product_material_write (and the other five taxonomy joins): catalog.write
 * v_product_catalog and v_product_variant_availability are
 * security_invoker views (017_views.sql) — they inherit product_read
 * automatically, no separate grant needed beyond SELECT on the view.
 */
import { supabase } from '../../lib/supabase/client';
import { findCatalogProductsByIds as sharedFindCatalogProductsByIds } from '../../lib/supabase/catalogQueries';
import type {
  ProductRow,
  ProductInsert,
  ProductUpdate,
  ProductImageRow,
  ProductImageInsert,
  ProductSpecificationRow,
  ProductSpecificationInsert,
  ProductStatus,
  VProductCatalogRow,
  VProductVariantAvailabilityRow,
  TaxonomyTableName,
  ProductTaxonomyJoinTableName,
} from '../../lib/supabase/database.types';
import { toRange, type PaginationParams } from '../../lib/supabase/queryHelpers';
import type { ListProductsParams } from './product.types';

// ---------------------------------------------------------------------
// Public browse / search (v_product_catalog, 017_views.sql)
// ---------------------------------------------------------------------

export async function findPublicProducts(
  params: ListProductsParams
): Promise<{ rows: VProductCatalogRow[]; count: number | null }> {
  let query = supabase.from('v_product_catalog').select('*', { count: 'exact' });

  if (params.departmentSlug) query = query.eq('department_slug', params.departmentSlug);
  if (params.categorySlug) query = query.eq('category_slug', params.categorySlug);
  if (params.isFeatured !== undefined) query = query.eq('is_featured', params.isFeatured);
  if (params.isTrending !== undefined) query = query.eq('is_trending', params.isTrending);
  if (params.isNewArrival !== undefined) query = query.eq('is_new_arrival', params.isNewArrival);

  const sortColumn = params.sort?.column ?? 'name';
  const ascending = (params.sort?.direction ?? 'asc') === 'asc';
  query = query.order(sortColumn, { ascending });

  const [from, to] = toRange({ page: params.page, pageSize: params.pageSize });
  query = query.range(from, to);

  const { data, error, count } = await query;
  if (error) throw error;
  return { rows: data, count };
}

/**
 * Full-text search directly against public.product.search_vector
 * (the GIN-indexed tsvector maintained by trg_product_search_vector,
 * 005_catalog.sql) — v_product_catalog does not expose that column,
 * so search intentionally queries the base table rather than the
 * view. RLS's product_read policy still applies, restricting results
 * to published/public rows exactly as the view does.
 */
export async function searchProductsByText(
  query: string,
  pagination: PaginationParams
): Promise<{
  rows: (ProductRow & {
    product_type: { code: string };
    department: { slug: string; name: string } | null;
    category: { slug: string; name: string } | null;
  })[];
  count: number | null;
}> {
  const [from, to] = toRange(pagination);

  const { data, error, count } = await supabase
    .from('product')
    .select(
      '*, product_type:product_type_id(code), department:department_id(slug, name), category:category_id(slug, name)',
      { count: 'exact' }
    )
    .textSearch('search_vector', query, { type: 'websearch', config: 'english' })
    .range(from, to);

  if (error) throw error;
  return { rows: data as never, count };
}

// ---------------------------------------------------------------------
// Product detail (multi-query assembly — see product.types.ts header)
// ---------------------------------------------------------------------

/** SELECT product.*, product_type(code) FROM product WHERE slug = :slug LIMIT 1 */
export async function findProductBaseBySlug(
  slug: string
): Promise<{ product: ProductRow; productTypeCode: string } | null> {
  const { data, error } = await supabase
    .from('product')
    .select('*, product_type:product_type_id(code)')
    .eq('slug', slug)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const { product_type, ...product } = data as ProductRow & { product_type: { code: string } };
  return { product: product as ProductRow, productTypeCode: product_type.code };
}

/** SELECT product.*, product_type(code) FROM product WHERE id = :id LIMIT 1 — admin path, any status. */
export async function findProductBaseById(
  id: string
): Promise<{ product: ProductRow; productTypeCode: string } | null> {
  const { data, error } = await supabase
    .from('product')
    .select('*, product_type:product_type_id(code)')
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const { product_type, ...product } = data as ProductRow & { product_type: { code: string } };
  return { product: product as ProductRow, productTypeCode: product_type.code };
}

/** SELECT product_image.*, media_asset(storage_path) FROM product_image WHERE product_id = :id ORDER BY sort_order */
export async function findProductImages(
  productId: string
): Promise<(ProductImageRow & { media_asset: { storage_path: string } })[]> {
  const { data, error } = await supabase
    .from('product_image')
    .select('*, media_asset:media_asset_id(storage_path)')
    .eq('product_id', productId)
    .order('sort_order', { ascending: true });

  if (error) throw error;
  return data as never;
}

/** SELECT * FROM product_specification WHERE product_id = :id ORDER BY sort_order */
export async function findProductSpecifications(productId: string): Promise<ProductSpecificationRow[]> {
  const { data, error } = await supabase
    .from('product_specification')
    .select('*')
    .eq('product_id', productId)
    .order('sort_order', { ascending: true });

  if (error) throw error;
  return data;
}

/** SELECT * FROM v_product_variant_availability WHERE product_id = :id */
export async function findVariantAvailability(
  productId: string
): Promise<VProductVariantAvailabilityRow[]> {
  const { data, error } = await supabase
    .from('v_product_variant_availability')
    .select('*')
    .eq('product_id', productId);

  if (error) throw error;
  return data;
}

/** SELECT related_product_id FROM product_relation WHERE product_id = :id AND relation_type = 'related' ORDER BY sort_order */
export async function findRelatedProductIds(productId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('product_relation')
    .select('related_product_id')
    .eq('product_id', productId)
    .eq('relation_type', 'related')
    .order('sort_order', { ascending: true });

  if (error) throw error;
  return data.map((r) => r.related_product_id);
}

/**
 * SELECT * FROM v_product_catalog WHERE id IN (:ids) — used to
 * resolve related product summaries. Delegates to the shared
 * implementation in lib/supabase/catalogQueries.ts (see that file's
 * header for why); this export's name and signature are unchanged.
 */
export const findCatalogProductsByIds = sharedFindCatalogProductsByIds;

// ---------------------------------------------------------------------
// Admin: core product CRUD
// ---------------------------------------------------------------------

export async function insertProduct(input: ProductInsert): Promise<ProductRow> {
  const { data, error } = await supabase.from('product').insert(input).select('*').single();
  if (error) throw error;
  return data;
}

export async function updateProductRow(id: string, patch: ProductUpdate): Promise<ProductRow> {
  const { data, error } = await supabase.from('product').update(patch).eq('id', id).select('*').single();
  if (error) throw error;
  return data;
}

export async function setProductStatus(id: string, status: ProductStatus): Promise<ProductRow> {
  return updateProductRow(id, { status });
}

export async function setProductFlags(
  id: string,
  flags: Partial<{ is_featured: boolean; is_trending: boolean; is_new_arrival: boolean }>
): Promise<ProductRow> {
  return updateProductRow(id, flags);
}

/**
 * DELETE FROM product WHERE id = :id
 * Intercepted by trg_product_soft_delete (005_catalog.sql), same
 * pattern as collection.repository.ts's softDeleteCollection.
 */
export async function softDeleteProduct(id: string): Promise<void> {
  const { error } = await supabase.from('product').delete().eq('id', id);
  if (error) throw error;
}

// ---------------------------------------------------------------------
// Admin: images
// ---------------------------------------------------------------------

export async function insertProductImage(
  input: ProductImageInsert
): Promise<ProductImageRow & { media_asset: { storage_path: string } }> {
  const { data, error } = await supabase
    .from('product_image')
    .insert(input)
    .select('*, media_asset:media_asset_id(storage_path)')
    .single();

  if (error) throw error;
  return data as never;
}

export async function deleteProductImage(imageId: string): Promise<void> {
  const { error } = await supabase.from('product_image').delete().eq('id', imageId);
  if (error) throw error;
}

/** Sets is_primary = true; trg_product_image_single_primary (005_catalog.sql) unsets all siblings automatically. */
export async function setPrimaryProductImage(imageId: string): Promise<void> {
  const { error } = await supabase.from('product_image').update({ is_primary: true }).eq('id', imageId);
  if (error) throw error;
}

export async function reorderProductImage(imageId: string, sortOrder: number): Promise<void> {
  const { error } = await supabase.from('product_image').update({ sort_order: sortOrder }).eq('id', imageId);
  if (error) throw error;
}

// ---------------------------------------------------------------------
// Admin: specifications
// ---------------------------------------------------------------------

export async function insertProductSpecification(
  input: ProductSpecificationInsert
): Promise<ProductSpecificationRow> {
  const { data, error } = await supabase.from('product_specification').insert(input).select('*').single();
  if (error) throw error;
  return data;
}

export async function deleteProductSpecification(specificationId: string): Promise<void> {
  const { error } = await supabase.from('product_specification').delete().eq('id', specificationId);
  if (error) throw error;
}

// ---------------------------------------------------------------------
// Admin: taxonomy assignment (six structurally identical join tables —
// one generic pair of functions parameterized by table/column name,
// mirroring the SQL layer's own DRY treatment of these six tables)
// ---------------------------------------------------------------------

const TAXONOMY_FK_COLUMN: Record<ProductTaxonomyJoinTableName, string> = {
  product_material: 'material_id',
  product_fabric_type: 'fabric_type_id',
  product_embroidery_type: 'embroidery_type_id',
  product_occasion: 'occasion_id',
  product_season: 'season_id',
  product_tag: 'tag_id',
};

export const TAXONOMY_JOIN_TABLE: Record<TaxonomyTableName, ProductTaxonomyJoinTableName> = {
  material: 'product_material',
  fabric_type: 'product_fabric_type',
  embroidery_type: 'product_embroidery_type',
  occasion: 'product_occasion',
  season: 'product_season',
  tag: 'product_tag',
};

export async function assignProductTaxonomy(
  joinTable: ProductTaxonomyJoinTableName,
  productId: string,
  taxonomyId: string
): Promise<void> {
  const fkColumn = TAXONOMY_FK_COLUMN[joinTable];
  const { error } = await supabase.from(joinTable).insert({
    product_id: productId,
    [fkColumn]: taxonomyId,
  } as never);
  if (error) throw error;
}

export async function unassignProductTaxonomy(
  joinTable: ProductTaxonomyJoinTableName,
  productId: string,
  taxonomyId: string
): Promise<void> {
  const fkColumn = TAXONOMY_FK_COLUMN[joinTable];
  const { error } = await supabase
    .from(joinTable)
    .delete()
    .eq('product_id', productId)
    .eq(fkColumn, taxonomyId);
  if (error) throw error;
}

/** Lists the taxonomy ids currently assigned to a product for a given join table, e.g. all material_id values for product X. */
export async function findProductTaxonomyIds(
  joinTable: ProductTaxonomyJoinTableName,
  productId: string
): Promise<string[]> {
  const fkColumn = TAXONOMY_FK_COLUMN[joinTable];
  const { data, error } = await supabase.from(joinTable).select(fkColumn).eq('product_id', productId);
  if (error) throw error;
  return (data as unknown as Record<string, string>[]).map((row) => row[fkColumn]);
}
