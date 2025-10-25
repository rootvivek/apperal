'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useWishlist } from '@/contexts/WishlistContext';
import { Product } from '@/types/product';

interface ProductCardProduct {
  id: string;
  name: string;
  description: string;
  price: number;
  original_price?: number; // Original price before discount
  category_id?: string;
  category_name?: string;
  category_slug?: string;
  subcategory?: string;
  image_url: string;
  stock_quantity: number;
  is_active?: boolean;
  is_new?: boolean; // Flag for "Newly Added" badge
  created_at: string;
  updated_at: string;
  images?: {
    id: string;
    image_url: string;
    alt_text?: string;
    display_order: number;
  }[];
}

interface ProductCardProps {
  product: ProductCardProduct;
  showCategoryAndStock?: boolean;
  hideStockOverlay?: boolean; // New prop to hide the stock overlay
  hideDescription?: boolean; // New prop to hide description
  hideCategoryAndStock?: boolean; // New prop to hide category and stock info
}

export default function ProductCard({ 
  product, 
  showCategoryAndStock = true, 
  hideStockOverlay = false,
  hideDescription = false,
  hideCategoryAndStock = false
}: ProductCardProps) {
  const { addToWishlist, removeFromWishlist, isInWishlist, loading } = useWishlist();
  const isWishlisted = isInWishlist(product.id);
  const [isHovered, setIsHovered] = useState(false);

  // Calculate discount percentage
  const calculateDiscountPercentage = () => {
    if (product.original_price && product.original_price > product.price) {
      return Math.round(((product.original_price - product.price) / product.original_price) * 100);
    }
    return 0;
  };

  const discountPercentage = calculateDiscountPercentage();


  // Convert ProductCardProduct to Product type for wishlist
  const convertToWishlistProduct = (productCardProduct: ProductCardProduct): Product => {
    return {
      id: productCardProduct.id,
      name: productCardProduct.name,
      description: productCardProduct.description,
      price: productCardProduct.price,
      originalPrice: productCardProduct.original_price || productCardProduct.price,
      images: [productCardProduct.image_url],
      category: {
        id: productCardProduct.category_id || 'unknown',
        name: productCardProduct.category_name || 'Unknown',
        slug: productCardProduct.category_slug || 'unknown',
        description: '',
        image: '',
        subcategories: []
      },
      subcategory: productCardProduct.subcategory || '',
      brand: '',
      sizes: [],
      colors: [],
      inStock: (productCardProduct.is_active !== false) && productCardProduct.stock_quantity > 0,
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

  return (
    <Link 
      href={`/product/${product.id}`} 
      className="group relative bg-white rounded-md border border-gray-200 shadow-xs hover:shadow-sm transition-all duration-300 overflow-hidden block transform hover:-translate-y-1"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Newly Added Badge - Top Left */}
      {product.is_new && (
        <div className="absolute top-2 left-2 z-10 bg-green-500 text-white text-xs font-bold px-2 py-1 rounded-sm">
          NEW
        </div>
      )}
      {/* Wishlist Button */}
      <button
        onClick={handleWishlistToggle}
        disabled={loading}
        className="absolute top-2 right-2 z-10 p-1 bg-white bg-opacity-95 rounded-full shadow-xs hover:bg-opacity-100 hover:shadow-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed backdrop-blur-sm"
        aria-label={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
      >
        <svg 
          className={`transition-colors duration-200 ${
            isWishlisted 
              ? 'text-red-500 fill-current' 
              : 'text-gray-400 hover:text-red-500'
          }`} 
          fill={isWishlisted ? 'currentColor' : 'none'} 
          stroke="currentColor" 
          viewBox="0 0 24 24"
          width="16"
          height="16"
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
      <div className="aspect-[4/5] overflow-hidden relative group bg-gray-50">
        {(() => {
          // Get the first available image (no cycling)
          let imageUrl = '/placeholder-product.jpg';
          
          // First try to get image from images array
          if (product.images && product.images.length > 0) {
            const firstImage = product.images[0];
            if (typeof firstImage === 'string') {
              imageUrl = firstImage;
            } else if (firstImage && firstImage.image_url) {
              imageUrl = firstImage.image_url;
            }
          } 
          // Fallback to direct image_url
          else if (product.image_url) {
            imageUrl = product.image_url;
          }

          console.log(`ProductCard - Image URL for ${product.name}:`, imageUrl);

          return (
            <img
              src={imageUrl}
              alt={product.name}
              className="h-full w-full object-cover group-hover:scale-110 transition-transform duration-500 ease-out"
              onError={(e) => {
                console.error('ProductCard - Image failed to load:', e.currentTarget.src, 'for product:', product.name);
                // Only set placeholder if it's not already the placeholder to prevent infinite loop
                if (e.currentTarget.src !== window.location.origin + '/placeholder-product.jpg') {
                  e.currentTarget.src = '/placeholder-product.jpg';
                }
              }}
              onLoad={() => console.log('ProductCard - Image loaded successfully:', product.name, 'from:', imageUrl)}
            />
          );
        })()}
        
        {(product.is_active === false || product.stock_quantity === 0) && !hideStockOverlay && (
          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
            <span className="text-white font-semibold">Out of Stock</span>
          </div>
        )}
      </div>

      {/* Product Info */}
      <div className="p-3">
        {showCategoryAndStock && !hideCategoryAndStock && (
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-gray-600 font-normal">
              {product.category_name || 'Unknown'}
            </span>
            <span className="text-xs text-gray-500 font-normal">Stock: {product.stock_quantity}</span>
          </div>
        )}
        
        <h3 className="font-medium text-gray-900 mb-1 line-clamp-2 group-hover:text-blue-600 transition-colors text-sm leading-tight">
          {product.name}
        </h3>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {/* Current Price */}
            <span className="text-base font-semibold text-gray-900">₹{product.price.toFixed(2)}</span>
            
            {/* Original Price (if discounted) */}
            {product.original_price && product.original_price > product.price && (
              <>
                <span className="text-sm text-gray-500 line-through">₹{product.original_price.toFixed(2)}</span>
                <span className="text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded font-medium">
                  {discountPercentage}% OFF
                </span>
              </>
            )}
          </div>
        </div>

        {/* Subcategory Badge */}
        {showCategoryAndStock && !hideCategoryAndStock && (
          <div className="mt-1">
            <span className="inline-block bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded-full font-normal">
              {product.subcategory}
            </span>
          </div>
        )}
      </div>
    </Link>
  );
}