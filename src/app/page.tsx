'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import CategoryGrid from '@/components/CategoryGrid';
import ProductCard from '@/components/ProductCard';
import HeroCarousel from '@/components/HeroCarousel';
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

  useEffect(() => {
    // Only fetch data if not already fetched (prevents refetch on refresh)
    if (!dataFetched) {
      fetchData();
    }
  }, [dataFetched]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // ULTRA-FAST: Single database call using optimized function
      const { data: result, error } = await supabase.rpc('get_home_page_data');

      if (error) {
        console.error('Error fetching home data:', error);
        
        // FALLBACK: Use original query method if optimized function fails
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

      setAllProducts(transformedAllProducts);
      setCategorySections(transformedCategorySections);
      setCategories(categorySections.map((s: any) => s.category));
      setDataFetched(true); // Mark data as fetched
    } catch (error) {
      console.error('Error fetching data:', error);
      setAllProducts([]);
      setCategorySections([]);
      setCategories([]);
    } finally {
      setLoading(false);
    }
  };

  // FALLBACK: Original query method if optimized function fails
  const fetchDataFallback = async () => {
    try {
      
      // Fetch all active products with their additional images
      const { data: allProductsData, error: allProductsError } = await supabase
        .from('products')
        .select(`
          *,
          product_images (
            id,
            image_url,
            alt_text,
            display_order
          )
        `)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(8);

      if (allProductsError) {
        console.error('All products error:', allProductsError);
      }

      // Fetch categories
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('categories')
        .select('*')
        .is('parent_category_id', null)
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
              product_images (
                id,
                image_url,
                alt_text,
                display_order
              )
            `)
            .eq('is_active', true)
            .eq('category', category.name)
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
  };

  if (loading) {
    return (
      <main className="min-h-screen">
        <HeroCarousel />
        {/* Show skeleton loading for better UX */}
        <div className="px-2 sm:px-4 md:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[...Array(8)].map((_, index) => (
              <div key={index} className="bg-gray-200 animate-pulse rounded-lg">
                <div className="aspect-[4/5] bg-gray-300 rounded-t-lg"></div>
                <div className="p-4 space-y-2">
                  <div className="h-4 bg-gray-300 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-300 rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white">
      {/* Categories Section - Show after navbar */}
      <section className="pb-3 bg-white mb-4">
        <CategoryGrid categories={categories} />
      </section>

      {/* Hero Carousel */}
      <HeroCarousel />

      {/* All Products Section */}
      <section className="py-8 bg-white">
        <div className="w-full px-1.5 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">All Products</h2>
          </div>
          {allProducts.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2">
              {allProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
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
                <h2 className="text-2xl font-bold text-gray-900 mb-4">{section.category.name}</h2>
              </div>
              {section.products.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2">
                  {section.products.map((product) => (
                    <ProductCard key={product.id} product={product} />
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
