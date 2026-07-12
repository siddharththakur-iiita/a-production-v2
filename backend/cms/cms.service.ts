/**
 * src/features/cms/cms.service.ts
 *
 * Most of this module's writes are straightforward publish/unpublish
 * toggles — the CMS domain simply doesn't have the multi-step
 * lifecycle complexity Orders/Tailoring do. The one piece of genuine
 * assembly logic is the navigation tree: navigation_item is
 * self-referential (mirroring category.service.ts's tree pattern for
 * the same shape of problem — flat list fetched once, tree assembled
 * client-side, since PostgREST cannot express a recursive CTE), with
 * mega_menu_promo attached per node.
 */
import * as repo from './cms.repository';
import {
  mapMediaAssetRow,
  mapPageRow,
  mapContentBlockRow,
  mapHeroBannerRow,
  mapFeaturedPlacementRow,
  mapGalleryItemRow,
  mapTestimonialRow,
  mapAnnouncementRow,
  mapNavigationMenuRow,
  mapNavigationItemRow,
  mapMegaMenuPromoRow,
  mapSocialLinkRow,
  mapContactInfoRow,
  mapSeoRedirectRow,
  mapSiteSettingRow,
  type MediaAsset,
  type Page,
  type ContentBlock,
  type HeroBanner,
  type FeaturedPlacement,
  type GalleryItem,
  type Testimonial,
  type Announcement,
  type NavigationMenu,
  type NavigationTreeNode,
  type SocialLink,
  type ContactInfo,
  type SeoRedirect,
  type SiteSetting,
  type RegisterMediaAssetInput,
  type CreateContentBlockInput,
  type CreateHeroBannerInput,
  type CreateFeaturedPlacementInput,
  type CreateGalleryItemInput,
  type CreateTestimonialInput,
  type CreateAnnouncementInput,
  type CreateNavigationItemInput,
  type SetMegaMenuPromoInput,
  type CreateSocialLinkInput,
  type UpdateContactInfoInput,
  type CreateSeoRedirectInput,
} from './cms.types';
import {
  registerMediaAssetSchema,
  createContentBlockSchema,
  createHeroBannerSchema,
  createFeaturedPlacementSchema,
  createGalleryItemSchema,
  createTestimonialSchema,
  createAnnouncementSchema,
  createNavigationItemSchema,
  setMegaMenuPromoSchema,
  createSocialLinkSchema,
  updateContactInfoSchema,
  createSeoRedirectSchema,
} from './cms.validation';
import { mapCmsPostgrestError, mapCmsZodError } from './cms.errors';
import type { ContentBlockStatus } from '../../lib/supabase/database.types';

// =======================================================================
// Media asset
// =======================================================================

export async function registerMediaAsset(input: RegisterMediaAssetInput): Promise<MediaAsset> {
  const parsed = registerMediaAssetSchema.safeParse(input);
  if (!parsed.success) throw mapCmsZodError(parsed.error);

  try {
    const row = await repo.insertMediaAsset({
      storage_path: parsed.data.storagePath,
      is_private: parsed.data.isPrivate,
      alt_text: parsed.data.altText,
      tags: parsed.data.tags,
    });
    return mapMediaAssetRow(row);
  } catch (err) {
    throw mapCmsPostgrestError(err as never);
  }
}

// =======================================================================
// Page / Content block
// =======================================================================

export async function listActivePages(): Promise<Page[]> {
  try {
    const rows = await repo.findActivePages();
    return rows.map(mapPageRow);
  } catch (err) {
    throw mapCmsPostgrestError(err as never);
  }
}

export async function getPageByKey(key: string): Promise<Page | null> {
  try {
    const row = await repo.findPageByKey(key);
    return row ? mapPageRow(row) : null;
  } catch (err) {
    throw mapCmsPostgrestError(err as never);
  }
}

export async function listPublishedContentBlocks(pageId: string): Promise<ContentBlock[]> {
  try {
    const rows = await repo.findPublishedContentBlocksForPage(pageId);
    return rows.map(mapContentBlockRow);
  } catch (err) {
    throw mapCmsPostgrestError(err as never);
  }
}

