/**
 * src/features/collection/collection.types.ts
 *
 * Domain types for the Collection module, mapped from the raw
 * database.types.ts row shapes (collection / product_collection
 * tables, 005_catalog.sql).
 */
import type { CollectionRow, VProductCatalogRow } from '../../lib/supabase/database.types';
import { getCatalogPublicUrl } from '../../lib/supabase/storage';

export type CollectionStatus = CollectionRow['status'];

export interface Collection {
  id: string;
  slug: string;
  title: string;
  label: string | null;
  description: string | null;
  heroImageUrl: string | null;
  status: CollectionStatus;
  sortOrder: number;
}

export function mapCollectionRow(
  row: CollectionRow,
  heroStoragePath: string | null = null
): Collection {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    label: row.label,
    description: row.description,
    heroImageUrl: heroStoragePath ? getCatalogPublicUrl(heroStoragePath) : null,
    status: row.status,
    sortOrder: row.sort_order,
  };
}

/** A product as it appears within a collection listing — reuses the same public catalog projection the Product module exposes. */
export interface CollectionProduct {
  id: string;
  slug: string;
  name: string;
  price: number | null;
  compareAtPrice: number | null;
  currency: string;
  imageUrl: string | null;
  sortOrderInCollection: number;
}

export function mapCollectionProduct(
  row: VProductCatalogRow,
  sortOrderInCollection: number
): CollectionProduct {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    price: row.price !== null ? Number(row.price) : null,
    compareAtPrice: row.compare_at_price !== null ? Number(row.compare_at_price) : null,
    currency: row.currency,
    imageUrl: row.primary_image_storage_path ? getCatalogPublicUrl(row.primary_image_storage_path) : null,
    sortOrderInCollection,
  };
}

export interface CreateCollectionInput {
  slug: string;
  title: string;
  label?: string;
  description?: string;
  heroMediaAssetId?: string;
  sortOrder?: number;
}

export interface UpdateCollectionInput {
  title?: string;
  label?: string | null;
  description?: string | null;
  heroMediaAssetId?: string | null;
  sortOrder?: number;
}
