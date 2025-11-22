'use client';

import Link from 'next/link';
import { useState, useEffect, useRef, memo, useMemo, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { useWishlist } from '@/contexts/WishlistContext';
import { useAuth } from '@/contexts/AuthContext';
import { useLoginModal } from '@/contexts/LoginModalContext';
import { Product } from '@/types/product';
import ImageWithFallback from './ImageWithFallback';

interface ProductCardProduct {
  id: string;
  slug?: string;
  name: string;
  description?: string;
  price: number;
  original_price?: number;
  discount_percentage?: number;
  badge?: string;
  category: string | { id: string; name: string; slug: string; image: string; subcategories: any[] };
  subcategories: string[];
  image_url: string;
  stock_quantity: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  images?: (string | { id: string; image_url: string; alt_text?: string; display_order: number })[];
}

interface ProductCardProps {
  product: ProductCardProduct;
  hideStockOverlay?: boolean;
  variant?: 'default' | 'minimal' | 'image-only';
  isHeroImage?: boolean;
  enableBlurPreview?: boolean;
  enableSkeleton?: boolean;
  enableQuickView?: boolean;
  enableQuickAdd?: boolean;
  onQuickView?: (product: ProductCardProduct) => void;
  onQuickAdd?: (product: ProductCardProduct) => void;
}

const AUTO_SLIDE_INTERVAL = 2000;
const AUTO_RESUME_DELAY = 1000;
const MIN_SWIPE_DISTANCE = 30;
const PLACEHOLDER_IMAGE = '/placeholder-product.jpg';
const BADGE_STYLES: Record<string, string> = {
  'NEW': 'bg-green-500 text-white',
  'SALE': 'bg-red-500 text-white',
  'HOT': 'bg-brand-400 text-white',
  'FEATURED': 'bg-brand-400 text-white',
  'LIMITED': 'bg-purple-500 text-white',
};

function useProductImages(product: ProductCardProduct) {
  return useMemo(() => {
    const images: string[] = [];
    const seenUrls = new Set<string>();
    
    if (product.image_url && typeof product.image_url === 'string') {
      const mainImageUrl = product.image_url.trim();
      if (mainImageUrl && (mainImageUrl.startsWith('http') || mainImageUrl.startsWith('https') || mainImageUrl.startsWith('/'))) {
        images.push(mainImageUrl);
        seenUrls.add(mainImageUrl);
      }
    }
    
    if (product.images && Array.isArray(product.images)) {
      product.images.forEach((image) => {
        let imageUrl: string | null = null;
        if (typeof image === 'string' && image.trim()) {
          imageUrl = image.trim();
        } else if (typeof image === 'object' && image !== null && 'image_url' in image && typeof image.image_url === 'string') {
          imageUrl = image.image_url.trim();
        }
        if (imageUrl && !seenUrls.has(imageUrl) && (imageUrl.startsWith('http') || imageUrl.startsWith('https') || imageUrl.startsWith('/'))) {
          images.push(imageUrl);
          seenUrls.add(imageUrl);
        }
      });
    }
    
    return images.length > 0 ? images : (product.image_url ? [product.image_url] : [PLACEHOLDER_IMAGE]);
  }, [product.image_url, product.images]);
}

function useProductDiscount(price: number, originalPrice?: number) {
  return useMemo(() => {
    if (!originalPrice || originalPrice <= price) {
      return { discountPercentage: 0, hasDiscount: false };
    }
    const discount = Math.round(((originalPrice - price) / originalPrice) * 100);
    return { discountPercentage: discount, hasDiscount: discount > 0 };
  }, [price, originalPrice]);
}

function useImageSwiper(imageCount: number, isTouchDevice: boolean) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const resumeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const touchStartRef = useRef<number | null>(null);
  const touchEndRef = useRef<number | null>(null);
  const lastIndexRef = useRef(0);

  const clearSlideInterval = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const clearResumeTimeout = useCallback(() => {
    if (resumeTimeoutRef.current) {
      clearTimeout(resumeTimeoutRef.current);
      resumeTimeoutRef.current = null;
    }
  }, []);

  const goToNext = useCallback(() => {
    setCurrentIndex(prev => {
      const next = (prev + 1) % imageCount;
      lastIndexRef.current = next;
      return next;
    });
  }, [imageCount]);

  const goToPrev = useCallback(() => {
    setCurrentIndex(prev => {
      const next = (prev - 1 + imageCount) % imageCount;
      lastIndexRef.current = next;
      return next;
    });
  }, [imageCount]);

  const goToIndex = useCallback((index: number) => {
    if (index >= 0 && index < imageCount) {
      setCurrentIndex(index);
      lastIndexRef.current = index;
    }
  }, [imageCount]);

  const startSliding = useCallback(() => {
    if (imageCount <= 1 || isTouchDevice) return;
    setIsHovered(true);
    clearResumeTimeout();
    clearSlideInterval();
    setCurrentIndex(lastIndexRef.current);
    intervalRef.current = setInterval(goToNext, AUTO_SLIDE_INTERVAL);
  }, [imageCount, isTouchDevice, goToNext, clearSlideInterval, clearResumeTimeout]);

  const stopSliding = useCallback(() => {
    if (isTouchDevice) return;
    setIsHovered(false);
    clearSlideInterval();
    clearResumeTimeout();
    resumeTimeoutRef.current = setTimeout(() => {
      if (!isTouchDevice && imageCount > 1) {
        setIsHovered(true);
        intervalRef.current = setInterval(goToNext, AUTO_SLIDE_INTERVAL);
      }
    }, AUTO_RESUME_DELAY);
  }, [isTouchDevice, imageCount, goToNext, clearSlideInterval, clearResumeTimeout]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (!isTouchDevice || imageCount <= 1 || !e.targetTouches?.[0]) return;
    touchEndRef.current = null;
    touchStartRef.current = e.targetTouches[0].clientX;
    clearSlideInterval();
    clearResumeTimeout();
  }, [isTouchDevice, imageCount, clearSlideInterval, clearResumeTimeout]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isTouchDevice || imageCount <= 1 || !e.targetTouches?.[0]) return;
    touchEndRef.current = e.targetTouches[0].clientX;
  }, [isTouchDevice, imageCount]);

  const handleTouchEnd = useCallback(() => {
    if (!isTouchDevice || imageCount <= 1) {
      touchStartRef.current = null;
      touchEndRef.current = null;
      return;
    }
    const start = touchStartRef.current;
    const end = touchEndRef.current;
    if (start === null || end === null) {
      touchStartRef.current = null;
      touchEndRef.current = null;
      return;
    }
    const distance = start - end;
    if (Math.abs(distance) > MIN_SWIPE_DISTANCE) {
      distance > 0 ? goToNext() : goToPrev();
    }
    touchStartRef.current = null;
    touchEndRef.current = null;
  }, [isTouchDevice, imageCount, goToNext, goToPrev]);

  const handleDotClick = useCallback((index: number) => {
    goToIndex(index);
    clearSlideInterval();
    clearResumeTimeout();
    if (isHovered && !isTouchDevice) {
      resumeTimeoutRef.current = setTimeout(() => {
        intervalRef.current = setInterval(goToNext, AUTO_SLIDE_INTERVAL);
      }, AUTO_RESUME_DELAY);
    }
  }, [goToIndex, clearSlideInterval, clearResumeTimeout, isHovered, isTouchDevice, goToNext]);

  useEffect(() => {
    return () => {
      clearSlideInterval();
      clearResumeTimeout();
    };
  }, [clearSlideInterval, clearResumeTimeout]);

  useEffect(() => {
    if (currentIndex >= imageCount) {
      const safeIndex = 0;
      setCurrentIndex(safeIndex);
      lastIndexRef.current = safeIndex;
    }
  }, [imageCount, currentIndex]);

  return {
    currentIndex,
    startSliding,
    stopSliding,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    handleDotClick,
  };
}

