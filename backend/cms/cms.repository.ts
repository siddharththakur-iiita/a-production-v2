/**
 * src/features/cms/cms.repository.ts
 *
 * RLS reminder (016_rls.sql): every read-facing table here follows
 * the same shape — public SELECT of published/active rows, staff
 * SELECT of everything, staff ALL for writes, all gated on cms.write
 * (or catalog.write for the tables shared with Catalog, e.g.
 * media_asset). site_setting additionally gates its public read
 * per-row on is_public. contact_info/navigation_menu/navigation_item/
 * social_link are public SELECT unconditionally (no draft/published
 * gate — see 016_rls.sql Section 7 for the exact per-table policy
 * list).
 */
import { supabase } from '../../lib/supabase/client';
import type {
  MediaAssetRow,
  MediaAssetInsert,
  PageRow,
  PageInsert,
  ContentBlockRow,
  ContentBlockInsert,
  ContentBlockStatus,
  HeroBannerRow,
  HeroBannerInsert,
  FeaturedPlacementRow,
  FeaturedPlacementInsert,
  GalleryItemRow,
  GalleryItemInsert,
  TestimonialRow,
  TestimonialInsert,
  AnnouncementRow,
  AnnouncementInsert,
  NavigationMenuRow,
  NavigationItemRow,
  NavigationItemInsert,
  MegaMenuPromoRow,
  MegaMenuPromoInsert,
  SocialLinkRow,
  SocialLinkInsert,
  ContactInfoRow,
  SeoRedirectRow,
  SeoRedirectInsert,
  SiteSettingRow,
} from '../../lib/supabase/database.types';

export async function insertMediaAsset(input: MediaAssetInsert): Promise<MediaAssetRow> {
  const { data, error } = await supabase.from('media_asset').insert(input).select('*').single();
  if (error) throw error;
  return data;
}

export async function findMediaAssetById(id: string): Promise<MediaAssetRow | null> {
  const { data, error } = await supabase.from('media_asset').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data;
}

export async function findActivePages(): Promise<PageRow[]> {
  const { data, error } = await supabase.from('page').select('*').eq('is_active', true);
  if (error) throw error;
  return data;
}

export async function findPageByKey(key: string): Promise<PageRow | null> {
  const { data, error } = await supabase.from('page').select('*').eq('key', key).maybeSingle();
  if (error) throw error;
  return data;
}

export async function insertPage(input: PageInsert): Promise<PageRow> {
  const { data, error } = await supabase.from('page').insert(input).select('*').single();
  if (error) throw error;
  return data;
}

export async function findPublishedContentBlocksForPage(pageId: string): Promise<ContentBlockRow[]> {
  const { data, error } = await supabase
    .from('content_block')
    .select('*')
    .eq('page_id', pageId)
    .eq('status', 'published')
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return data;
}

export async function findAllContentBlocksForPageStaff(pageId: string): Promise<ContentBlockRow[]> {
  const { data, error } = await supabase
    .from('content_block')
    .select('*')
    .eq('page_id', pageId)
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return data;
}

export async function insertContentBlock(input: ContentBlockInsert): Promise<ContentBlockRow> {
  const { data, error } = await supabase.from('content_block').insert(input).select('*').single();
  if (error) throw error;
  return data;
}

