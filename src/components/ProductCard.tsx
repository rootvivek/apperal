'use client';

import Link from 'next/link';
import { useState, useEffect, useRef, memo, useMemo, useCallback } from 'react';
import { useWishlist } from '@/contexts/WishlistContext';
import { Product } from '@/types/product';

interface ProductCardProduct {
  id: string;
  slug?: string; // Product slug for friendly URLs
  name: string;
  description?: string; // Optional description field
  price: number; // Current selling price
  original_price?: number; // Original price before discount
  discount_percentage?: number; // Discount percentage
  badge?: string; // Product badge (NEW, SALE, HOT, etc.)
  category: string | { id: string; name: string; slug: string; image: string; subcategories: any[] };
  subcategories: string[]; // Changed from single subcategory to array
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
  hideStockOverlay?: boolean; // New prop to hide the stock overlay
  variant?: 'default' | 'minimal' | 'image-only'; // New prop to control styling variant
}

function ProductCard({ product, hideStockOverlay = false, variant = 'default' }: ProductCardProps) {
  const { addToWishlist, removeFromWishlist, isInWishlist, loading } = useWishlist();
  const isWishlisted = isInWishlist(product.id);
  
  // State for image sliding functionality
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // State for touch/swipe functionality
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [isTouching, setIsTouching] = useState(false);

  // Convert ProductCardProduct to Product type for wishlist - memoized
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

  const handleWishlistToggle = useCallback(async (e: React.MouseEvent) => {
    e.preventDefault(); // Prevent navigation to product page
    e.stopPropagation();
    
    if (loading) return; // Prevent multiple clicks while loading
    
    if (isWishlisted) {
      await removeFromWishlist(product.id);
    } else {
      await addToWishlist(convertToWishlistProduct(product));
    }
  }, [isWishlisted, loading, product, addToWishlist, removeFromWishlist, convertToWishlistProduct]);

  // Calculate discount percentage automatically - memoized
  const discountPercentage = useMemo(() => {
    if (product.original_price && product.original_price > product.price) {
      return Math.round(((product.original_price - product.price) / product.original_price) * 100);
    }
    return 0;
  }, [product.original_price, product.price]);

  const hasDiscount = discountPercentage > 0;

  // Get all available images for the product - memoized
  const availableImages = useMemo(() => {
    const images = [];
    
    // Add main image
    if (product.image_url) {
      images.push(product.image_url);
    }
    
    // Add additional images if they exist
    if (product.images && product.images.length > 0) {
      product.images.forEach((image, index) => {
        if (typeof image === 'string' && image !== product.image_url) {
          images.push(image);
        } else if (typeof image === 'object' && image.image_url && image.image_url !== product.image_url) {
          images.push(image.image_url);
        }
      });
    }
    
    return images;
  }, [product.image_url, product.images]);

  const hasMultipleImages = availableImages.length > 1;

  // Start image sliding when hovering - memoized
  const startImageSliding = useCallback(() => {
    if (!hasMultipleImages) return;
    
    setIsHovered(true);
    setCurrentImageIndex(0);
    
    intervalRef.current = setInterval(() => {
      setCurrentImageIndex(prevIndex => {
        return (prevIndex + 1) % availableImages.length;
      });
    }, 2000); // Change image every 2 seconds
  }, [availableImages.length]);

  // Stop image sliding when not hovering - memoized
  const stopImageSliding = useCallback(() => {
    setIsHovered(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setCurrentImageIndex(0); // Reset to first image
  }, []);

  // Touch event handlers for mobile swipe - memoized
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (!hasMultipleImages) return;
    
    setIsTouching(true);
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
    
    // Stop auto-sliding when user starts touching
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, [hasMultipleImages]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!hasMultipleImages) return;
    setTouchEnd(e.targetTouches[0].clientX);
  }, [hasMultipleImages]);

  const handleTouchEnd = useCallback(() => {
    if (!hasMultipleImages || !touchStart || !touchEnd) {
      setIsTouching(false);
      return;
    }
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;

    if (isLeftSwipe) {
      // Swipe left - next image
      setCurrentImageIndex(prevIndex => (prevIndex + 1) % availableImages.length);
    } else if (isRightSwipe) {
      // Swipe right - previous image
      setCurrentImageIndex(prevIndex => prevIndex === 0 ? availableImages.length - 1 : prevIndex - 1);
    }
    
    setIsTouching(false);
    setTouchStart(null);
    setTouchEnd(null);
  }, [hasMultipleImages, touchStart, touchEnd, availableImages.length]);

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  // Badge styling - memoized
  const badgeStyle = useMemo(() => {
    const badge = product.badge;
    switch (badge?.toUpperCase()) {
      case 'NEW':
        return 'bg-green-500 text-white';
      case 'SALE':
        return 'bg-red-500 text-white';
      case 'HOT':
        return 'bg-brand-400 text-white';
      case 'FEATURED':
        return 'bg-brand-400 text-white';
      case 'LIMITED':
        return 'bg-purple-500 text-white';
      default:
        return 'bg-gray-500 text-white';
    }
  }, [product.badge]);

  // Conditional styling based on variant - memoized
  const { cardClasses, imageClasses, contentClasses, productUrl } = useMemo(() => {
    const card = variant === 'minimal' || variant === 'image-only'
      ? "group relative bg-white rounded-none shadow-none hover:shadow-none transition-shadow duration-300 overflow-hidden block border border-gray-200 h-full"
      : "group relative bg-white rounded-[4px] shadow-sm hover:shadow-md transition-shadow duration-300 overflow-hidden block border border-gray-200";
    
    const image = variant === 'minimal' || variant === 'image-only'
      ? "h-full w-full object-cover transition-transform duration-300"
      : "h-full w-full object-cover group-hover:scale-105 transition-transform duration-300";
      
    const content = variant === 'minimal'
      ? "px-2 py-1"
      : variant === 'image-only'
      ? "hidden"
      : "p-2";

    // Use slug if available, otherwise use ID for backward compatibility
    const url = product.slug ? `/product/${product.slug}` : `/product/${product.id}`;

    return {
      cardClasses: card,
      imageClasses: image,
      contentClasses: content,
      productUrl: url
    };
  }, [variant, product.slug, product.id]);
  
  return (
    <Link href={productUrl} className={`${cardClasses} relative z-0`}>
      {/* Product Badge */}
      {product.badge && variant !== 'image-only' && (
        <div className={`absolute top-2 left-2 z-10 px-1 py-0.5 rounded text-[10px] sm:text-xs font-medium ${badgeStyle}`}>
          {product.badge}
        </div>
      )}


      {/* Product Image */}
      <div 
        className={`${variant === 'image-only' ? "h-full w-full overflow-hidden relative" : "aspect-[5/6] sm:aspect-[4/5] overflow-hidden relative"} group`}
        onMouseEnter={startImageSliding}
        onMouseLeave={stopImageSliding}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <img
          src={availableImages[currentImageIndex] || '/placeholder-product.jpg'}
          alt={product.name}
          className={`${imageClasses} transition-all duration-500`}
          onError={(e) => {
            e.currentTarget.src = '/placeholder-product.jpg';
          }}
        />
        
        {/* Image indicators (dots) - only show if there are multiple images */}
        {hasMultipleImages && variant !== 'image-only' && (
          <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex space-x-1">
            {availableImages.map((_, index) => (
              <div
                key={index}
                className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
                  index === currentImageIndex 
                    ? 'bg-white shadow-md' 
                    : 'bg-white bg-opacity-50'
                }`}
              />
            ))}
          </div>
        )}
        
        {/* Multiple images indicator - subtle hint - only show if no product badge */}
        {hasMultipleImages && variant !== 'image-only' && !product.badge && (
          <div className="absolute top-2 left-2 bg-brand-400 text-white text-xs px-1.5 py-0.5 rounded-full opacity-80">
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
            </svg>
          </div>
        )}
        
        
        {!product.is_active && !hideStockOverlay && (
          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
            <span className="text-white font-medium">Out of Stock</span>
          </div>
        )}
      </div>

      {/* Product Info */}
      <div className={contentClasses}>
        <div className="flex items-start justify-between gap-2 mb-1 sm:mb-2">
          <h3 className="font-medium text-gray-900 line-clamp-2 group-hover:text-brand transition-colors text-sm sm:text-base flex-1" style={{ textShadow: '0.5px 0.5px 1px rgba(0,0,0,0.1)' }}>
            {product.name}
          </h3>
          {variant !== 'image-only' && (
            <button
              onClick={handleWishlistToggle}
              disabled={loading}
              className="p-0 rounded-full transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
              aria-label={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
            >
              <svg 
                className={`w-4 h-4 transition-colors duration-200 ${
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
          <span className="text-sm sm:text-base font-normal text-gray-900" style={{ textShadow: '0.5px 0.5px 1px rgba(0,0,0,0.1)' }}>
            ₹{product.price.toFixed(2)}
          </span>
          {hasDiscount && product.original_price && (
            <span className="text-xs sm:text-sm text-gray-500 line-through">
              ₹{product.original_price.toFixed(2)}
            </span>
          )}
          {hasDiscount && (
            <span className="text-xs text-red-500 font-normal">
              {discountPercentage}% off
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

// Memoize component to prevent unnecessary re-renders
export default memo(ProductCard, (prevProps, nextProps) => {
  // Custom comparison function for better performance
  return (
    prevProps.product.id === nextProps.product.id &&
    prevProps.product.price === nextProps.product.price &&
    prevProps.product.stock_quantity === nextProps.product.stock_quantity &&
    prevProps.product.is_active === nextProps.product.is_active &&
    prevProps.hideStockOverlay === nextProps.hideStockOverlay &&
    prevProps.variant === nextProps.variant
  );
});