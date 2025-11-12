'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import ProductCard from './ProductCard';
import { createClient } from '@/lib/supabase/client';

interface Product {
  id: string;
  name: string;
  price: number;
  original_price?: number;
  image_url: string;
  discount_percentage?: number;
}

export default function HeroCarousel() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    fetchFeaturedProducts();
  }, []);

  const fetchFeaturedProducts = async () => {
    try {
      setLoading(true);
      
      // Fetch products that are marked to show in hero section
      const { data, error } = await supabase
        .from('products')
        .select('id, name, price, original_price, image_url, discount_percentage')
        .eq('is_active', true)
        .eq('show_in_hero', true)
        .order('created_at', { ascending: false })
        .limit(4);

      if (error) throw error;
      
      // Hero products fetched successfully
      console.log('Hero products data:', data);
      setProducts(data || []);
    } catch (err: any) {
      console.error('Error fetching featured products:', err);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  const calculateDiscountPercentage = (originalPrice: number, currentPrice: number) => {
    return Math.round(((originalPrice - currentPrice) / originalPrice) * 100);
  };

  if (loading) {
    return (
      <div className="w-full h-[50vh] md:h-[70vh] flex items-center justify-center bg-white mb-0 pb-0 sm:pb-0">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading featured products...</p>
        </div>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="w-full h-[50vh] md:h-[70vh] bg-white mb-0 pb-0 sm:pb-4 flex items-center justify-center">
        <div className="text-center text-gray-500">
          <p>No featured products available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-[50vh] md:h-[70vh] bg-white mb-0 pb-0 sm:pb-4 -mt-2 sm:mt-0">
      <div className="h-full w-full px-0 py-0">
        {/* Product Grid - Images Only */}
        <div className="h-full overflow-hidden relative">
          <div className="flex animate-scroll h-full" style={{ paddingLeft: '0.25rem' }}>
            {/* Show products once for now - can add infinite scroll later if needed */}
            {products.map((product, index) => (
              <div key={`${product.id}-${index}`} className="flex-shrink-0 h-full w-full md:w-1/2 lg:w-1/4" style={{ marginRight: index < products.length - 1 ? '0.25rem' : '0', marginLeft: index === 0 ? '-0.25rem' : '0' }}>
                <ProductCard 
                  product={{
                    ...product,
                    description: '',
                    category: 'Featured',
                    subcategories: [],
                    stock_quantity: 0,
                    is_active: true,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                    images: product.image_url ? [product.image_url] : []
                  }} 
                  variant="image-only"
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