export async function listContentBlocksForStaff(pageId: string): Promise<ContentBlock[]> {
  try {
    const rows = await repo.findAllContentBlocksForPageStaff(pageId);
    return rows.map(mapContentBlockRow);
  } catch (err) {
    throw mapCmsPostgrestError(err as never);
  }
}

export async function createContentBlock(input: CreateContentBlockInput): Promise<ContentBlock> {
  const parsed = createContentBlockSchema.safeParse(input);
  if (!parsed.success) throw mapCmsZodError(parsed.error);

  try {
    const row = await repo.insertContentBlock({
      page_id: parsed.data.pageId,
      section_key: parsed.data.sectionKey,
      content: parsed.data.content,
      sort_order: parsed.data.sortOrder,
    });
    return mapContentBlockRow(row);
  } catch (err) {
    throw mapCmsPostgrestError(err as never);
  }
}

export async function updateContentBlockContent(
  id: string,
  content: Record<string, unknown>
): Promise<ContentBlock> {
  try {
    const row = await repo.updateContentBlockContentRow(id, content);
    return mapContentBlockRow(row);
  } catch (err) {
    throw mapCmsPostgrestError(err as never);
  }
}

/** published_at is auto-stamped by trg_content_block_updated_at (011_cms.sql) — this only ever writes status. */
export async function publishContentBlock(id: string): Promise<ContentBlock> {
  try {
    const row = await repo.updateContentBlockStatusRow(id, 'published');
    return mapContentBlockRow(row);
  } catch (err) {
    throw mapCmsPostgrestError(err as never);
  }
}

export async function unpublishContentBlock(id: string): Promise<ContentBlock> {
  try {
    const row = await repo.updateContentBlockStatusRow(id, 'draft');
    return mapContentBlockRow(row);
  } catch (err) {
    throw mapCmsPostgrestError(err as never);
  }
}

// =======================================================================
// Hero banner
// =======================================================================

/** Filters to banners currently within their starts_at/ends_at scheduling window — an application-layer business rule, since no dedicated view exists for hero banners the way v_product_catalog does for products. */
export async function listActiveHeroBanners(pageId: string): Promise<HeroBanner[]> {
  try {
    const rows = await repo.findPublishedHeroBannersForPage(pageId);
    const now = new Date();
    return rows
      .filter((r) => (!r.starts_at || new Date(r.starts_at) <= now) && (!r.ends_at || new Date(r.ends_at) >= now))
      .map((r) => mapHeroBannerRow(r, r.media_asset?.storage_path ?? null));
  } catch (err) {
    throw mapCmsPostgrestError(err as never);
  }
}

export async function createHeroBanner(input: CreateHeroBannerInput): Promise<HeroBanner> {
  const parsed = createHeroBannerSchema.safeParse(input);
  if (!parsed.success) throw mapCmsZodError(parsed.error);

  try {
    const row = await repo.insertHeroBanner({
      page_id: parsed.data.pageId,
      media_asset_id: parsed.data.mediaAssetId,
      headline: parsed.data.headline,
      subheadline: parsed.data.subheadline,
      cta_label: parsed.data.ctaLabel,
      cta_url: parsed.data.ctaUrl,
      starts_at: parsed.data.startsAt,
      ends_at: parsed.data.endsAt,
      sort_order: parsed.data.sortOrder,
    });
    return mapHeroBannerRow(row);
  } catch (err) {
    throw mapCmsPostgrestError(err as never);
  }
}

export async function publishHeroBanner(id: string): Promise<HeroBanner> {
  try {
    const row = await repo.updateHeroBannerStatusRow(id, 'published');
    return mapHeroBannerRow(row);
  } catch (err) {
    throw mapCmsPostgrestError(err as never);
  }
}

export async function unpublishHeroBanner(id: string): Promise<HeroBanner> {
  try {
    const row = await repo.updateHeroBannerStatusRow(id, 'draft');
    return mapHeroBannerRow(row);
  } catch (err) {
    throw mapCmsPostgrestError(err as never);
  }
}

// =======================================================================
// Featured placement
// =======================================================================

