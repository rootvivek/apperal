'use client';

import { useState, useEffect, useRef, use } from 'react';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import { useWishlist } from '@/contexts/WishlistContext';
import { createClient } from '@/lib/supabase/client';
import CartIcon from '@/components/CartIcon';
import ProductCard from '@/components/ProductCard';

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
  // Unwrap params Promise (Next.js 15+)
  const { slug } = use(params);
  
  const [product, setProduct] = useState<ProductCardProduct | null>(null);
  const [relatedProducts, setRelatedProducts] = useState<ProductCardProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [relatedLoading, setRelatedLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [categorySlug, setCategorySlug] = useState<string>('');
  const [subcategorySlug, setSubcategorySlug] = useState<string>('');
  const { addToCart } = useCart();
  const { user } = useAuth();
  const { wishlist, addToWishlist, removeFromWishlist, isInWishlist } = useWishlist();
  const supabase = createClient();

  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [isAddedToCart, setIsAddedToCart] = useState(false);
  const [showZoomPreview, setShowZoomPreview] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isSharing, setIsSharing] = useState(false);
  const [imageContainerSize, setImageContainerSize] = useState({ width: 0, height: 0 });
  const [zoomPreviewPosition, setZoomPreviewPosition] = useState({ left: 0, top: 0 });
  const imageContainerRef = useRef<HTMLDivElement>(null);
  const previousSlugRef = useRef<string>('');

  const fetchRelatedProducts = async (category: string, currentProductId: string) => {
    try {
      setRelatedLoading(true);
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('category', category)
        .neq('id', currentProductId)
        .eq('is_active', true)
        .limit(4)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching related products:', error);
        return;
      }

      if (data) {
        // Fetch images for each related product
        const productsWithImages = await Promise.all(
          data.map(async (product: any) => {
            const { data: images } = await supabase
              .from('product_images')
              .select('*')
              .eq('product_id', product.id)
              .order('display_order', { ascending: true });
            
            const productWithImages = {
              ...product,
              images: images || []
            };
            
            
            return productWithImages;
          })
        );
        
        setRelatedProducts(productsWithImages as ProductCardProduct[]);
      }
    } catch (err) {
      console.error('Error fetching related products:', err);
    } finally {
      setRelatedLoading(false);
    }
  };

  useEffect(() => {
    // Restore selected size from localStorage on mount/refresh (only in browser)
    if (typeof window !== 'undefined') {
      const savedSize = localStorage.getItem(`selectedSize_${slug}`);
      if (savedSize) {
        setSelectedSize(savedSize);
      }
      
      // Only reset size selection when product slug actually changes (not on refresh)
      if (previousSlugRef.current !== slug) {
        setSelectedSize(savedSize || '');
        previousSlugRef.current = slug;
      }
    }
    
    const fetchProduct = async () => {
      try {
        setLoading(true);
        
        // First try to find by exact slug match - include all detail tables
        let { data: product, error: productError } = await supabase
          .from('products')
          .select(`
            *, 
            product_images (id, image_url, alt_text, display_order),
            product_cover_details (*),
            product_apparel_details (*),
            product_accessories_details (*)
          `)
          .eq('slug', slug)
          .eq('is_active', true)
          .maybeSingle();
        
        // If not found by exact slug, try partial match (removing trailing numbers like -1, -2, etc.)
        if (!product && !productError) {
          const slugWithoutSuffix = slug.replace(/-\d+$/, '');
          
          const { data: partialProduct, error: partialError } = await supabase
            .from('products')
            .select(`
              *, 
              product_images (id, image_url, alt_text, display_order),
              product_cover_details (*),
              product_apparel_details (*),
              product_accessories_details (*)
            `)
            .ilike('slug', `${slugWithoutSuffix}%`)
            .eq('is_active', true)
            .limit(1)
            .maybeSingle();
          
          if (!partialError && partialProduct) {
            product = partialProduct;
            productError = null;
          }
        }
        
        // If not found by slug, try by ID (for backward compatibility)
        if (!product && !productError && slug && slug.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
          const { data, error } = await supabase
            .from('products')
            .select(`
              *, 
              product_images (id, image_url, alt_text, display_order),
              product_cover_details (*),
              product_apparel_details (*),
              product_accessories_details (*)
            `)
            .eq('id', slug)
            .eq('is_active', true)
            .maybeSingle();
          
          if (!error && data) {
            product = data;
            productError = null;
          }
        }

        if (productError) {
          console.error('Error fetching product:', productError);
          setError('Product not found');
          return;
        }

        if (!product) {
          console.error('No product found with slug:', slug);
          setError('Product not found');
          return;
        }

        // Extract images from product_images relationship
        const images = product.product_images || [];

        if (product) {
          // Transform product to match ProductCardProduct interface
          const productWithImages = {
            id: product.id,
            name: product.name,
            slug: product.slug,
            description: product.description || '',
            price: product.price,
            original_price: product.original_price || null,
            badge: product.badge || null,
            category: product.category || '',
            category_id: product.category_id || null,
            subcategory: product.subcategory || '',
            subcategory_id: product.subcategory_id || null,
            subcategories: Array.isArray(product.subcategories)
              ? product.subcategories
              : (product.subcategory ? [product.subcategory] : []),
            image_url: product.image_url || '',
            stock_quantity: product.stock_quantity || 0,
            is_active: typeof product.is_active === 'boolean' ? product.is_active : true,
            show_in_hero: product.show_in_hero || false,
            created_at: product.created_at,
            updated_at: product.updated_at,
            // Common product fields (from products table)
            brand: product.brand || null,
            is_new: product.is_new || false,
            rating: product.rating || null,
            review_count: product.review_count || null,
            in_stock: product.in_stock !== undefined ? product.in_stock : (product.stock_quantity > 0),
            images: images && images.length > 0 ? images : (product.image_url ? [{
              id: 'main-image',
              image_url: product.image_url,
              alt_text: product.name,
              display_order: 0
            }] : []),
            // Include detail tables (only one will have data based on category)
            product_cover_details: (product.product_cover_details && Array.isArray(product.product_cover_details) && product.product_cover_details.length > 0) 
              ? product.product_cover_details[0] 
              : (product.product_cover_details || undefined),
            product_apparel_details: (product.product_apparel_details && Array.isArray(product.product_apparel_details) && product.product_apparel_details.length > 0) 
              ? product.product_apparel_details[0] 
              : (product.product_apparel_details || undefined),
            product_accessories_details: (product.product_accessories_details && Array.isArray(product.product_accessories_details) && product.product_accessories_details.length > 0) 
              ? product.product_accessories_details[0] 
              : (product.product_accessories_details || undefined),
          };
          
          setProduct(productWithImages as ProductCardProduct);
          
          // Handle size selection: restore saved size or set default
          if (productWithImages.product_apparel_details?.size) {
            const availableSizes = productWithImages.product_apparel_details.size
              .split(',')
              .map((s: string) => s.trim())
              .filter(Boolean);
            
            if (availableSizes.length > 0) {
              const savedSize = typeof window !== 'undefined' ? localStorage.getItem(`selectedSize_${slug}`) : null;
              const currentSize = selectedSize || savedSize;
              
              // Validate saved size is still available, otherwise use default
              if (currentSize && availableSizes.includes(currentSize)) {
                setSelectedSize(currentSize);
                if (typeof window !== 'undefined' && !savedSize) {
                  localStorage.setItem(`selectedSize_${slug}`, currentSize);
                }
              } else {
                // Saved size is no longer available, use first available size
                const defaultSize = availableSizes[0];
                setSelectedSize(defaultSize);
                if (typeof window !== 'undefined') {
                  localStorage.setItem(`selectedSize_${slug}`, defaultSize);
                }
              }
            }
          }
          
          // Fetch category and subcategory slugs
          const categoryName = typeof product.category === 'string' ? product.category : product.category?.name;
          if (categoryName) {
            // Fetch category by name
            const { data: categoryData } = await supabase
              .from('categories')
              .select('slug')
              .eq('name', categoryName)
              .single();
            
            if (categoryData) {
              setCategorySlug(categoryData.slug);
            }
            
            // Fetch subcategory by name if product has subcategory
            if (product.subcategory) {
              const { data: subcategoryData } = await supabase
                .from('subcategories')
                .select('slug')
                .eq('name', product.subcategory)
                .single();
              
              if (subcategoryData) {
                setSubcategorySlug(subcategoryData.slug);
              }
            }
            
            fetchRelatedProducts(categoryName, product.id);
          }
        } else {
          setError('Product not found');
        }
      } catch (err) {
        console.error('Error fetching product:', err);
        setError('Failed to load product');
      } finally {
        setLoading(false);
      }
    };

    if (slug) {
      fetchProduct();
    }
  }, [slug, supabase]);

  const handleAddToCart = () => {
    if (!product) return;
    
    // Check if size is required for apparel products
    if (product.product_apparel_details && !selectedSize) {
      alert('Please select a size');
      return;
    }
    
    // Do not block the click handler on network I/O
    // Show brief feedback but don't disable the button
    setIsAddedToCart(true);
    setTimeout(() => setIsAddedToCart(false), 1500);
    void addToCart(product.id, quantity, selectedSize || null);
  };

  const handleBuyNow = () => {
    if (!product) return;
    
    // Check if size is required for apparel products
    if (product.product_apparel_details && !selectedSize) {
      alert('Please select a size');
      return;
    }
    
    // Check if user is authenticated for checkout
    if (!user) {
      const currentUrl = window.location.pathname;
      window.location.href = `/login?redirect=${encodeURIComponent(currentUrl)}`;
      return;
    }
    
    // Redirect directly to checkout without adding to cart
    const params = new URLSearchParams({
      direct: 'true',
      productId: product.id,
      quantity: quantity.toString()
    });
    
    // Add size if it's an apparel product
    if (selectedSize) {
      params.append('size', selectedSize);
    }
    
    window.location.href = `/checkout?${params.toString()}`;
  };

  const handleWishlistToggle = () => {
    if (!user) {
      window.location.href = '/login';
      return;
    }
    
    if (product && wishlist) {
      const inWishlist = isInWishlist(product.id);
      if (inWishlist) {
        removeFromWishlist(product.id);
      } else {
        addToWishlist(product as any);
      }
    }
  };

  const handleShare = async () => {
    if (!product || isSharing) {
      console.error('No product data available for sharing or already sharing');
      return;
    }

    setIsSharing(true);

    const shareData = {
      title: product.name,
      text: `Check out this product: ${product.name}`,
      url: window.location.href,
    };

    if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        // Fallback to clipboard if share was cancelled or failed
        await copyToClipboard();
      }
    } else {
      await copyToClipboard();
    }

    setIsSharing(false);
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      // Show a more user-friendly notification
      const notification = document.createElement('div');
      notification.textContent = 'Product link copied to clipboard!';
      notification.className = 'fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-md shadow-lg z-50';
      document.body.appendChild(notification);
      
      setTimeout(() => {
        document.body.removeChild(notification);
      }, 3000);
    } catch (err) {
      console.error('Error copying to clipboard:', err);
      // Final fallback - show the URL in a prompt
      prompt('Copy this link to share:', window.location.href);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading product...</p>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center max-w-2xl mx-auto px-4">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Product Not Found</h1>
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
    <div className="min-h-screen bg-white pb-24 sm:pb-8 pt-16 sm:pt-20">
      <div className="max-w-[1450px] mx-auto w-full px-1 sm:px-2 md:px-4 lg:px-6 pb-8">
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
                {typeof product.category === 'string' ? product.category : product.category?.name || 'Category'}
              </Link>
            </li>
            {product.subcategory && (
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
                    {product.subcategory}
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
                {product.name}
              </span>
            </li>
          </ol>
        </nav>

        <div className="bg-white mb-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-4 lg:gap-6 overflow-visible">
            {/* Product Images */}
            <div className="w-full overflow-visible">
            {/* Desktop: Thumbnails on Left, Main Image on Right */}
            <div className="hidden md:flex gap-1 overflow-visible">
              {/* Thumbnail Gallery - Left (Desktop only) */}
              {product.images && product.images.length > 1 && (
                <div className="flex flex-col gap-2 flex-shrink-0">
                  {product.images.map((image, index) => (
                    <button
                      key={image.id}
                      onClick={() => setSelectedImage(index)}
                      className={`flex-shrink-0 w-20 h-20 rounded transition-all duration-200 shadow-sm flex items-center justify-center bg-white ${
                        selectedImage === index 
                          ? 'scale-105 border border-brand/50' 
                          : 'border-0 hover:shadow-md'
                      }`}
                      style={{ boxSizing: 'border-box' }}
                    >
                      <div className="w-full h-full overflow-hidden rounded">
                        <img
                          src={image.image_url}
                          alt={image.alt_text || `${product.name} ${index + 1}`}
                          className="h-full w-full object-contain"
                          loading="lazy"
                          decoding="async"
                          width={80}
                          height={80}
                          onError={(e) => {
                            e.currentTarget.src = '/placeholder-product.jpg';
                          }}
                        />
                      </div>
                    </button>
                  ))}
                </div>
              )}
              
              {/* Main Image Container - Desktop */}
              <div className="flex-1 relative overflow-visible">
              {/* Main Image */}
            <div 
              ref={imageContainerRef}
              className="aspect-square rounded bg-white cursor-default md:cursor-crosshair relative w-full max-w-full overflow-hidden"
              onMouseEnter={() => {
                setShowZoomPreview(true);
                if (imageContainerRef.current) {
                  const rect = imageContainerRef.current.getBoundingClientRect();
                  setImageContainerSize({ width: rect.width, height: rect.height });
                  setZoomPreviewPosition({
                    left: rect.right + 16,
                    top: rect.top
                  });
                }
              }}
              onMouseLeave={() => setShowZoomPreview(false)}
              onMouseMove={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const x = ((e.clientX - rect.left) / rect.width) * 100;
                const y = ((e.clientY - rect.top) / rect.height) * 100;
                setMousePosition({ x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) });
                
                // Update zoom preview position as mouse moves
                if (imageContainerRef.current) {
                  const containerRect = imageContainerRef.current.getBoundingClientRect();
                  setZoomPreviewPosition({
                    left: containerRect.right + 16,
                    top: containerRect.top
                  });
                }
              }}
            >
              {/* Product Badge - Top Left Corner */}
              {product.badge && (() => {
                const badgeStyle = (() => {
                  switch (product.badge?.toUpperCase()) {
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
                })();
                return (
                  <div className="absolute top-0 left-0 z-30 pointer-events-none m-0">
                    <span className={`px-3 py-2 text-[10px] sm:text-xs font-medium ${badgeStyle}`}>
                      {product.badge}
                    </span>
                  </div>
                );
              })()}
              
              {/* Wishlist and Share Icons */}
              <div className="absolute top-2 right-2 z-30 flex flex-col gap-3">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleWishlistToggle();
                  }}
                  onMouseEnter={(e) => e.stopPropagation()}
                  className="p-2.5 sm:p-3 bg-white bg-opacity-95 hover:bg-opacity-100 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-110"
                >
                  <svg 
                    className={`w-4 h-4 sm:w-5 sm:h-5 transition-colors ${
                      product && isInWishlist(product.id) 
                        ? 'text-red-500 fill-current' 
                        : 'text-gray-600 hover:text-red-500'
                    }`} 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleShare();
                  }}
                  onMouseEnter={(e) => e.stopPropagation()}
                  disabled={isSharing}
                  className={`p-2.5 sm:p-3 bg-white bg-opacity-95 hover:bg-opacity-100 rounded-full shadow-lg transition-all duration-200 ${
                    isSharing ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-xl hover:scale-110'
                  }`}
                  title="Share this product"
                >
                  <svg 
                    className={`w-4 h-4 sm:w-5 sm:h-5 transition-colors ${
                      isSharing 
                        ? 'text-brand' 
                        : 'text-gray-600 hover:text-brand'
                    }`}
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
                  </svg>
                </button>
              </div>

              <img
                src={product.images && product.images.length > 0 
                  ? product.images[selectedImage].image_url 
                  : product.image_url || '/placeholder-product.jpg'}
                alt={product.name}
                className="h-full w-full object-cover"
                loading="eager"
                decoding="async"
                width={800}
                height={800}
                fetchPriority="high"
                onError={(e) => {
                  e.currentTarget.src = '/placeholder-product.jpg';
                }}
              />
              
              {/* Magnifying Glass Overlay */}
              {showZoomPreview && (
                <div 
                  className="hidden md:block absolute w-20 h-20 border-2 border-brand bg-white bg-opacity-50 rounded-full pointer-events-none z-10"
                  style={{
                    left: `${mousePosition.x}%`,
                    top: `${mousePosition.y}%`,
                    transform: 'translate(-50%, -50%)'
                  }}
                >
                  <div className="w-full h-full rounded-full overflow-hidden">
                    <img
                      src={product.images && product.images.length > 0 
                        ? product.images[selectedImage].image_url 
                        : product.image_url || '/placeholder-product.jpg'}
                      alt={product.name}
                      className="w-full h-full object-cover"
                      style={{
                        transform: `scale(3)`,
                        transformOrigin: `${mousePosition.x}% ${mousePosition.y}%`
                      }}
                      onError={(e) => {
                        e.currentTarget.src = '/placeholder-product.jpg';
                      }}
                    />
                  </div>
                </div>
              )}
              
            </div>
            
            {/* Zoomed Image Preview - Right Side */}
            {showZoomPreview && imageContainerSize.width > 0 && (
              <div 
                className="hidden md:block fixed bg-white rounded shadow-2xl z-50 overflow-hidden aspect-square"
                style={{
                  width: `${imageContainerSize.width}px`,
                  height: `${imageContainerSize.height}px`,
                  left: `${zoomPreviewPosition.left}px`,
                  top: `${zoomPreviewPosition.top}px`
                }}
              >
                <img
                  src={product.images && product.images.length > 0 
                    ? product.images[selectedImage].image_url 
                    : product.image_url || '/placeholder-product.jpg'}
                  alt={product.name}
                  className="w-full h-full object-contain"
                  style={{
                    transform: `scale(3)`,
                    transformOrigin: `${mousePosition.x}% ${mousePosition.y}%`
                  }}
                  onError={(e) => {
                    e.currentTarget.src = '/placeholder-product.jpg';
                  }}
                />
              </div>
            )}
              </div>
            </div>
            
            {/* Mobile: Main Image Container */}
            <div className="md:hidden w-full relative">
              {/* Main Image */}
              <div 
                ref={imageContainerRef}
                className="aspect-square rounded bg-white cursor-default w-full max-w-full overflow-hidden"
              >
                {/* Product Badge - Top Left Corner */}
                {product.badge && (() => {
                  const badgeStyle = (() => {
                    switch (product.badge?.toUpperCase()) {
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
                  })();
                  return (
                    <div className="absolute top-0 left-0 z-20 m-0">
                      <span className={`px-3 py-2 text-[10px] sm:text-xs font-medium ${badgeStyle}`}>
                        {product.badge}
                      </span>
                    </div>
                  );
                })()}
                
                {/* Wishlist and Share Icons */}
                <div className="absolute top-2 right-2 z-20 flex flex-col gap-3">
                  <button
                    onClick={handleWishlistToggle}
                    className="p-2.5 bg-white bg-opacity-95 hover:bg-opacity-100 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-110"
                  >
                    <svg 
                      className={`w-4 h-4 transition-colors ${
                        product && isInWishlist(product.id) 
                          ? 'text-red-500 fill-current' 
                          : 'text-gray-600 hover:text-red-500'
                      }`} 
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                  </button>
                  <button
                    onClick={handleShare}
                    disabled={isSharing}
                    className={`p-2.5 bg-white bg-opacity-95 hover:bg-opacity-100 rounded-full shadow-lg transition-all duration-200 ${
                      isSharing ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-xl hover:scale-110'
                    }`}
                    title="Share this product"
                  >
                    <svg 
                      className={`w-4 h-4 transition-colors ${
                        isSharing 
                          ? 'text-blue-500' 
                          : 'text-gray-600 hover:text-blue-500'
                      }`}
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
                    </svg>
                  </button>
                </div>

                <img
                  src={product.images && product.images.length > 0 
                    ? product.images[selectedImage].image_url 
                    : product.image_url || '/placeholder-product.jpg'}
                  alt={product.name}
                  className="h-full w-full object-cover"
                  loading="eager"
                  decoding="async"
                  width={800}
                  height={800}
                  fetchPriority="high"
                  onError={(e) => {
                    e.currentTarget.src = '/placeholder-product.jpg';
                  }}
                />
              </div>
            </div>
            
            {/* Thumbnail Gallery - Bottom (Mobile only) */}
            {product.images && product.images.length > 1 && (
              <div className="md:hidden flex gap-1 overflow-x-auto pb-2 pt-1 mt-1 scrollbar-hide items-center px-1">
                {product.images.map((image, index) => (
                  <button
                    key={image.id}
                    onClick={() => setSelectedImage(index)}
                    className={`flex-shrink-0 w-20 h-20 rounded transition-all duration-200 shadow-sm flex items-center justify-center bg-white ${
                      selectedImage === index 
                        ? 'scale-105 border border-brand/50' 
                        : 'border-0 hover:shadow-md'
                    }`}
                    style={{ boxSizing: 'border-box' }}
                  >
                    <div className="w-full h-full overflow-hidden rounded">
                      <img
                        src={image.image_url}
                        alt={image.alt_text || `${product.name} ${index + 1}`}
                        className="h-full w-full object-cover"
                        loading="lazy"
                        decoding="async"
                        width={80}
                        height={80}
                        onError={(e) => {
                          e.currentTarget.src = '/placeholder-product.jpg';
                        }}
                      />
                    </div>
                  </button>
                ))}
              </div>
            )}
            </div>

          {/* Product Info */}
          <div className="space-y-6">
            <div>
              {/* Brand Name - Always shown before product name */}
              {(product.brand || product.product_apparel_details?.brand || product.product_cover_details?.brand) && (
                <div className="mb-1">
                  <span className="text-base sm:text-lg font-semibold text-gray-600 uppercase tracking-wide">
                    {product.brand || product.product_apparel_details?.brand || product.product_cover_details?.brand}
                  </span>
                </div>
              )}
              <h1 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4 leading-tight">{product.name}</h1>
              <div className="mt-3 flex flex-wrap items-center gap-4">
                <div className="flex items-baseline gap-3">
                  <span className="text-lg sm:text-xl font-semibold text-brand">₹{product.price.toFixed(2)}</span>
                  {product.original_price && product.original_price > product.price && (
                    <>
                      <span className="text-sm text-gray-500 line-through">₹{product.original_price.toFixed(2)}</span>
                      <span className="text-sm font-semibold text-green-600">
                        ({Math.round(((product.original_price - product.price) / product.original_price) * 100)}% OFF)
                      </span>
                    </>
                  )}
                </div>
              </div>
              {product.rating !== null && product.rating !== undefined && (
                <div className="mt-3 flex items-center gap-2">
                  <span className="flex items-center text-yellow-500">
                    {'⭐'.repeat(Math.round(product.rating))}
                  </span>
                  <span className="text-sm text-gray-600">
                    {product.rating.toFixed(1)} ({product.review_count || 0} reviews)
                  </span>
                </div>
              )}
            </div>

            {/* Phone Cover Details */}
            {product.product_cover_details && (
              <div className="bg-white rounded-xl p-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-5 pb-2">Phone Cover Details</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {product.product_cover_details.brand && (
                    <div className="flex items-center gap-3 p-3 bg-white rounded-lg shadow-sm">
                      <span className="font-semibold text-gray-700 min-w-[140px]">Brand:</span>
                      <span className="text-gray-900 font-medium">{product.product_cover_details.brand}</span>
                    </div>
                  )}
                  {product.product_cover_details.compatible_model && (
                    <div className="flex items-center gap-3 p-3 bg-white rounded-lg shadow-sm">
                      <span className="font-semibold text-gray-700 min-w-[140px]">Compatible Model:</span>
                      <span className="text-gray-900 font-medium">{product.product_cover_details.compatible_model}</span>
                    </div>
                  )}
                  {product.product_cover_details.type && (
                    <div className="flex items-center gap-3 p-3 bg-white rounded-lg shadow-sm">
                      <span className="font-semibold text-gray-700 min-w-[140px]">Type:</span>
                      <span className="text-gray-900 font-medium">{product.product_cover_details.type}</span>
                    </div>
                  )}
                  {product.product_cover_details.color && (
                    <div className="flex items-center gap-3 p-3 bg-white rounded-lg shadow-sm">
                      <span className="font-semibold text-gray-700 min-w-[140px]">Color:</span>
                      <span className="text-gray-900 font-medium">{product.product_cover_details.color}</span>
                    </div>
                  )}
                </div>
              </div>
            )}


            {/* Accessories Details */}
            {product.product_accessories_details && (
              <div className="bg-white rounded-xl p-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-5 pb-2">Accessories Details</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {product.product_accessories_details.accessory_type && (
                    <div className="flex items-center gap-3 p-3 bg-white rounded-lg shadow-sm">
                      <span className="font-semibold text-gray-700 min-w-[140px]">Accessory Type:</span>
                      <span className="text-gray-900 font-medium">{product.product_accessories_details.accessory_type}</span>
                    </div>
                  )}
                  {product.product_accessories_details.compatible_with && (
                    <div className="flex items-center gap-3 p-3 bg-white rounded-lg shadow-sm">
                      <span className="font-semibold text-gray-700 min-w-[140px]">Compatible With:</span>
                      <span className="text-gray-900 font-medium">{product.product_accessories_details.compatible_with}</span>
                    </div>
                  )}
                  {product.product_accessories_details.material && (
                    <div className="flex items-center gap-3 p-3 bg-white rounded-lg shadow-sm">
                      <span className="font-semibold text-gray-700 min-w-[140px]">Material:</span>
                      <span className="text-gray-900 font-medium">{product.product_accessories_details.material}</span>
                    </div>
                  )}
                  {product.product_accessories_details.color && (
                    <div className="flex items-center gap-3 p-3 bg-white rounded-lg shadow-sm">
                      <span className="font-semibold text-gray-700 min-w-[140px]">Color:</span>
                      <span className="text-gray-900 font-medium">{product.product_accessories_details.color}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Size Selection and Actions */}
            <div className="space-y-5">
              {/* Size Selection - Only show for apparel products - Chip buttons */}
              {product.product_apparel_details && (() => {
                // Parse available sizes from comma-separated string
                const availableSizes = product.product_apparel_details.size
                  ? product.product_apparel_details.size.split(',').map((s: string) => s.trim()).filter(Boolean)
                  : [];
                
                // Only show if there are available sizes
                if (availableSizes.length === 0) return null;
                
                return (
                  <div>
                    <label className="block text-base font-semibold text-gray-900 mb-3">
                      Select Size <span className="text-red-500">*</span>
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {availableSizes.map((size) => (
                        <button
                          key={size}
                          type="button"
                          onClick={() => {
                            setSelectedSize(size);
                            if (typeof window !== 'undefined') {
                              localStorage.setItem(`selectedSize_${slug}`, size);
                            }
                          }}
                          className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all duration-200 ${
                            selectedSize === size
                              ? 'bg-brand text-white shadow-lg scale-105'
                              : 'bg-white text-gray-700 border border-gray-300 hover:border-brand hover:text-brand hover:shadow-md'
                          }`}
                        >
                          {size}
                        </button>
                      ))}
                    </div>
                    {!selectedSize && (
                      <p className="mt-2 text-sm text-red-600 font-medium">Please select a size</p>
                    )}
                  </div>
                );
              })()}

              {/* Desktop Buttons */}
              <div className="hidden sm:flex flex-col sm:flex-row gap-3">
                <button
                  onClick={handleAddToCart}
                  disabled={product.stock_quantity === 0 || (product.product_apparel_details && !selectedSize)}
                  className="flex-1 bg-yellow-500 text-white py-4 px-6 rounded font-semibold hover:bg-yellow-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-3 shadow hover:shadow-sm transform hover:scale-[1.02]"
                >
                  <CartIcon className="w-5 h-5 flex-shrink-0" />
                  <span className="text-base">
                    {isAddedToCart ? 'Added to Cart!' : 'Add to Cart'}
                  </span>
                </button>
                <button
                  onClick={handleBuyNow}
                  disabled={product.stock_quantity === 0 || (product.product_apparel_details && !selectedSize)}
                  className="flex-1 bg-orange-500 text-white py-4 px-6 rounded font-semibold hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow hover:shadow-sm transform hover:scale-[1.02]"
                >
                  Buy Now
                </button>
              </div>

              {product.stock_quantity === 0 && (
                <div className="text-center p-4 bg-red-50 border-2 border-red-200 rounded">
                  <p className="text-gray-900 font-semibold">This product is currently out of stock</p>
                </div>
              )}
            </div>

            {/* Product Details and Apparel Details - Combined in one frame */}
            <div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Product Details</h3>
              <div className="space-y-1">
                {product.product_apparel_details?.brand && (
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-gray-700 min-w-[120px]">Brand:</span>
                    <span className="text-gray-900">{product.product_apparel_details.brand}</span>
                  </div>
                )}
                {product.product_apparel_details?.material && (
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-gray-700 min-w-[120px]">Material:</span>
                    <span className="text-gray-900">{product.product_apparel_details.material}</span>
                  </div>
                )}
                {product.product_apparel_details?.fit_type && (
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-gray-700 min-w-[120px]">Fit Type:</span>
                    <span className="text-gray-900">{product.product_apparel_details.fit_type}</span>
                  </div>
                )}
                {product.product_apparel_details?.color && (
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-gray-700 min-w-[120px]">Color:</span>
                    <span className="text-gray-900">{product.product_apparel_details.color}</span>
                  </div>
                )}
                {product.product_apparel_details?.size && (
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-gray-700 min-w-[120px]">Size:</span>
                    <span className="text-gray-900">{product.product_apparel_details.size}</span>
                  </div>
                )}
                {product.description && (
                  <div className="flex items-start gap-3">
                    <span className="font-semibold text-gray-700 min-w-[120px]">Description:</span>
                    <span className="text-gray-900 leading-relaxed">{product.description}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        </div>

        {/* Related Products Section */}
        <div className="mt-12 mb-8">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold text-gray-900 mb-3">Related Products</h2>
            <p className="text-gray-600 text-lg">You might also like these products</p>
          </div>
          
          {relatedLoading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand"></div>
              <span className="ml-4 text-gray-600 text-lg">Loading related products...</span>
            </div>
          ) : relatedProducts.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-6">
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
            <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
              <p className="text-gray-500 text-lg">No related products found.</p>
            </div>
          )}
        </div>
      </div>

      {/* Sticky Buttons - Mobile Only */}
      <div className="fixed bottom-0 left-0 right-0 w-full bg-white/50 backdrop-blur-md border-t border-gray-200/30 shadow-lg z-50 sm:hidden" style={{ position: 'fixed', bottom: 0, left: 0, right: 0 }}>
        <div className="px-3 py-4 flex gap-2">
          <button
            onClick={handleAddToCart}
            disabled={product.stock_quantity === 0 || (product.product_apparel_details && !selectedSize)}
            className="flex-1 bg-yellow-500 text-white py-4 px-4 rounded-md font-semibold hover:bg-yellow-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2 text-sm"
          >
            <CartIcon className="w-4 h-4 flex-shrink-0" />
            <span>
              {isAddedToCart ? 'Added!' : 'Add to Cart'}
            </span>
          </button>
          <button
            onClick={handleBuyNow}
            disabled={product.stock_quantity === 0 || (product.product_apparel_details && !selectedSize)}
            className="flex-1 bg-orange-500 text-white py-4 px-4 rounded-md font-semibold hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 text-sm"
          >
            Buy Now
          </button>
        </div>
      </div>
    </div>
  );
}