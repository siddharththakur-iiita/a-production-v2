/**
 * src/features/cms/__tests__/cms.service.test.ts
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import * as repo from '../cms.repository';
import * as service from '../cms.service';
import type { NavigationItemRow, MegaMenuPromoRow, AnnouncementRow } from '../../../lib/supabase/database.types';

vi.mock('../cms.repository');

function makeNavItemRow(overrides: Partial<NavigationItemRow> = {}): NavigationItemRow {
  return {
    id: 'nav-1',
    menu_id: 'menu-1',
    parent_item_id: null,
    label: 'Women',
    url: null,
    category_id: null,
    sort_order: 0,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

function makePromoRow(overrides: Partial<MegaMenuPromoRow> = {}): MegaMenuPromoRow {
  return {
    id: 'promo-1',
    navigation_item_id: 'nav-1',
    media_asset_id: null,
    title: 'Bridal Couture 2026',
    subtitle: null,
    cta_url: null,
    ...overrides,
  };
}

function makeAnnouncementRow(overrides: Partial<AnnouncementRow> = {}): AnnouncementRow {
  return {
    id: 'ann-1',
    message: 'Now shipping worldwide',
    link_url: null,
    starts_at: null,
    ends_at: null,
    status: 'published',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

describe('cms.service', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('getNavigationTree (tree assembly)', () => {
    it('assembles a flat list into a nested tree by parentItemId, sorted by sortOrder', async () => {
      vi.mocked(repo.findNavigationItemsForMenu).mockResolvedValue([
        makeNavItemRow({ id: 'root', label: 'Women', parent_item_id: null, sort_order: 0 }),
        makeNavItemRow({ id: 'child-2', label: 'Sarees', parent_item_id: 'root', sort_order: 1 }),
        makeNavItemRow({ id: 'child-1', label: 'Lehengas', parent_item_id: 'root', sort_order: 0 }),
      ]);
      vi.mocked(repo.findMegaMenuPromosForMenu).mockResolvedValue([]);

      const tree = await service.getNavigationTree('menu-1');

      expect(tree).toHaveLength(1);
      expect(tree[0].id).toBe('root');
      expect(tree[0].children.map((c) => c.id)).toEqual(['child-1', 'child-2']);
    });

    it('attaches the correct mega_menu_promo to each node', async () => {
      vi.mocked(repo.findNavigationItemsForMenu).mockResolvedValue([
        makeNavItemRow({ id: 'nav-1', label: 'Women' }),
        makeNavItemRow({ id: 'nav-2', label: 'Men' }),
      ]);
      vi.mocked(repo.findMegaMenuPromosForMenu).mockResolvedValue([
        { ...makePromoRow({ navigation_item_id: 'nav-1' }), media_asset: null } as never,
      ]);

      const tree = await service.getNavigationTree('menu-1');

      const women = tree.find((n) => n.id === 'nav-1');
      const men = tree.find((n) => n.id === 'nav-2');
      expect(women?.promo?.title).toBe('Bridal Couture 2026');
      expect(men?.promo).toBeNull();
    });

    it('does not query promos when the menu has no items', async () => {
      vi.mocked(repo.findNavigationItemsForMenu).mockResolvedValue([]);

      await service.getNavigationTree('menu-1');

      expect(repo.findMegaMenuPromosForMenu).toHaveBeenCalledWith([]);
    });
  });

  describe('listActiveAnnouncements (scheduling window filter)', () => {
    it('includes an announcement with no date window', async () => {
      vi.mocked(repo.findPublishedAnnouncements).mockResolvedValue([makeAnnouncementRow()]);

      const result = await service.listActiveAnnouncements();

      expect(result).toHaveLength(1);
    });

    it('excludes an announcement whose window has not started yet', async () => {
      const future = new Date(Date.now() + 86400000).toISOString();
      vi.mocked(repo.findPublishedAnnouncements).mockResolvedValue([
        makeAnnouncementRow({ starts_at: future }),
      ]);

      const result = await service.listActiveAnnouncements();

      expect(result).toHaveLength(0);
    });

    it('excludes an announcement whose window has already ended', async () => {
      const past = new Date(Date.now() - 86400000).toISOString();
      vi.mocked(repo.findPublishedAnnouncements).mockResolvedValue([makeAnnouncementRow({ ends_at: past })]);

      const result = await service.listActiveAnnouncements();

      expect(result).toHaveLength(0);
    });

    it('includes an announcement currently within its window', async () => {
      const past = new Date(Date.now() - 86400000).toISOString();
      const future = new Date(Date.now() + 86400000).toISOString();
      vi.mocked(repo.findPublishedAnnouncements).mockResolvedValue([
        makeAnnouncementRow({ starts_at: past, ends_at: future }),
      ]);

      const result = await service.listActiveAnnouncements();

      expect(result).toHaveLength(1);
    });
  });
});
