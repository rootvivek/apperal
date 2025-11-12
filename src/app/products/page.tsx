'use client';

import { useState, useEffect } from 'react';
import ProductCard from '@/components/ProductCard';
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

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    fetchAllProducts();
  }, []);

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
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white py-6">
          <div className="max-w-[1450px] mx-auto w-full px-1 sm:px-4 md:px-6 lg:px-8">
            <div className="text-center">
              <h1 className="text-3xl font-bold text-gray-900 mb-4">All Products</h1>
              <p className="text-xl text-gray-600">
                Discover our carefully curated collection of clothing and accessories for every occasion
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading products...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white py-6">
        <div className="max-w-[1450px] mx-auto w-full px-1 sm:px-4 md:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">All Products</h1>
            <p className="text-xl text-gray-600">
              Discover our carefully curated collection of clothing and accessories for every occasion
            </p>
          </div>
        </div>
      </div>
      
      <div className="max-w-[1450px] mx-auto w-full px-1 sm:px-4 md:px-6 lg:px-8 py-8">
        {products.length > 0 ? (
          <>
            {/* Mobile: Horizontal scroll, 2 items visible */}
            <div className="sm:hidden">
              <div className="overflow-x-auto scrollbar-hide -mx-1 px-1">
                <div className="flex gap-1" style={{ width: 'max-content' }}>
                  {products.map((product) => (
                    <div
                      key={product.id}
                      className="flex-shrink-0"
                      style={{ width: 'calc((100vw - 2rem) / 1.95 - 0.25rem)', maxWidth: '190px' }}
                    >
                      <ProductCard product={product as any} />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Desktop: Grid layout */}
            <div className="hidden sm:grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {products.map((product) => (
                <ProductCard key={product.id} product={product as any} />
              ))}
            </div>
          </>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-600 text-lg">No products found.</p>
          </div>
        )}
      </div>
    </div>
  );
}
