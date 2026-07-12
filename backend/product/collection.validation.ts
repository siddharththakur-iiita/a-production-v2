/**
 * src/features/collection/collection.validation.ts
 */
import { z } from 'zod';
import { slugSchema as baseSlugSchema, requireAtLeastOneField } from '../../lib/validation/commonSchemas';

// This module's slug max length (100) is unchanged from before the
// consistency refactor — only the shared min/regex part moved to
// commonSchemas.ts (see that file's header for why).
const slugSchema = baseSlugSchema.max(100);

export const createCollectionSchema = z.object({
  slug: slugSchema,
  title: z.string().min(1, 'Title is required').max(200),
  label: z.string().max(100).optional(),
  description: z.string().max(5000).optional(),
  heroMediaAssetId: z.string().uuid().optional(),
  sortOrder: z.number().int().min(0).optional(),
});

export const updateCollectionSchema = requireAtLeastOneField(
  z.object({
    title: z.string().min(1).max(200).optional(),
    label: z.string().max(100).nullable().optional(),
    description: z.string().max(5000).nullable().optional(),
    heroMediaAssetId: z.string().uuid().nullable().optional(),
    sortOrder: z.number().int().min(0).optional(),
  })
);

export const addProductToCollectionSchema = z.object({
  collectionId: z.string().uuid(),
  productId: z.string().uuid(),
  sortOrder: z.number().int().min(0).optional(),
});

export type CreateCollectionValidated = z.infer<typeof createCollectionSchema>;
export type UpdateCollectionValidated = z.infer<typeof updateCollectionSchema>;
