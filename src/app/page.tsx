'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Link from 'next/link';
import CategoryGrid from '@/components/CategoryGrid';
import ProductCard from '@/components/ProductCard';
import HeroCarousel from '@/components/HeroCarousel';
import Banner from '@/components/Banner';
import { Spinner } from '@/components/ui/spinner';
import { createClient } from '@/lib/supabase/client';
import { PRODUCT_GRID_CLASSES_RESPONSIVE } from '@/utils/layoutUtils';
import { PRODUCT_LIMITS } from '@/constants';

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  subcategory: string;
  image_url: string;
  stock_quantity: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  product_images?: {
    id: string;
    image_url: string;
    alt_text?: string;
    display_order: number;
  }[];
  images?: {
    id: string;
    image_url: string;
    alt_text?: string;
    display_order: number;
  }[];
}

interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  image_url: string;
}

interface CategoryWithProducts {
  category: Category;
  products: Product[];
}

// Client-side cache constants (defined outside component to avoid scope issues)
const HOMEPAGE_CACHE_KEY = 'homepage_data';
const HOMEPAGE_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export default function Home() {
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [categorySections, setCategorySections] = useState<CategoryWithProducts[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  // Simple cache to prevent refetching on refresh
  const [dataFetched, setDataFetched] = useState(false);

  // FALLBACK: Original query method - memoized
  const fetchDataFallback = useCallback(async () => {
    try {
      
      // Fetch all active products with their additional images
      const { data: allProductsData, error: allProductsError } = await supabase
        .from('products')
        .select(`
          *,
          product_images (\n            id,\n            image_url,\n            alt_text,\n            display_order\n          )\n        `)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(PRODUCT_LIMITS.HOME_PAGE);

      if (allProductsError) {
        // Error handled silently - UI will show empty state
      }

      // Fetch categories and subcategories in parallel
      const [categoriesResult, subcategoriesResult] = await Promise.all([
        supabase
          .from('categories')
          .select('*')
          .is('parent_category_id', null)
          .eq('is_active', true)
          .order('name', { ascending: true }),
        supabase
          .from('subcategories')
          .select('*')
          .eq('is_active', true)
          .order('name', { ascending: true })
      ]);

      if (categoriesResult.error) {
        // Error handled silently
      }

      if (subcategoriesResult.error) {
        // Error handled silently
      }

      // Attach subcategories to their parent categories
      const categoriesData = (categoriesResult.data || []).map((category: any) => ({
        ...category,
        subcategories: (subcategoriesResult.data || []).filter(
          (subcat: any) => subcat.parent_category_id === category.id
        )
      }));

      // Fetch products for each category
      const categorySectionsData: CategoryWithProducts[] = [];
      
      if (categoriesData) {
        for (const category of categoriesData) {
          const { data: categoryProducts, error: categoryProductsError } = await supabase
            .from('products')
            .select(`
              *,
              product_images (\n                id,\n                image_url,\n                alt_text,\n                display_order\n              )\n            `)
            .eq('is_active', true)
            .eq('category_id', category.id)
            .order('created_at', { ascending: false })
            .limit(PRODUCT_LIMITS.HOME_PAGE);

          if (categoryProductsError) {
            // Error handled silently
          }

          categorySectionsData.push({
            category,
            products: categoryProducts || []
          });
        }
      }

      // Transform products to include images array
      const transformedAllProducts = allProductsData?.map((product: any) => ({
        ...product,
        images: product.product_images || [],
        subcategories: []
      })) || [];

      // Transform category products to include images array
      const transformedCategorySections = categorySectionsData.map(section => ({
        ...section,
        products: section.products.map((product: any) => ({
          ...product,
          images: product.product_images || [],
          subcategories: []
        }))
      }));

      setAllProducts(transformedAllProducts);
      setCategorySections(transformedCategorySections);
      setCategories(categoriesData || []);
      setDataFetched(true);
      
      // Cache the results immediately after setting state
      if (typeof window !== 'undefined') {
        const cacheData = {
          allProducts: transformedAllProducts,
          categorySections: transformedCategorySections,
          categories: categoriesData || [],
        };
        const expires = Date.now() + HOMEPAGE_CACHE_TTL;
        sessionStorage.setItem(HOMEPAGE_CACHE_KEY, JSON.stringify({ data: cacheData, expires }));
      }
    } catch (error) {
      setAllProducts([]);
      setCategorySections([]);
      setCategories([]);
    }
  }, [supabase]); // Include supabase dependency

  // Memoize fetchData to prevent recreation on every render
  const fetchData = useCallback(async () => {
    if (dataFetched) return; // Prevent duplicate calls
    
    // Check client-side cache first
    if (typeof window !== 'undefined') {
      const cached = sessionStorage.getItem(HOMEPAGE_CACHE_KEY);
      if (cached) {
        try {
          const { data, expires } = JSON.parse(cached);
          if (expires && Date.now() < expires) {
            setAllProducts(data.allProducts || []);
            setCategorySections(data.categorySections || []);
            setCategories(data.categories || []);
            setDataFetched(true);
            setLoading(false);
            return;
          }
        } catch {
          // Invalid cache, continue to fetch
        }
      }
    }
    
    try {
      setLoading(true);
      // Directly use fallback method since RPC function doesn't exist
      await fetchDataFallback();
      
      // Note: Cache is set in fetchDataFallback after state is updated
    } catch (error) {
      setAllProducts([]);
      setCategorySections([]);
      setCategories([]);
    } finally {
      setLoading(false);
    }
  }, [dataFetched, fetchDataFallback]);

  useEffect(() => {
    // Only fetch data if not already fetched (prevents refetch on refresh)
    if (!dataFetched) {
      fetchData();
    }
  }, [dataFetched, fetchData]);

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-sm">
        <div className="text-center">
          <Spinner className="size-12 text-blue-600 mx-auto" />
          <p className="mt-4 text-gray-600">Loading products...</p>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-white" style={{ touchAction: 'pan-x pan-y' }}>
      {/* Hero Carousel - positioned directly below navbar with no gap */}
      <HeroCarousel className="!pt-[88px] sm:!pt-[100px] md:!pt-[108px] lg:!pt-[120px]" />

      {/* Categories Section - Show after carousel */}
      <section className="pt-3 pb-3 sm:pt-8 sm:pb-4 bg-white h-auto" style={{ touchAction: 'pan-x pan-y' }}>
        <div className="w-full px-1.5 sm:px-6 lg:px-8">
          <Banner sectionName="categories" />
          <div className="flex items-center justify-between mb-2 sm:mb-4 mt-2 sm:mt-4">
            <h2 className="text-lg sm:text-2xl font-semibold text-gray-900">Shop by Category</h2>
          </div>
          <CategoryGrid categories={categories} />
        </div>
      </section>

      {/* All Products Section */}
      <section className="pt-3 pb-3 sm:pt-8 sm:pb-4 bg-white" style={{ touchAction: 'pan-x pan-y' }}>
        <div className="w-full px-1.5 sm:px-6 lg:px-8">
          <Banner sectionName="all-products" />
          <div className="flex items-center justify-between mb-2 sm:mb-4 mt-2 sm:mt-4">
            <h2 className="text-lg sm:text-2xl font-semibold text-gray-900">All Products</h2>
            <Link
              href="/products"
              className="text-sm text-brand hover:text-brand-600 font-medium"
            >
              Show More →
            </Link>
          </div>
          {allProducts.length > 0 ? (
            <div className={`${PRODUCT_GRID_CLASSES_RESPONSIVE}`} style={{ touchAction: 'pan-x pan-y' }}>
              {allProducts.map((product) => (
                <ProductCard key={product.id} product={product as any} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="text-gray-400 text-6xl mb-4">🛍️</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No products available</h3>
              <p className="text-gray-500">
                Check back soon for new products!
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Dynamic Category Sections */}
      {categorySections.map((section, index) => {
        const bgColor = 'bg-white';
        // Use "accessories" banner section name if category slug or name contains "accessories"
        const isAccessories = section.category.slug?.toLowerCase() === 'accessories' || 
                             section.category.name?.toLowerCase().includes('accessories');
        const bannerSectionName = isAccessories 
          ? 'accessories' 
          : `category-${section.category.slug}`;
        
        return (
          <section key={section.category.id} className={`pt-3 pb-3 sm:pt-8 sm:pb-4 ${bgColor}`} style={{ touchAction: 'pan-x pan-y' }}>
            <div className="w-full px-1.5 sm:px-6 lg:px-8">
              <Banner sectionName={bannerSectionName} />
              <div className="flex items-center justify-between mb-2 sm:mb-4 mt-2 sm:mt-4">
                <h2 className="text-lg sm:text-2xl font-semibold text-gray-900">{section.category.name}</h2>
                <Link
                  href={`/products/${section.category.slug}`}
                  className="text-sm text-brand hover:text-brand-600 font-medium"
                >
                  Show More →
                </Link>
              </div>
              {section.products.length > 0 ? (
                <div className={`${PRODUCT_GRID_CLASSES_RESPONSIVE}`} style={{ touchAction: 'pan-x pan-y' }}>
                  {section.products.map((product) => (
                    <ProductCard key={product.id} product={product as any} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="text-gray-400 text-6xl mb-4">📦</div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No products available yet</h3>
                  <p className="text-gray-500">
                    We&apos;re working on adding products to this category. Check back soon!
                  </p>
                </div>
              )}
            </div>
          </section>
        );
      })}

    </main>
  );
}
