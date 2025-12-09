'use client';

import { useState, useEffect } from 'react';
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
  image_url: string;
}

export default function HeroCarousel() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [navbarHeight, setNavbarHeight] = useState(72);

  useEffect(() => {
    async function fetchProducts() {
      try {
        const { data } = await createClient()
          .from('products')
          .select('id, name, image_url')
          .eq('is_active', true)
          .not('image_url', 'is', null)
          .neq('image_url', '')
          .order('created_at', { ascending: false })
          .limit(9);

        const validProducts = (data || []).filter(
          p => p.image_url?.trim() && !p.image_url.includes('placeholder')
        );

        setProducts(validProducts);
      } catch {
        setProducts([]);
      } finally {
        setLoading(false);
      }
    }

    fetchProducts();
  }, []);

  useEffect(() => {
    const updateHeight = () => {
      const nav = document.querySelector('nav');
      setNavbarHeight(nav?.getBoundingClientRect().height || 72);
    };

    updateHeight();
    const timer = setTimeout(updateHeight, 100);
    const nav = document.querySelector('nav');
    const observer = nav ? new ResizeObserver(updateHeight) : null;
    observer?.observe(nav!);
    
    window.addEventListener('resize', updateHeight);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', updateHeight);
      observer?.disconnect();
    };
  }, []);

  if (loading) {
    return (
      <div 
        className="w-full h-[300px] lg:h-[500px] flex items-center justify-center bg-white hero-carousel-container" 
        style={{ marginTop: `${navbarHeight}px` }}
      >
        <Spinner className="size-12 text-[#D7882B]" />
      </div>
    );
  }

  if (products.length === 0) return null;

  return (
    <div 
      className="w-full h-[300px] lg:h-[500px] bg-white overflow-hidden hero-carousel-container" 
      style={{ marginTop: `${navbarHeight}px` }}
    >
      <Swiper
        modules={[Autoplay, Pagination]}
        spaceBetween={0}
        slidesPerView={1}
        breakpoints={{
          640: { slidesPerView: 2 },
          1024: { slidesPerView: 3 },
        }}
        autoplay={{ delay: 3000, disableOnInteraction: false }}
        pagination={{
          clickable: true,
          bulletClass: 'swiper-pagination-bullet !bg-gray-400 !opacity-50',
          bulletActiveClass: 'swiper-pagination-bullet-active !bg-[#D7882B] !opacity-100',
        }}
        loop={products.length > 3}
        className="hero-carousel-swiper h-full w-full"
      >
        {products.map((product) => (
          <SwiperSlide key={product.id} className="h-full">
            <ImageWithFallback
              src={product.image_url}
              alt={product.name}
              className="w-full h-full object-cover"
              fallbackType="product"
              loading="eager"
              fetchPriority="high"
              width={1600}
              height={900}
            />
          </SwiperSlide>
        ))}
      </Swiper>
    </div>
  );
}
