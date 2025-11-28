'use client';

import { useState, useEffect, useCallback } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, Pagination } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/pagination';
import ImageWithFallback from '@/components/ImageWithFallback';
import { createClient } from '@/lib/supabase/client';
import { Spinner } from '@/components/ui/spinner';

interface Product {
  id: string;
  name: string;
  price: number;
  original_price?: number | null;
  image_url: string;
}

interface HeroCarouselProps {
  className?: string;
}

export default function HeroCarousel({ className = '' }: HeroCarouselProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const fetchFeaturedProducts = useCallback(async () => {
    try {
      setLoading(true);
      
      // First try to get products marked for hero
      let { data, error } = await supabase
        .from('products')
        .select('id, name, price, original_price, image_url')
        .eq('is_active', true)
        .eq('show_in_hero', true)
        .order('created_at', { ascending: false })
        .limit(4);

      // If no hero products found, fallback to latest active products
      if (!data || data.length === 0) {
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('products')
          .select('id, name, price, original_price, image_url')
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
          <Spinner className="size-12 text-[#D7882B]" />
          <p className="mt-4 text-gray-600">Loading carousel...</p>
          <p className="mt-4 text-gray-600">Loading featured products...</p>
        </div>
      </div>
    );
  }

  if (products.length === 0) {
    // Fallback hero with placeholder image so header doesn't look empty
    return (
      <div className={`w-full h-[50vh] md:h-[70vh] bg-white mb-0 pb-0 overflow-hidden relative z-0 ${className}`} style={{ minHeight: '400px', backgroundColor: '#ffffff' }}>
        <ImageWithFallback
          src="/placeholder-product.jpg"
          alt="Featured products"
          className="w-full h-full object-cover"
          fallbackType="product"
          loading="eager"
          fetchPriority="high"
          width={1600}
          height={900}
        />
      </div>
    );
  }

  return (
    <div className={`w-full h-[50vh] md:h-[70vh] bg-white overflow-hidden relative z-0 hero-carousel-container ${className}`} style={{ minHeight: '400px', backgroundColor: '#ffffff', margin: 0, padding: 0, width: '100%' }}>
      <Swiper
        modules={[Autoplay, Pagination]}
        spaceBetween={0}
        slidesPerView={1}
        breakpoints={{
          640: {
            slidesPerView: 2,
            spaceBetween: 0,
          },
          1024: {
            slidesPerView: 3,
            spaceBetween: 0,
          },
        }}
        autoplay={{
          delay: 3000,
          disableOnInteraction: false,
        }}
        pagination={{
          clickable: true,
          bulletClass: 'swiper-pagination-bullet !bg-gray-400 !opacity-50',
          bulletActiveClass: 'swiper-pagination-bullet-active !bg-[#D7882B] !opacity-100',
        }}
        loop={products.length > 1}
        className="hero-carousel-swiper h-full w-full"
        style={{ 
          height: '100%', 
          width: '100%',
          margin: 0,
          padding: 0,
        }}
      >
        {products.map((product) => {
          const imageUrl = product.image_url || '/placeholder-product.jpg';
          return (
          <SwiperSlide key={product.id} className="h-full" style={{ height: '100%', margin: 0, padding: 0, width: '100%' }}>
            <div className="h-full w-full" style={{ margin: 0, padding: 0, width: '100%', height: '100%' }}>
              <ImageWithFallback
                src={imageUrl}
                alt={product.name}
                className="w-full h-full object-cover"
                fallbackType="product"
                loading="eager"
                fetchPriority="high"
                width={1600}
                height={900}
                responsive
                responsiveSizes={[640, 1024, 1440, 1600]}
                quality={90}
                style={{ margin: 0, padding: 0, display: 'block', width: '100%', height: '100%' }}
                />
              </div>
          </SwiperSlide>
          );
        })}
      </Swiper>
    </div>
  );
}
