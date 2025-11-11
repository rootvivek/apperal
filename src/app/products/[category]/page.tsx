'use client';

import { notFound } from 'next/navigation';
import Link from 'next/link';
import ProductCard from '@/components/ProductCard';
import { createClient } from '@/lib/supabase/client';
import { useState, useEffect, use } from 'react';

interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  image_url: string;
  parent_category_id: string | null;
}

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
  subcategories: string[];
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

interface CategoryPageProps {
  params: Promise<{
    category: string;
  }>;
}

export default function CategoryPage({ params }: CategoryPageProps) {
  // Unwrap params Promise (Next.js 15+)
  const { category: categorySlug } = use(params);
  
  const [category, setCategory] = useState<Category | null>(null);
  const [subcategories, setSubcategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    fetchCategoryAndProducts();
  }, [categorySlug]);

  // Filter products by subcategory
  useEffect(() => {
    if (selectedSubcategory === 'all') {
      setFilteredProducts(products);
    } else {
      // Filter by exact subcategory name match
      const filtered = products.filter(product => {
        if (!product.subcategory) return false;
        // Case-insensitive comparison for better matching
        return product.subcategory.toLowerCase() === selectedSubcategory.toLowerCase();
      });
      setFilteredProducts(filtered);
    }
  }, [selectedSubcategory, products]);

  const handleSubcategoryClick = (subcategoryName: string) => {
    setSelectedSubcategory(subcategoryName);
  };

  const fetchCategoryAndProducts = async () => {
    try {
      setLoading(true);
      
      // Decode URL parameter
      const decodedCategory = decodeURIComponent(categorySlug);
      
      // ULTRA-FAST: Single database call using optimized function
      const { data: result, error } = await supabase.rpc('get_category_products', {
        category_slug_param: decodedCategory
      });

      if (error) {
        await fetchCategoryAndProductsFallback();
        return;
      }

      if (!result) {
        // Fallback to regular queries
        await fetchCategoryAndProductsFallback();
        return;
      }

      // Check if category is active before setting it
      if (!result.category || result.category.is_active === false) {
        // Category is inactive, fallback to regular query
        await fetchCategoryAndProductsFallback();
        return;
      }

      // Set category data
      setCategory(result.category);

      // Set subcategories from result if available (filter active only)
      if (result.subcategories && result.subcategories.length > 0) {
        const activeSubcategories = result.subcategories.filter(
          (sub: any) => sub.is_active !== false
        );
        setSubcategories(activeSubcategories);
      } else {
        // Fetch subcategories separately if not in result (only active subcategories)
        const { data: subcats } = await supabase
          .from('subcategories')
          .select('*')
          .eq('parent_category_id', result.category.id)
          .eq('is_active', true);
        setSubcategories(subcats || []);
      }

      // Transform and set products
      const transformedProducts = result.products?.map((product: any) => ({
        id: product.id,
        slug: product.slug,
        name: product.name,
        description: product.description || '',
        price: product.price,
        category: result.category.name,
        subcategory: product.subcategory || '',
        image_url: product.main_image_url,
        stock_quantity: product.stock_quantity || 0,
        is_active: true,
        subcategories: product.subcategory ? [product.subcategory] : [],
        created_at: product.created_at,
        updated_at: product.created_at,
        images: product.additional_images || []
      })) || [];

      setProducts(transformedProducts);
      setFilteredProducts(transformedProducts);
    } catch (error) {
      await fetchCategoryAndProductsFallback();
    } finally {
      setLoading(false);
    }
  };

  const fetchCategoryAndProductsFallback = async () => {
    try {
      // Decode URL parameter to handle encoding issues
      const decodedCategory = decodeURIComponent(categorySlug);
      
      // Fetch category by slug (only active categories)
      const { data: categoryData, error: categoryError } = await supabase
        .from('categories')
        .select('*')
        .eq('slug', decodedCategory)
        .eq('is_active', true)
        .single();

      if (categoryError || !categoryData) {
        setCategory(null);
        setProducts([]);
        setFilteredProducts([]);
        setSubcategories([]);
        return;
      }

      // Fetch subcategories for this category (only active subcategories)
      const { data: subcategoriesData, error: subcategoriesError } = await supabase
        .from('subcategories')
        .select('*')
        .eq('parent_category_id', categoryData.id)
        .eq('is_active', true);

      if (!subcategoriesError && subcategoriesData) {
        setSubcategories(subcategoriesData);
      }

      // Fetch products for this category - try UUID relationship first, fallback to legacy string
      let productsData = null;
      let productsError = null;
      
      // Try UUID relationship first (category_id)
      const { data: uuidProducts, error: uuidError } = await supabase
        .from('products')
        .select('*, product_images (id, image_url, alt_text, display_order)')
        .eq('category_id', categoryData.id)
        .eq('is_active', true);
      
      if (!uuidError && uuidProducts && uuidProducts.length > 0) {
        productsData = uuidProducts;
      } else {
        // Fallback to legacy string field
        const { data: legacyProducts, error: legacyError } = await supabase
          .from('products')
          .select('*, product_images (id, image_url, alt_text, display_order)')
          .eq('category', categoryData.name)
          .eq('is_active', true);
        productsData = legacyProducts;
        productsError = legacyError;
      }

      if (productsError) {
        setProducts([]);
        setCategory(categoryData);
        return;
      }

      // Get subcategory names map for UUID-based products
      // Fetch ALL subcategories (active and inactive) for products that already have subcategory_id
      // This ensures products are still displayed even if their subcategory becomes inactive
      const subcategoryIds = Array.from(new Set(
        productsData
          .filter((p: any) => p.subcategory_id)
          .map((p: any) => p.subcategory_id)
      ));
      
      let subcategoryNameMap: { [key: string]: string } = {};
      if (subcategoryIds.length > 0) {
        const { data: subcats } = await supabase
          .from('subcategories')
          .select('id, name, is_active')
          .in('id', subcategoryIds);
        if (subcats) {
          // Map all subcategories (we'll filter the display list, but keep products accessible)
          subcategoryNameMap = Object.fromEntries(
            subcats.map((sc: any) => [sc.id, sc.name])
          );
        }
      }

      // Transform products
      const transformedProducts = productsData.map((product: any) => {
        // Get subcategory name - prefer legacy string, fallback to UUID lookup
        let subcategoryName = product.subcategory || '';
        if (!subcategoryName && product.subcategory_id) {
          subcategoryName = subcategoryNameMap[product.subcategory_id] || '';
        }
        
        return {
        id: product.id,
        slug: product.slug,
        name: product.name,
        description: product.description || '',
        price: product.price,
        category: categoryData.name,
          subcategory: subcategoryName,
        image_url: product.image_url,
        stock_quantity: product.stock_quantity || 0,
        is_active: product.is_active,
          subcategories: subcategoryName ? [subcategoryName] : [],
        created_at: product.created_at,
        updated_at: product.updated_at,
        product_images: product.product_images,
        images: product.product_images?.map((img: any) => img.image_url) || []
        };
      });

      setCategory(categoryData);
      setProducts(transformedProducts);
      setFilteredProducts(transformedProducts);
    } catch (error) {
      setProducts([]);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!category) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-[1450px] mx-auto w-full px-1 sm:px-4 md:px-6 lg:px-8">
          <div className="text-center py-12">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">Category Not Found</h1>
            <p className="text-gray-600 mb-8">The category you&apos;re looking for doesn&apos;t exist.</p>
            <Link
              href="/products"
              className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              Browse All Products
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Main Content */}
        <div className="max-w-[1450px] mx-auto w-full px-1 sm:px-4 md:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Left Sidebar - Subcategories */}
          <div className="w-full lg:w-64 flex-shrink-0 hidden lg:block">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Subcategories</h3>
              <div className="space-y-2">
                <button
                  onClick={() => handleSubcategoryClick('all')}
                  className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                    selectedSubcategory === 'all'
                      ? 'bg-blue-100 text-blue-700 font-medium'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  All Products ({products.length})
                </button>
                {subcategories.map((subcategory) => {
                  const subcategoryProductCount = products.filter(
                    product => product.subcategory && 
                    product.subcategory.toLowerCase() === subcategory.name.toLowerCase()
                  ).length;
                  
                  return (
                    <button
                      key={subcategory.id}
                      onClick={() => handleSubcategoryClick(subcategory.name)}
                      className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                        selectedSubcategory === subcategory.name
                          ? 'bg-blue-100 text-blue-700 font-medium'
                          : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      {subcategory.name} ({subcategoryProductCount})
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Content - Products */}
          <div className="flex-1">
            {/* Mobile Subcategory Selector */}
            <div className="lg:hidden mb-6">
              <select
                value={selectedSubcategory}
                onChange={(e) => handleSubcategoryClick(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-center"
              >
                <option value="all">All Products ({products.length})</option>
                {subcategories.map((subcategory) => {
                  const subcategoryProductCount = products.filter(
                    product => product.subcategory === subcategory.name
                  ).length;
                  return (
                    <option key={subcategory.id} value={subcategory.name}>
                      {subcategory.name} ({subcategoryProductCount})
                    </option>
                  );
                })}
              </select>
            </div>

            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">
                {selectedSubcategory === 'all' 
                  ? `All Products (${filteredProducts.length})`
                  : `${selectedSubcategory} (${filteredProducts.length})`
                }
              </h2>
              <div className="flex items-center space-x-4">
                <select className="border border-gray-300 rounded-md px-3 py-2 text-sm">
                  <option>Sort by: Featured</option>
                  <option>Price: Low to High</option>
                  <option>Price: High to Low</option>
                  <option>Customer Rating</option>
                  <option>Newest</option>
                </select>
              </div>
            </div>

            {filteredProducts.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredProducts.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-gray-500 text-lg">
                  {selectedSubcategory === 'all' 
                    ? 'No products found in this category.'
                    : `No products found in ${selectedSubcategory}.`
                  }
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}