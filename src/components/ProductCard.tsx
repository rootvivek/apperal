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
  images?: (string | {
    id: string;
    image_url: string;
    alt_text?: string;
    display_order: number;
  })[];
}

interface ProductCardProps {
  product: ProductCardProduct;
  hideStockOverlay?: boolean;
  variant?: 'default' | 'minimal' | 'image-only';
  isHeroImage?: boolean;
}

// Constants
const AUTO_SLIDE_INTERVAL = 2000;
const MIN_SWIPE_DISTANCE = 30;
const PLACEHOLDER_IMAGE = '/placeholder-product.jpg';

function ProductCard({ product, hideStockOverlay = false, variant = 'default', isHeroImage = false }: ProductCardProps) {
  const { user } = useAuth();
  const { addToWishlist, removeFromWishlist, isInWishlist, loading } = useWishlist();
  const { openModal: openLoginModal } = useLoginModal();
  const pathname = usePathname();
  const isWishlisted = isInWishlist(product.id);
  
  // Image swiper state
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Touch/swipe refs
  const touchStartRef = useRef<number | null>(null);
  const touchEndRef = useRef<number | null>(null);

  // Check if device is touch-enabled (mobile/tablet)
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  
  useEffect(() => {
    // Check if device supports touch
    const checkTouchDevice = () => {
      return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    };
    setIsTouchDevice(checkTouchDevice());
  }, []);

  // Helper: Clear interval safely
  const clearSlideInterval = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  // Helper: Navigate to next image
  const goToNextImage = useCallback((imageCount: number) => {
    setCurrentImageIndex(prev => (prev + 1) % imageCount);
  }, []);

  // Helper: Navigate to previous image
  const goToPrevImage = useCallback((imageCount: number) => {
    setCurrentImageIndex(prev => (prev - 1 + imageCount) % imageCount);
  }, []);

  // Helper: Navigate to specific image
  const goToImage = useCallback((index: number, imageCount: number) => {
    if (index >= 0 && index < imageCount) {
      setCurrentImageIndex(index);
    }
  }, []);

  // Convert product for wishlist
  const convertToWishlistProduct = useCallback((productCardProduct: ProductCardProduct): Product => {
    const categoryName = typeof productCardProduct.category === 'string' 
      ? productCardProduct.category 
      : productCardProduct.category?.name || 'Unknown';
    
    return {
      id: productCardProduct.id,
      name: productCardProduct.name,
      description: '',
      price: productCardProduct.price,
      originalPrice: productCardProduct.price,
      images: [productCardProduct.image_url],
      category: {
        id: categoryName.toLowerCase(),
        name: categoryName,
        slug: categoryName.toLowerCase(),
        description: '',
        image: '',
        subcategories: []
      },
      subcategories: productCardProduct.subcategories || [],
      brand: '',
      sizes: [],
      colors: [],
      inStock: productCardProduct.is_active && productCardProduct.stock_quantity > 0,
      rating: 0,
      reviewCount: 0,
      tags: [],
      createdAt: new Date(productCardProduct.created_at),
      updatedAt: new Date(productCardProduct.updated_at)
    };
  }, []);

  // Wishlist toggle handler
  const handleWishlistToggle = useCallback(async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (loading) return;
    
    if (!user) {
      try {
        const pendingProduct = convertToWishlistProduct(product);
        const pendingWishlist = localStorage.getItem('pending-wishlist-add');
        const pendingItems = pendingWishlist ? JSON.parse(pendingWishlist) : [];
        
        if (!pendingItems.find((item: Product) => item.id === product.id)) {
          pendingItems.push(pendingProduct);
          localStorage.setItem('pending-wishlist-add', JSON.stringify(pendingItems));
        }
      } catch (error) {
        console.error('Error saving pending wishlist item:', error);
      }
      openLoginModal();
      return;
    }
    
    if (isWishlisted) {
      await removeFromWishlist(product.id);
    } else {
      await addToWishlist(convertToWishlistProduct(product));
    }
  }, [isWishlisted, loading, product, user, addToWishlist, removeFromWishlist, convertToWishlistProduct, openLoginModal]);

  // Calculate discount
  const discountPercentage = useMemo(() => {
    if (!product.original_price || product.original_price <= product.price) return 0;
    const discount = ((product.original_price - product.price) / product.original_price) * 100;
    return Math.round(discount);
  }, [product.original_price, product.price]);

  const hasDiscount = discountPercentage > 0;

  // Get all available images with deduplication
  const availableImages = useMemo(() => {
    const images: string[] = [];
    const seenUrls = new Set<string>();
    
    // Add main image
    if (product.image_url && typeof product.image_url === 'string') {
      const mainImageUrl = product.image_url.trim();
      if (mainImageUrl && (mainImageUrl.startsWith('http') || mainImageUrl.startsWith('https') || mainImageUrl.startsWith('/'))) {
        images.push(mainImageUrl);
        seenUrls.add(mainImageUrl);
      }
    }
    
    // Add additional images
    if (product.images && Array.isArray(product.images)) {
      product.images.forEach((image) => {
        let imageUrl: string | null = null;
        
        if (typeof image === 'string' && image.trim()) {
          imageUrl = image.trim();
        } else if (typeof image === 'object' && image !== null && 'image_url' in image && typeof image.image_url === 'string') {
          imageUrl = image.image_url.trim();
        }
        
        if (imageUrl && 
            !seenUrls.has(imageUrl) &&
            (imageUrl.startsWith('http') || imageUrl.startsWith('https') || imageUrl.startsWith('/'))) {
          images.push(imageUrl);
          seenUrls.add(imageUrl);
        }
      });
    }
    
    return images.length > 0 ? images : (product.image_url ? [product.image_url] : [PLACEHOLDER_IMAGE]);
  }, [product.image_url, product.images]);

  const hasMultipleImages = availableImages.length > 1;

  // Auto-slide handlers
  const startImageSliding = useCallback(() => {
    if (!hasMultipleImages) return;
    
    setIsHovered(true);
    setCurrentImageIndex(0);
    clearSlideInterval();
    
    intervalRef.current = setInterval(() => {
      goToNextImage(availableImages.length);
    }, AUTO_SLIDE_INTERVAL);
  }, [hasMultipleImages, availableImages.length, clearSlideInterval, goToNextImage]);

  const stopImageSliding = useCallback(() => {
    setIsHovered(false);
    clearSlideInterval();
    setCurrentImageIndex(0);
  }, [clearSlideInterval]);

  // Touch handlers (only enabled on touch devices)
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (!isTouchDevice || !hasMultipleImages || !e.targetTouches?.[0]) return;
    
    touchEndRef.current = null;
    touchStartRef.current = e.targetTouches[0].clientX;
    clearSlideInterval();
  }, [isTouchDevice, hasMultipleImages, clearSlideInterval]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isTouchDevice || !hasMultipleImages || !e.targetTouches?.[0]) return;
    touchEndRef.current = e.targetTouches[0].clientX;
  }, [isTouchDevice, hasMultipleImages]);

  const handleTouchEnd = useCallback(() => {
    if (!isTouchDevice || !hasMultipleImages) {
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
      if (distance > 0) {
        goToNextImage(availableImages.length);
      } else {
        goToPrevImage(availableImages.length);
      }
    }
    
    touchStartRef.current = null;
    touchEndRef.current = null;
  }, [isTouchDevice, hasMultipleImages, availableImages.length, goToNextImage, goToPrevImage]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearSlideInterval();
    };
  }, [clearSlideInterval]);

  // Reset image index when images change
  useEffect(() => {
    if (currentImageIndex >= availableImages.length) {
      setCurrentImageIndex(0);
    }
  }, [availableImages.length, currentImageIndex]);

  // Badge styling
  const badgeStyle = useMemo(() => {
    const badge = product.badge?.toUpperCase();
    const styles: Record<string, string> = {
      'NEW': 'bg-green-500 text-white',
      'SALE': 'bg-red-500 text-white',
      'HOT': 'bg-brand-400 text-white',
      'FEATURED': 'bg-brand-400 text-white',
      'LIMITED': 'bg-purple-500 text-white',
    };
    return styles[badge || ''] || 'bg-gray-500 text-white';
  }, [product.badge]);

  // Styling based on variant
  const { cardClasses, imageClasses, contentClasses, productUrl } = useMemo(() => {
    const isImageOnly = variant === 'image-only';
    const isMinimal = variant === 'minimal';
    
    const card = isImageOnly || isMinimal
      ? "group relative bg-white rounded-none shadow-none hover:shadow-none transition-shadow duration-300 overflow-hidden block border border-gray-200 h-full"
      : "group relative bg-white rounded-[4px] shadow-sm hover:shadow-md transition-shadow duration-300 overflow-hidden block border border-gray-200";
    
    const image = "h-full w-full object-cover transition-transform duration-300";
    
    const content = isImageOnly
      ? "hidden"
      : isMinimal
      ? "px-1.5 py-0.5"
      : "p-1.5";

    const url = product.slug ? `/product/${product.slug}` : `/product/${product.id}`;

    return { cardClasses: card, imageClasses: image, contentClasses: content, productUrl: url };
  }, [variant, product.slug, product.id]);
  
  const handleProductClick = useCallback(() => {
    if (typeof window !== 'undefined' && pathname) {
      try {
        sessionStorage.setItem('productReferrer', pathname);
      } catch (error) {
        // Handle storage quota or other errors
        console.warn('Failed to save product referrer:', error);
      }
    }
  }, [pathname]);

  // Format price safely
  const formatPrice = useCallback((price: number) => {
    if (typeof price !== 'number' || isNaN(price) || price < 0) return '0.00';
    return price.toFixed(2);
  }, []);

  // Image loading priority
  const getImageLoading = useCallback((index: number) => {
    return hasMultipleImages ? 'eager' : (index === 0 ? 'eager' : 'lazy');
  }, [hasMultipleImages]);

  const getImagePriority = useCallback((index: number) => {
    return index === 0 ? 'high' : (index <= 2 ? 'high' : 'low');
  }, []);

  return (
    <Link href={productUrl} className={`${cardClasses} relative z-0`} onClick={handleProductClick}>
      {/* Product Badge */}
      {product.badge && variant !== 'image-only' && (
        <div className="absolute top-0 left-0 z-20 m-0">
          <span className={`px-3 py-2 text-[10px] sm:text-xs font-medium ${badgeStyle}`}>
            {product.badge}
          </span>
        </div>
      )}

      {/* Product Image */}
      <div 
        className={`${variant === 'image-only' ? "h-full w-full overflow-hidden relative" : "aspect-[5/6] sm:aspect-[4/5] overflow-hidden relative"} group`}
        style={{ touchAction: isTouchDevice ? 'pan-x pan-y' : 'auto' }}
        onMouseEnter={startImageSliding}
        onMouseLeave={stopImageSliding}
        onTouchStart={isTouchDevice ? handleTouchStart : undefined}
        onTouchMove={isTouchDevice ? handleTouchMove : undefined}
        onTouchEnd={isTouchDevice ? handleTouchEnd : undefined}
      >
        <div className="relative w-full h-full">
          {availableImages.map((imageUrl, index) => {
            const isActive = currentImageIndex === index;
            return (
              <ImageWithFallback
                key={`product-image-${product.id}-${index}-${imageUrl}`}
                src={imageUrl || PLACEHOLDER_IMAGE}
                alt={`${product.name || 'Product'} ${index + 1}`}
                className={`${imageClasses} absolute inset-0 transition-opacity duration-500 ${
                  isActive ? 'opacity-100 z-[5]' : 'opacity-0 z-0 pointer-events-none'
                }`}
                loading={getImageLoading(index)}
                decoding="async"
                width={variant === 'image-only' ? 800 : 400}
                height={variant === 'image-only' ? 600 : 480}
                fetchPriority={getImagePriority(index)}
                sizes={variant === 'image-only' ? '100vw' : '(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw'}
                fallbackType="product"
                responsive={true}
                responsiveSizes={variant === 'image-only' ? [640, 1024, 1920] : [300, 400, 500]}
                quality={85}
              />
            );
          })}
        </div>
        
        {/* Image dots indicator */}
        {hasMultipleImages && (
          <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex gap-1.5 z-30">
            {availableImages.map((_, index) => (
              <button
                key={index}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  goToImage(index, availableImages.length);
                  clearSlideInterval();
                  if (isHovered) {
                    intervalRef.current = setInterval(() => {
                      goToNextImage(availableImages.length);
                    }, AUTO_SLIDE_INTERVAL);
                  }
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
                aria-label={`Go to image ${index + 1} of ${availableImages.length}`}
                type="button"
              />
            ))}
          </div>
        )}
        
        {/* Out of Stock Overlay */}
        {!product.is_active && !hideStockOverlay && (
          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-40">
            <span className="text-white font-medium">Out of Stock</span>
          </div>
        )}
      </div>

      {/* Product Info */}
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
            ₹{formatPrice(product.price)}
          </span>
          {hasDiscount && product.original_price && (
            <>
              <span className="text-xs sm:text-sm text-gray-500 line-through">
                ₹{formatPrice(product.original_price)}
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

// Memoize component
export default memo(ProductCard, (prevProps, nextProps) => {
  return (
    prevProps.product.id === nextProps.product.id &&
    prevProps.product.price === nextProps.product.price &&
    prevProps.product.stock_quantity === nextProps.product.stock_quantity &&
    prevProps.product.is_active === nextProps.product.is_active &&
    prevProps.product.image_url === nextProps.product.image_url &&
    prevProps.hideStockOverlay === nextProps.hideStockOverlay &&
    prevProps.variant === nextProps.variant
  );
});
