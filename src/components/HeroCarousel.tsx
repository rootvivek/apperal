'use client';

import { useState, useEffect, useCallback } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, Pagination } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/pagination';
import ProductCard from './ProductCard';
import { createClient } from '@/lib/supabase/client';
import LoadingLogo from './LoadingLogo';

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

  const fetchFeaturedProducts = useCallback(async () => {
    try {
      setLoading(true);
      
      // First try to get products marked for hero
      let { data, error } = await supabase
        .from('products')
        .select('id, name, price, original_price, image_url, discount_percentage')
        .eq('is_active', true)
        .eq('show_in_hero', true)
        .order('created_at', { ascending: false })
        .limit(4);

      // If no hero products found, fallback to latest active products
      if (!data || data.length === 0) {
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('products')
          .select('id, name, price, original_price, image_url, discount_percentage')
          .eq('is_active', true)
          .order('created_at', { ascending: false })
          .limit(4);
        
        if (fallbackError) throw fallbackError;
        setProducts(fallbackData || []);
      } else {
      if (error) throw error;
      setProducts(data || []);
      }
    } catch (err: any) {
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchFeaturedProducts();
  }, [fetchFeaturedProducts]);

  // Preload first hero image for LCP optimization
  useEffect(() => {
    if (products.length > 0 && products[0].image_url) {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'image';
      link.href = products[0].image_url;
      link.fetchPriority = 'high';
      document.head.appendChild(link);
      
      return () => {
        // Cleanup on unmount
        if (document.head.contains(link)) {
          document.head.removeChild(link);
        }
      };
    }
  }, [products]);


  if (loading) {
    return (
      <div className="w-full h-[50vh] md:h-[70vh] flex items-center justify-center bg-white mb-0 pb-0 sm:pb-0">
        <div className="text-center">
          <LoadingLogo size="md" text="Loading carousel..." />
          <p className="mt-4 text-gray-600">Loading featured products...</p>
        </div>
      </div>
    );
  }

  if (products.length === 0) {
    return null; // Don't show anything if no products
  }

  return (
    <div className="w-full h-[50vh] md:h-[70vh] bg-white mb-0 pb-0 overflow-hidden relative z-0" style={{ minHeight: '400px', backgroundColor: '#ffffff' }}>
      <Swiper
        modules={[Autoplay, Pagination]}
        spaceBetween={2}
        slidesPerView={1}
        breakpoints={{
          640: {
            slidesPerView: 2,
            spaceBetween: 2,
          },
          1024: {
            slidesPerView: 3,
            spaceBetween: 2,
          },
        }}
        autoplay={{
          delay: 3000,
          disableOnInteraction: false,
        }}
        pagination={{
          clickable: true,
          bulletClass: 'swiper-pagination-bullet !bg-gray-400 !opacity-50',
          bulletActiveClass: 'swiper-pagination-bullet-active !bg-blue-600 !opacity-100',
        }}
        loop={products.length > 3}
        className="h-full w-full"
        style={{ height: '100%', width: '100%' }}
      >
        {products.map((product, index) => (
          <SwiperSlide key={product.id} className="h-full" style={{ height: '100%' }}>
            <div className="h-full w-full">
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
                  isHeroImage={index === 0}
                />
              </div>
          </SwiperSlide>
            ))}
      </Swiper>
    </div>
  );
}
