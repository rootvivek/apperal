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
  category: string;
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
      
      // Fetch 4 featured products
      const { data, error } = await supabase
        .from('products')
        .select('id, name, price, original_price, image_url, category, discount_percentage')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(4);

      if (error) throw error;
      
      setProducts(data || []);
    } catch (err: any) {
      console.error('Error fetching featured products:', err);
      // Fallback to placeholder products if database fails
      setProducts([
        {
          id: '1',
          name: 'Featured Product 1',
          price: 299,
          original_price: 499,
          image_url: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400',
          category: 'Men\'s Clothing',
          discount_percentage: 40
        },
        {
          id: '2',
          name: 'Featured Product 2',
          price: 199,
          original_price: 299,
          image_url: 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=400',
          category: 'Women\'s Clothing',
          discount_percentage: 33
        },
        {
          id: '3',
          name: 'Featured Product 3',
          price: 149,
          original_price: 199,
          image_url: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400',
          category: 'Accessories',
          discount_percentage: 25
        },
        {
          id: '4',
          name: 'Featured Product 4',
          price: 399,
          original_price: 599,
          image_url: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400',
          category: 'Kids\' Clothing',
          discount_percentage: 33
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const calculateDiscountPercentage = (originalPrice: number, currentPrice: number) => {
    return Math.round(((originalPrice - currentPrice) / originalPrice) * 100);
  };

  if (loading) {
    return (
      <div className="w-full h-[70vh] flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading featured products...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-[70vh] bg-gray-50">
      <div className="h-full w-full px-0 py-0">
        {/* Product Grid - Images Only */}
        <div className="h-full overflow-hidden">
          <div className="flex animate-scroll h-full">
            {/* Create enough products for seamless cycling - show 4 at a time */}
            {[...products, ...products].map((product, index) => (
              <div key={`${product.id}-${index}`} className="flex-shrink-0 h-full" style={{ width: '25vw' }}>
                <ProductCard 
                  product={{
                    ...product,
                    description: '',
                    subcategories: [],
                    stock_quantity: 0,
                    is_active: true,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                    images: [product.image_url]
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
