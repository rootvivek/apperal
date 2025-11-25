/**
 * Hook for fetching related products
 */

import { useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { transformProductForCard } from '@/utils/product/transformProduct';

interface RelatedProduct {
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
  images?: Array<{
    id: string;
    image_url: string;
    alt_text?: string;
    display_order: number;
  }>;
}

interface UseRelatedProductsReturn {
  relatedProducts: RelatedProduct[];
  loading: boolean;
  fetchRelatedProducts: (
    categoryName: string,
    categoryId: string | null,
    currentProductId: string,
    subcategoryId?: string | null
  ) => Promise<void>;
}

const PRODUCT_SELECT_FIELDS = 'id, name, slug, description, price, original_price, image_url, stock_quantity, is_active, category_id, subcategory_id, created_at, updated_at, badge, product_images (id, image_url, alt_text, display_order)';

/**
 * Hook for fetching related products based on category/subcategory
 */
export function useRelatedProducts(): UseRelatedProductsReturn {
  const [relatedProducts, setRelatedProducts] = useState<RelatedProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  const fetchRelatedProducts = useCallback(async (
    categoryName: string,
    categoryId: string | null,
    currentProductId: string,
    subcategoryId?: string | null
  ) => {
    try {
      setLoading(true);
      
      let productsData: any[] = [];
      
      // Try to query by category_id first (UUID relationship) - this is the primary method
      if (categoryId) {
        const { data, error } = await supabase
          .from('products')
          .select(PRODUCT_SELECT_FIELDS)
          .eq('category_id', categoryId)
          .neq('id', currentProductId)
          .eq('is_active', true)
          .limit(8)
          .order('created_at', { ascending: false });
        
        if (!error && data && data.length > 0) {
          productsData = data;
        }
      }
      
      // If no products found by category_id, try to fetch by subcategory_id as fallback
      if (productsData.length === 0 && subcategoryId) {
        const { data, error } = await supabase
          .from('products')
          .select(PRODUCT_SELECT_FIELDS)
          .eq('subcategory_id', subcategoryId)
          .neq('id', currentProductId)
          .eq('is_active', true)
          .limit(8)
          .order('created_at', { ascending: false });
        
        if (!error && data && data.length > 0) {
          productsData = data;
        }
      }
      
      // If still no products, fetch any active products as a last resort
      if (productsData.length === 0) {
        const { data, error } = await supabase
          .from('products')
          .select(PRODUCT_SELECT_FIELDS)
          .neq('id', currentProductId)
          .eq('is_active', true)
          .limit(8)
          .order('created_at', { ascending: false });
        
        if (!error && data && data.length > 0) {
          productsData = data;
        }
      }
      
      // Transform products to include images array and ensure image_url is present
      if (productsData.length > 0) {
        const transformedProducts = productsData.map((product: any) => {
          const transformed = transformProductForCard(product);
          // Ensure category and subcategory are strings for ProductCard
          return {
            ...transformed,
            category: typeof transformed.category === 'object' 
              ? transformed.category?.name || '' 
              : (transformed.category || ''),
            subcategory: transformed.subcategory || '',
            subcategories: transformed.subcategory ? [transformed.subcategory] : [],
          };
        });
        
        setRelatedProducts(transformedProducts as RelatedProduct[]);
      } else {
        setRelatedProducts([]);
      }
    } catch (err) {
      setRelatedProducts([]);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  return {
    relatedProducts,
    loading,
    fetchRelatedProducts,
  };
}

