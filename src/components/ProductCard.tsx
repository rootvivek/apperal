'use client';

import Link from 'next/link';
import { useWishlist } from '@/contexts/WishlistContext';
import { Product } from '@/types/product';

interface ProductCardProduct {
  id: string;
  name: string;
  price: number; // Current selling price
  original_price?: number; // Original price before discount
  discount_percentage?: number; // Discount percentage
  badge?: string; // Product badge (NEW, SALE, HOT, etc.)
  category: string | { id: string; name: string; slug: string; image: string; subcategories: any[] };
  subcategory: string;
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
}

export default function ProductCard({ product, hideStockOverlay = false }: ProductCardProps) {
  const { addToWishlist, removeFromWishlist, isInWishlist, loading } = useWishlist();
  const isWishlisted = isInWishlist(product.id);

  // Convert ProductCardProduct to Product type for wishlist
  const convertToWishlistProduct = (productCardProduct: ProductCardProduct): Product => {
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
      subcategory: productCardProduct.subcategory,
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
  };

  const handleWishlistToggle = async (e: React.MouseEvent) => {
    e.preventDefault(); // Prevent navigation to product page
    e.stopPropagation();
    
    if (loading) return; // Prevent multiple clicks while loading
    
    if (isWishlisted) {
      await removeFromWishlist(product.id);
    } else {
      await addToWishlist(convertToWishlistProduct(product));
    }
  };

  // Calculate discount percentage if not provided
  const calculateDiscountPercentage = () => {
    if (product.discount_percentage) return product.discount_percentage;
    if (product.original_price && product.original_price > product.price) {
      return Math.round(((product.original_price - product.price) / product.original_price) * 100);
    }
    return 0;
  };

  const discountPercentage = calculateDiscountPercentage();
  const hasDiscount = discountPercentage > 0;

  // Badge styling
  const getBadgeStyle = (badge: string) => {
    switch (badge?.toUpperCase()) {
      case 'NEW':
        return 'bg-green-500 text-white';
      case 'SALE':
        return 'bg-red-500 text-white';
      case 'HOT':
        return 'bg-orange-500 text-white';
      case 'FEATURED':
        return 'bg-blue-500 text-white';
      case 'LIMITED':
        return 'bg-purple-500 text-white';
      default:
        return 'bg-gray-500 text-white';
    }
  };

  return (
    <Link href={`/product/${product.id}`} className="group relative bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow duration-300 overflow-hidden block border border-gray-100">
      {/* Product Badge */}
      {product.badge && (
        <div className={`absolute top-3 left-3 z-10 px-2 py-1 rounded-md text-xs font-semibold ${getBadgeStyle(product.badge)}`}>
          {product.badge}
        </div>
      )}

      {/* Discount Badge */}
      {hasDiscount && (
        <div className="absolute top-3 right-12 z-10 px-2 py-1 rounded-md text-xs font-semibold bg-red-500 text-white">
          -{discountPercentage}%
        </div>
      )}

      {/* Wishlist Button */}
      <button
        onClick={handleWishlistToggle}
        disabled={loading}
        className="absolute top-3 right-3 z-10 p-2 bg-white bg-opacity-90 rounded-full shadow-md hover:bg-opacity-100 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        aria-label={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
      >
        <svg 
          className={`w-5 h-5 transition-colors duration-200 ${
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

      {/* Product Image */}
      <div className="aspect-square overflow-hidden relative">
        <img
          src={(() => {
            // Handle both string array (from wishlist) and object array (from product detail)
            if (product.images && product.images.length > 0) {
              const firstImage = product.images[0];
              console.log('ProductCard - First image:', firstImage, 'Type:', typeof firstImage);
              // If it's a string (from wishlist), use it directly
              if (typeof firstImage === 'string') {
                console.log('ProductCard - Using string image:', firstImage);
                return firstImage;
              }
              // If it's an object (from product detail), use image_url
              if (typeof firstImage === 'object' && firstImage.image_url) {
                console.log('ProductCard - Using object image:', firstImage.image_url);
                return firstImage.image_url;
              }
            }
            // Fallback to product.image_url or placeholder
            const fallbackUrl = product.image_url || '/placeholder-product.jpg';
            console.log('ProductCard - Using fallback image:', fallbackUrl);
            return fallbackUrl;
          })()}
          alt={product.name}
          className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
          onError={(e) => {
            console.error('ProductCard - Image failed to load:', e.currentTarget.src);
            e.currentTarget.src = '/placeholder-product.jpg';
          }}
          onLoad={() => console.log('ProductCard - Image loaded successfully:', product.name)}
        />
        {!product.is_active && !hideStockOverlay && (
          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
            <span className="text-white font-semibold">Out of Stock</span>
          </div>
        )}
      </div>

      {/* Product Info */}
      <div className="p-3">
        <h3 className="font-medium text-gray-900 mb-2 line-clamp-2 group-hover:text-blue-600 transition-colors text-sm" style={{ textShadow: '0.5px 0.5px 1px rgba(0,0,0,0.1)' }}>
          {product.name}
        </h3>
        
        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            <div className="flex items-center space-x-2">
              <span className="text-base font-semibold text-gray-900" style={{ textShadow: '0.5px 0.5px 1px rgba(0,0,0,0.1)' }}>
                ₹{product.price.toFixed(2)}
              </span>
              {hasDiscount && product.original_price && (
                <span className="text-sm text-gray-500 line-through">
                  ₹{product.original_price.toFixed(2)}
                </span>
              )}
            </div>
            {hasDiscount && (
              <span className="text-xs text-green-600 font-medium">
                You save ₹{(product.original_price! - product.price).toFixed(2)}
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}