'use client';

import { useState, useEffect } from 'react';
import ProductListing from '@/components/ProductListing';
import { Spinner } from '@/components/ui/spinner';
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
  slug?: string;
  badge?: string;
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
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    fetchAllProducts();
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const { data: categoriesData } = await supabase
        .from('categories')
        .select('id, name, slug')
        .is('parent_category_id', null)
        .eq('is_active', true)
        .order('name', { ascending: true });
      
      if (categoriesData) {
        setCategories(categoriesData);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchAllProducts = async () => {
    try {
      setLoading(true);
      
      // Fetch all active products with their images from all categories
      const { data: productsData, error } = await supabase
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
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Transform products to include images array
      const transformedProducts = (productsData || []).map((product: any) => ({
        ...product,
        images: product.product_images || [],
        subcategories: product.subcategory ? [product.subcategory] : []
      }));
      
      setProducts(transformedProducts);
    } catch (error) {
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

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
    <ProductListing
      products={products}
      filterOptions={categories}
      filterType="category"
      showFilter={true}
      emptyMessage="No products found."
    />
  );
}
