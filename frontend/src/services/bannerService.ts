import { Banner, BannerPosition } from '../types/banner';

export type { Banner, BannerPosition }; // Re-export for convenience

export interface DealsConfig {
  flashDealTargetDate: string; // ISO string
  flashDealImage?: string;
  featuredDealProductId?: string;
  featuredDealProductIds?: string[];
  dealOfTheDayProductId?: string;
  dealOfTheDayProductIds?: string[];
}

const STORAGE_KEY = 'admin_banners_v8';
const DEALS_CONFIG_KEY = 'admin_deals_config_v3';

// Default Mock Data
const MOCK_BANNERS: Banner[] = [
  {
    id: '1',
    position: 'Main Banner',
    resourceType: 'Category',
    resourceName: 'Furniture',
    categoryName: 'Furniture',
    imageUrl: 'https://images.unsplash.com/photo-1618220179428-22790b461013?auto=format&fit=crop&q=80&w=1600',
    image: 'https://images.unsplash.com/photo-1618220179428-22790b461013?auto=format&fit=crop&q=80&w=1600',
    isActive: true
  },
  {
    id: '2',
    position: 'Main Banner',
    resourceType: 'None',
    categoryName: 'No Category Selected',
    imageUrl: 'https://images.unsplash.com/photo-1616486338812-3dadae4b4f9d?auto=format&fit=crop&q=80&w=1600',
    image: 'https://images.unsplash.com/photo-1616486338812-3dadae4b4f9d?auto=format&fit=crop&q=80&w=1600',
    isActive: true
  },
  {
    id: '3',
    position: 'Popup Banner',
    resourceType: 'None',
    categoryName: 'No Category Selected',
    imageUrl: 'https://images.unsplash.com/photo-1607083206869-4c7672e72a8a?auto=format&fit=crop&q=80&w=800',
    image: 'https://images.unsplash.com/photo-1607083206869-4c7672e72a8a?auto=format&fit=crop&q=80&w=800',
    isActive: true
  }
];

const DEFAULT_DEALS_CONFIG: DealsConfig = {
  flashDealTargetDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
};

// Initialize Storage
if (!localStorage.getItem(STORAGE_KEY)) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(MOCK_BANNERS));
}
if (!localStorage.getItem(DEALS_CONFIG_KEY)) {
  localStorage.setItem(DEALS_CONFIG_KEY, JSON.stringify(DEFAULT_DEALS_CONFIG));
}

export const bannerService = {
  getAllBanners: (): Banner[] => {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (e) { return []; }
  },

  getBannersByPosition: (position: BannerPosition): Banner[] => {
    const banners = bannerService.getAllBanners();
    return banners.filter(b => b.position === position && b.isActive);
  },

  getActiveBannersForPosition: (position: string): Banner[] => {
     // Compatibility wrapper for older calls if any
     let mappedPos = position;
     if (position === 'HOME_MAIN_SLIDER') mappedPos = 'Main Banner';
     if (position === 'POPUP_ON_FIRST_VISIT') mappedPos = 'Popup Banner';

     // Filter raw if it matches standard positions, otherwise return empty or try exact match
     return bannerService.getBannersByPosition(mappedPos as BannerPosition);
  },

  addBanner: (banner: Omit<Banner, 'id' | 'isActive' | 'image'>) => {
    const banners = bannerService.getAllBanners();
    const newBanner: Banner = {
        ...banner,
        id: Date.now().toString(),
        isActive: true,
        image: banner.imageUrl
    };
    banners.push(newBanner);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(banners));
    return newBanner;
  },

  deleteBanner: (id: string) => {
    const banners = bannerService.getAllBanners();
    const filtered = banners.filter(b => b.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  },

  updateBanner: (id: string, updates: Partial<Banner>) => {
    const banners = bannerService.getAllBanners();
    const index = banners.findIndex(b => b.id === id);
    if (index !== -1) {
        banners[index] = { ...banners[index], ...updates };
        if (updates.imageUrl) {
            banners[index].image = updates.imageUrl;
        }
        localStorage.setItem(STORAGE_KEY, JSON.stringify(banners));
    }
  },

  // Deals
  getDealsConfig: (): DealsConfig => {
    try {
      const data = localStorage.getItem(DEALS_CONFIG_KEY);
      return data ? JSON.parse(data) : DEFAULT_DEALS_CONFIG;
    } catch (e) { return DEFAULT_DEALS_CONFIG; }
  },

  updateDealsConfig: (updates: Partial<DealsConfig>) => {
    const current = bannerService.getDealsConfig();
    const updated = { ...current, ...updates };
    localStorage.setItem(DEALS_CONFIG_KEY, JSON.stringify(updated));
    return updated;
  }
};
