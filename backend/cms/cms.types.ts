/**
 * src/features/cms/cms.types.ts
 *
 * Domain types for the CMS module (011_cms.sql, 15 tables): media
 * library, pages/content blocks, hero banners, featured placements,
 * gallery, testimonials, announcements, navigation (self-referential
 * tree, mirroring category.types.ts's tree pattern for the same
 * shape of problem), social links, contact info, SEO redirects, and
 * site settings.
 */
import type {
  MediaAssetRow,
  PageRow,
  ContentBlockRow,
  ContentBlockStatus,
  HeroBannerRow,
  FeaturedPlacementRow,
  GalleryItemRow,
  TestimonialRow,
  AnnouncementRow,
  NavigationMenuRow,
  NavigationItemRow,
  MegaMenuPromoRow,
  SocialLinkRow,
  ContactInfoRow,
  SeoRedirectRow,
  SiteSettingRow,
} from '../../lib/supabase/database.types';
import { getCatalogPublicUrl } from '../../lib/supabase/storage';

export interface MediaAsset {
  id: string;
  storagePath: string;
  url: string;
  isPrivate: boolean;
  altText: string | null;
  tags: string[] | null;
}

export function mapMediaAssetRow(row: MediaAssetRow): MediaAsset {
  return {
    id: row.id,
    storagePath: row.storage_path,
    url: row.is_private ? '' : getCatalogPublicUrl(row.storage_path),
    isPrivate: row.is_private,
    altText: row.alt_text,
    tags: row.tags,
  };
}

export interface RegisterMediaAssetInput {
  storagePath: string;
  isPrivate?: boolean;
  altText?: string;
  tags?: string[];
}

export interface Page {
  id: string;
  key: string;
  name: string;
  isActive: boolean;
}

export function mapPageRow(row: PageRow): Page {
  return { id: row.id, key: row.key, name: row.name, isActive: row.is_active };
}

export interface ContentBlock {
  id: string;
  pageId: string;
  sectionKey: string;
  content: Record<string, unknown>;
  sortOrder: number;
  status: ContentBlockStatus;
  publishedAt: string | null;
}

export function mapContentBlockRow(row: ContentBlockRow): ContentBlock {
  return {
    id: row.id,
    pageId: row.page_id,
    sectionKey: row.section_key,
    content: row.content as Record<string, unknown>,
    sortOrder: row.sort_order,
    status: row.status,
    publishedAt: row.published_at,
  };
}

export interface HeroBanner {
  id: string;
  pageId: string;
  imageUrl: string | null;
  headline: string | null;
  subheadline: string | null;
  ctaLabel: string | null;
  ctaUrl: string | null;
  startsAt: string | null;
  endsAt: string | null;
  sortOrder: number;
  status: ContentBlockStatus;
}

export function mapHeroBannerRow(row: HeroBannerRow, storagePath: string | null = null): HeroBanner {
  return {
    id: row.id,
    pageId: row.page_id,
    imageUrl: storagePath ? getCatalogPublicUrl(storagePath) : null,
    headline: row.headline,
    subheadline: row.subheadline,
    ctaLabel: row.cta_label,
    ctaUrl: row.cta_url,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    sortOrder: row.sort_order,
    status: row.status,
  };
}

export type PlacementContext = FeaturedPlacementRow['placement_context'];
export type PlacementType = FeaturedPlacementRow['placement_type'];

export interface FeaturedPlacement {
  id: string;
  placementContext: PlacementContext;
  contextRefId: string | null;
  productId: string;
  placementType: PlacementType;
  sortOrder: number;
  startsAt: string | null;
  endsAt: string | null;
}

export function mapFeaturedPlacementRow(row: FeaturedPlacementRow): FeaturedPlacement {
  return {
    id: row.id,
    placementContext: row.placement_context,
    contextRefId: row.context_ref_id,
    productId: row.product_id,
    placementType: row.placement_type,
    sortOrder: row.sort_order,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
  };
}

export interface GalleryItem {
  id: string;
  caption: string | null;
  sourceUrl: string | null;
  sortOrder: number;
  status: ContentBlockStatus;
  imageUrl: string | null;
}

export function mapGalleryItemRow(row: GalleryItemRow, storagePath: string | null = null): GalleryItem {
  return {
    id: row.id,
    caption: row.caption,
    sourceUrl: row.source_url,
    sortOrder: row.sort_order,
    status: row.status,
    imageUrl: storagePath ? getCatalogPublicUrl(storagePath) : null,
  };
}

export interface Testimonial {
  id: string;
  customerName: string;
  quote: string;
  rating: number | null;
  productId: string | null;
  status: ContentBlockStatus;
  sortOrder: number;
  photoUrl: string | null;
}

export function mapTestimonialRow(row: TestimonialRow, photoStoragePath: string | null = null): Testimonial {
  return {
    id: row.id,
    customerName: row.customer_name,
    quote: row.quote,
    rating: row.rating,
    productId: row.product_id,
    status: row.status,
    sortOrder: row.sort_order,
    photoUrl: photoStoragePath ? getCatalogPublicUrl(photoStoragePath) : null,
  };
}

export interface Announcement {
  id: string;
  message: string;
  linkUrl: string | null;
  startsAt: string | null;
  endsAt: string | null;
  status: ContentBlockStatus;
}

