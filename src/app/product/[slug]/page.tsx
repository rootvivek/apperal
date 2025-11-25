'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import EmptyState from '@/components/EmptyState';
import { PRODUCT_GRID_CLASSES_SMALL_GAP } from '@/utils/layoutUtils';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import { useWishlist } from '@/contexts/WishlistContext';
import { useLoginModal } from '@/contexts/LoginModalContext';
import ProductCard from '@/components/ProductCard';
import ProductReviews from '@/components/ProductReviews';
import { Spinner } from '@/components/ui/spinner';
import ProductMedia from './ProductMedia';
import ProductInfo from '@/components/ProductInfo';
import ProductDetails from './ProductDetails';
import ProductBottomActions from './ProductBottomActions';
import { useProductDetail } from '@/hooks/product/useProductDetail';
import { useRelatedProducts } from '@/hooks/product/useRelatedProducts';
import { getSelectedSize, getSelectedColor, clearProductSelections } from '@/utils/product/productSelections';

interface ProductCardProduct {
  id: string;
  name: string;
  slug?: string;
  description: string;
  price: number;
  original_price?: number | null;
  badge?: string | null;
  category: string | { id: string; name: string; slug: string; description: string; image: string; subcategories: any[] };
  category_id?: string | null;
  subcategory: string;
  subcategory_id?: string | null;
  subcategories: string[];
  image_url: string;
  stock_quantity: number;
  is_active: boolean;
  show_in_hero?: boolean;
  created_at: string;
  updated_at: string;
  // Additional product fields
  brand?: string | null;
  is_new?: boolean | null;
  rating?: number | null;
  review_count?: number | null;
  in_stock?: boolean | null;
  images?: {
    id: string;
    image_url: string;
    alt_text?: string;
    display_order: number;
  }[];
  // Product detail fields (category-specific only, common fields are in products table)
  product_cover_details?: {
    brand: string; // Cover-specific brand field (different from common brand)
    compatible_model: string;
    type: string;
    color: string;
  };
  product_apparel_details?: {
    brand: string;
    material: string;
    fit_type: string;
    pattern: string;
    color: string;
    size: string;
    sku: string;
  };
  product_accessories_details?: {
    accessory_type: string;
    compatible_with: string;
    material: string;
    color: string;
  };
}

interface ProductDetailPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export default function ProductDetailPage({ params }: ProductDetailPageProps) {
  const [slug, setSlug] = useState<string>('');
  
  // Resolve params promise (Next.js 15+)
  useEffect(() => {
    const resolveParams = async () => {
      const resolved = await params;
      setSlug(resolved.slug);
    };
    resolveParams();
  }, [params]);
  
  // Use hooks for product data
  const { product: productData, loading, error, categorySlug, subcategorySlug } = useProductDetail(slug);
  const { relatedProducts, loading: relatedLoading, fetchRelatedProducts } = useRelatedProducts();
  
  const [product, setProduct] = useState<ProductCardProduct | null>(null);
  const { addToCart } = useCart();
  const { user } = useAuth();
  const { wishlist, addToWishlist, removeFromWishlist, isInWishlist, loading: wishlistLoading } = useWishlist();
  const { openModal: openLoginModal } = useLoginModal();

  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [selectedColor, setSelectedColor] = useState<string>('');
  const [isAddedToCart, setIsAddedToCart] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const previousSlugRef = useRef<string>('');
  const wishlistProductRef = useRef<any>(null);


  useEffect(() => {
    // Restore selected size and color from localStorage on mount/refresh (only in browser)
    if (typeof window !== 'undefined' && slug) {
      const savedSize = getSelectedSize(slug);
      const savedColor = getSelectedColor(slug);
      if (savedSize) {
        setSelectedSize(savedSize);
      }
      if (savedColor) {
        setSelectedColor(savedColor);
      }
      
      // Only reset selections when product slug actually changes (not on refresh)
      if (previousSlugRef.current !== slug) {
        // Reset all selections to empty when navigating to a new product
        setSelectedSize('');
        setSelectedColor('');
        // Clear localStorage for the previous product
        if (previousSlugRef.current) {
          clearProductSelections(previousSlugRef.current);
        }
        previousSlugRef.current = slug;
        // Then restore saved values for the new product if they exist
        const newSavedSize = getSelectedSize(slug);
        const newSavedColor = getSelectedColor(slug);
        if (newSavedSize) {
          setSelectedSize(newSavedSize);
        }
        if (newSavedColor) {
          setSelectedColor(newSavedColor);
        }
      }
    }
  }, [slug]);

