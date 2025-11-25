/**
 * Hook for fetching product details by slug
 */

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { transformProductForCard } from '@/utils/product/transformProduct';

interface ProductDetail {
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
  product_cover_details?: any;
  product_apparel_details?: any;
  product_accessories_details?: any;
}

interface UseProductDetailReturn {
  product: ProductDetail | null;
  loading: boolean;
  error: string | null;
  categorySlug: string;
  subcategorySlug: string;
}

/**
 * Fetches product details by slug with multiple fallback strategies
 */
export function useProductDetail(slug: string): UseProductDetailReturn {
  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [categorySlug, setCategorySlug] = useState<string>('');
  const [subcategorySlug, setSubcategorySlug] = useState<string>('');
  const supabase = createClient();

  useEffect(() => {
    if (!slug) {
      setLoading(false);
      return;
    }

    const fetchProduct = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Decode URL-encoded slug and normalize (handles special characters, whitespace, etc.)
        let decodedSlug = decodeURIComponent(slug).trim();
        
        // Handle double encoding
        try {
          decodedSlug = decodeURIComponent(decodedSlug);
        } catch {
          // Already decoded, use as is
        }
        
        // First try to find by exact slug match (case-sensitive, active products only)
        let { data: productData, error: productError } = await supabase
          .from('products')
          .select(`
            *, 
            product_images (id, image_url, alt_text, display_order),
            product_cover_details (*),
            product_apparel_details (*),
            product_accessories_details (*),
            category:categories!products_category_id_fkey (id, name, slug)
          `)
          .eq('slug', decodedSlug)
          .eq('is_active', true)
          .maybeSingle();
        
        // If not found, try without is_active filter (product might be inactive but we still want to show it)
        if (!productData && !productError) {
          const { data: inactiveData, error: inactiveError } = await supabase
            .from('products')
            .select(`
              *, 
              product_images (id, image_url, alt_text, display_order),
              product_cover_details (*),
              product_apparel_details (*),
              product_accessories_details (*),
              category:categories!products_category_id_fkey (id, name, slug)
            `)
            .eq('slug', decodedSlug)
            .maybeSingle();
          
          if (!inactiveError && inactiveData) {
            productData = inactiveData;
            productError = null;
            // Note: We'll still show the product even if inactive
          }
        }
        
        // If not found by exact slug, try multiple fallback strategies
        if (!productData && !productError) {
          // Strategy 1: Try case-insensitive exact match
          const { data: caseProduct, error: caseError } = await supabase
            .from('products')
            .select(`
              *, 
              product_images (id, image_url, alt_text, display_order),
              product_cover_details (*),
              product_apparel_details (*),
              product_accessories_details (*),
              category:categories!products_category_id_fkey (id, name, slug)
            `)
            .ilike('slug', decodedSlug)
            .eq('is_active', true)
            .maybeSingle();
          
          if (!caseError && caseProduct) {
            productData = caseProduct;
            productError = null;
          }
        }
        
        // Strategy 2: Try without trailing numbers (e.g., "iphone-12-1" -> "iphone-12")
        if (!productData && !productError) {
          const slugWithoutSuffix = decodedSlug.replace(/-\d+$/, '');
          
          if (slugWithoutSuffix !== decodedSlug) {
            const { data: partialProduct, error: partialError } = await supabase
              .from('products')
              .select(`
                *, 
                product_images (id, image_url, alt_text, display_order),
                product_cover_details (*),
                product_apparel_details (*),
                product_accessories_details (*),
                category:categories!products_category_id_fkey (id, name, slug)
              `)
              .eq('slug', slugWithoutSuffix)
              .eq('is_active', true)
              .maybeSingle();
            
            if (!partialError && partialProduct) {
              productData = partialProduct;
              productError = null;
            }
          }
        }
        
        // Strategy 3: Try pattern match to find any variant (e.g., "iphone-12%" finds "iphone-12", "iphone-12-1", etc.)
        if (!productData && !productError) {
          const slugWithoutSuffix = decodedSlug.replace(/-\d+$/, '');
          const searchPattern = slugWithoutSuffix !== decodedSlug ? slugWithoutSuffix : decodedSlug;
          
          const { data: patternProducts, error: patternError } = await supabase
            .from('products')
            .select(`
              *, 
              product_images (id, image_url, alt_text, display_order),
              product_cover_details (*),
              product_apparel_details (*),
              product_accessories_details (*),
              category:categories!products_category_id_fkey (id, name, slug)
            `)
            .ilike('slug', `${searchPattern}%`)
            .eq('is_active', true)
            .order('slug', { ascending: true })
            .limit(10);
          
          if (!patternError && patternProducts && patternProducts.length > 0) {
            // Prefer exact match, then base slug, then first result
            const exactMatch = patternProducts.find(p => p.slug === decodedSlug);
            const baseMatch = patternProducts.find(p => p.slug === searchPattern);
            productData = exactMatch || baseMatch || patternProducts[0];
            productError = null;
          }
        }
        
        // If not found by slug, try by ID (for backward compatibility)
        if (!productData && !productError && slug.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
          const { data, error } = await supabase
            .from('products')
            .select(`
              *, 
              product_images (id, image_url, alt_text, display_order),
              product_cover_details (*),
              product_apparel_details (*),
              product_accessories_details (*),
              category:categories!products_category_id_fkey (id, name, slug)
            `)
            .eq('id', slug)
            .eq('is_active', true)
            .maybeSingle();
          
          if (!error && data) {
            productData = data;
            productError = null;
          }
        }

        // Last resort: Try exact match without is_active filter (product might be inactive)
        if (!productData && !productError) {
          const { data: inactiveProduct, error: inactiveError } = await supabase
            .from('products')
            .select(`
              *, 
              product_images (id, image_url, alt_text, display_order),
              product_cover_details (*),
              product_apparel_details (*),
              product_accessories_details (*),
              category:categories!products_category_id_fkey (id, name, slug)
            `)
            .eq('slug', decodedSlug)
            .maybeSingle();
          
          if (!inactiveError && inactiveProduct) {
            // Product exists but is inactive - still show it
            productData = inactiveProduct;
            productError = null;
          }
        }

        // Additional fallback: Try searching by name similarity (convert slug back to name pattern)
        if (!productData && !productError) {
          const namePattern = decodedSlug
            .split('-')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
          
          const { data: nameProducts, error: nameError } = await supabase
            .from('products')
            .select(`
              *, 
              product_images (id, image_url, alt_text, display_order),
              product_cover_details (*),
              product_apparel_details (*),
              product_accessories_details (*),
              category:categories!products_category_id_fkey (id, name, slug)
            `)
            .ilike('name', `%${namePattern}%`)
            .eq('is_active', true)
            .limit(1)
            .maybeSingle();
          
          if (!nameError && nameProducts) {
            productData = nameProducts;
            productError = null;
          }
        }
        
        // Final fallback: Try searching by slug containing the base words (fuzzy match)
        if (!productData && !productError) {
          const slugWords = decodedSlug.split('-').filter(w => w.length > 2);
          if (slugWords.length > 0) {
            // Use the longest word as the primary search term (most likely to be unique)
            const primaryWord = slugWords.reduce((a, b) => a.length > b.length ? a : b);
            const { data: fuzzyProducts, error: fuzzyError } = await supabase
              .from('products')
              .select(`
                *, 
                product_images (id, image_url, alt_text, display_order),
                product_cover_details (*),
                product_apparel_details (*),
                product_accessories_details (*),
                category:categories!products_category_id_fkey (id, name, slug)
              `)
              .ilike('slug', `%${primaryWord}%`)
              .eq('is_active', true)
              .order('slug', { ascending: true })
              .limit(5);
            
            if (!fuzzyError && fuzzyProducts && fuzzyProducts.length > 0) {
              // Prefer exact match, then closest match
              const exactMatch = fuzzyProducts.find(p => p.slug === decodedSlug);
              const closeMatch = fuzzyProducts.find(p => p.slug.includes(decodedSlug) || decodedSlug.includes(p.slug));
              productData = exactMatch || closeMatch || fuzzyProducts[0];
              productError = null;
            }
          }
        }

        if (productError) {
          // Supabase errors might be objects, handle both cases
          const errorMessage = typeof productError === 'string' 
            ? productError 
            : (productError as any)?.message || 'Unknown error';
          setError(`Product not found. Error: ${errorMessage}`);
          return;
        }

        if (!productData) {
          setError(`Product not found. Slug: "${decodedSlug}" (original: "${slug}"). Please check if the product exists.`);
          return;
        }

        // Transform product to match expected format
        const transformedProduct = transformProductForCard(productData);
        // Ensure alt_text is never null (convert null to undefined)
        const productWithFixedImages = {
          ...transformedProduct,
          images: transformedProduct.images?.map(img => ({
            ...img,
            alt_text: img.alt_text ?? undefined
          }))
        };
        setProduct(productWithFixedImages);

        // Fetch category and subcategory slugs
        let categoryName = '';
        let categoryId: string | null = null;
        
        // Handle category - could be from relationship (object) or string field
        if (productData.category && typeof productData.category === 'object' && !Array.isArray(productData.category)) {
          categoryName = productData.category.name || '';
          categoryId = productData.category.id || null;
          setCategorySlug(productData.category.slug || '');
        } else if (typeof productData.category === 'string') {
          categoryName = productData.category;
        }
        
        // If we have category_id but no name, fetch the category
        if (productData.category_id && !categoryName) {
          try {
            const { data: categoryData } = await supabase
              .from('categories')
              .select('id, name, slug')
              .eq('id', productData.category_id)
              .single();
            
            if (categoryData) {
              categoryName = categoryData.name;
              categoryId = categoryData.id;
              setCategorySlug(categoryData.slug);
            }
          } catch {
            // Error handled silently
          }
        }
          
        // If we have category name but no ID, try to fetch it
        if (categoryName && !categoryId) {
          try {
            const { data: categoryData } = await supabase
              .from('categories')
              .select('id, name, slug')
              .eq('name', categoryName)
              .single();
            
            if (categoryData) {
              categoryId = categoryData.id;
              setCategorySlug(categoryData.slug);
            }
          } catch {
            // Error handled silently
          }
        }
          
        // Fetch subcategory by name if product has subcategory
        if (productData.subcategory) {
          try {
            const { data: subcategoryData } = await supabase
              .from('subcategories')
              .select('slug')
              .eq('name', productData.subcategory)
              .single();
            
            if (subcategoryData) {
              setSubcategorySlug(subcategoryData.slug);
            }
          } catch {
            // Error handled silently
          }
        }
      } catch (err) {
        setError('Failed to load product');
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [slug, supabase]);

  return {
    product,
    loading,
    error,
    categorySlug,
    subcategorySlug,
  };
}