export async function listFeaturedPlacements(
  context: FeaturedPlacement['placementContext'],
  contextRefId?: string
): Promise<FeaturedPlacement[]> {
  try {
    const rows = await repo.findFeaturedPlacements(context, contextRefId);
    return rows.map(mapFeaturedPlacementRow);
  } catch (err) {
    throw mapCmsPostgrestError(err as never);
  }
}

/** Validated server-side by trg_featured_placement_validate (011_cms.sql) — this function does not pre-check the product's flags itself, since that check must be race-free against concurrent flag changes and the trigger already provides that guarantee atomically. */
export async function addFeaturedPlacement(input: CreateFeaturedPlacementInput): Promise<FeaturedPlacement> {
  const parsed = createFeaturedPlacementSchema.safeParse(input);
  if (!parsed.success) throw mapCmsZodError(parsed.error);

  try {
    const row = await repo.insertFeaturedPlacement({
      placement_context: parsed.data.placementContext,
      context_ref_id: parsed.data.contextRefId,
      product_id: parsed.data.productId,
      placement_type: parsed.data.placementType,
      sort_order: parsed.data.sortOrder,
      starts_at: parsed.data.startsAt,
      ends_at: parsed.data.endsAt,
    });
    return mapFeaturedPlacementRow(row);
  } catch (err) {
    throw mapCmsPostgrestError(err as never);
  }
}

export async function removeFeaturedPlacement(id: string): Promise<void> {
  try {
    await repo.deleteFeaturedPlacement(id);
  } catch (err) {
    throw mapCmsPostgrestError(err as never);
  }
}

// =======================================================================
// Gallery item
// =======================================================================

export async function listPublishedGalleryItems(): Promise<GalleryItem[]> {
  try {
    const rows = await repo.findPublishedGalleryItems();
    return rows.map((r) => mapGalleryItemRow(r, r.media_asset.storage_path));
  } catch (err) {
    throw mapCmsPostgrestError(err as never);
  }
}

export async function addGalleryItem(input: CreateGalleryItemInput): Promise<GalleryItem> {
  const parsed = createGalleryItemSchema.safeParse(input);
  if (!parsed.success) throw mapCmsZodError(parsed.error);

  try {
    const row = await repo.insertGalleryItem({
      media_asset_id: parsed.data.mediaAssetId,
      caption: parsed.data.caption,
      source_url: parsed.data.sourceUrl,
      sort_order: parsed.data.sortOrder,
    });
    return mapGalleryItemRow(row);
  } catch (err) {
    throw mapCmsPostgrestError(err as never);
  }
}

export async function setGalleryItemStatus(id: string, status: ContentBlockStatus): Promise<GalleryItem> {
  try {
    const row = await repo.updateGalleryItemStatusRow(id, status);
    return mapGalleryItemRow(row);
  } catch (err) {
    throw mapCmsPostgrestError(err as never);
  }
}

// =======================================================================
// Testimonial
// =======================================================================

export async function listPublishedTestimonials(): Promise<Testimonial[]> {
  try {
    const rows = await repo.findPublishedTestimonials();
    return rows.map((r) => mapTestimonialRow(r, r.customer_photo?.storage_path ?? null));
  } catch (err) {
    throw mapCmsPostgrestError(err as never);
  }
}

export async function addTestimonial(input: CreateTestimonialInput): Promise<Testimonial> {
  const parsed = createTestimonialSchema.safeParse(input);
  if (!parsed.success) throw mapCmsZodError(parsed.error);

  try {
    const row = await repo.insertTestimonial({
      customer_name: parsed.data.customerName,
      quote: parsed.data.quote,
      rating: parsed.data.rating,
      product_id: parsed.data.productId,
      customer_photo_media_asset_id: parsed.data.customerPhotoMediaAssetId,
      sort_order: parsed.data.sortOrder,
    });
    return mapTestimonialRow(row);
  } catch (err) {
    throw mapCmsPostgrestError(err as never);
  }
}

export async function setTestimonialStatus(id: string, status: ContentBlockStatus): Promise<Testimonial> {
  try {
    const row = await repo.updateTestimonialStatusRow(id, status);
    return mapTestimonialRow(row);
  } catch (err) {
    throw mapCmsPostgrestError(err as never);
  }
}

