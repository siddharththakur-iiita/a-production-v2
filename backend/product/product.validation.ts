/**
 * src/features/product/product.validation.ts
 *
 * Mirrors the CHECK constraints on public.product exactly
 * (005_catalog.sql): compare_at_price >= price, lead_time_days_max >=
 * lead_time_days_min, status/visibility enums. The one rule this file
 * deliberately does NOT attempt to replicate is
 * trg_product_validate_price ("price required unless product_type is
 * bespoke_template") — that requires knowing the resolved
 * product_type.code, which is a database round-trip away, not
 * something the client can validate synchronously. That rule remains
 * exclusively enforced by the trigger; product.errors.ts maps its
 * raised exception into a typed ProductError.
 */
import { z } from 'zod';
import { slugSchema as baseSlugSchema, requireAtLeastOneField } from '../../lib/validation/commonSchemas';

// This module's slug max length (200) is unchanged from before the
// consistency refactor — only the shared min/regex part moved to
// commonSchemas.ts (see that file's header for why).
const slugSchema = baseSlugSchema.max(200);

const currencySchema = z
  .string()
  .length(3)
  .regex(/^[A-Z]{3}$/, 'Currency must be a 3-letter uppercase ISO-4217 code');

export const createProductSchema = z
  .object({
    slug: slugSchema,
    name: z.string().min(1, 'Name is required').max(200),
    description: z.string().max(20000).optional(),
    productTypeId: z.string().uuid(),
    departmentId: z.string().uuid(),
    categoryId: z.string().uuid().optional(),
    brandId: z.string().uuid().optional(),
    genderId: z.string().uuid().optional(),
    ageGroupId: z.string().uuid().optional(),
    price: z.number().min(0).optional(),
    compareAtPrice: z.number().min(0).optional(),
    currency: currencySchema.optional(),
    leadTimeDaysMin: z.number().int().min(0).optional(),
    leadTimeDaysMax: z.number().int().min(0).optional(),
    fabric: z.string().max(1000).optional(),
    craftsmanship: z.string().max(1000).optional(),
    careInstructions: z.string().max(5000).optional(),
    shippingInfo: z.string().max(5000).optional(),
    returnPolicy: z.string().max(5000).optional(),
  })
  .refine(
    (data) => data.compareAtPrice === undefined || data.price === undefined || data.compareAtPrice >= data.price,
    { message: 'compareAtPrice must be greater than or equal to price', path: ['compareAtPrice'] }
  )
  .refine(
    (data) =>
      data.leadTimeDaysMax === undefined ||
      data.leadTimeDaysMin === undefined ||
      data.leadTimeDaysMax >= data.leadTimeDaysMin,
    { message: 'leadTimeDaysMax must be greater than or equal to leadTimeDaysMin', path: ['leadTimeDaysMax'] }
  );

export const updateProductSchema = requireAtLeastOneField(
  z.object({
    name: z.string().min(1).max(200).optional(),
    description: z.string().max(20000).nullable().optional(),
    categoryId: z.string().uuid().nullable().optional(),
    brandId: z.string().uuid().nullable().optional(),
    genderId: z.string().uuid().nullable().optional(),
    ageGroupId: z.string().uuid().nullable().optional(),
    price: z.number().min(0).nullable().optional(),
    compareAtPrice: z.number().min(0).nullable().optional(),
    leadTimeDaysMin: z.number().int().min(0).nullable().optional(),
    leadTimeDaysMax: z.number().int().min(0).nullable().optional(),
    fabric: z.string().max(1000).nullable().optional(),
    craftsmanship: z.string().max(1000).nullable().optional(),
    careInstructions: z.string().max(5000).nullable().optional(),
    shippingInfo: z.string().max(5000).nullable().optional(),
    returnPolicy: z.string().max(5000).nullable().optional(),
  })
).refine(
  (data) => data.compareAtPrice == null || data.price == null || data.compareAtPrice >= data.price,
  { message: 'compareAtPrice must be greater than or equal to price', path: ['compareAtPrice'] }
);

export const addProductImageSchema = z.object({
  productId: z.string().uuid(),
  mediaAssetId: z.string().uuid(),
  sortOrder: z.number().int().min(0).optional(),
  isPrimary: z.boolean().optional(),
  altText: z.string().max(500).optional(),
});

export const addProductSpecificationSchema = z.object({
  productId: z.string().uuid(),
  key: z.string().min(1).max(60),
  value: z.string().min(1).max(200),
  sortOrder: z.number().int().min(0).optional(),
});

export const searchProductsSchema = z.object({
  query: z.string().min(1, 'Search query cannot be empty').max(200),
  page: z.number().int().min(1).optional(),
  pageSize: z.number().int().min(1).max(100).optional(),
});
