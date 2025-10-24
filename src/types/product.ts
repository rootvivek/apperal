// Product types and interfaces
export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  originalPrice?: number;
  images: string[];
  category: ProductCategory;
  subcategory: string;
  brand: string;
  sizes: string[];
  colors: string[];
  inStock: boolean;
  rating: number;
  reviewCount: number;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ProductCategory {
  id: string;
  name: string;
  slug: string;
  description: string;
  image: string;
  subcategories: ProductSubcategory[];
}

export interface ProductSubcategory {
  id: string;
  name: string;
  slug: string;
  parentCategory: string;
}

export interface ProductFilter {
  category?: string;
  subcategory?: string;
  brand?: string[];
  priceRange?: [number, number];
  sizes?: string[];
  colors?: string[];
  inStock?: boolean;
  sortBy?: 'price-asc' | 'price-desc' | 'rating' | 'newest' | 'popular';
}

export interface CartItem {
  product: Product;
  quantity: number;
  selectedSize: string;
  selectedColor: string;
}

export interface WishlistItem {
  product: Product;
  addedAt: Date;
}
