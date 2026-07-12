/**
 * src/features/category/category.validation.ts
 *
 * Application-layer validation using zod. This is a genuine second
 * line of defense, not a duplicate of the database's own constraints
 * — it exists to reject bad input with a fast, specific, client-side
 * error *before* a round-trip to Postgres, but the database CHECK
 * constraints (category_no_self_parent_check, the
 * (department_id, parent_category_id, slug) UNIQUE constraint, the
 * app_slug domain's regex) remain the actual source of truth and are
 * re-validated on every write regardless of what happens here.
 */
import { z } from 'zod';
import { slugSchema as baseSlugSchema, requireAtLeastOneField } from '../../lib/validation/commonSchemas';

// This module's slug max length (100) is unchanged from before the
// consistency refactor — only the shared min/regex part moved to
// commonSchemas.ts (see that file's header for why).
const slugSchema = baseSlugSchema.max(100);

export const createCategorySchema = z.object({
  departmentId: z.string().uuid('departmentId must be a valid UUID'),
  parentCategoryId: z.string().uuid().nullable().optional(),
  name: z.string().min(1, 'Name is required').max(100),
  slug: slugSchema,
  sortOrder: z.number().int().min(0).optional(),
});

export const updateCategorySchema = requireAtLeastOneField(
  z.object({
    name: z.string().min(1).max(100).optional(),
    slug: slugSchema.optional(),
    parentCategoryId: z.string().uuid().nullable().optional(),
    sortOrder: z.number().int().min(0).optional(),
  })
);

export type CreateCategoryValidated = z.infer<typeof createCategorySchema>;
export type UpdateCategoryValidated = z.infer<typeof updateCategorySchema>;