// =======================================================================
// Announcement
// =======================================================================

export async function listActiveAnnouncements(): Promise<Announcement[]> {
  try {
    const rows = await repo.findPublishedAnnouncements();
    const now = new Date();
    return rows
      .filter((r) => (!r.starts_at || new Date(r.starts_at) <= now) && (!r.ends_at || new Date(r.ends_at) >= now))
      .map(mapAnnouncementRow);
  } catch (err) {
    throw mapCmsPostgrestError(err as never);
  }
}

export async function createAnnouncement(input: CreateAnnouncementInput): Promise<Announcement> {
  const parsed = createAnnouncementSchema.safeParse(input);
  if (!parsed.success) throw mapCmsZodError(parsed.error);

  try {
    const row = await repo.insertAnnouncement({
      message: parsed.data.message,
      link_url: parsed.data.linkUrl,
      starts_at: parsed.data.startsAt,
      ends_at: parsed.data.endsAt,
    });
    return mapAnnouncementRow(row);
  } catch (err) {
    throw mapCmsPostgrestError(err as never);
  }
}

export async function setAnnouncementStatus(id: string, status: ContentBlockStatus): Promise<Announcement> {
  try {
    const row = await repo.updateAnnouncementStatusRow(id, status);
    return mapAnnouncementRow(row);
  } catch (err) {
    throw mapCmsPostgrestError(err as never);
  }
}

// =======================================================================
// Navigation (tree assembly)
// =======================================================================

export async function getNavigationMenuByKey(key: string): Promise<NavigationMenu | null> {
  try {
    const row = await repo.findNavigationMenuByKey(key);
    return row ? mapNavigationMenuRow(row) : null;
  } catch (err) {
    throw mapCmsPostgrestError(err as never);
  }
}

/**
 * Fetches every item for a menu and assembles it into a tree
 * client-side, attaching each node's mega_menu_promo (if any) — the
 * same flat-list-then-assemble approach as category.service.ts's
 * getCategoryTree, for the identical structural reason (self-
 * referential table, no recursive CTE via PostgREST).
 */
export async function getNavigationTree(menuId: string): Promise<NavigationTreeNode[]> {
  try {
    const items = await repo.findNavigationItemsForMenu(menuId);
    const promoRows = await repo.findMegaMenuPromosForMenu(items.map((i) => i.id));
    const promoByNavItemId = new Map(
      promoRows.map((p) => [p.navigation_item_id, mapMegaMenuPromoRow(p, p.media_asset?.storage_path ?? null)])
    );

    const mapped = items.map(mapNavigationItemRow);
    return buildNavigationTree(mapped, null, promoByNavItemId);
  } catch (err) {
    throw mapCmsPostgrestError(err as never);
  }
}

function buildNavigationTree(
  flat: ReturnType<typeof mapNavigationItemRow>[],
  parentId: string | null,
  promoByNavItemId: Map<string, ReturnType<typeof mapMegaMenuPromoRow>>
): NavigationTreeNode[] {
  return flat
    .filter((item) => item.parentItemId === parentId)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((item) => ({
      ...item,
      children: buildNavigationTree(flat, item.id, promoByNavItemId),
      promo: promoByNavItemId.get(item.id) ?? null,
    }));
}

export async function createNavigationItem(input: CreateNavigationItemInput) {
  const parsed = createNavigationItemSchema.safeParse(input);
  if (!parsed.success) throw mapCmsZodError(parsed.error);

  try {
    const row = await repo.insertNavigationItem({
      menu_id: parsed.data.menuId,
      parent_item_id: parsed.data.parentItemId,
      label: parsed.data.label,
      url: parsed.data.url,
      category_id: parsed.data.categoryId,
      sort_order: parsed.data.sortOrder,
    });
    return mapNavigationItemRow(row);
  } catch (err) {
    throw mapCmsPostgrestError(err as never);
  }
}