function ProductCard({ 
  product, 
  hideStockOverlay = false, 
  variant = 'default', 
  isHeroImage = false,
  enableBlurPreview = false,
  enableSkeleton = false,
  enableQuickView = false,
  enableQuickAdd = false,
  onQuickView,
  onQuickAdd,
}: ProductCardProps) {
  const { user } = useAuth();
  const { addToWishlist, removeFromWishlist, isInWishlist, loading } = useWishlist();
  const { openModal: openLoginModal } = useLoginModal();
  const pathname = usePathname();
  const isWishlisted = isInWishlist(product.id);
  const [isTouchDevice] = useState(() => typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0));
  const [imageLoaded, setImageLoaded] = useState(false);

  const availableImages = useProductImages(product);
  const hasMultipleImages = availableImages.length > 1;
  const { discountPercentage, hasDiscount } = useProductDiscount(product.price, product.original_price);
  const { currentIndex, startSliding, stopSliding, handleTouchStart, handleTouchMove, handleTouchEnd, handleDotClick } = useImageSwiper(availableImages.length, isTouchDevice);
  const badgeStyle = useMemo(() => BADGE_STYLES[product.badge?.toUpperCase() || ''] || 'bg-gray-500 text-white', [product.badge]);
  
  const { cardClasses, contentClasses, productUrl, imageProps } = useMemo(() => {
    const isImageOnly = variant === 'image-only';
    const isMinimal = variant === 'minimal';
    return {
      cardClasses: isImageOnly || isMinimal
        ? "group relative bg-white rounded-none shadow-none hover:shadow-none transition-shadow duration-300 overflow-hidden block border border-gray-200 h-full"
        : "group relative bg-white rounded-[4px] shadow-sm hover:shadow-md transition-shadow duration-300 overflow-hidden block border border-gray-200",
      contentClasses: isImageOnly ? "hidden" : isMinimal ? "px-1.5 py-0.5" : "p-1.5",
      productUrl: product.slug ? `/product/${product.slug}` : `/product/${product.id}`,
      imageProps: {
        width: variant === 'image-only' ? 800 : 400,
        height: variant === 'image-only' ? 600 : 480,
        sizes: variant === 'image-only' ? '100vw' : '(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw',
        responsiveSizes: variant === 'image-only' ? [640, 1024, 1920] : [300, 400, 500],
      },
    };
  }, [variant, product.slug, product.id]);

  const wishlistProduct = useMemo((): Product => {
    const categoryName = typeof product.category === 'string' ? product.category : product.category?.name || 'Unknown';
    return {
      id: product.id,
      name: product.name,
      description: '',
      price: product.price,
      originalPrice: product.price,
      images: [product.image_url],
      category: {
        id: categoryName.toLowerCase(),
        name: categoryName,
        slug: categoryName.toLowerCase(),
        description: '',
        image: '',
        subcategories: []
      },
      subcategories: product.subcategories || [],
      brand: '',
      sizes: [],
      colors: [],
      inStock: product.is_active && product.stock_quantity > 0,
      rating: 0,
      reviewCount: 0,
      tags: [],
      createdAt: new Date(product.created_at),
      updatedAt: new Date(product.updated_at)
    };
  }, [product]);

  const { formattedPrice, formattedOriginalPrice } = useMemo(() => {
    const format = (p: number) => (typeof p === 'number' && !isNaN(p) && p >= 0 ? p.toFixed(2) : '0.00');
    return {
      formattedPrice: format(product.price),
      formattedOriginalPrice: product.original_price ? format(product.original_price) : null,
    };
  }, [product.price, product.original_price]);

  const handleWishlistToggle = useCallback(async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (loading) return;
    
    if (!user) {
      try {
        const pendingWishlist = localStorage.getItem('pending-wishlist-add');
        const pendingItems = pendingWishlist ? JSON.parse(pendingWishlist) : [];
        if (!pendingItems.find((item: Product) => item.id === product.id)) {
          pendingItems.push(wishlistProduct);
          localStorage.setItem('pending-wishlist-add', JSON.stringify(pendingItems));
        }
      } catch {}
      openLoginModal();
      return;
    }
    
    if (isWishlisted) {
      await removeFromWishlist(product.id);
    } else {
      await addToWishlist(wishlistProduct);
    }
  }, [isWishlisted, loading, product.id, user, addToWishlist, removeFromWishlist, wishlistProduct, openLoginModal]);

  const handleProductClick = useCallback(() => {
    if (pathname) {
      try {
        sessionStorage.setItem('productReferrer', pathname);
      } catch {}
    }
  }, [pathname]);

  const handleQuickView = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onQuickView?.(product);
  }, [product, onQuickView]);

  const handleQuickAdd = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onQuickAdd?.(product);
  }, [product, onQuickAdd]);

  const getImageLoading = useCallback((index: number) => {
    if (isHeroImage && index === 0) return 'eager' as const;
    if (hasMultipleImages) return 'eager' as const;
    return index === 0 ? 'eager' as const : 'lazy' as const;
  }, [isHeroImage, hasMultipleImages]);

  const getImagePriority = useCallback((index: number) => {
    if (isHeroImage && index === 0) return 'high' as const;
    return index === 0 ? 'high' as const : (index <= 2 ? 'high' as const : 'low' as const);
  }, [isHeroImage]);

  const dotClickHandlers = useMemo(() => 
    availableImages.map((_, index) => () => handleDotClick(index)),
    [availableImages.length, handleDotClick]
  );

  return (
    <Link href={productUrl} className={`${cardClasses} relative z-0`} onClick={handleProductClick}>
      {product.badge && variant !== 'image-only' && (
        <div className="absolute top-0 left-0 z-20 m-0">
          <span className={`px-3 py-2 text-[10px] sm:text-xs font-medium ${badgeStyle}`}>
            {product.badge}
          </span>
        </div>
      )}

      {enableSkeleton && !imageLoaded && (
        <div className="absolute inset-0 bg-gray-200 animate-pulse z-10" />
      )}

      <div 
        className={`${variant === 'image-only' ? "h-full w-full overflow-hidden relative" : "aspect-[5/6] sm:aspect-[4/5] overflow-hidden relative"} group`}
        style={{ 
          touchAction: isTouchDevice ? 'pan-x pan-y' : 'auto',
          willChange: hasMultipleImages ? 'transform' : 'auto',
          transform: 'translate3d(0, 0, 0)',
        }}
        onMouseEnter={hasMultipleImages && !isTouchDevice ? startSliding : undefined}
        onMouseLeave={hasMultipleImages && !isTouchDevice ? stopSliding : undefined}
        onTouchStart={isTouchDevice ? handleTouchStart : undefined}
        onTouchMove={isTouchDevice ? handleTouchMove : undefined}
        onTouchEnd={isTouchDevice ? handleTouchEnd : undefined}
      >
        <div className="relative w-full h-full" style={{ transform: 'translate3d(0, 0, 0)' }}>
          {availableImages.map((imageUrl, index) => {
            const isActive = currentIndex === index;
            return (
              <ImageWithFallback
                key={`${product.id}-img-${index}`}
                src={imageUrl || PLACEHOLDER_IMAGE}
                alt={`${product.name || 'Product'} ${index + 1}`}
                className="h-full w-full object-cover absolute inset-0 transition-opacity duration-500"
                style={{ 
                  opacity: isActive ? 1 : 0,
                  zIndex: isActive ? 5 : 0,
                  pointerEvents: isActive ? 'auto' : 'none',
                  willChange: 'opacity',
                  transform: 'translate3d(0, 0, 0)',
                }}
                loading={getImageLoading(index)}
                decoding="async"
                width={imageProps.width}
                height={imageProps.height}
                fetchPriority={getImagePriority(index)}
                sizes={imageProps.sizes}
                fallbackType="product"
                responsive={true}
                responsiveSizes={imageProps.responsiveSizes}
                quality={85}
                onLoad={() => index === 0 && setImageLoaded(true)}
              />
            );
          })}
        </div>
        
        {hasMultipleImages && (
          <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex gap-1.5 z-30">
            {availableImages.map((_, index) => (
              <button
                key={index}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  dotClickHandlers[index]();
                }}
                className={`transition-all duration-200 rounded-full cursor-pointer ${
                  currentIndex === index
                    ? 'w-2 h-2 bg-white shadow-md'
                    : 'w-1.5 h-1.5 bg-white/60 hover:bg-white/80'
                }`}
                aria-label={`Go to image ${index + 1} of ${availableImages.length}`}
                type="button"
              />
            ))}
          </div>
        )}
        
        {!product.is_active && !hideStockOverlay && (
          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-40">
            <span className="text-white font-medium">Out of Stock</span>
          </div>
        )}

        {enableQuickView && (
          <button
            onClick={handleQuickView}
            className="absolute top-2 right-2 z-30 px-3 py-1.5 bg-white/90 hover:bg-white rounded-md text-xs font-medium text-gray-700 opacity-0 group-hover:opacity-100 transition-opacity"
            type="button"
          >
            Quick View
          </button>
        )}

        {enableQuickAdd && product.is_active && (
          <button
            onClick={handleQuickAdd}
            className="absolute bottom-2 right-2 z-30 px-3 py-1.5 bg-brand-600 hover:bg-brand-700 text-white rounded-md text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity"
            type="button"
          >
            Quick Add
          </button>
        )}
      </div>

      <div className={contentClasses}>
        <div className="flex items-center justify-between gap-2 mb-1 sm:mb-1.5">
          <h3 className="font-medium sm:font-normal text-gray-900 line-clamp-1 group-hover:text-brand transition-colors text-xs sm:text-sm flex-1" style={{ textShadow: '0.5px 0.5px 1px rgba(0,0,0,0.1)' }}>
            {product.name || 'Unnamed Product'}
          </h3>
          {variant !== 'image-only' && (
            <button
              onClick={handleWishlistToggle}
              disabled={loading}
              className="p-0 rounded-full transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
              aria-label={user ? (isWishlisted ? 'Remove from wishlist' : 'Add to wishlist') : 'Sign in to add to wishlist'}
            >
              <svg 
                className={`w-5 h-5 sm:w-6 sm:h-6 transition-colors duration-200 ${
                  isWishlisted 
                    ? 'text-red-500 fill-current' 
                    : 'text-gray-400 hover:text-red-500'
                }`} 
                fill={isWishlisted ? 'currentColor' : 'none'} 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" 
                />
              </svg>
            </button>
          )}
        </div>
        
        <div className="flex items-center space-x-1">
          <span className="text-xs sm:text-sm font-normal text-gray-900" style={{ textShadow: '0.5px 0.5px 1px rgba(0,0,0,0.1)' }}>
            ₹{formattedPrice}
          </span>
          {hasDiscount && formattedOriginalPrice && (
            <>
              <span className="text-xs sm:text-sm text-gray-500 line-through">
                ₹{formattedOriginalPrice}
              </span>
              <span className="text-xs sm:text-sm text-red-500 font-normal">
                {discountPercentage}% off
              </span>
            </>
          )}
        </div>
      </div>
    </Link>
  );
}

