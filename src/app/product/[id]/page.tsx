'use client';

import { useState, useEffect } from 'react';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
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
    id: string;
  };
}

export default function ProductDetailPage({ params }: ProductDetailPageProps) {
  const [product, setProduct] = useState<ProductCardProduct | null>(null);
  const [relatedProducts, setRelatedProducts] = useState<ProductCardProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [relatedLoading, setRelatedLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { addToCart } = useCart();
  const { user } = useAuth();
  const supabase = createClient();

  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [isAddedToCart, setIsAddedToCart] = useState(false);
  const [showZoomPreview, setShowZoomPreview] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

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
        // Load product data
        const { data: product, error: productError } = await supabase
          .from('products')
          .select('*')
          .eq('id', params.id)
          .eq('is_active', true)
          .single();

        if (productError) {
          console.error('Error fetching product:', productError);
          setError('Product not found');
          return;
        }

        // Load product images (temporarily disabled until table is created)
        let images = null;
        let imagesError = null;
        
        try {
          const result = await supabase
            .from('product_images')
            .select('*')
            .eq('product_id', params.id)
            .order('display_order', { ascending: true });
          
          images = result.data;
          imagesError = result.error;
        } catch (err) {
          console.log('product_images table not found, using fallback');
          images = null;
          imagesError = null;
        }

        if (imagesError) {
          console.error('Error fetching product images:', imagesError);
          // If the table doesn't exist, just continue with empty images array
        }

        if (product) {
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
          
          setProduct(productWithImages as ProductCardProduct);
          // Fetch related products based on category
          const categoryName = typeof product.category === 'string' ? product.category : product.category?.name;
          if (categoryName) {
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

    if (params.id) {
      fetchProduct();
    }
  }, [params.id, supabase]);

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
    notFound();
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-[1450px] mx-auto w-full py-8" style={{ paddingLeft: '6px', paddingRight: '6px' }}>
        {/* Breadcrumb */}
        <nav className="flex mb-8" aria-label="Breadcrumb">
          <ol className="flex items-center space-x-2">
            <li>
              <Link href="/" className="text-gray-500 hover:text-blue-600">Home</Link>
            </li>
            <li className="flex items-center">
              <svg className="w-4 h-4 text-gray-400 mx-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
              <Link href="/products" className="text-gray-500 hover:text-blue-600">Products</Link>
            </li>
            <li className="flex items-center">
              <svg className="w-4 h-4 text-gray-400 mx-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
              <span className="text-gray-900">{product.name}</span>
            </li>
          </ol>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Product Images */}
          <div className="flex gap-4 relative">
            {/* Thumbnail Gallery - Left Side */}
            {product.images && product.images.length > 1 && (
              <div className="flex flex-col gap-2">
                {product.images.map((image, index) => (
                  <button
                    key={image.id}
                    onClick={() => setSelectedImage(index)}
                    className={`w-16 h-16 overflow-hidden rounded-lg border-2 transition-colors ${
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
            
            {/* Main Image */}
            <div 
              className="flex-1 aspect-square overflow-hidden rounded-lg bg-white cursor-crosshair relative sm:cursor-crosshair cursor-default"
              onMouseEnter={() => setShowZoomPreview(true)}
              onMouseLeave={() => setShowZoomPreview(false)}
              onMouseMove={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const x = ((e.clientX - rect.left) / rect.width) * 100;
                const y = ((e.clientY - rect.top) / rect.height) * 100;
                setMousePosition({ x, y });
              }}
            >
              <img
                src={product.images && product.images.length > 0 
                  ? product.images[selectedImage].image_url 
                  : product.image_url || '/placeholder-product.jpg'}
                alt={product.name}
                className="h-full w-full object-contain"
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
            </div>
            
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

          {/* Product Info */}
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{product.name}</h1>
              <div className="mt-2 flex items-center space-x-4">
                <span className="text-3xl font-bold text-gray-900">₹{product.price.toFixed(2)}</span>
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

              {/* Login Required Message */}
              {!user && (
                <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-blue-800 text-sm">
                    <span className="font-medium">💡 Tip:</span> You can add items to cart, but you'll need to login to complete your purchase.
                  </p>
                  <Link 
                    href="/login" 
                    className="inline-block mt-2 text-blue-600 hover:text-blue-800 text-sm font-medium"
                  >
                    Login to save your cart →
                  </Link>
                </div>
              )}

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