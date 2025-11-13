'use client';

import { notFound } from 'next/navigation';
import ProductListing from '@/components/ProductListing';
import { createClient } from '@/lib/supabase/client';
import { useState, useEffect, use } from 'react';

interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  image_url: string;
}

interface Subcategory {
  id: string;
  name: string;
  slug: string;
  parent_category_id: string;
}

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  subcategory: string;
  subcategories: string[];
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

interface SubcategoryPageProps {
  params: Promise<{
    category: string;
    subcategory: string;
  }>;
}

export default function SubcategoryPage({ params }: SubcategoryPageProps) {
  // Unwrap params Promise (Next.js 15+)
  const { category: categorySlug, subcategory: subcategorySlug } = use(params);
  
  const [category, setCategory] = useState<Category | null>(null);
  const [subcategory, setSubcategory] = useState<Subcategory | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const fetchSubcategoryAndProducts = async () => {
    try {
      setLoading(true);
      
      // Decode URL parameters to handle spaces and special characters
      const decodedCategory = decodeURIComponent(categorySlug);
      const decodedSubcategory = decodeURIComponent(subcategorySlug);
      
      // Try optimized RPC function first, fallback to regular queries if it fails
      const { data: result, error } = await supabase.rpc('get_subcategory_products', {
        category_slug_param: decodedCategory,
        subcategory_slug_param: decodedSubcategory
      });

      if (error || !result) {
        // RPC function not available, use fallback
        await fetchSubcategoryFallback();
        return;
      }

      // Set category and subcategory data
      setCategory(result.category);
      setSubcategory(result.subcategory);

      // Transform and set products
      const transformedProducts = result.products?.map((product: any) => ({
        id: product.id,
        slug: product.slug,
        name: product.name,
        description: product.description || '',
        price: product.price,
        category: result.category.name,
        subcategory: result.subcategory.name,
        image_url: product.main_image_url,
        stock_quantity: 0,
        is_active: true,
        created_at: product.created_at,
        updated_at: product.created_at,
        images: product.additional_images || []
      })) || [];

      setProducts(transformedProducts);
    } catch (error) {
      await fetchSubcategoryFallback();
    } finally {
      setLoading(false);
    }
  };

  const fetchSubcategoryFallback = async () => {
    try {
      // Decode URL parameters
      const decodedCategory = decodeURIComponent(categorySlug);
      const decodedSubcategory = decodeURIComponent(subcategorySlug);
      
      // Fetch category by slug (only active categories)
      const { data: categoryData, error: categoryError } = await supabase
        .from('categories')
        .select('*')
        .eq('slug', decodedCategory)
        .eq('is_active', true)
        .single();

      // Create fallback category if not found
      const fallbackCategory = categoryError || !categoryData 
        ? {
            id: `fallback-${categorySlug}`,
            name: categorySlug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
            slug: categorySlug,
            description: '',
            image_url: null,
            parent_category_id: null
          }
        : categoryData;

      if (!fallbackCategory) {
        setProducts([]);
        setLoading(false);
        return;
      }

      // Fetch subcategory by slug and parent category from subcategories table (only active subcategories)
      const { data: subcategoryData, error: subcategoryError } = await supabase
        .from('subcategories')
        .select('*')
        .eq('slug', decodedSubcategory)
        .eq('parent_category_id', fallbackCategory.id)
        .eq('is_active', true)
        .single();

      // Create fallback subcategory if not found in database
      const fallbackSubcategory = subcategoryError || !subcategoryData 
        ? {
            id: `fallback-${subcategorySlug}`,
            name: subcategorySlug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
            slug: subcategorySlug,
            description: '',
            image_url: null,
            parent_category_id: fallbackCategory.id
          }
        : subcategoryData;

      setCategory(fallbackCategory);
      setSubcategory(fallbackSubcategory);

      // Fetch products for this subcategory - try UUID relationship first, fallback to legacy string
      let productsData = null;
      let productsError = null;
      
      // Try UUID relationship first (subcategory_id) - for real subcategories from database
      if (fallbackSubcategory.id && !fallbackSubcategory.id.startsWith('fallback-')) {
        const { data, error } = await supabase
          .from('products')
          .select('*, product_images (id, image_url, alt_text, display_order)')
          .eq('subcategory_id', fallbackSubcategory.id)
          .eq('is_active', true);
        
        if (!error && data) {
          productsData = data;
        } else {
          productsError = error;
        }
      }
      
      // If UUID query failed or returned no results, try legacy string field
      if (!productsData || productsData.length === 0) {
        const subcategoryNameToSearch = fallbackSubcategory.name;
        const { data, error } = await supabase
          .from('products')
          .select('*, product_images (id, image_url, alt_text, display_order)')
          .eq('subcategory', subcategoryNameToSearch)
          .eq('is_active', true);
        productsData = data;
        productsError = error;
      }

      if (productsError) {
        setProducts([]);
        return;
      }

      if (!productsData || productsData.length === 0) {
        setProducts([]);
        return;
      }

      // Transform products
      const transformedProducts = productsData.map((product: any) => {
        const subcategoryName = fallbackSubcategory.name || product.subcategory || '';
        return {
          id: product.id,
          slug: product.slug,
          name: product.name,
          description: product.description || '',
          price: product.price,
          category: fallbackCategory.name,
          subcategory: subcategoryName,
          image_url: product.image_url,
          stock_quantity: product.stock_quantity || 0,
          is_active: product.is_active,
          created_at: product.created_at,
          updated_at: product.updated_at,
          product_images: product.product_images,
          images: product.product_images?.map((img: any) => img.image_url) || []
        };
      });

      setProducts(transformedProducts);
    } catch (error) {
      setProducts([]);
    }
  };

  useEffect(() => {
    fetchSubcategoryAndProducts();
  }, [categorySlug, subcategorySlug]);

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

  if (!category || !subcategory) {
    notFound();
  }

  return (
    <ProductListing
      products={products}
      filterType="none"
      showFilter={false}
      emptyMessage="No products found."
    />
  );
}