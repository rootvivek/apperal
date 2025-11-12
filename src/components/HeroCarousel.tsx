'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
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
  const [currentIndex, setCurrentIndex] = useState(0);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [isAutoSliding, setIsAutoSliding] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const autoSlideIntervalRef = useRef<NodeJS.Timeout | null>(null);
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

  // Minimum swipe distance (in pixels)
  const minSwipeDistance = 50;

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
    // Pause auto-slide when user starts touching
    setIsPaused(true);
    setIsAutoSliding(false);
    if (autoSlideIntervalRef.current) {
      clearInterval(autoSlideIntervalRef.current);
      autoSlideIntervalRef.current = null;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) {
      // Resume auto-slide if no swipe was detected
      setIsPaused(false);
      setTouchStart(null);
      setTouchEnd(null);
      return;
    }
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    // Update index if swipe detected
    if (isLeftSwipe && currentIndex < products.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else if (isRightSwipe && currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }

    // Reset touch states
    setTouchStart(null);
    setTouchEnd(null);

    // Reset auto-slide timer immediately after manual swipe
    if (autoSlideIntervalRef.current) {
      clearInterval(autoSlideIntervalRef.current);
      autoSlideIntervalRef.current = null;
    }

    // Resume auto-slide with fresh timer after a short delay
    // The useEffect will automatically restart the interval when isPaused becomes false
    setTimeout(() => {
      setIsPaused(false);
    }, 1000);
  };

  // Update scroll position when currentIndex changes (for programmatic swipes and auto-slide)
  useEffect(() => {
    if (scrollContainerRef.current && typeof window !== 'undefined' && window.innerWidth < 768) {
      // On mobile, each card is full width
      const containerWidth = scrollContainerRef.current.offsetWidth;
      scrollContainerRef.current.scrollTo({
        left: currentIndex * containerWidth,
        behavior: 'smooth'
      });
    }
  }, [currentIndex]);

  // Sync currentIndex with scroll position (for manual scrolling only - not during auto-slide)
  useEffect(() => {
    if (!scrollContainerRef.current || typeof window === 'undefined' || window.innerWidth >= 768) return;
    if (isAutoSliding) return; // Don't sync during auto-slide

    const container = scrollContainerRef.current;
    let scrollTimeout: NodeJS.Timeout;
    
    const handleScroll = () => {
      // Debounce scroll events
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        const containerWidth = container.offsetWidth;
        const scrollLeft = container.scrollLeft;
        const newIndex = Math.round(scrollLeft / containerWidth);
        
        if (newIndex !== currentIndex && newIndex >= 0 && newIndex < products.length) {
          setCurrentIndex(newIndex);
        }
      }, 100);
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    
    return () => {
      container.removeEventListener('scroll', handleScroll);
      clearTimeout(scrollTimeout);
    };
  }, [currentIndex, products.length, isAutoSliding]);

  // Auto-slide functionality for mobile
  useEffect(() => {
    // Don't run if still loading, on desktop, or if no products
    if (loading || typeof window === 'undefined' || window.innerWidth >= 768 || products.length === 0) {
      if (autoSlideIntervalRef.current) {
        clearInterval(autoSlideIntervalRef.current);
        autoSlideIntervalRef.current = null;
      }
      return;
    }

    // Clear existing interval
    if (autoSlideIntervalRef.current) {
      clearInterval(autoSlideIntervalRef.current);
      autoSlideIntervalRef.current = null;
    }

    // Only start if not paused
    if (!isPaused) {
      setIsAutoSliding(true);
      const intervalId = setInterval(() => {
        setCurrentIndex(prev => {
          const nextIndex = prev >= products.length - 1 ? 0 : prev + 1;
          return nextIndex;
        });
      }, 4000); // Change slide every 4 seconds
      
      autoSlideIntervalRef.current = intervalId;
    } else {
      setIsAutoSliding(false);
    }

    return () => {
      if (autoSlideIntervalRef.current) {
        clearInterval(autoSlideIntervalRef.current);
        autoSlideIntervalRef.current = null;
      }
      setIsAutoSliding(false);
    };
  }, [loading, products.length, isPaused]);

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
    <div className="w-full h-[50vh] md:h-[70vh] bg-white mb-0 pb-0 sm:pb-4 -mt-2 sm:mt-0 relative">
      <div className="h-full w-full px-0 py-0">
        {/* Product Grid - Images Only */}
        <div 
          className="h-full overflow-hidden relative md:overflow-visible"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <div 
            ref={scrollContainerRef}
            className="flex md:animate-scroll h-full overflow-x-auto md:overflow-hidden scrollbar-hide snap-x snap-mandatory"
            style={{ paddingLeft: '0.25rem', scrollSnapType: 'x mandatory' }}
          >
            {/* Show products once for now - can add infinite scroll later if needed */}
            {products.map((product, index) => (
              <div 
                key={`${product.id}-${index}`} 
                className="flex-shrink-0 h-full w-full md:w-1/2 lg:w-1/4 snap-start" 
                style={{ marginRight: index < products.length - 1 ? '0.25rem' : '0', marginLeft: index === 0 ? '-0.25rem' : '0' }}
              >
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

      {/* Dot Indicators - Mobile Only */}
      {products.length > 1 && (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2 z-10 md:hidden">
          {products.map((_, index) => (
            <button
              key={index}
              onClick={() => {
                setCurrentIndex(index);
                // Pause auto-slide when clicking dot
                setIsPaused(true);
                if (autoSlideIntervalRef.current) {
                  clearInterval(autoSlideIntervalRef.current);
                  autoSlideIntervalRef.current = null;
                }
                // Resume after delay - useEffect will restart it
                setTimeout(() => {
                  setIsPaused(false);
                }, 3000);
              }}
              className={`transition-all duration-300 rounded-full ${
                index === currentIndex
                  ? 'w-8 h-2 bg-white'
                  : 'w-2 h-2 bg-white/50'
              }`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
