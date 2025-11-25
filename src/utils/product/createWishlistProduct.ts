import type { Product } from '@/types/product';

interface ProductCardProduct {
  id: string;
  name: string;
  description?: string;
  price: number;
  original_price?: number;
  category: string | { id: string; name: string; slug: string; image: string; subcategories: any[] };
  subcategories: string[];
  image_url: string;
  stock_quantity: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Creates a Product object from ProductCardProduct for wishlist operations
 */
export function createWishlistProduct(product: ProductCardProduct): Product {
  const categoryName = typeof product.category === 'string' ? product.category : product.category?.name || 'Unknown';
  return {
    id: product.id,
    name: product.name,
    description: product.description || '',
    price: product.price,
    originalPrice: product.original_price || product.price,
    images: [product.image_url],
    category: {
      id: categoryName.toLowerCase(),
      name: categoryName,
      slug: categoryName.toLowerCase(),
      description: '',
      image: '',
      subcategories: []
    },
    subcategories: product.subcategories || [],
    brand: '',
    sizes: [],
    colors: [],
    inStock: product.is_active && product.stock_quantity > 0,
    rating: 0,
    reviewCount: 0,
    tags: [],
    createdAt: new Date(product.created_at),
    updatedAt: new Date(product.updated_at)
  };
}

