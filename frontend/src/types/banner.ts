export type BannerPosition =
  | 'Main Banner'
  | 'Popup Banner'
  | 'Footer Banner'
  | 'Main Section Banner'
  | 'Deal of the Day'
  | 'Flash Deals'
  | 'HOME_MAIN_SLIDER' // Keep for compatibility if needed
  | 'POPUP_ON_FIRST_VISIT'; // Keep for compatibility if needed

export interface Banner {
  id: string;
  position: BannerPosition;
  resourceType: 'Product' | 'Category' | 'External' | 'None';
  resourceId?: string;
  resourceName?: string;
  imageUrl: string;
  image: string; // Alias for imageUrl
  isActive: boolean;
  categoryName?: string;
  title?: string;
  subtitle?: string;
}
