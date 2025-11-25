'use client';

import Link from 'next/link';
import {
  useState,
  memo,
  useMemo,
  useCallback,
} from 'react';
import { usePathname } from 'next/navigation';
import { useWishlist } from '@/contexts/WishlistContext';
import { useAuth } from '@/contexts/AuthContext';
import { useLoginModal } from '@/contexts/LoginModalContext';
import { Product } from '@/types/product';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import ImageWithFallback from './ImageWithFallback';
import { useProductImages } from '@/hooks/product/useProductImages';
import { useProductDiscount } from '@/hooks/product/useProductDiscount';
import { useImageSwiper } from '@/hooks/product/useImageSwiper';
import { PLACEHOLDER_IMAGE } from '@/constants/productCard';
import { getBadgeStyle } from '@/utils/product/badgeStyles';
import { formatPrice } from '@/utils/product/formatPrice';
import { createWishlistProduct } from '@/utils/product/createWishlistProduct';

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
  const {
    currentIndex,
    startSliding,
    stopSliding,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    handleDotClick,
  } = useImageSwiper(availableImages.length, isTouchDevice);
  const badgeStyle = useMemo(() => getBadgeStyle(product.badge), [product.badge]);
  
  const { cardClasses, contentClasses, productUrl, imageProps } = useMemo(() => {
    const isImageOnly = variant === 'image-only';
    const isMinimal = variant === 'minimal';
    return {
      cardClasses: isImageOnly || isMinimal
        ? 'group relative bg-card rounded-[4px] shadow-none hover:shadow-none transition-shadow duration-300 overflow-hidden border border-gray-200 h-full'
        : 'group relative bg-card rounded-[4px] shadow-sm hover:shadow-md transition-shadow duration-300 overflow-hidden border border-gray-200',
      contentClasses: isImageOnly
        ? 'hidden'
        : isMinimal
        ? 'pt-0.5 pr-1 pb-1 pl-2'
        : 'pt-0.5 pr-1 pb-1 pl-2',
      productUrl: product.slug ? `/product/${product.slug}` : `/product/${product.id}`,
      imageProps: {
        width: variant === 'image-only' ? 800 : 400,
        height: variant === 'image-only' ? 600 : 480,
        sizes: variant === 'image-only' ? '100vw' : '(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw',
        responsiveSizes: variant === 'image-only' ? [640, 1024, 1920] : [300, 400, 500],
      },
    };
  }, [variant, product.slug, product.id]);

  const wishlistProduct = useMemo(() => createWishlistProduct(product), [product]);

  const { formattedPrice, formattedOriginalPrice } = useMemo(() => {
    return {
      formattedPrice: formatPrice(product.price),
      formattedOriginalPrice: product.original_price ? formatPrice(product.original_price) : null,
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
    <Link
      href={productUrl}
      className="relative z-0 block group"
      onClick={handleProductClick}
    >
      <Card className={cn(cardClasses, 'h-full')}>
        {product.badge && variant !== 'image-only' && (
          <div className="absolute top-0 left-0 z-20 m-0">
            <Badge
              className={cn(
                'px-3 py-2 text-[10px] sm:text-xs font-medium rounded-none border-0',
                badgeStyle,
              )}
            >
              {product.badge}
            </Badge>
          </div>
        )}

        {enableSkeleton && !imageLoaded && (
          <div className="absolute inset-0 bg-gray-200 animate-pulse z-10" />
        )}

        <div 
          className={cn(
            variant === 'image-only'
              ? 'h-full w-full overflow-hidden relative'
              : 'aspect-[5/6] sm:aspect-[4/5] overflow-hidden relative',
            'group',
          )}
        style={{ 
          touchAction: isTouchDevice ? 'pan-x pan-y' : 'auto',
          willChange: hasMultipleImages ? 'transform' : 'auto',
          transform: 'translate3d(0, 0, 0)',
        }}
          onMouseEnter={
            hasMultipleImages && !isTouchDevice ? startSliding : undefined
          }
          onMouseLeave={
            hasMultipleImages && !isTouchDevice ? stopSliding : undefined
          }
          onTouchStart={isTouchDevice ? handleTouchStart : undefined}
          onTouchMove={isTouchDevice ? handleTouchMove : undefined}
          onTouchEnd={isTouchDevice ? handleTouchEnd : undefined}
        >
          <div
            className="relative w-full h-full"
            style={{ transform: 'translate3d(0, 0, 0)' }}
          >
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
                  responsive
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
                  className={cn(
                    'transition-all duration-200 rounded-full cursor-pointer',
                    currentIndex === index
                      ? 'w-2 h-2 bg-white shadow-md'
                      : 'w-1.5 h-1.5 bg-white/60 hover:bg-white/80',
                  )}
                  aria-label={`Go to image ${index + 1} of ${availableImages.length}`}
                  type="button"
                />
              ))}
            </div>
          )}
          
          {!product.is_active && !hideStockOverlay && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-40">
              <span className="text-white font-medium">Out of Stock</span>
            </div>
          )}

          {enableQuickView && (
            <Button
              onClick={handleQuickView}
              type="button"
              variant="secondary"
              size="sm"
              className="absolute top-2 right-2 z-30 px-3 py-1.5 text-xs font-medium text-gray-700 opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 hover:bg-white"
            >
              Quick View
            </Button>
          )}

          {enableQuickAdd && product.is_active && (
            <Button
              onClick={handleQuickAdd}
              type="button"
              size="sm"
              className="absolute bottom-2 right-2 z-30 px-3 py-1.5 text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity bg-brand-600 hover:bg-brand-700 text-white"
            >
              Quick Add
            </Button>
          )}
        </div>

        <div className={contentClasses}>
          <div className="flex items-center justify-between gap-1 mb-0 sm:mb-0.5">
            <h3
              className="font-normal text-gray-900 line-clamp-1 group-hover:text-brand transition-colors text-[11px] sm:text-[11px] md:text-xs flex-1"
              style={{ textShadow: '0.5px 0.5px 1px rgba(0,0,0,0.1)' }}
            >
              {product.name || 'Unnamed Product'}
            </h3>
            {variant !== 'image-only' && (
              <Button
                onClick={handleWishlistToggle}
                disabled={loading}
                variant="ghost"
                size="icon"
                className="h-6 w-6 rounded-full transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0 p-0"
                aria-label={
                  user
                    ? isWishlisted
                      ? 'Remove from wishlist'
                      : 'Add to wishlist'
                    : 'Sign in to add to wishlist'
                }
              >
                <svg 
                  className={cn(
                    'w-4 h-4 sm:w-5 sm:h-5 transition-colors duration-200',
                    isWishlisted
                      ? 'text-red-500 fill-current'
                      : 'text-gray-400 hover:text-red-500',
                  )} 
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
              </Button>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            <span
              className="text-[10px] sm:text-xs font-medium text-gray-900"
              style={{ textShadow: '0.5px 0.5px 1px rgba(0,0,0,0.1)' }}
            >
              ₹{formattedPrice}
            </span>
            {hasDiscount && formattedOriginalPrice && (
              <>
                <span className="text-[10px] sm:text-xs text-gray-500 line-through">
                  ₹{formattedOriginalPrice}
                </span>
                <span className="text-[10px] sm:text-xs text-red-500 font-normal">
                  {discountPercentage}% off
                </span>
              </>
            )}
          </div>
        </div>
      </Card>
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
