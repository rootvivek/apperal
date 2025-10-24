'use client';

import Link from 'next/link';
import { useWishlist } from '@/contexts/WishlistContext';
import { Product } from '@/types/product';

interface ProductCardProduct {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string | { id: string; name: string; slug: string; description: string; image: string; subcategories: any[] };
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
  showCategoryAndStock?: boolean;
  hideStockOverlay?: boolean; // New prop to hide the stock overlay
}

export default function ProductCard({ product, showCategoryAndStock = true, hideStockOverlay = false }: ProductCardProps) {
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
      description: productCardProduct.description,
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

  return (
    <Link href={`/product/${product.id}`} className="group relative bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 overflow-hidden block">
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
      <div className="p-4">
        {showCategoryAndStock && (
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">
              {typeof product.category === 'string' ? product.category : product.category?.name || 'Unknown'}
            </span>
            <span className="text-sm text-gray-500">Stock: {product.stock_quantity}</span>
          </div>
        )}
        
        <h3 className="font-semibold text-gray-900 mb-3 line-clamp-2 group-hover:text-blue-600 transition-colors">
          {product.name}
        </h3>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-lg font-bold text-gray-900">₹{product.price.toFixed(2)}</span>
          </div>
        </div>

        {/* Subcategory Badge */}
        {showCategoryAndStock && (
          <div className="mt-2">
            <span className="inline-block bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded-full">
              {product.subcategory}
            </span>
          </div>
        )}
      </div>
    </Link>
  );
}