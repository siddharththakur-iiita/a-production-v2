/**
 * src/features/collection/collection.errors.ts
 *
 * Constraint names referenced here come directly from
 * 005_catalog.sql's collection/product_collection CREATE TABLE
 * statements.
 */
import { AppError, classifyPostgrestError } from '../../lib/supabase/postgrestErrors';
import type { PostgrestError } from '@supabase/supabase-js';
import { z } from 'zod';

export type CollectionErrorCode =
  | 'validation_failed'
  | 'slug_already_in_use'
  | 'collection_not_found'
  | 'product_not_found'
  | 'hero_media_not_found'
  | 'product_already_in_collection'
  | 'permission_denied'
  | 'unknown';

export class CollectionError extends AppError {
  readonly code: CollectionErrorCode;
  constructor(code: CollectionErrorCode, message: string, cause?: unknown) {
    super(message, cause);
    this.name = 'CollectionError';
    this.code = code;
  }
}

export function mapCollectionZodError(error: z.ZodError): CollectionError {
  const first = error.errors[0];
  return new CollectionError('validation_failed', first?.message ?? 'Invalid collection input.', error);
}

export function mapCollectionPostgrestError(error: PostgrestError): CollectionError {
  const classified = classifyPostgrestError(error);

  switch (classified.kind) {
    case 'not_found':
      return new CollectionError('collection_not_found', 'Collection not found.', error);

    case 'unique_violation':
      if (classified.constraintName === 'collection_slug_key') {
        return new CollectionError('slug_already_in_use', 'This collection slug is already in use.', error);
      }
      if (classified.constraintName === 'product_collection_pkey') {
        return new CollectionError(
          'product_already_in_collection',
          'This product is already part of this collection.',
          error
        );
      }
      return new CollectionError('unknown', error.message, error);

    case 'foreign_key_violation':
      if (classified.constraintName === 'product_collection_product_id_fkey') {
        return new CollectionError('product_not_found', 'The specified product does not exist.', error);
      }
      if (classified.constraintName === 'product_collection_collection_id_fkey') {
        return new CollectionError('collection_not_found', 'The specified collection does not exist.', error);
      }
      if (classified.constraintName === 'collection_hero_media_asset_id_fkey') {
        return new CollectionError('hero_media_not_found', 'The specified hero image does not exist.', error);
      }
      return new CollectionError('unknown', error.message, error);

    case 'permission_denied':
      return new CollectionError(
        'permission_denied',
        'You do not have permission to modify collections.',
        error
      );

    default:
      return new CollectionError('unknown', error.message, error);
  }
}
