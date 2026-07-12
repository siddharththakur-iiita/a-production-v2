/**
 * src/features/cms/cms.hooks.ts
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as service from './cms.service';
import { cmsQueryKeys } from './cms.queryKeys';
import type { ContentBlockStatus } from '../../lib/supabase/database.types';
import type {
  CreateAnnouncementInput,
  CreateContentBlockInput,
  CreateFeaturedPlacementInput,
  CreateGalleryItemInput,
  CreateHeroBannerInput,
  CreateNavigationItemInput,
  CreateSeoRedirectInput,
  CreateSocialLinkInput,
  CreateTestimonialInput,
  FeaturedPlacement,
  RegisterMediaAssetInput,
  SetMegaMenuPromoInput,
  UpdateContactInfoInput,
} from './cms.types';

export function useRegisterMediaAsset() {
  return useMutation({ mutationFn: (input: RegisterMediaAssetInput) => service.registerMediaAsset(input) });
}

export function useActivePages() {
  return useQuery({ queryKey: cmsQueryKeys.pages(), queryFn: () => service.listActivePages() });
}

export function usePageByKey(key: string | undefined) {
  return useQuery({
    queryKey: cmsQueryKeys.pageByKey(key ?? ''),
    queryFn: () => service.getPageByKey(key as string),
    enabled: Boolean(key),
  });
}

export function usePublishedContentBlocks(pageId: string | undefined) {
  return useQuery({
    queryKey: cmsQueryKeys.contentBlocks(pageId ?? ''),
    queryFn: () => service.listPublishedContentBlocks(pageId as string),
    enabled: Boolean(pageId),
  });
}

export function useContentBlocksForStaff(pageId: string | undefined) {
  return useQuery({
    queryKey: cmsQueryKeys.contentBlocksStaff(pageId ?? ''),
    queryFn: () => service.listContentBlocksForStaff(pageId as string),
    enabled: Boolean(pageId),
  });
}

export function useCreateContentBlock() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateContentBlockInput) => service.createContentBlock(input),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: cmsQueryKeys.contentBlocksStaff(variables.pageId) });
    },
  });
}

export function useUpdateContentBlockContent(pageId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, content }: { id: string; content: Record<string, unknown> }) =>
      service.updateContentBlockContent(id, content),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: cmsQueryKeys.contentBlocksStaff(pageId) }),
  });
}

export function usePublishContentBlock(pageId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => service.publishContentBlock(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cmsQueryKeys.contentBlocksStaff(pageId) });
      queryClient.invalidateQueries({ queryKey: cmsQueryKeys.contentBlocks(pageId) });
    },
  });
}

export function useUnpublishContentBlock(pageId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => service.unpublishContentBlock(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cmsQueryKeys.contentBlocksStaff(pageId) });
      queryClient.invalidateQueries({ queryKey: cmsQueryKeys.contentBlocks(pageId) });
    },
  });
}

export function useActiveHeroBanners(pageId: string | undefined) {
  return useQuery({
    queryKey: cmsQueryKeys.heroBanners(pageId ?? ''),
    queryFn: () => service.listActiveHeroBanners(pageId as string),
    enabled: Boolean(pageId),
  });
}

export function useCreateHeroBanner() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateHeroBannerInput) => service.createHeroBanner(input),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: cmsQueryKeys.heroBanners(variables.pageId) });
    },
  });
}

export function usePublishHeroBanner(pageId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => service.publishHeroBanner(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: cmsQueryKeys.heroBanners(pageId) }),
  });
}

export function useUnpublishHeroBanner(pageId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => service.unpublishHeroBanner(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: cmsQueryKeys.heroBanners(pageId) }),
  });
}

export function useFeaturedPlacements(context: FeaturedPlacement['placementContext'], contextRefId?: string) {
  return useQuery({
    queryKey: cmsQueryKeys.featuredPlacements(context, contextRefId),
    queryFn: () => service.listFeaturedPlacements(context, contextRefId),
  });
}

export function useAddFeaturedPlacement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateFeaturedPlacementInput) => service.addFeaturedPlacement(input),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: cmsQueryKeys.featuredPlacements(variables.placementContext, variables.contextRefId),
      });
    },
  });
}

export function useRemoveFeaturedPlacement(context: FeaturedPlacement['placementContext'], contextRefId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => service.removeFeaturedPlacement(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cmsQueryKeys.featuredPlacements(context, contextRefId) });
    },
  });
}

export function usePublishedGalleryItems() {
  return useQuery({ queryKey: cmsQueryKeys.galleryItems(), queryFn: () => service.listPublishedGalleryItems() });
}

export function useAddGalleryItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateGalleryItemInput) => service.addGalleryItem(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: cmsQueryKeys.galleryItems() }),
  });
}

export function useSetGalleryItemStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: ContentBlockStatus }) =>
      service.setGalleryItemStatus(id, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: cmsQueryKeys.galleryItems() }),
  });
}

export function usePublishedTestimonials() {
  return useQuery({ queryKey: cmsQueryKeys.testimonials(), queryFn: () => service.listPublishedTestimonials() });
}

export function useAddTestimonial() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateTestimonialInput) => service.addTestimonial(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: cmsQueryKeys.testimonials() }),
  });
}

export function useSetTestimonialStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: ContentBlockStatus }) =>
      service.setTestimonialStatus(id, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: cmsQueryKeys.testimonials() }),
  });
}

export function useActiveAnnouncements() {
  return useQuery({ queryKey: cmsQueryKeys.announcements(), queryFn: () => service.listActiveAnnouncements() });
}

export function useCreateAnnouncement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateAnnouncementInput) => service.createAnnouncement(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: cmsQueryKeys.announcements() }),
  });
}

export function useSetAnnouncementStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: ContentBlockStatus }) =>
      service.setAnnouncementStatus(id, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: cmsQueryKeys.announcements() }),
  });
}

export function useNavigationMenuByKey(key: string | undefined) {
  return useQuery({
    queryKey: cmsQueryKeys.navigationMenu(key ?? ''),
    queryFn: () => service.getNavigationMenuByKey(key as string),
    enabled: Boolean(key),
  });
}

export function useNavigationTree(menuId: string | undefined) {
  return useQuery({
    queryKey: cmsQueryKeys.navigationTree(menuId ?? ''),
    queryFn: () => service.getNavigationTree(menuId as string),
    enabled: Boolean(menuId),
  });
}

export function useCreateNavigationItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateNavigationItemInput) => service.createNavigationItem(input),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: cmsQueryKeys.navigationTree(variables.menuId) });
    },
  });
}

export function useSetMegaMenuPromo(menuId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: SetMegaMenuPromoInput) => service.setMegaMenuPromo(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: cmsQueryKeys.navigationTree(menuId) }),
  });
}

export function usePublishedSocialLinks() {
  return useQuery({ queryKey: cmsQueryKeys.socialLinks(), queryFn: () => service.listPublishedSocialLinks() });
}

export function useAddSocialLink() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateSocialLinkInput) => service.addSocialLink(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: cmsQueryKeys.socialLinks() }),
  });
}

export function useContactInfo() {
  return useQuery({ queryKey: cmsQueryKeys.contactInfo(), queryFn: () => service.getContactInfo() });
}

export function useUpdateContactInfo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateContactInfoInput) => service.updateContactInfo(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: cmsQueryKeys.contactInfo() }),
  });
}

export function useResolveSeoRedirect(fromPath: string | undefined) {
  return useQuery({
    queryKey: cmsQueryKeys.seoRedirect(fromPath ?? ''),
    queryFn: () => service.resolveSeoRedirect(fromPath as string),
    enabled: Boolean(fromPath),
  });
}

export function useCreateSeoRedirect() {
  return useMutation({ mutationFn: (input: CreateSeoRedirectInput) => service.createSeoRedirect(input) });
}

export function usePublicSiteSettings() {
  return useQuery({
    queryKey: cmsQueryKeys.publicSiteSettings(),
    queryFn: () => service.listPublicSiteSettings(),
  });
}

export function useSiteSetting(key: string | undefined) {
  return useQuery({
    queryKey: cmsQueryKeys.siteSetting(key ?? ''),
    queryFn: () => service.getSiteSetting(key as string),
    enabled: Boolean(key),
  });
}

export function useSetSiteSetting() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ key, value, isPublic }: { key: string; value: unknown; isPublic?: boolean }) =>
      service.setSiteSetting(key, value, isPublic),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: cmsQueryKeys.siteSetting(variables.key) });
      queryClient.invalidateQueries({ queryKey: cmsQueryKeys.publicSiteSettings() });
    },
  });
}
