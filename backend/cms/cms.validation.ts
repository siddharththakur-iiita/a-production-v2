/**
 * src/features/cms/cms.validation.ts
 *
 * Mirrors the CHECK constraints in 011_cms.sql.
 */
import { z } from 'zod';
import { requireAtLeastOneField } from '../../lib/validation/commonSchemas';

export const registerMediaAssetSchema = z.object({
  storagePath: z.string().min(1, 'Storage path is required').max(500),
  isPrivate: z.boolean().optional(),
  altText: z.string().max(500).optional(),
  tags: z.array(z.string()).optional(),
});

export const createContentBlockSchema = z.object({
  pageId: z.string().uuid(),
  sectionKey: z.string().min(1, 'Section key is required').max(100),
  content: z.record(z.unknown()),
  sortOrder: z.number().int().min(0).optional(),
});

export const updateContentBlockContentSchema = z.object({
  id: z.string().uuid(),
  content: z.record(z.unknown()),
});

function datesValid(data: { startsAt?: string; endsAt?: string }): boolean {
  return !data.startsAt || !data.endsAt || new Date(data.endsAt) >= new Date(data.startsAt);
}

export const createHeroBannerSchema = z
  .object({
    pageId: z.string().uuid(),
    mediaAssetId: z.string().uuid().optional(),
    headline: z.string().max(200).optional(),
    subheadline: z.string().max(500).optional(),
    ctaLabel: z.string().max(100).optional(),
    ctaUrl: z.string().max(500).optional(),
    startsAt: z.string().datetime().optional(),
    endsAt: z.string().datetime().optional(),
    sortOrder: z.number().int().min(0).optional(),
  })
  .refine(datesValid, { message: 'endsAt must be on or after startsAt', path: ['endsAt'] });

export const createFeaturedPlacementSchema = z
  .object({
    placementContext: z.enum(['homepage', 'department', 'collection_page']),
    contextRefId: z.string().uuid().optional(),
    productId: z.string().uuid(),
    placementType: z.enum(['featured', 'trending']),
    sortOrder: z.number().int().min(0).optional(),
    startsAt: z.string().datetime().optional(),
    endsAt: z.string().datetime().optional(),
  })
  .refine(datesValid, { message: 'endsAt must be on or after startsAt', path: ['endsAt'] });

export const createGalleryItemSchema = z.object({
  mediaAssetId: z.string().uuid(),
  caption: z.string().max(500).optional(),
  sourceUrl: z.string().max(500).optional(),
  sortOrder: z.number().int().min(0).optional(),
});

export const createTestimonialSchema = z.object({
  customerName: z.string().min(1, 'Customer name is required').max(200),
  quote: z.string().min(1, 'Quote is required').max(2000),
  rating: z.number().int().min(1).max(5).optional(),
  productId: z.string().uuid().optional(),
  customerPhotoMediaAssetId: z.string().uuid().optional(),
  sortOrder: z.number().int().min(0).optional(),
});

export const createAnnouncementSchema = z
  .object({
    message: z.string().min(1, 'Message is required').max(500),
    linkUrl: z.string().max(500).optional(),
    startsAt: z.string().datetime().optional(),
    endsAt: z.string().datetime().optional(),
  })
  .refine(datesValid, { message: 'endsAt must be on or after startsAt', path: ['endsAt'] });

export const createNavigationItemSchema = z.object({
  menuId: z.string().uuid(),
  parentItemId: z.string().uuid().optional(),
  label: z.string().min(1, 'Label is required').max(100),
  url: z.string().max(500).optional(),
  categoryId: z.string().uuid().optional(),
  sortOrder: z.number().int().min(0).optional(),
});

export const setMegaMenuPromoSchema = z.object({
  navigationItemId: z.string().uuid(),
  mediaAssetId: z.string().uuid().optional(),
  title: z.string().max(200).optional(),
  subtitle: z.string().max(500).optional(),
  ctaUrl: z.string().max(500).optional(),
});

export const createSocialLinkSchema = z.object({
  platform: z.string().min(1, 'Platform is required').max(50),
  url: z.string().min(1, 'URL is required').max(500),
  sortOrder: z.number().int().min(0).optional(),
});

export const updateContactInfoSchema = requireAtLeastOneField(
  z.object({
    phone: z.string().max(20).nullable().optional(),
    whatsappNumber: z.string().max(20).nullable().optional(),
    email: z.string().email().nullable().optional(),
    address: z.string().max(1000).nullable().optional(),
    businessHours: z.string().max(500).nullable().optional(),
  })
);

const pathSchema = z.string().min(1).regex(/^\//, 'Path must start with /');

export const createSeoRedirectSchema = z.object({
  fromPath: pathSchema,
  toPath: pathSchema,
  redirectType: z.enum(['301', '302']).optional(),
});

export const setSiteSettingSchema = z.object({
  key: z.string().min(1, 'Key is required').max(100),
  value: z.unknown(),
  isPublic: z.boolean().optional(),
});

export type RegisterMediaAssetValidated = z.infer<typeof registerMediaAssetSchema>;
export type CreateContentBlockValidated = z.infer<typeof createContentBlockSchema>;
export type CreateHeroBannerValidated = z.infer<typeof createHeroBannerSchema>;
export type CreateFeaturedPlacementValidated = z.infer<typeof createFeaturedPlacementSchema>;
export type CreateSeoRedirectValidated = z.infer<typeof createSeoRedirectSchema>;