export function mapAnnouncementRow(row: AnnouncementRow): Announcement {
  return {
    id: row.id,
    message: row.message,
    linkUrl: row.link_url,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    status: row.status,
  };
}

export interface NavigationMenu {
  id: string;
  key: string;
  name: string;
}

export function mapNavigationMenuRow(row: NavigationMenuRow): NavigationMenu {
  return { id: row.id, key: row.key, name: row.name };
}

export interface NavigationItem {
  id: string;
  menuId: string;
  parentItemId: string | null;
  label: string;
  url: string | null;
  categoryId: string | null;
  sortOrder: number;
}

export function mapNavigationItemRow(row: NavigationItemRow): NavigationItem {
  return {
    id: row.id,
    menuId: row.menu_id,
    parentItemId: row.parent_item_id,
    label: row.label,
    url: row.url,
    categoryId: row.category_id,
    sortOrder: row.sort_order,
  };
}

export interface NavigationTreeNode extends NavigationItem {
  children: NavigationTreeNode[];
  promo: MegaMenuPromo | null;
}

export interface MegaMenuPromo {
  id: string;
  navigationItemId: string;
  title: string | null;
  subtitle: string | null;
  ctaUrl: string | null;
  imageUrl: string | null;
}

export function mapMegaMenuPromoRow(row: MegaMenuPromoRow, storagePath: string | null = null): MegaMenuPromo {
  return {
    id: row.id,
    navigationItemId: row.navigation_item_id,
    title: row.title,
    subtitle: row.subtitle,
    ctaUrl: row.cta_url,
    imageUrl: storagePath ? getCatalogPublicUrl(storagePath) : null,
  };
}

export interface SocialLink {
  id: string;
  platform: string;
  url: string;
  sortOrder: number;
  status: ContentBlockStatus;
}

export function mapSocialLinkRow(row: SocialLinkRow): SocialLink {
  return { id: row.id, platform: row.platform, url: row.url, sortOrder: row.sort_order, status: row.status };
}

export interface ContactInfo {
  id: string;
  label: string;
  phone: string | null;
  whatsappNumber: string | null;
  email: string | null;
  address: string | null;
  businessHours: string | null;
}

export function mapContactInfoRow(row: ContactInfoRow): ContactInfo {
  return {
    id: row.id,
    label: row.label,
    phone: row.phone,
    whatsappNumber: row.whatsapp_number,
    email: row.email,
    address: row.address,
    businessHours: row.business_hours,
  };
}

export interface SeoRedirect {
  id: string;
  fromPath: string;
  toPath: string;
  redirectType: SeoRedirectRow['redirect_type'];
  status: SeoRedirectRow['status'];
}

export function mapSeoRedirectRow(row: SeoRedirectRow): SeoRedirect {
  return {
    id: row.id,
    fromPath: row.from_path,
    toPath: row.to_path,
    redirectType: row.redirect_type,
    status: row.status,
  };
}

export interface SiteSetting {
  key: string;
  value: unknown;
  isPublic: boolean;
}

export function mapSiteSettingRow(row: SiteSettingRow): SiteSetting {
  return { key: row.key, value: row.value, isPublic: row.is_public };
}

export interface CreateContentBlockInput {
  pageId: string;
  sectionKey: string;
  content: Record<string, unknown>;
  sortOrder?: number;
}

export interface UpdateContentBlockContentInput {
  id: string;
  content: Record<string, unknown>;
}

export interface CreateHeroBannerInput {
  pageId: string;
  mediaAssetId?: string;
  headline?: string;
  subheadline?: string;
  ctaLabel?: string;
  ctaUrl?: string;
  startsAt?: string;
  endsAt?: string;
  sortOrder?: number;
}

export interface CreateFeaturedPlacementInput {
  placementContext: PlacementContext;
  contextRefId?: string;
  productId: string;
  placementType: PlacementType;
  sortOrder?: number;
  startsAt?: string;
  endsAt?: string;
}

export interface CreateGalleryItemInput {
  mediaAssetId: string;
  caption?: string;
  sourceUrl?: string;
  sortOrder?: number;
}

export interface CreateTestimonialInput {
  customerName: string;
  quote: string;
  rating?: number;
  productId?: string;
  customerPhotoMediaAssetId?: string;
  sortOrder?: number;
}

export interface CreateAnnouncementInput {
  message: string;
  linkUrl?: string;
  startsAt?: string;
  endsAt?: string;
}

export interface CreateNavigationItemInput {
  menuId: string;
  parentItemId?: string;
  label: string;
  url?: string;
  categoryId?: string;
  sortOrder?: number;
}

export interface SetMegaMenuPromoInput {
  navigationItemId: string;
  mediaAssetId?: string;
  title?: string;
  subtitle?: string;
  ctaUrl?: string;
}

export interface CreateSocialLinkInput {
  platform: string;
  url: string;
  sortOrder?: number;
}

export interface UpdateContactInfoInput {
  phone?: string | null;
  whatsappNumber?: string | null;
  email?: string | null;
  address?: string | null;
  businessHours?: string | null;
}

export interface CreateSeoRedirectInput {
  fromPath: string;
  toPath: string;
  redirectType?: SeoRedirectRow['redirect_type'];
}
