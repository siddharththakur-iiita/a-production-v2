/**
 * src/features/collection/collection.service.ts
 */
import * as repo from './collection.repository';
import {
  mapCollectionRow,
  mapCollectionProduct,
  type Collection,
  type CollectionProduct,
  type CreateCollectionInput,
  type UpdateCollectionInput,
} from './collection.types';
import {
  createCollectionSchema,
  updateCollectionSchema,
  addProductToCollectionSchema,
} from './collection.validation';
import { mapCollectionPostgrestError, mapCollectionZodError } from './collection.errors';

export async function listPublishedCollections(): Promise<Collection[]> {
  try {
    const rows = await repo.findPublishedCollections();
    return rows.map((r) => mapCollectionRow(r));
  } catch (err) {
    throw mapCollectionPostgrestError(err as never);
  }
}

/** Admin listing across every status. Requires catalog.write (enforced by collection_staff_read RLS). */
export async function listCollectionsForStaff(): Promise<Collection[]> {
  try {
    const rows = await repo.findAllCollectionsForStaff();
    return rows.map((r) => mapCollectionRow(r));
  } catch (err) {
    throw mapCollectionPostgrestError(err as never);
  }
}

export async function getCollectionBySlug(slug: string): Promise<Collection | null> {
  try {
    const row = await repo.findCollectionBySlug(slug);
    return row ? mapCollectionRow(row) : null;
  } catch (err) {
    throw mapCollectionPostgrestError(err as never);
  }
}

export async function getCollectionById(id: string): Promise<Collection | null> {
  try {
    const row = await repo.findCollectionById(id);
    return row ? mapCollectionRow(row) : null;
  } catch (err) {
    throw mapCollectionPostgrestError(err as never);
  }
}

/**
 * Fetches the products in a collection, in curated order. Two
 * repository queries are merged here (membership rows, then the
 * public catalog projection for those product ids) rather than a
 * single embedded query — see collection.repository.ts for why.
 * Products that are members of the collection but not currently
 * `published`/`public` (e.g. temporarily unpublished) are silently
 * omitted, since v_product_catalog itself only ever returns
 * public-eligible rows — this is the correct behavior for a
 * storefront listing, not a bug.
 */
export async function getCollectionProducts(collectionId: string): Promise<CollectionProduct[]> {
  try {
    const memberships = await repo.findProductCollectionRows(collectionId);
    if (memberships.length === 0) return [];

    const productIds = memberships.map((m) => m.product_id);
    const catalogRows = await repo.findCatalogProductsByIds(productIds);
    const catalogById = new Map(catalogRows.map((row) => [row.id, row]));

    return memberships
      .map((m) => {
        const catalogRow = catalogById.get(m.product_id);
        return catalogRow ? mapCollectionProduct(catalogRow, m.sort_order) : null;
      })
      .filter((p): p is CollectionProduct => p !== null)
      .sort((a, b) => a.sortOrderInCollection - b.sortOrderInCollection);
  } catch (err) {
    throw mapCollectionPostgrestError(err as never);
  }
}

export async function createCollection(input: CreateCollectionInput): Promise<Collection> {
  const parsed = createCollectionSchema.safeParse(input);
  if (!parsed.success) throw mapCollectionZodError(parsed.error);

  try {
    const row = await repo.insertCollection({
      slug: parsed.data.slug,
      title: parsed.data.title,
      label: parsed.data.label ?? null,
      description: parsed.data.description ?? null,
      hero_media_asset_id: parsed.data.heroMediaAssetId ?? null,
      sort_order: parsed.data.sortOrder,
    });
    return mapCollectionRow(row);
  } catch (err) {
    throw mapCollectionPostgrestError(err as never);
  }
}

export async function updateCollection(id: string, input: UpdateCollectionInput): Promise<Collection> {
  const parsed = updateCollectionSchema.safeParse(input);
  if (!parsed.success) throw mapCollectionZodError(parsed.error);

  try {
    const row = await repo.updateCollectionRow(id, {
      title: parsed.data.title,
      label: parsed.data.label,
      description: parsed.data.description,
      hero_media_asset_id: parsed.data.heroMediaAssetId,
      sort_order: parsed.data.sortOrder,
    });
    return mapCollectionRow(row);
  } catch (err) {
    throw mapCollectionPostgrestError(err as never);
  }
}

export async function publishCollection(id: string): Promise<Collection> {
  try {
    const row = await repo.updateCollectionRow(id, { status: 'published' });
    return mapCollectionRow(row);
  } catch (err) {
    throw mapCollectionPostgrestError(err as never);
  }
}

export async function archiveCollection(id: string): Promise<Collection> {
  try {
    const row = await repo.updateCollectionRow(id, { status: 'archived' });
    return mapCollectionRow(row);
  } catch (err) {
    throw mapCollectionPostgrestError(err as never);
  }
}

export async function revertCollectionToDraft(id: string): Promise<Collection> {
  try {
    const row = await repo.updateCollectionRow(id, { status: 'draft' });
    return mapCollectionRow(row);
  } catch (err) {
    throw mapCollectionPostgrestError(err as never);
  }
}

/** Soft-deletes a collection (see collection.repository.ts — intercepted by trg_collection_soft_delete). */
export async function deleteCollection(id: string): Promise<void> {
  try {
    await repo.softDeleteCollection(id);
  } catch (err) {
    throw mapCollectionPostgrestError(err as never);
  }
}

export async function addProductToCollection(input: {
  collectionId: string;
  productId: string;
  sortOrder?: number;
}): Promise<void> {
  const parsed = addProductToCollectionSchema.safeParse(input);
  if (!parsed.success) throw mapCollectionZodError(parsed.error);

  try {
    await repo.insertProductCollection({
      productId: parsed.data.productId,
      collectionId: parsed.data.collectionId,
      sortOrder: parsed.data.sortOrder,
    });
  } catch (err) {
    throw mapCollectionPostgrestError(err as never);
  }
}

export async function removeProductFromCollection(collectionId: string, productId: string): Promise<void> {
  try {
    await repo.deleteProductCollection(productId, collectionId);
  } catch (err) {
    throw mapCollectionPostgrestError(err as never);
  }
}

export async function reorderProductInCollection(
  collectionId: string,
  productId: string,
  newSortOrder: number
): Promise<void> {
  try {
    await repo.updateProductCollectionSortOrder(productId, collectionId, newSortOrder);
  } catch (err) {
    throw mapCollectionPostgrestError(err as never);
  }
}
