'use client';

import { notFound } from 'next/navigation';
import ProductCard from '@/components/ProductCard';
import { createClient } from '@/lib/supabase/client';
import { useState, useEffect } from 'react';

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
  image_url: string;
  stock_quantity: number;
  is_active: boolean;
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
  params: {
    category: string;
    subcategory: string;
  };
}

export default function SubcategoryPage({ params }: SubcategoryPageProps) {
  const [category, setCategory] = useState<Category | null>(null);
  const [subcategory, setSubcategory] = useState<Subcategory | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    fetchSubcategoryAndProducts();
  }, [params.category, params.subcategory]);

  const fetchSubcategoryAndProducts = async () => {
    try {
      setLoading(true);
      
      // Decode URL parameters to handle spaces and special characters
      const decodedCategory = decodeURIComponent(params.category);
      const decodedSubcategory = decodeURIComponent(params.subcategory);
      
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
      console.error('Error:', error);
      await fetchSubcategoryFallback();
    } finally {
      setLoading(false);
    }
  };

  const fetchSubcategoryFallback = async () => {
    try {
      // Decode URL parameters
      const decodedCategory = decodeURIComponent(params.category);
      const decodedSubcategory = decodeURIComponent(params.subcategory);
      
      // Fetch category by slug
      const { data: categoryData, error: categoryError } = await supabase
        .from('categories')
        .select('*')
        .eq('slug', decodedCategory)
        .single();

      // Create fallback category if not found
      const fallbackCategory = categoryError || !categoryData 
        ? {
            id: `fallback-${params.category}`,
            name: params.category.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
            slug: params.category,
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

      // Fetch subcategory by slug and parent category from subcategories table
      const { data: subcategoryData, error: subcategoryError } = await supabase
        .from('subcategories')
        .select('*')
        .eq('slug', decodedSubcategory)
        .eq('parent_category_id', fallbackCategory.id)
        .single();

      // Create fallback subcategory if not found in database
      const fallbackSubcategory = subcategoryError || !subcategoryData 
        ? {
            id: `fallback-${params.subcategory}`,
            name: params.subcategory.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
            slug: params.subcategory,
            description: '',
            image_url: null,
            parent_category_id: fallbackCategory.id
          }
        : subcategoryData;

      setCategory(fallbackCategory);
      setSubcategory(fallbackSubcategory);

      // Fetch products for this subcategory
      const subcategoryNameToSearch = fallbackSubcategory.name;
      
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select('*, product_images (id, image_url, alt_text, display_order)')
        .eq('subcategory', subcategoryNameToSearch)
        .eq('is_active', true);

      if (productsError) {
        console.error('Error fetching products:', productsError);
        setProducts([]);
        return;
      }

      // Transform products
      const transformedProducts = productsData.map((product: any) => ({
        id: product.id,
        slug: product.slug,
        name: product.name,
        description: product.description || '',
        price: product.price,
        category: fallbackCategory.name,
        subcategory: fallbackSubcategory.name,
        image_url: product.image_url,
        stock_quantity: product.stock_quantity || 0,
        is_active: product.is_active,
        created_at: product.created_at,
        updated_at: product.updated_at,
        product_images: product.product_images,
        images: product.product_images?.map((img: any) => img.image_url) || []
      }));

      setProducts(transformedProducts);
    } catch (error) {
      console.error('Fallback error:', error);
      // Don't call notFound() here - let the product display with empty subcategory data
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

  if (!category || !subcategory) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Products Grid */}
      <div className="max-w-[1450px] mx-auto w-full px-2 sm:px-4 md:px-6 lg:px-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">
            {products.length} Products
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

        {products.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">No products found in this subcategory.</p>
          </div>
        )}
      </div>
    </div>
  );
}