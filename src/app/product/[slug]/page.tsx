'use client';

import { useState, useEffect } from 'react';
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
  description: string;
  price: number;
  category: string | { id: string; name: string; slug: string; description: string; image: string; subcategories: any[] };
  subcategory: string;
  image_url: string;
  stock_quantity: number;
  is_active: boolean;
  images?: {
    id: string;
    image_url: string;
    alt_text?: string;
    display_order: number;
  }[];
}

interface ProductDetailPageProps {
  params: {
    slug: string;
  };
}

export default function ProductDetailPage({ params }: ProductDetailPageProps) {
  const [product, setProduct] = useState<ProductCardProduct | null>(null);
  const [relatedProducts, setRelatedProducts] = useState<ProductCardProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [relatedLoading, setRelatedLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [categorySlug, setCategorySlug] = useState<string>('');
  const [subcategorySlug, setSubcategorySlug] = useState<string>('');
  const { addToCart } = useCart();
  const { user } = useAuth();
  const { wishlistItems, addToWishlist, removeFromWishlist } = useWishlist();
  const supabase = createClient();

  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [isAddedToCart, setIsAddedToCart] = useState(false);
  const [showZoomPreview, setShowZoomPreview] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isSharing, setIsSharing] = useState(false);

  const fetchRelatedProducts = async (category: string, currentProductId: string) => {
    try {
      console.log('Fetching related products for category:', category, 'excluding product:', currentProductId);
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

      console.log('Related products found:', data?.length || 0);
      if (data) {
        // Fetch images for each related product
        const productsWithImages = await Promise.all(
          data.map(async (product) => {
            const { data: images } = await supabase
              .from('product_images')
              .select('*')
              .eq('product_id', product.id)
              .order('display_order', { ascending: true });
            
            const productWithImages = {
              ...product,
              images: images || []
            };
            
            // If no images from product_images table, but product has image_url, create a fake image entry
            if ((!images || images.length === 0) && product.image_url) {
              productWithImages.images = [{
                id: 'main-image',
                image_url: product.image_url,
                alt_text: product.name,
                display_order: 0
              }];
            }
            
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
    const fetchProduct = async () => {
      try {
        setLoading(true);
        
        console.log('Fetching product with slug:', params.slug);
        
        // First try to find by slug
        let { data: product, error: productError } = await supabase
          .from('products')
          .select('*, product_images (id, image_url, alt_text, display_order)')
          .eq('slug', params.slug)
          .eq('is_active', true)
          .maybeSingle();
        
        console.log('First fetch result:', { product: !!product, error: productError });
        
        // If not found by slug, try by ID (for backward compatibility)
        if (!product && !productError && params.slug && params.slug.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
          console.log('Trying to fetch by ID:', params.slug);
          const { data, error } = await supabase
            .from('products')
            .select('*, product_images (id, image_url, alt_text, display_order)')
            .eq('id', params.slug)
            .eq('is_active', true)
            .maybeSingle();
          
          console.log('ID fetch result:', { data: !!data, error });
          
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
          console.error('No product found with slug:', params.slug);
          setError('Product not found');
          return;
        }

        // Extract images from product_images relationship
        const images = product.product_images || [];
        
        console.log('=== PRODUCT FETCH DEBUG ===');
        console.log('URL slug param:', params.slug);
        console.log('Product found:', !!product);
        console.log('Product ID:', product?.id);
        console.log('Product slug in DB:', product?.slug);
        console.log('Product name:', product?.name);
        console.log('Images count:', images?.length);
        console.log('Images:', images);
        console.log('Full product object:', product);
        console.log('========================');

        if (product) {
          // Transform product to match ProductCardProduct interface
          const productWithImages = {
            id: product.id,
            name: product.name,
            description: product.description || '',
            price: product.price,
            category: product.category || '',
            subcategory: product.subcategory || '',
            image_url: product.image_url || '',
            stock_quantity: product.stock_quantity || 0,
            is_active: product.is_active || true,
            created_at: product.created_at,
            updated_at: product.updated_at,
            images: images && images.length > 0 ? images : (product.image_url ? [{
              id: 'main-image',
              image_url: product.image_url,
              alt_text: product.name,
              display_order: 0
            }] : [])
          };
          
          console.log('Transformed product:', productWithImages);
          setProduct(productWithImages as ProductCardProduct);
          
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

    if (params.slug) {
      fetchProduct();
    }
  }, [params.slug, supabase]);

  const handleAddToCart = async () => {
    if (!product) return;
    
    await addToCart(product.id, quantity);
    setIsAddedToCart(true);
    setTimeout(() => setIsAddedToCart(false), 2000);
  };

  const handleBuyNow = () => {
    if (!product) return;
    
    // Check if user is authenticated for checkout
    if (!user) {
      const currentUrl = window.location.pathname;
      window.location.href = `/login?redirect=${encodeURIComponent(currentUrl)}`;
      return;
    }
    
    // Add to cart first, then redirect to checkout with direct purchase parameters
    addToCart(product.id, quantity).then(() => {
      window.location.href = `/checkout?direct=true&productId=${product.id}&quantity=${quantity}`;
    });
  };

  const handleWishlistToggle = () => {
    if (!user) {
      window.location.href = '/login';
      return;
    }
    
    if (product && wishlistItems) {
      const isInWishlist = wishlistItems.some(item => item.id === product.id);
      if (isInWishlist) {
        removeFromWishlist(product.id);
      } else {
        addToWishlist(product);
      }
    }
  };

  const handleShare = async () => {
    if (!product || isSharing) {
      console.error('No product data available for sharing or already sharing');
      return;
    }

    setIsSharing(true);
    console.log('Share button clicked');

    const shareData = {
      title: product.name,
      text: `Check out this product: ${product.name}`,
      url: window.location.href,
    };

    console.log('Attempting to share:', shareData);

    if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
      try {
        await navigator.share(shareData);
        console.log('Successfully shared via Web Share API');
      } catch (err) {
        console.log('Error sharing via Web Share API:', err);
        // Fallback to clipboard if share was cancelled or failed
        await copyToClipboard();
      }
    } else {
      console.log('Web Share API not available, using clipboard fallback');
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading product...</p>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Product Not Found</h1>
          <p className="text-gray-600 mb-6">The product you're looking for doesn't exist.</p>
          <Link
            href="/products"
            className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            Browse Products
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-[1450px] mx-auto w-full px-2 sm:px-4 md:px-6 lg:px-8">
        {/* Breadcrumb Navigation - Desktop only */}
        <nav className="hidden sm:flex mb-8" aria-label="Breadcrumb">
          <ol className="flex items-center space-x-2">
            <li>
              <Link href="/" className="text-gray-500 hover:text-gray-700 text-sm">
                Home
              </Link>
            </li>
            <li>
              <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
            </li>
            <li>
              <Link href="/products" className="text-gray-500 hover:text-gray-700 text-sm">
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
                className="text-gray-500 hover:text-gray-700 text-sm"
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
                    className="text-gray-500 hover:text-gray-700 text-sm"
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
              <span className="text-gray-900 font-medium text-sm" aria-current="page">
                {product.name}
              </span>
            </li>
          </ol>
        </nav>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 lg:gap-12">
          {/* Product Images */}
          <div className="flex gap-4">
            {/* Thumbnail Gallery - Left (Desktop only) */}
            {product.images && product.images.length > 1 && (
              <div className="hidden sm:flex flex-col gap-2">
                {product.images.map((image, index) => (
                  <button
                    key={image.id}
                    onClick={() => setSelectedImage(index)}
                    className={`flex-shrink-0 w-16 h-16 overflow-hidden rounded-lg border-2 transition-colors ${
                      selectedImage === index 
                        ? 'border-blue-500' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <img
                      src={image.image_url}
                      alt={`${product.name} ${index + 1}`}
                      className="w-full h-full object-contain"
                      onError={(e) => {
                        e.currentTarget.src = '/placeholder-product.jpg';
                      }}
                    />
                  </button>
                ))}
              </div>
            )}

            {/* Main Image Container */}
            <div className="flex-1 space-y-4 w-full">
              {/* Main Image */}
            <div 
              className="aspect-square rounded-lg bg-white cursor-crosshair relative sm:cursor-crosshair cursor-default w-full max-w-full"
              onMouseEnter={() => setShowZoomPreview(true)}
              onMouseLeave={() => setShowZoomPreview(false)}
              onMouseMove={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const x = ((e.clientX - rect.left) / rect.width) * 100;
                const y = ((e.clientY - rect.top) / rect.height) * 100;
                setMousePosition({ x, y });
              }}
            >
              {/* Wishlist and Share Icons */}
              <div className="absolute top-2 right-2 z-20 flex flex-col gap-2">
                <button
                  onClick={handleWishlistToggle}
                  className="p-1.5 sm:p-2 bg-white bg-opacity-80 hover:bg-opacity-100 rounded-full shadow-sm transition-all duration-200"
                >
                  <svg 
                    className={`w-4 h-4 sm:w-5 sm:h-5 transition-colors ${
                      wishlistItems?.some(item => item.id === product.id) 
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
                  className={`p-1.5 sm:p-2 bg-white bg-opacity-80 hover:bg-opacity-100 rounded-full shadow-sm transition-all duration-200 ${
                    isSharing ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-md'
                  }`}
                  title="Share this product"
                >
                  <svg 
                    className={`w-4 h-4 sm:w-5 sm:h-5 transition-colors ${
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
                className="h-full w-full object-contain rounded-lg overflow-hidden"
                onError={(e) => {
                  e.currentTarget.src = '/placeholder-product.jpg';
                }}
              />
              
              {/* Magnifying Glass Overlay */}
              {showZoomPreview && (
                <div 
                  className="hidden sm:block absolute w-20 h-20 border-2 border-blue-500 bg-white bg-opacity-50 rounded-full pointer-events-none z-10"
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
              
              {/* Zoomed Image Preview - Right Side */}
              {showZoomPreview && (
                <div className="hidden sm:block absolute left-full top-0 ml-4 bg-white rounded-lg shadow-2xl border border-gray-200 z-50 overflow-hidden" style={{ width: '100%', height: '100%' }}>
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
            
            {/* Thumbnail Gallery - Bottom (Mobile only) */}
            {product.images && product.images.length > 1 && (
              <div className="sm:hidden flex gap-2 overflow-x-auto pb-2">
                {product.images.map((image, index) => (
                  <button
                    key={image.id}
                    onClick={() => setSelectedImage(index)}
                    className={`flex-shrink-0 w-16 h-16 overflow-hidden rounded-lg border-2 transition-colors ${
                      selectedImage === index 
                        ? 'border-blue-500' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <img
                      src={image.image_url}
                      alt={image.alt_text || `${product.name} ${index + 1}`}
                      className="h-full w-full object-contain"
                    />
                  </button>
                ))}
              </div>
            )}
            </div>
            
             {/* Zoomed Image Preview - Right Side */}
             {showZoomPreview && (
               <div className="hidden sm:block absolute left-full top-0 ml-4 w-96 h-96 bg-white rounded-lg shadow-2xl border border-gray-200 z-50 overflow-hidden">
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


          {/* Product Info */}
          <div className="space-y-6">
            <div>
              <h1 className="text-xl sm:text-3xl font-bold text-gray-900">{product.name}</h1>
              <div className="mt-2 flex items-center space-x-4">
                <span className="text-xl sm:text-3xl font-bold text-gray-900">₹{product.price.toFixed(2)}</span>
                <span className="text-sm text-gray-500">
                  {product.stock_quantity > 0 ? `${product.stock_quantity} in stock` : 'Out of stock'}
                </span>
              </div>
            </div>


            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium text-gray-900">Category:</span>
                <span className="ml-2 text-gray-600">
                  {typeof product.category === 'string' ? product.category : product.category?.name || 'Unknown'}
                </span>
              </div>
              <div>
                <span className="font-medium text-gray-900">Subcategory:</span>
                <span className="ml-2 text-gray-600">{product.subcategory}</span>
              </div>
            </div>

            {/* Quantity and Actions */}
            <div className="space-y-4">
              <div>
                <label htmlFor="quantity" className="block text-sm font-medium text-gray-700 mb-2">
                  Quantity
                </label>
                <div className="flex items-center">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="w-8 h-8 border border-gray-300 rounded-md flex items-center justify-center hover:bg-gray-50"
                  >
                    -
                  </button>
                  <span className="w-8 text-center text-sm font-medium text-gray-900">
                    {quantity}
                  </span>
                  <button
                    onClick={() => setQuantity(Math.min(product.stock_quantity, quantity + 1))}
                    className="w-8 h-8 border border-gray-300 rounded-md flex items-center justify-center hover:bg-gray-50"
                  >
                    +
                  </button>
                </div>
              </div>

              <div className="flex space-x-4">
                <button
                  onClick={handleAddToCart}
                  disabled={product.stock_quantity === 0 || isAddedToCart}
                  className="flex-1 bg-blue-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                >
                  <CartIcon className="w-5 h-5 flex-shrink-0" />
                  <span>
                    {isAddedToCart ? 'Added to Cart!' : 'Add to Cart'}
                  </span>
                </button>
                <button
                  onClick={handleBuyNow}
                  disabled={product.stock_quantity === 0}
                  className="flex-1 bg-gray-900 text-white py-3 px-6 rounded-lg font-medium hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Buy Now
                </button>
              </div>

              {product.stock_quantity === 0 && (
                <div className="text-center p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-800 font-medium">This product is currently out of stock</p>
                </div>
              )}
            </div>

            {/* Product Features */}
            <div className="border-t border-gray-200 pt-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Product Details</h3>
              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex justify-between">
                  <span>Category:</span>
                  <span>{typeof product.category === 'string' ? product.category : product.category?.name || 'Unknown'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Subcategory:</span>
                  <span>{product.subcategory}</span>
                </div>
                <div className="flex justify-between">
                  <span>Stock:</span>
                  <span>{product.stock_quantity} available</span>
                </div>
                <div className="flex justify-between">
                  <span>Status:</span>
                  <span className={product.is_active ? 'text-green-600' : 'text-red-600'}>
                    {product.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Related Products Section */}
        <div className="mt-16">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Related Products</h2>
            <p className="text-gray-600">You might also like these products</p>
          </div>
          
          {relatedLoading ? (
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-2 text-gray-600">Loading related products...</span>
            </div>
          ) : relatedProducts.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {relatedProducts.map((relatedProduct) => (
                <ProductCard 
                  key={relatedProduct.id} 
                  product={relatedProduct}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500">No related products found.</p>
              <p className="text-sm text-gray-400 mt-2">
                Debug: Related products count: {relatedProducts.length}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}