export async function updateContentBlockContentRow(id: string, content: unknown): Promise<ContentBlockRow> {
  const { data, error } = await supabase
    .from('content_block')
    .update({ content })
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

export async function updateContentBlockStatusRow(
  id: string,
  status: ContentBlockStatus
): Promise<ContentBlockRow> {
  const { data, error } = await supabase.from('content_block').update({ status }).eq('id', id).select('*').single();
  if (error) throw error;
  return data;
}

export async function findPublishedHeroBannersForPage(
  pageId: string
): Promise<(HeroBannerRow & { media_asset: { storage_path: string } | null })[]> {
  const { data, error } = await supabase
    .from('hero_banner')
    .select('*, media_asset:media_asset_id(storage_path)')
    .eq('page_id', pageId)
    .eq('status', 'published')
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return data as never;
}

export async function insertHeroBanner(input: HeroBannerInsert): Promise<HeroBannerRow> {
  const { data, error } = await supabase.from('hero_banner').insert(input).select('*').single();
  if (error) throw error;
  return data;
}

export async function updateHeroBannerStatusRow(id: string, status: ContentBlockStatus): Promise<HeroBannerRow> {
  const { data, error } = await supabase.from('hero_banner').update({ status }).eq('id', id).select('*').single();
  if (error) throw error;
  return data;
}

export async function findFeaturedPlacements(
  context: FeaturedPlacementRow['placement_context'],
  contextRefId?: string
): Promise<FeaturedPlacementRow[]> {
  let query = supabase.from('featured_placement').select('*').eq('placement_context', context);
  query = contextRefId ? query.eq('context_ref_id', contextRefId) : query.is('context_ref_id', null);

  const { data, error } = await query.order('sort_order', { ascending: true });
  if (error) throw error;
  return data;
}

export async function insertFeaturedPlacement(input: FeaturedPlacementInsert): Promise<FeaturedPlacementRow> {
  const { data, error } = await supabase.from('featured_placement').insert(input).select('*').single();
  if (error) throw error;
  return data;
}

export async function deleteFeaturedPlacement(id: string): Promise<void> {
  const { error } = await supabase.from('featured_placement').delete().eq('id', id);
  if (error) throw error;
}

export async function findPublishedGalleryItems(): Promise<
  (GalleryItemRow & { media_asset: { storage_path: string } })[]
> {
  const { data, error } = await supabase
    .from('gallery_item')
    .select('*, media_asset:media_asset_id(storage_path)')
    .eq('status', 'published')
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return data as never;
}

export async function insertGalleryItem(input: GalleryItemInsert): Promise<GalleryItemRow> {
  const { data, error } = await supabase.from('gallery_item').insert(input).select('*').single();
  if (error) throw error;
  return data;
}

export async function updateGalleryItemStatusRow(id: string, status: ContentBlockStatus): Promise<GalleryItemRow> {
  const { data, error } = await supabase.from('gallery_item').update({ status }).eq('id', id).select('*').single();
  if (error) throw error;
  return data;
}

export async function findPublishedTestimonials(): Promise<
  (TestimonialRow & { customer_photo: { storage_path: string } | null })[]
> {
  const { data, error } = await supabase
    .from('testimonial')
    .select('*, customer_photo:customer_photo_media_asset_id(storage_path)')
    .eq('status', 'published')
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return data as never;
}

export async function insertTestimonial(input: TestimonialInsert): Promise<TestimonialRow> {
  const { data, error } = await supabase.from('testimonial').insert(input).select('*').single();
  if (error) throw error;
  return data;
}

export async function updateTestimonialStatusRow(id: string, status: ContentBlockStatus): Promise<TestimonialRow> {
  const { data, error } = await supabase.from('testimonial').update({ status }).eq('id', id).select('*').single();
  if (error) throw error;
  return data;
}

export async function findPublishedAnnouncements(): Promise<AnnouncementRow[]> {
  const { data, error } = await supabase.from('announcement').select('*').eq('status', 'published');
  if (error) throw error;
  return data;
}

export async function insertAnnouncement(input: AnnouncementInsert): Promise<AnnouncementRow> {
  const { data, error } = await supabase.from('announcement').insert(input).select('*').single();
  if (error) throw error;
  return data;
}

export async function updateAnnouncementStatusRow(id: string, status: ContentBlockStatus): Promise<AnnouncementRow> {
  const { data, error } = await supabase.from('announcement').update({ status }).eq('id', id).select('*').single();
  if (error) throw error;
  return data;
}

export async function findNavigationMenuByKey(key: string): Promise<NavigationMenuRow | null> {
  const { data, error } = await supabase.from('navigation_menu').select('*').eq('key', key).maybeSingle();
  if (error) throw error;
  return data;
}

export async function findNavigationItemsForMenu(menuId: string): Promise<NavigationItemRow[]> {
  const { data, error } = await supabase
    .from('navigation_item')
    .select('*')
    .eq('menu_id', menuId)
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return data;
}

export async function insertNavigationItem(input: NavigationItemInsert): Promise<NavigationItemRow> {
  const { data, error } = await supabase.from('navigation_item').insert(input).select('*').single();
  if (error) throw error;
  return data;
}

export async function findMegaMenuPromosForMenu(
  navigationItemIds: string[]
): Promise<(MegaMenuPromoRow & { media_asset: { storage_path: string } | null })[]> {
  if (navigationItemIds.length === 0) return [];
  const { data, error } = await supabase
    .from('mega_menu_promo')
    .select('*, media_asset:media_asset_id(storage_path)')
    .in('navigation_item_id', navigationItemIds);
  if (error) throw error;
  return data as never;
}

export async function upsertMegaMenuPromo(input: MegaMenuPromoInsert): Promise<MegaMenuPromoRow> {
  const { data, error } = await supabase
    .from('mega_menu_promo')
    .upsert(input, { onConflict: 'navigation_item_id' })
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

export async function findPublishedSocialLinks(): Promise<SocialLinkRow[]> {
  const { data, error } = await supabase
    .from('social_link')
    .select('*')
    .eq('status', 'published')
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return data;
}

export async function insertSocialLink(input: SocialLinkInsert): Promise<SocialLinkRow> {
  const { data, error } = await supabase.from('social_link').insert(input).select('*').single();
  if (error) throw error;
  return data;
}

export async function findDefaultContactInfo(): Promise<ContactInfoRow | null> {
  const { data, error } = await supabase.from('contact_info').select('*').eq('label', 'default').maybeSingle();
  if (error) throw error;
  return data;
}

export async function updateDefaultContactInfo(
  patch: Partial<{
    phone: string | null;
    whatsapp_number: string | null;
    email: string | null;
    address: string | null;
    business_hours: string | null;
  }>
): Promise<ContactInfoRow> {
  const { data, error } = await supabase
    .from('contact_info')
    .update(patch)
    .eq('label', 'default')
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

export async function findActiveSeoRedirectByFromPath(fromPath: string): Promise<SeoRedirectRow | null> {
  const { data, error } = await supabase
    .from('seo_redirect')
    .select('*')
    .eq('from_path', fromPath)
    .eq('status', 'active')
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function insertSeoRedirect(input: SeoRedirectInsert): Promise<SeoRedirectRow> {
  const { data, error } = await supabase.from('seo_redirect').insert(input).select('*').single();
  if (error) throw error;
  return data;
}

export async function findPublicSiteSettings(): Promise<SiteSettingRow[]> {
  const { data, error } = await supabase.from('site_setting').select('*').eq('is_public', true);
  if (error) throw error;
  return data;
}

export async function findSiteSettingByKey(key: string): Promise<SiteSettingRow | null> {
  const { data, error } = await supabase.from('site_setting').select('*').eq('key', key).maybeSingle();
  if (error) throw error;
  return data;
}

export async function upsertSiteSetting(key: string, value: unknown, isPublic?: boolean): Promise<SiteSettingRow> {
  const { data, error } = await supabase
    .from('site_setting')
    .upsert({ key, value, is_public: isPublic }, { onConflict: 'key' })
    .select('*')
    .single();
  if (error) throw error;
  return data;
}
