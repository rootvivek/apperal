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
      
      // Fetch category
      const { data: categoryData, error: categoryError } = await supabase
        .from('categories')
        .select('*')
        .eq('slug', params.category)
        .single();

      if (categoryError) {
        console.error('Error fetching category:', categoryError);
        notFound();
        return;
      }

      setCategory(categoryData);

      // Fetch subcategory
      const { data: subcategoryData, error: subcategoryError } = await supabase
        .from('categories')
        .select('*')
        .eq('slug', params.subcategory)
        .eq('parent_category_id', categoryData.id)
        .single();

      if (subcategoryError) {
        console.error('Error fetching subcategory:', subcategoryError);
        notFound();
        return;
      }

      setSubcategory(subcategoryData);

      // Fetch products for this subcategory with additional images
      const { data: productsData, error: productsError } = await supabase
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
        .eq('category', categoryData.name)
        .eq('subcategory', subcategoryData.name)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (productsError) {
        console.error('Error fetching products:', productsError);
        setProducts([]);
      } else {
        // Transform products to include images array
        const transformedProducts = productsData?.map(product => ({
          ...product,
          images: product.product_images || []
        })) || [];
        
        setProducts(transformedProducts);
      }
    } catch (error) {
      console.error('Error:', error);
      notFound();
    } finally {
      setLoading(false);
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
      <div className="max-w-[1450px] mx-auto w-full py-8" style={{ paddingLeft: '6px', paddingRight: '6px' }}>
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