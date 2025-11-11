'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Link from 'next/link';
import CategoryGrid from '@/components/CategoryGrid';
import ProductCard from '@/components/ProductCard';
import HeroCarousel from '@/components/HeroCarousel';
import HomePageSkeleton from '@/components/HomePageSkeleton';
import { createClient } from '@/lib/supabase/client';

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

export default function Home() {
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [categorySections, setCategorySections] = useState<CategoryWithProducts[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  // Simple cache to prevent refetching on refresh
  const [dataFetched, setDataFetched] = useState(false);

  // Memoize fetchData to prevent recreation on every render
  const fetchData = useCallback(async () => {
    if (dataFetched) return; // Prevent duplicate calls
    try {
      setLoading(true);
      
      // ULTRA-FAST: Single database call using optimized function
      const { data: result, error } = await supabase.rpc('get_home_page_data');

      if (error) {
        // Silently fallback to regular queries if RPC function is not available
        // Suppress expected errors for missing RPC function (404, function not found, etc.)
        const errorMessage = error.message || '';
        const errorCode = 'code' in error ? error.code : undefined;
        const isExpectedError = 
          errorCode === 'PGRST116' ||
          errorMessage.includes('function get_home_page_data') ||
          errorMessage.includes('Could not find the function') ||
          errorMessage.includes('does not exist') ||
          errorMessage.includes('schema cache') ||
          ('status' in error && error.status === 404) ||
          ('statusCode' in error && error.statusCode === 404);
        
        // Only log unexpected errors
        if (!isExpectedError) {
          // Fallback to direct query on RPC error
        }
        // Silently fallback - no console error for expected missing function
        await fetchDataFallback();
        return;
      }

      // Extract data from the optimized response
      const allProducts = result?.all_products || [];
      const categorySections = result?.category_sections || [];
      
      // Transform data to match existing component expectations
      const transformedAllProducts = allProducts.map((product: any) => ({
        id: product.id,
        name: product.name,
        description: product.description || '',
        price: product.price,
        category: '',
        subcategory: '',
        image_url: product.main_image_url,
        stock_quantity: 0,
        is_active: true,
        created_at: product.created_at,
        updated_at: product.created_at,
        images: product.additional_images || []
      }));

      const transformedCategorySections = categorySections.map((section: any) => ({
        category: section.category,
        products: section.products.map((product: any) => ({
          id: product.id,
          name: product.name,
          description: product.description || '',
          price: product.price,
          category: section.category.name,
          subcategory: '',
          image_url: product.main_image_url,
          stock_quantity: 0,
          is_active: true,
          created_at: product.created_at,
          updated_at: product.created_at,
          images: product.additional_images || []
        }))
      }));

      // Filter categories to only show active ones (in case RPC function returns inactive)
      const activeCategorySections = transformedCategorySections.filter(
        (section: any) => section.category?.is_active !== false
      );
      const activeCategories = activeCategorySections.map((s: any) => s.category).filter(
        (cat: any) => cat?.is_active !== false
      );
      
      setAllProducts(transformedAllProducts);
      setCategorySections(activeCategorySections);
      setCategories(activeCategories);
      setDataFetched(true); // Mark data as fetched
    } catch (error) {
      console.error('Error fetching data:', error);
      setAllProducts([]);
      setCategorySections([]);
      setCategories([]);
    } finally {
      setLoading(false);
    }
  }, [dataFetched, supabase]); // Include supabase and dataFetched

  useEffect(() => {
    // Only fetch data if not already fetched (prevents refetch on refresh)
    if (!dataFetched) {
      fetchData();
    }
  }, [dataFetched, fetchData]);

  // FALLBACK: Original query method if optimized function fails - memoized
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
        .limit(8);

      if (allProductsError) {
        console.error('All products error:', allProductsError);
      }

      // Fetch categories (only active categories)
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('categories')
        .select('*')
        .is('parent_category_id', null)
        .eq('is_active', true)
        .order('name', { ascending: true });

      if (categoriesError) {
        console.error('Categories error:', categoriesError);
      }

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
            .limit(8);

          if (categoryProductsError) {
            console.error(`Error fetching products for ${category.name}:`, categoryProductsError);
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
    } catch (error) {
      console.error('Fallback error:', error);
      setAllProducts([]);
      setCategorySections([]);
      setCategories([]);
    }
  }, [supabase]); // Include supabase dependency

  if (loading) {
    return <HomePageSkeleton />;
  }

  return (
    <main className="min-h-screen bg-white">
      {/* Categories Section - Show after navbar */}
      <section className="pt-2 pb-2 sm:pt-3 sm:pb-4 bg-white mb-0 sm:mb-1 h-auto">
        <CategoryGrid categories={categories} />
      </section>

      {/* Hero Carousel */}
      <HeroCarousel />

      {/* All Products Section */}
      <section className="pt-8 pb-2 sm:pt-8 sm:pb-4 bg-white">
        <div className="w-full px-1.5 sm:px-6 lg:px-8">
          <div className="text-center mb-2 sm:mb-4">
            <h2 className="text-2xl font-semibold text-gray-900 mb-2 sm:mb-4">All Products</h2>
          </div>
          {allProducts.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
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
          <div className="text-center mt-8">
            <Link
              href="/products"
              className="bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
            >
              View All Products
            </Link>
          </div>
        </div>
      </section>

      {/* Dynamic Category Sections */}
      {categorySections.map((section, index) => {
        const bgColor = 'bg-white';
        const buttonColors = [
          'bg-green-600 hover:bg-green-700',
          'bg-purple-600 hover:bg-purple-700',
          'bg-orange-600 hover:bg-orange-700',
          'bg-red-600 hover:bg-red-700',
          'bg-indigo-600 hover:bg-indigo-700',
          'bg-pink-600 hover:bg-pink-700',
          'bg-teal-600 hover:bg-teal-700',
          'bg-yellow-600 hover:bg-yellow-700'
        ];
        const buttonColor = buttonColors[index % buttonColors.length];
        
        return (
          <section key={section.category.id} className={`py-16 ${bgColor}`}>
            <div className="w-full px-1.5 sm:px-6 lg:px-8">
              <div className="text-center mb-12">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">{section.category.name}</h2>
              </div>
              {section.products.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
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
              <div className="text-center mt-8">
                <Link
                  href={`/products/${section.category.slug}`}
                  className={`${buttonColor} text-white px-8 py-3 rounded-lg font-semibold transition-colors`}
                >
                  Shop {section.category.name}
                </Link>
              </div>
            </div>
          </section>
        );
      })}

    </main>
  );
}
