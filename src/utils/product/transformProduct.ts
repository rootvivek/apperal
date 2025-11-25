/**
 * Product transformation utilities
 * Transforms raw product data from Supabase to the format expected by components
 */

interface ProductImage {
  id: string;
  image_url: string;
  alt_text?: string | null;
  display_order: number;
}

interface RawProduct {
  id: string;
  name: string;
  slug?: string;
  description?: string | null;
  price: number;
  original_price?: number | null;
  image_url?: string | null;
  stock_quantity?: number;
  is_active?: boolean;
  category_id?: string | null;
  subcategory_id?: string | null;
  category?: string | { id: string; name: string; slug: string } | null;
  subcategory?: string | null;
  subcategories?: string[];
  created_at?: string;
  updated_at?: string;
  badge?: string | null;
  product_images?: ProductImage[] | null;
  brand?: string | null;
  is_new?: boolean | null;
  rating?: number | null;
  review_count?: number | null;
  in_stock?: boolean | null;
  show_in_hero?: boolean | null;
  product_cover_details?: any;
  product_apparel_details?: any;
  product_accessories_details?: any;
}

interface TransformedProduct {
  id: string;
  name: string;
  slug?: string;
  description: string;
  price: number;
  original_price?: number | null;
  badge?: string | null;
  category: string | { id: string; name: string; slug: string };
  category_id?: string | null;
  subcategory: string;
  subcategory_id?: string | null;
  subcategories: string[];
  image_url: string;
  stock_quantity: number;
  is_active: boolean;
  show_in_hero?: boolean;
  created_at: string;
  updated_at: string;
  brand?: string | null;
  is_new?: boolean | null;
  rating?: number | null;
  review_count?: number | null;
  in_stock?: boolean | null;
  images?: ProductImage[];
  product_cover_details?: any;
  product_apparel_details?: any;
  product_accessories_details?: any;
}

/**
 * Transforms product images from Supabase format to component format
 */
export function transformProductImages(
  product: RawProduct,
  productImages?: ProductImage[] | null
): ProductImage[] {
  const images = productImages || product.product_images || [];
  
  // Ensure image_url exists - use first product_image if main image_url is missing
  let mainImageUrl = product.image_url || '';
  if (!mainImageUrl && images.length > 0) {
    mainImageUrl = images[0].image_url;
  }
  
  // Transform product_images to images array format
  if (images.length > 0) {
    return images.map((img) => ({
      id: img.id || `image-${Math.random()}`,
      image_url: img.image_url,
      alt_text: img.alt_text || product.name,
      display_order: img.display_order || 0,
    }));
  }
  
  // Fallback: create array from main image_url
  if (mainImageUrl) {
    return [{
      id: 'main-image',
      image_url: mainImageUrl,
      alt_text: product.name,
      display_order: 0,
    }];
  }
  
  return [];
}

/**
 * Transforms a raw product from Supabase to the format expected by ProductCard
 */
export function transformProductForCard(product: RawProduct): TransformedProduct {
  const images = transformProductImages(product);
  const mainImageUrl = product.image_url || (images.length > 0 ? images[0].image_url : '');
  
  // Handle category - could be from relationship (object) or string field
  let category: string | { id: string; name: string; slug: string } = '';
  if (product.category && typeof product.category === 'object' && !Array.isArray(product.category)) {
    category = product.category;
  } else if (typeof product.category === 'string') {
    category = product.category;
  }
  
  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    description: product.description || '',
    price: product.price,
    original_price: product.original_price || null,
    badge: product.badge || null,
    category,
    category_id: product.category_id || null,
    subcategory: product.subcategory || '',
    subcategory_id: product.subcategory_id || null,
    subcategories: Array.isArray(product.subcategories)
      ? product.subcategories
      : (product.subcategory ? [product.subcategory] : []),
    image_url: mainImageUrl,
    stock_quantity: product.stock_quantity || 0,
    is_active: typeof product.is_active === 'boolean' ? product.is_active : true,
    show_in_hero: product.show_in_hero || false,
    created_at: product.created_at || '',
    updated_at: product.updated_at || '',
    brand: product.brand || null,
    is_new: product.is_new || null,
    rating: product.rating || null,
    review_count: product.review_count || null,
    in_stock: product.in_stock !== undefined ? product.in_stock : (product.stock_quantity || 0) > 0,
    images,
    product_cover_details: product.product_cover_details,
    product_apparel_details: product.product_apparel_details,
    product_accessories_details: product.product_accessories_details,
  };
}

