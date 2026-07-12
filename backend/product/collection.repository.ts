/**
 * src/features/collection/collection.repository.ts
 *
 * RLS reminder (016_rls.sql):
 *   collection_read:        anon/authenticated SELECT WHERE status='published' AND deleted_at IS NULL
 *   collection_staff_read:  authenticated SELECT, gated on catalog.write (sees all statuses)
 *   collection_write:       authenticated ALL, gated on catalog.write
 *   product_collection_read:  anon/authenticated SELECT (unrestricted — membership rows carry no
 *                              sensitive data on their own; the *products* they reference already
 *                              have their own product_read RLS applied when actually fetched)
 *   product_collection_write: authenticated ALL, gated on catalog.write
 */
import { supabase } from '../../lib/supabase/client';
import { findCatalogProductsByIds as sharedFindCatalogProductsByIds } from '../../lib/supabase/catalogQueries';
import type {
  CollectionRow,
  CollectionInsert,
  CollectionUpdate,
  ProductCollectionRow,
} from '../../lib/supabase/database.types';

/** SELECT * FROM collection WHERE status = 'published' ORDER BY sort_order (deleted_at IS NULL enforced by RLS). */
export async function findPublishedCollections(): Promise<CollectionRow[]> {
  const { data, error } = await supabase
    .from('collection')
    .select('*')
    .eq('status', 'published')
    .order('sort_order', { ascending: true });

  if (error) throw error;
  return data;
}

/** Admin listing: every status, via collection_staff_read RLS (requires catalog.write). */
export async function findAllCollectionsForStaff(): Promise<CollectionRow[]> {
  const { data, error } = await supabase
    .from('collection')
    .select('*')
    .order('sort_order', { ascending: true });

  if (error) throw error;
  return data;
}

export async function findCollectionBySlug(slug: string): Promise<CollectionRow | null> {
  const { data, error } = await supabase.from('collection').select('*').eq('slug', slug).maybeSingle();
  if (error) throw error;
  return data;
}

export async function findCollectionById(id: string): Promise<CollectionRow | null> {
  const { data, error } = await supabase.from('collection').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data;
}

export async function insertCollection(input: CollectionInsert): Promise<CollectionRow> {
  const { data, error } = await supabase.from('collection').insert(input).select('*').single();
  if (error) throw error;
  return data;
}

export async function updateCollectionRow(id: string, patch: CollectionUpdate): Promise<CollectionRow> {
  const { data, error } = await supabase.from('collection').update(patch).eq('id', id).select('*').single();
  if (error) throw error;
  return data;
}

/**
 * DELETE FROM collection WHERE id = :id
 * Not a real hard delete: collection is Pattern A, and
 * trg_collection_soft_delete (005_catalog.sql) intercepts this at the
 * database level and converts it into `UPDATE collection SET
 * deleted_at = now()`. This function issues the DELETE exactly as
 * PostgREST's `.delete()` does; the trigger is what makes it safe.
 */
export async function softDeleteCollection(id: string): Promise<void> {
  const { error } = await supabase.from('collection').delete().eq('id', id);
  if (error) throw error;
}

/** SELECT product_id, sort_order FROM product_collection WHERE collection_id = :collectionId ORDER BY sort_order */
export async function findProductCollectionRows(collectionId: string): Promise<ProductCollectionRow[]> {
  const { data, error } = await supabase
    .from('product_collection')
    .select('*')
    .eq('collection_id', collectionId)
    .order('sort_order', { ascending: true });

  if (error) throw error;
  return data;
}

/**
 * Fetches the public catalog projection (v_product_catalog,
 * 017_views.sql) for a given set of product ids. Delegates to the
 * shared implementation in lib/supabase/catalogQueries.ts (see that
 * file's header for why this was extracted); this export's name and
 * signature — and product.repository.ts's identical export — are
 * both unchanged.
 */
export const findCatalogProductsByIds = sharedFindCatalogProductsByIds;

/** INSERT INTO product_collection (product_id, collection_id, sort_order) VALUES (...) */
export async function insertProductCollection(row: {
  productId: string;
  collectionId: string;
  sortOrder?: number;
}): Promise<void> {
  const { error } = await supabase.from('product_collection').insert({
    product_id: row.productId,
    collection_id: row.collectionId,
    sort_order: row.sortOrder,
  });
  if (error) throw error;
}

/** DELETE FROM product_collection WHERE product_id = :productId AND collection_id = :collectionId */
export async function deleteProductCollection(productId: string, collectionId: string): Promise<void> {
  const { error } = await supabase
    .from('product_collection')
    .delete()
    .eq('product_id', productId)
    .eq('collection_id', collectionId);
  if (error) throw error;
}

/** UPDATE product_collection SET sort_order = :sortOrder WHERE product_id = :productId AND collection_id = :collectionId */
export async function updateProductCollectionSortOrder(
  productId: string,
  collectionId: string,
  sortOrder: number
): Promise<void> {
  const { error } = await supabase
    .from('product_collection')
    .update({ sort_order: sortOrder })
    .eq('product_id', productId)
    .eq('collection_id', collectionId);
  if (error) throw error;
}
