'use client';

import { notFound } from 'next/navigation';
import Link from 'next/link';
import ProductListing from '@/components/ProductListing';
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
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    fetchCategoryAndProducts();
  }, [categorySlug]);

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

      // Fetch products for this category - include products from category and all subcategories
      let productsData: any[] = [];
      let productsError = null;
      
      // Get all subcategory IDs for this category
      const subcategoryIds = subcategoriesData?.map((sub: any) => sub.id) || [];
      
      // Fetch products from category (UUID relationship)
      const { data: categoryProducts, error: categoryProductsError } = await supabase
        .from('products')
        .select('*, product_images (id, image_url, alt_text, display_order)')
        .eq('category_id', categoryData.id)
        .eq('is_active', true);
      
      if (!categoryProductsError && categoryProducts) {
        productsData = [...productsData, ...categoryProducts];
      }
      
      // Fetch products from all subcategories (UUID relationship)
      if (subcategoryIds.length > 0) {
        const { data: subcategoryProducts, error: subcategoryError } = await supabase
          .from('products')
          .select('*, product_images (id, image_url, alt_text, display_order)')
          .in('subcategory_id', subcategoryIds)
          .eq('is_active', true);
        
        if (!subcategoryError && subcategoryProducts) {
          // Combine and remove duplicates by product ID
          const existingIds = new Set(productsData.map((p: any) => p.id));
          const newProducts = subcategoryProducts.filter((p: any) => !existingIds.has(p.id));
          productsData = [...productsData, ...newProducts];
        }
      }
      
      // If no products found with UUID relationship, try legacy string fields
      if (productsData.length === 0) {
        const subcategoryNames = subcategoriesData?.map((sub: any) => sub.name) || [];
        
        // Fetch products from category (legacy)
        const { data: legacyCategoryProducts, error: legacyCategoryError } = await supabase
          .from('products')
          .select('*, product_images (id, image_url, alt_text, display_order)')
          .eq('category', categoryData.name)
          .eq('is_active', true);
        
        if (!legacyCategoryError && legacyCategoryProducts) {
          productsData = [...productsData, ...legacyCategoryProducts];
        }
        
        // Fetch products from subcategories (legacy)
        if (subcategoryNames.length > 0) {
          const { data: legacySubcategoryProducts, error: legacySubcategoryError } = await supabase
            .from('products')
            .select('*, product_images (id, image_url, alt_text, display_order)')
            .in('subcategory', subcategoryNames)
            .eq('is_active', true);
          
          if (!legacySubcategoryError && legacySubcategoryProducts) {
            const existingIds = new Set(productsData.map((p: any) => p.id));
            const newProducts = legacySubcategoryProducts.filter((p: any) => !existingIds.has(p.id));
            productsData = [...productsData, ...newProducts];
          }
        }
      }


      // Get subcategory names map for UUID-based products
      // Fetch ALL subcategories (active and inactive) for products that already have subcategory_id
      // This ensures products are still displayed even if their subcategory becomes inactive
      const productSubcategoryIds = Array.from(new Set(
        productsData
          .filter((p: any) => p.subcategory_id)
          .map((p: any) => p.subcategory_id)
      ));
      
      let subcategoryNameMap: { [key: string]: string } = {};
      if (productSubcategoryIds.length > 0) {
        const { data: subcats } = await supabase
          .from('subcategories')
          .select('id, name, is_active')
          .in('id', productSubcategoryIds);
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
              className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-orange-600 hover:bg-orange-700"
            >
              Browse All Products
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const sidebarContent = (
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
            
            const subcategoryImage = (subcategory as any).image_url || '/images/categories/placeholder.svg';
            
            return (
              <button
                key={subcategory.id}
                onClick={() => handleSubcategoryClick(subcategory.name)}
                className={`w-full flex items-center gap-3 text-left px-3 py-2 rounded-md text-sm transition-colors ${
                  selectedSubcategory === subcategory.name
                    ? 'bg-blue-100 text-blue-700 font-medium'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <img
                  src={subcategoryImage}
                  alt={subcategory.name}
                  className="w-10 h-10 object-cover rounded flex-shrink-0"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    if (target.src !== '/images/categories/placeholder.svg') {
                      target.src = '/images/categories/placeholder.svg';
                    }
                  }}
                />
                <span className="flex-1">
                  {subcategory.name} ({subcategoryProductCount})
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );

  return (
    <ProductListing
      products={products}
      filterOptions={subcategories}
      filterType="subcategory"
      initialFilter={selectedSubcategory}
      onFilterChange={setSelectedSubcategory}
      showFilter={true}
      emptyMessage={selectedSubcategory === 'all' 
        ? 'No products found in this category.'
        : `No products found in ${selectedSubcategory}.`
      }
      sidebar={sidebarContent}
    />
  );
}