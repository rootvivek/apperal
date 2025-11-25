export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  parent_category_id: string | null;
  detail_type?: string | null;
  is_active?: boolean;
}

export interface ProductImage {
  id?: string;
  image_url: string;
  alt_text?: string;
  display_order: number;
}

export interface ProductFormData {
  id?: string;
  name: string;
  description: string;
  price: string;
  original_price: string;
  badge: string;
  category: string;
  subcategories: string[];
  image_url: string;
  stock_quantity: string;
  is_active: boolean;
  show_in_hero: boolean;
  images: ProductImage[];
  brand?: string;
  is_new?: boolean;
  rating?: number;
  review_count?: number;
  in_stock?: boolean;
  mobileDetails: Record<string, any>;
  apparelDetails: Record<string, any>;
  accessoriesDetails: Record<string, any>;
}

export const PRODUCT_SIZES = ['Small', 'Medium', 'Large'] as const;
export const PRODUCT_FIT_TYPES = ['Regular', 'Slim', 'Loose', 'Oversized', 'Fitted'] as const;

export type ProductSize = typeof PRODUCT_SIZES[number];
export type ProductFitType = typeof PRODUCT_FIT_TYPES[number];