  // Update product state when productData changes
  useEffect(() => {
    if (productData) {
      setProduct(productData as ProductCardProduct);
    } else {
      setProduct(null);
    }
  }, [productData]);

  // Fetch related products when product data is available
  useEffect(() => {
    if (productData && productData.id) {
      const categoryName = typeof productData.category === 'string' 
        ? productData.category 
        : productData.category?.name || '';
      const categoryId = typeof productData.category === 'object' 
        ? productData.category?.id || null
        : productData.category_id || null;
      const subcategoryId = productData.subcategory_id || null;
      
      // Only fetch if we have at least a categoryId or subcategoryId
      if (categoryId || subcategoryId) {
        fetchRelatedProducts(categoryName, categoryId, productData.id, subcategoryId);
      }
    }
  }, [productData?.id, productData?.category_id, productData?.subcategory_id, fetchRelatedProducts]);

  // Store category/subcategory slugs in sessionStorage for back button navigation
  useEffect(() => {
    if (categorySlug || subcategorySlug) {
      if (typeof window !== 'undefined') {
        if (categorySlug) {
          sessionStorage.setItem('productCategorySlug', categorySlug);
        }
        if (subcategorySlug) {
          sessionStorage.setItem('productSubcategorySlug', subcategorySlug);
        }
      }
    }
  }, [categorySlug, subcategorySlug]);

  // Create wishlist product helper - matches ProductCard pattern
  const createWishlistProduct = useCallback(() => {
    if (!product) return null;
    
    const availableImages = product.images && product.images.length > 0
      ? product.images.map(img => typeof img === 'string' ? img : img.image_url)
      : (product.image_url ? [product.image_url] : []);
    
    const categoryId = typeof product.category === 'string' ? product.category.toLowerCase() : product.category?.id || '';
    const categoryName = typeof product.category === 'string' ? product.category : product.category?.name || '';
    const categorySlug = typeof product.category === 'string' ? product.category.toLowerCase() : product.category?.slug || '';
    
    return {
      id: product.id,
      name: product.name,
      description: product.description || '',
      price: product.price,
      originalPrice: product.original_price || product.price,
      images: availableImages,
      category: { id: categoryId, name: categoryName, slug: categorySlug, description: '', image: '', subcategories: [] },
      subcategories: product.subcategories || [],
      brand: product.brand || '',
      sizes: [],
      colors: [],
      inStock: product.is_active && product.stock_quantity > 0,
      rating: product.rating || 0,
      reviewCount: product.review_count || 0,
      tags: [],
      createdAt: new Date(product.created_at),
      updatedAt: new Date(product.updated_at)
    };
  }, [product]);

  // Stabilize wishlist product reference
  useEffect(() => {
    if (product) {
      wishlistProductRef.current = createWishlistProduct();
    }
  }, [product, createWishlistProduct]);

  const handleAddToCart = () => {
    if (!product) return;
    
    // Validation is handled by the modal in ProductInfo/ProductBottomActions components
    // This function is only called if all selections are valid
    
    // Do not block the click handler on network I/O
    // Show brief feedback but don't disable the button
    setIsAddedToCart(true);
    setTimeout(() => setIsAddedToCart(false), 1500);
    void addToCart(product.id, quantity, selectedSize || null);
  };

  const handleBuyNow = () => {
    if (!product) return;
    
    // Validation is handled by the modal in ProductInfo/ProductBottomActions components
    // This function is only called if all selections are valid
    
    // Build checkout URL with parameters
    const params = new URLSearchParams({
      direct: 'true',
      productId: product.id,
      quantity: quantity.toString()
    });
    
    // Add size if it's an apparel product
    if (selectedSize) {
      params.append('size', selectedSize);
    }
    
    const checkoutUrl = `/checkout?${params.toString()}`;
    
    // Check if user is authenticated for checkout
    if (!user) {
      // Pass the checkout URL as redirect parameter
      openLoginModal(checkoutUrl);
      return;
    }
    
    // Redirect directly to checkout without adding to cart
    window.location.href = checkoutUrl;
  };

