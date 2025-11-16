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
  isHeroImage?: boolean; // Indicates if this is the first hero image (LCP element)
}

function ProductCard({ product, hideStockOverlay = false, variant = 'default', isHeroImage = false }: ProductCardProps) {
  const { user } = useAuth();
  const { addToWishlist, removeFromWishlist, isInWishlist, loading } = useWishlist();
  const { openModal: openLoginModal } = useLoginModal();
  const pathname = usePathname();
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
    
    // If user is not logged in, open login modal and save product to pending wishlist
    if (!user) {
      // Save product to pending wishlist in localStorage
      const pendingProduct = convertToWishlistProduct(product);
      try {
        const pendingWishlist = localStorage.getItem('pending-wishlist-add');
        const pendingItems = pendingWishlist ? JSON.parse(pendingWishlist) : [];
        // Check if product already in pending list
        if (!pendingItems.find((item: Product) => item.id === product.id)) {
          pendingItems.push(pendingProduct);
          localStorage.setItem('pending-wishlist-add', JSON.stringify(pendingItems));
        }
      } catch (error) {
        console.error('Error saving pending wishlist item:', error);
      }
      // Open login modal
      openLoginModal();
      return;
    }
    
    // For logged-in users, add/remove from database
    if (isWishlisted) {
      await removeFromWishlist(product.id);
    } else {
      await addToWishlist(convertToWishlistProduct(product));
    }
  }, [isWishlisted, loading, product, user, addToWishlist, removeFromWishlist, convertToWishlistProduct, openLoginModal]);

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
    const images: string[] = [];
    
    // Add main image first
    if (product.image_url && typeof product.image_url === 'string' && product.image_url.trim() !== '') {
      images.push(product.image_url);
    }
    
    // Add additional images if they exist
    if (product.images && Array.isArray(product.images) && product.images.length > 0) {
      product.images.forEach((image) => {
        let imageUrl: string | null = null;
        
        // Handle string images
        if (typeof image === 'string' && image.trim() !== '') {
          imageUrl = image;
        }
        // Handle object images with image_url property
        else if (typeof image === 'object' && image !== null && 'image_url' in image && typeof image.image_url === 'string') {
          imageUrl = image.image_url;
        }
        
        // Add if valid and not duplicate
        if (imageUrl && 
            imageUrl.trim() !== '' &&
            imageUrl !== product.image_url && 
            !images.includes(imageUrl) &&
            (imageUrl.startsWith('http') || imageUrl.startsWith('https') || imageUrl.startsWith('/'))) {
          images.push(imageUrl);
        }
      });
    }
    
    // Return images or main image as fallback
    return images.length > 0 ? images : (product.image_url ? [product.image_url] : []);
  }, [product.image_url, product.images]);

  // Only show image sliding if product has more than 1 valid image
  const hasMultipleImages = availableImages.length > 1;

  // Start image sliding when hovering - memoized
  // Only start if product actually has multiple images (more than 1)
  const startImageSliding = useCallback(() => {
    // Double check: only start if we have more than 1 image
    if (availableImages.length <= 1) return;
    
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
  // Only allow swipe if product has multiple images
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (availableImages.length <= 1) return;
    
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
    if (availableImages.length <= 1) return;
    setTouchEnd(e.targetTouches[0].clientX);
  }, [availableImages.length]);

  const handleTouchEnd = useCallback(() => {
    if (availableImages.length <= 1 || !touchStart || !touchEnd) {
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
  }, [availableImages.length, touchStart, touchEnd]);

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
      : "h-full w-full object-cover transition-transform duration-300";
      
    const content = variant === 'minimal'
      ? "px-1.5 py-0.5"
      : variant === 'image-only'
      ? "hidden"
      : "p-1.5";

    // Use slug if available, otherwise use ID for backward compatibility
    const url = product.slug ? `/product/${product.slug}` : `/product/${product.id}`;

    return {
      cardClasses: card,
      imageClasses: image,
      contentClasses: content,
      productUrl: url
    };
  }, [variant, product.slug, product.id]);
  
  const handleProductClick = useCallback(() => {
    // Store current pathname as referrer when navigating to product page
    if (typeof window !== 'undefined' && pathname) {
      sessionStorage.setItem('productReferrer', pathname);
    }
  }, [pathname]);
  
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
        style={{ touchAction: 'pan-x pan-y' }}
        onMouseEnter={startImageSliding}
        onMouseLeave={stopImageSliding}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <ImageWithFallback
          src={availableImages[currentImageIndex] || '/placeholder-product.jpg'}
          alt={product.name}
          className={`${imageClasses} transition-all duration-500`}
          loading={isHeroImage || variant === 'image-only' ? 'eager' : currentImageIndex === 0 ? 'eager' : 'lazy'}
          decoding="async"
          width={variant === 'image-only' ? 800 : 400}
          height={variant === 'image-only' ? 600 : 480}
          fetchPriority={isHeroImage ? 'high' : variant === 'image-only' || currentImageIndex === 0 ? 'high' : 'low'}
          sizes={variant === 'image-only' ? '100vw' : '(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw'}
          fallbackType="product"
          responsive={true}
          responsiveSizes={variant === 'image-only' ? [640, 1024, 1920] : [300, 400, 500]}
          quality={85}
        />
        
        {/* Image dots indicator - show when multiple images */}
        {hasMultipleImages && availableImages.length > 1 && (
          <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex gap-1.5 z-20">
            {availableImages.map((_, index) => (
              <button
                key={index}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setCurrentImageIndex(index);
                  // Reset auto-slide interval
                  if (intervalRef.current) {
                    clearInterval(intervalRef.current);
                  }
                  if (isHovered) {
                    intervalRef.current = setInterval(() => {
                      setCurrentImageIndex(prevIndex => (prevIndex + 1) % availableImages.length);
                    }, 2000);
                  }
                }}
                className={`transition-all duration-200 rounded-full ${
                  currentImageIndex === index
                    ? 'w-2 h-2 bg-white'
                    : 'w-1.5 h-1.5 bg-white/50 hover:bg-white/75'
                }`}
                aria-label={`Go to image ${index + 1}`}
              />
            ))}
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
        <div className="flex items-center justify-between gap-2 mb-1 sm:mb-1.5">
          <h3 className="font-medium sm:font-normal text-gray-900 line-clamp-1 group-hover:text-brand transition-colors text-xs sm:text-sm flex-1" style={{ textShadow: '0.5px 0.5px 1px rgba(0,0,0,0.1)' }}>
            {product.name}
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
            ₹{product.price.toFixed(2)}
          </span>
          {hasDiscount && product.original_price && (
            <span className="text-xs sm:text-sm text-gray-500 line-through">
              ₹{product.original_price.toFixed(2)}
            </span>
          )}
          {hasDiscount && (
            <span className="text-xs sm:text-sm text-red-500 font-normal">
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