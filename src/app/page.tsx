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

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch all active products
      const { data: allProductsData, error: allProductsError } = await supabase
        .from('products')
        .select('*')
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
            .select('*')
            .eq('is_active', true)
            .eq('category', category.name)
            .order('created_at', { ascending: false })
            .limit(8);

          if (categoryProductsError) {
            console.error(`Error fetching products for ${category.name}:`, categoryProductsError);
          }

          // Show ALL categories, even if they have no products
          categorySectionsData.push({
            category,
            products: categoryProducts || []
          });
        }
      }

      setAllProducts(allProductsData || []);
      setCategorySections(categorySectionsData);
      setCategories(categoriesData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      setAllProducts([]);
      setCategorySections([]);
      setCategories([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen">
        <HeroCarousel />
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading products...</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen">
      {/* Hero Carousel */}
      <HeroCarousel />

      {/* Categories Section */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-[1450px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Shop by Category</h2>
            <p className="text-lg text-gray-600">
              Explore our wide range of products across different categories
            </p>
          </div>
          <CategoryGrid categories={categories} />
        </div>
      </section>

      {/* All Products Section */}
      <section className="py-16 bg-white">
        <div className="max-w-[1450px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">All Products</h2>
            <p className="text-lg text-gray-600">
              Discover our complete collection of products
            </p>
          </div>
          {allProducts.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
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
        const bgColor = index % 2 === 0 ? 'bg-gray-50' : 'bg-white';
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
            <div className="max-w-[1450px] mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center mb-12">
                <h2 className="text-3xl font-bold text-gray-900 mb-4">{section.category.name}</h2>
                <p className="text-lg text-gray-600">
                  {section.category.description || `Explore our ${section.category.name.toLowerCase()} collection`}
                </p>
              </div>
              {section.products.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                  {section.products.map((product) => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="text-gray-400 text-6xl mb-4">📦</div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No products available yet</h3>
                  <p className="text-gray-500">
                    We're working on adding products to this category. Check back soon!
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