  const handleWishlistToggle = useCallback(async (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    if (!product) return;
    if (wishlistLoading) return;
    
    if (!user) {
      try {
        const pendingWishlist = localStorage.getItem('pending-wishlist-add');
        const pendingItems = pendingWishlist ? JSON.parse(pendingWishlist) : [];
        
        if (!pendingItems.find((item: any) => item.id === product.id)) {
          pendingItems.push(wishlistProductRef.current);
          localStorage.setItem('pending-wishlist-add', JSON.stringify(pendingItems));
        }
      } catch {
        // Error handled silently
      }
      openLoginModal();
      return;
    }
    
    const isWishlisted = isInWishlist(product.id);
    if (isWishlisted) {
      await removeFromWishlist(product.id);
    } else {
      if (wishlistProductRef.current) {
        await addToWishlist(wishlistProductRef.current);
      }
    }
  }, [product, user, wishlistLoading, isInWishlist, addToWishlist, removeFromWishlist, openLoginModal]);

  const handleShare = useCallback(async (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    if (!product || isSharing) {
      return;
    }

    setIsSharing(true);

    const copyToClipboardFn = async () => {
      if (typeof window === 'undefined' || typeof navigator === 'undefined') return;
      
      try {
        await navigator.clipboard.writeText(window.location.href);
        // Show a more user-friendly notification
        const notification = document.createElement('div');
        notification.textContent = 'Product link copied to clipboard!';
        notification.className = 'fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-md shadow-lg z-50';
        document.body.appendChild(notification);
        
        setTimeout(() => {
          if (document.body.contains(notification)) {
            document.body.removeChild(notification);
          }
        }, 3000);
      } catch (err) {
        // Final fallback - show the URL in a prompt
        if (typeof prompt !== 'undefined') {
          prompt('Copy this link to share:', window.location.href);
        }
      }
    };

    try {
      const shareData = {
        title: product.name,
        text: `Check out this product: ${product.name}`,
        url: typeof window !== 'undefined' ? window.location.href : '',
      };

      if (typeof navigator !== 'undefined' && navigator.share && navigator.canShare && navigator.canShare(shareData)) {
        try {
          await navigator.share(shareData);
        } catch (err: any) {
          // User cancelled or share failed - fallback to clipboard
          if (err.name !== 'AbortError') {
            await copyToClipboardFn();
          }
        }
      } else {
        await copyToClipboardFn();
      }
    } catch (err) {
      // Final fallback
      await copyToClipboardFn();
    } finally {
      setIsSharing(false);
    }
  }, [product, isSharing]);

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-sm">
        <div className="text-center">
          <Spinner className="size-12 text-blue-600 mx-auto" />
          <p className="mt-4 text-gray-600">Loading product...</p>
        </div>
      </div>
    );
  }

  if (error || (!loading && !product)) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center max-w-2xl mx-auto px-4">
          <h1 className="text-2xl font-medium text-gray-900 mb-4">Product Not Found</h1>
          <p className="text-gray-600 mb-4">The product you&apos;re looking for doesn&apos;t exist.</p>
          <p className="text-sm text-gray-500 mb-6">
            Slug: {slug}<br />
            {error && `Error: ${error}`}
          </p>
          <Link
            href="/products"
            className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-brand hover:bg-brand-600"
          >
            Browse Products
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white pb-24 sm:pb-8">
      <div className="max-w-[1450px] mx-auto w-full px-1 sm:px-2 md:px-4 lg:px-6 pt-1 pb-8">
        {/* Breadcrumb Navigation - Desktop only */}
        <nav className="hidden sm:flex mb-2" aria-label="Breadcrumb">
          <ol className="flex items-center space-x-2">
            <li>
              <Link href="/" className="text-gray-500 hover:text-gray-700 text-xs">
                Home Page
              </Link>
            </li>
            <li>
              <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
            </li>
            <li>
              <Link href="/products" className="text-gray-500 hover:text-gray-700 text-xs">
                Products
              </Link>
            </li>
            <li>
              <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
            </li>
            <li>
              <Link 
                href={categorySlug ? `/products/${categorySlug}` : `/products`}
                className="text-gray-500 hover:text-gray-700 text-xs"
              >
                {product ? (typeof product.category === 'string' ? product.category : product.category?.name || 'Category') : 'Category'}
              </Link>
            </li>
            {product?.subcategory && (
              <>
                <li>
                  <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                </li>
                <li>
                  <Link 
                    href={categorySlug && subcategorySlug ? `/products/${categorySlug}/${subcategorySlug}` : `/products/${categorySlug || 'category'}`}
                    className="text-gray-500 hover:text-gray-700 text-xs"
                  >
                    {product?.subcategory || 'Subcategory'}
                  </Link>
                </li>
              </>
            )}
            <li>
              <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
            </li>
            <li>
              <span className="text-gray-900 font-medium text-xs" aria-current="page">
                {product?.name || 'Product'}
              </span>
            </li>
          </ol>
        </nav>

        <div className="bg-white mb-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-1 md:gap-2 lg:gap-3 overflow-visible">
            {/* Product Images */}
            <ProductMedia
              product={product!}
              selectedImage={selectedImage}
              setSelectedImage={setSelectedImage}
              handleWishlistToggle={handleWishlistToggle}
              handleShare={handleShare}
              isInWishlist={isInWishlist}
              wishlistLoading={wishlistLoading}
              isSharing={isSharing}
            />

          {/* Product Info */}
          <div className="space-y-3 sm:space-y-6">
            <ProductInfo
              product={product!}
              quantity={quantity}
              setQuantity={setQuantity}
              selectedSize={selectedSize}
              setSelectedSize={setSelectedSize}
              selectedColor={selectedColor}
              setSelectedColor={setSelectedColor}
              handleAddToCart={handleAddToCart}
              handleBuyNow={handleBuyNow}
              isAddedToCart={isAddedToCart}
              user={user}
              slug={slug}
            />
            
            {/* Product Details */}
            <ProductDetails product={product!} />
          </div>
        </div>
      </div>

      {/* Product Reviews Section */}
        {product && (
          <ProductReviews
            productId={product.id}
            onRatingUpdate={(avgRating, reviewCount) => {
              setProduct(prev => prev ? {
                ...prev,
                rating: avgRating,
                review_count: reviewCount
              } : null);
            }}
          />
        )}

        {/* Related Products Section - Edge to Edge */}
        <div className="mt-6 mb-8 -mx-1 sm:-mx-2 md:-mx-4 lg:-mx-6">
          <div className="text-center mb-6 px-1 sm:px-2 md:px-4 lg:px-6">
            <h2 className="text-lg sm:text-2xl font-medium text-gray-900 mb-3">Related Products</h2>
          </div>
          
          {relatedLoading ? (
            <div className="flex justify-center items-center py-12">
              <div className="text-center py-12">
                <Spinner className="size-12 text-blue-600 mx-auto" />
                <p className="mt-4 text-gray-600">Loading related products...</p>
              </div>
            </div>
          ) : relatedProducts.length > 0 ? (
            <div className={`${PRODUCT_GRID_CLASSES_SMALL_GAP} px-1 sm:px-2 md:px-4 lg:px-6`}>
              {relatedProducts.map((relatedProduct: any) => (
                <ProductCard 
                  key={relatedProduct.id} 
                  product={{
                    ...relatedProduct,
                    original_price: relatedProduct.original_price ?? undefined
                  }}
                />
              ))}
            </div>
          ) : (
            <div className="px-1 sm:px-2 md:px-4 lg:px-6">
              <EmptyState
                icon="📦"
                title="No related products found"
                variant="compact"
                className="bg-white rounded-xl border border-gray-200"
              />
            </div>
          )}
        </div>
      </div>

      {/* Sticky Buttons - Mobile Only */}
      {product && (
        <ProductBottomActions
          product={product}
          selectedSize={selectedSize}
          setSelectedSize={setSelectedSize}
          selectedColor={selectedColor}
          setSelectedColor={setSelectedColor}
          handleAddToCart={handleAddToCart}
          handleBuyNow={handleBuyNow}
          isAddedToCart={isAddedToCart}
          user={user}
          slug={slug}
        />
      )}
    </div>
  );
}
