'use client';

import { useState, useEffect } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, Pagination } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/pagination';
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
      
      const { data, error } = await supabase
        .from('products')
        .select('id, name, price, original_price, image_url, discount_percentage')
        .eq('is_active', true)
        .eq('show_in_hero', true)
        .order('created_at', { ascending: false })
        .limit(4);

      if (error) throw error;
      
      setProducts(data || []);
    } catch (err: any) {
      console.error('Error fetching featured products:', err);
      setProducts([]);
    } finally {
      setLoading(false);
    }
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
    <div className="w-full h-[50vh] md:h-[70vh] bg-white mb-0 pb-0 sm:pb-4 relative" style={{ touchAction: 'pan-x pan-y' }}>
      <Swiper
        modules={[Autoplay, Pagination]}
        spaceBetween={4}
        slidesPerView={1}
        breakpoints={{
          768: {
            slidesPerView: 2,
            spaceBetween: 4,
          },
          1024: {
            slidesPerView: 4,
            spaceBetween: 4,
          },
        }}
        autoplay={{
          delay: 4000,
          disableOnInteraction: false,
          pauseOnMouseEnter: true,
        }}
        pagination={{
          clickable: true,
          dynamicBullets: true,
        }}
        loop={products.length > 1}
        speed={600}
        grabCursor={true}
        className="h-full w-full"
        style={{
          paddingLeft: '0.25rem',
          paddingRight: '0.25rem',
          touchAction: 'pan-x pan-y',
        }}
      >
        {products.map((product) => (
          <SwiperSlide key={product.id} className="h-full">
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
              />
            </div>
          </SwiperSlide>
        ))}
      </Swiper>
      
    </div>
  );
}
