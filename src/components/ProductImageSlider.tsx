'use client';

import { useState, useEffect, useRef, useCallback, useMemo, memo } from 'react';
import ImageWithFallback from './ImageWithFallback';
import { mobileTypographyStyles } from '@/utils/mobileTypography';

interface ProductImageSliderProps {
  productId: string;
  productName: string;
  images: string[];
  variant?: 'default' | 'minimal' | 'image-only';
  isHeroImage?: boolean;
  isOutOfStock?: boolean;
  hideStockOverlay?: boolean;
}

const AUTO_SLIDE_INTERVAL = 2000;
const MIN_SWIPE_DISTANCE = 30;
const PLACEHOLDER_IMAGE = '/placeholder-product.jpg';

const ProductImageSlider = memo(({
  productId,
  productName,
  images,
  variant = 'default',
  isHeroImage = false,
  isOutOfStock = false,
  hideStockOverlay = false,
}: ProductImageSliderProps) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const touchStartRef = useRef<number | null>(null);
  const touchEndRef = useRef<number | null>(null);

  useEffect(() => {
    setIsTouchDevice('ontouchstart' in window || navigator.maxTouchPoints > 0);
  }, []);

  // Clear interval on unmount to prevent memory leak
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, []);

  const hasMultipleImages = images.length > 1;
  const isImageOnly = variant === 'image-only';
  const imageAspectRatio = isImageOnly ? "h-full w-full" : "aspect-[5/6] sm:aspect-[4/5]";

  // Image navigation helpers
  const clearSlideInterval = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const goToNextImage = useCallback(() => {
    setCurrentImageIndex(prev => (prev + 1) % images.length);
  }, [images.length]);

  const goToImage = useCallback((index: number) => {
    if (index >= 0 && index < images.length) {
      setCurrentImageIndex(index);
    }
  }, [images.length]);

  // Touch handlers
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartRef.current = e.touches[0].clientX;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    touchEndRef.current = e.touches[0].clientX;
  }, []);

  // Fix swipe crash: Use proper null checks (0 is valid coordinate)
  const handleTouchEnd = useCallback(() => {
    if (touchStartRef.current === null || touchEndRef.current === null) return;
    
    const distance = touchStartRef.current - touchEndRef.current;
    if (Math.abs(distance) > MIN_SWIPE_DISTANCE) {
      if (distance > 0) {
        goToNextImage();
      } else {
        setCurrentImageIndex(prev => (prev - 1 + images.length) % images.length);
      }
    }
    
    touchStartRef.current = null;
    touchEndRef.current = null;
  }, [images.length, goToNextImage]);

  // Desktop image sliding
  const startImageSliding = useCallback(() => {
    if (isTouchDevice || variant === 'image-only' || !hasMultipleImages) return;
    setIsHovered(true);
    clearSlideInterval();
    intervalRef.current = setInterval(goToNextImage, AUTO_SLIDE_INTERVAL);
  }, [isTouchDevice, variant, hasMultipleImages, goToNextImage, clearSlideInterval]);

  const stopImageSliding = useCallback(() => {
    setIsHovered(false);
    clearSlideInterval();
  }, [clearSlideInterval]);

  useEffect(() => {
    if (currentImageIndex >= images.length) {
      setCurrentImageIndex(0);
    }
  }, [images.length, currentImageIndex]);

  // Memoize image rendering to prevent unnecessary re-renders
  // LCP/CLS optimization: Only hero image index 0 = loading="eager" + fetchPriority="high"
  const renderedImages = useMemo(() => {
    return images.map((imageUrl, index) => {
      const isActive = currentImageIndex === index;
      const isHeroFirstImage = isHeroImage && index === 0;
      
      return (
        <ImageWithFallback
          key={`product-image-${productId}-${index}`}
          src={imageUrl || PLACEHOLDER_IMAGE}
          alt={`${productName || 'Product'} ${index + 1}`}
          className={`h-full w-full object-cover transition-transform duration-300 absolute inset-0 transition-opacity duration-500 ${
            isActive ? 'opacity-100 z-[5]' : 'opacity-0 z-0 pointer-events-none'
          }`}
          loading={isHeroFirstImage ? 'eager' : 'lazy'}
          decoding="async"
          width={isImageOnly ? 800 : 400}
          height={isImageOnly ? 600 : 480}
          fetchPriority={isHeroFirstImage ? 'high' : 'auto'}
          sizes={isImageOnly ? '100vw' : '(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw'}
          fallbackType="product"
          responsive={true}
          responsiveSizes={isImageOnly ? [640, 1024, 1920] : [300, 400, 500]}
          quality={85}
        />
      );
    });
  }, [images, currentImageIndex, productId, productName, isImageOnly, isHeroImage]);

  return (
    <div 
      className={`${imageAspectRatio} overflow-hidden relative group`}
      style={{ touchAction: isTouchDevice ? 'pan-x pan-y' : 'auto' }}
      onMouseEnter={!isTouchDevice ? startImageSliding : undefined}
      onMouseLeave={!isTouchDevice ? stopImageSliding : undefined}
      onTouchStart={isTouchDevice && hasMultipleImages ? handleTouchStart : undefined}
      onTouchMove={isTouchDevice && hasMultipleImages ? handleTouchMove : undefined}
      onTouchEnd={isTouchDevice && hasMultipleImages ? handleTouchEnd : undefined}
    >
      <div className="relative w-full h-full">
        {renderedImages}
      </div>
      
      {/* Image dots indicator */}
      {hasMultipleImages && (
        <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex gap-1.5 z-30">
          {images.map((_, index) => (
            <button
              key={index}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                stopImageSliding();
                goToImage(index);
                clearSlideInterval();
                intervalRef.current = setInterval(goToNextImage, AUTO_SLIDE_INTERVAL);
              }}
              onMouseEnter={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              className={`transition-all duration-200 rounded-full cursor-pointer ${
                currentImageIndex === index
                  ? 'w-2 h-2 bg-white shadow-md'
                  : 'w-1.5 h-1.5 bg-white/60 hover:bg-white/80'
              }`}
              aria-label={`Go to image ${index + 1} of ${images.length}`}
              type="button"
              data-stop-propagation
            />
          ))}
        </div>
      )}
      
      {/* Out of Stock Overlay */}
      {isOutOfStock && !hideStockOverlay && (
        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-40">
          <span className="text-white font-medium" style={{ ...mobileTypographyStyles.body12Medium, fontFamily: 'Geist, sans-serif' }}>
            Out of Stock
          </span>
        </div>
      )}
    </div>
  );
});

ProductImageSlider.displayName = 'ProductImageSlider';

export default ProductImageSlider;

