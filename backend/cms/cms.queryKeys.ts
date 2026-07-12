/**
 * src/features/cms/cms.queryKeys.ts
 */
export const cmsQueryKeys = {
  all: ['cms'] as const,

  pages: () => [...cmsQueryKeys.all, 'pages'] as const,
  pageByKey: (key: string) => [...cmsQueryKeys.pages(), key] as const,
  contentBlocks: (pageId: string) => [...cmsQueryKeys.all, 'content-blocks', pageId] as const,
  contentBlocksStaff: (pageId: string) => [...cmsQueryKeys.all, 'content-blocks-staff', pageId] as const,

  heroBanners: (pageId: string) => [...cmsQueryKeys.all, 'hero-banners', pageId] as const,

  featuredPlacements: (context: string, contextRefId?: string) =>
    [...cmsQueryKeys.all, 'featured-placements', context, contextRefId ?? null] as const,

  galleryItems: () => [...cmsQueryKeys.all, 'gallery-items'] as const,
  testimonials: () => [...cmsQueryKeys.all, 'testimonials'] as const,
  announcements: () => [...cmsQueryKeys.all, 'announcements'] as const,

  navigationMenu: (key: string) => [...cmsQueryKeys.all, 'navigation-menu', key] as const,
  navigationTree: (menuId: string) => [...cmsQueryKeys.all, 'navigation-tree', menuId] as const,

  socialLinks: () => [...cmsQueryKeys.all, 'social-links'] as const,
  contactInfo: () => [...cmsQueryKeys.all, 'contact-info'] as const,
  seoRedirect: (fromPath: string) => [...cmsQueryKeys.all, 'seo-redirect', fromPath] as const,

  publicSiteSettings: () => [...cmsQueryKeys.all, 'site-settings-public'] as const,
  siteSetting: (key: string) => [...cmsQueryKeys.all, 'site-setting', key] as const,
};