export async function setMegaMenuPromo(input: SetMegaMenuPromoInput) {
  const parsed = setMegaMenuPromoSchema.safeParse(input);
  if (!parsed.success) throw mapCmsZodError(parsed.error);

  try {
    const row = await repo.upsertMegaMenuPromo({
      navigation_item_id: parsed.data.navigationItemId,
      media_asset_id: parsed.data.mediaAssetId,
      title: parsed.data.title,
      subtitle: parsed.data.subtitle,
      cta_url: parsed.data.ctaUrl,
    });
    return mapMegaMenuPromoRow(row);
  } catch (err) {
    throw mapCmsPostgrestError(err as never);
  }
}

// =======================================================================
// Social link / Contact info / SEO redirect / Site setting
// =======================================================================

export async function listPublishedSocialLinks(): Promise<SocialLink[]> {
  try {
    const rows = await repo.findPublishedSocialLinks();
    return rows.map(mapSocialLinkRow);
  } catch (err) {
    throw mapCmsPostgrestError(err as never);
  }
}

export async function addSocialLink(input: CreateSocialLinkInput): Promise<SocialLink> {
  const parsed = createSocialLinkSchema.safeParse(input);
  if (!parsed.success) throw mapCmsZodError(parsed.error);

  try {
    const row = await repo.insertSocialLink({
      platform: parsed.data.platform,
      url: parsed.data.url,
      sort_order: parsed.data.sortOrder,
    });
    return mapSocialLinkRow(row);
  } catch (err) {
    throw mapCmsPostgrestError(err as never);
  }
}

export async function getContactInfo(): Promise<ContactInfo | null> {
  try {
    const row = await repo.findDefaultContactInfo();
    return row ? mapContactInfoRow(row) : null;
  } catch (err) {
    throw mapCmsPostgrestError(err as never);
  }
}

export async function updateContactInfo(input: UpdateContactInfoInput): Promise<ContactInfo> {
  const parsed = updateContactInfoSchema.safeParse(input);
  if (!parsed.success) throw mapCmsZodError(parsed.error);

  try {
    const row = await repo.updateDefaultContactInfo({
      phone: parsed.data.phone,
      whatsapp_number: parsed.data.whatsappNumber,
      email: parsed.data.email,
      address: parsed.data.address,
      business_hours: parsed.data.businessHours,
    });
    return mapContactInfoRow(row);
  } catch (err) {
    throw mapCmsPostgrestError(err as never);
  }
}

/** Looks up an active redirect for a given path — the frontend router calls this on a 404 before giving up, per seo_redirect's documented purpose (011_cms.sql). */
export async function resolveSeoRedirect(fromPath: string): Promise<SeoRedirect | null> {
  try {
    const row = await repo.findActiveSeoRedirectByFromPath(fromPath);
    return row ? mapSeoRedirectRow(row) : null;
  } catch (err) {
    throw mapCmsPostgrestError(err as never);
  }
}

export async function createSeoRedirect(input: CreateSeoRedirectInput): Promise<SeoRedirect> {
  const parsed = createSeoRedirectSchema.safeParse(input);
  if (!parsed.success) throw mapCmsZodError(parsed.error);

  try {
    const row = await repo.insertSeoRedirect({
      from_path: parsed.data.fromPath,
      to_path: parsed.data.toPath,
      redirect_type: parsed.data.redirectType,
    });
    return mapSeoRedirectRow(row);
  } catch (err) {
    throw mapCmsPostgrestError(err as never);
  }
}

export async function listPublicSiteSettings(): Promise<SiteSetting[]> {
  try {
    const rows = await repo.findPublicSiteSettings();
    return rows.map(mapSiteSettingRow);
  } catch (err) {
    throw mapCmsPostgrestError(err as never);
  }
}

export async function getSiteSetting(key: string): Promise<SiteSetting | null> {
  try {
    const row = await repo.findSiteSettingByKey(key);
    return row ? mapSiteSettingRow(row) : null;
  } catch (err) {
    throw mapCmsPostgrestError(err as never);
  }
}

export async function setSiteSetting(key: string, value: unknown, isPublic?: boolean): Promise<SiteSetting> {
  try {
    const row = await repo.upsertSiteSetting(key, value, isPublic);
    return mapSiteSettingRow(row);
  } catch (err) {
    throw mapCmsPostgrestError(err as never);
  }
}