export default memo(ProductCard, (prevProps, nextProps) => {
  if (prevProps.product === nextProps.product && 
      prevProps.hideStockOverlay === nextProps.hideStockOverlay &&
      prevProps.variant === nextProps.variant &&
      prevProps.isHeroImage === nextProps.isHeroImage &&
      prevProps.enableBlurPreview === nextProps.enableBlurPreview &&
      prevProps.enableSkeleton === nextProps.enableSkeleton &&
      prevProps.enableQuickView === nextProps.enableQuickView &&
      prevProps.enableQuickAdd === nextProps.enableQuickAdd) {
    return true;
  }
  
  const prev = prevProps.product;
  const next = nextProps.product;
  
  return (
    prev.id === next.id &&
    prev.price === next.price &&
    prev.original_price === next.original_price &&
    prev.is_active === next.is_active &&
    prev.image_url === next.image_url &&
    prev.badge === next.badge &&
    prev.name === next.name &&
    prev.slug === next.slug &&
    prevProps.hideStockOverlay === nextProps.hideStockOverlay &&
    prevProps.variant === nextProps.variant &&
    prevProps.isHeroImage === nextProps.isHeroImage &&
    (prev.images === next.images || JSON.stringify(prev.images) === JSON.stringify(next.images))
  );
});
