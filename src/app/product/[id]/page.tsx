'use client';

import { useState, useEffect } from 'react';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase/client';
import CartIcon from '@/components/CartIcon';

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  subcategory: string;
  image_url: string;
  stock_quantity: number;
  is_active: boolean;
}

interface ProductDetailPageProps {
  params: {
    id: string;
  };
}

export default function ProductDetailPage({ params }: ProductDetailPageProps) {
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { addToCart } = useCart();
  const { user } = useAuth();
  const supabase = createClient();

  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [isAddedToCart, setIsAddedToCart] = useState(false);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('products')
          .select('*')
          .eq('id', params.id)
          .eq('is_active', true)
          .single();

        if (error) {
          console.error('Error fetching product:', error);
          setError('Product not found');
          return;
        }

        if (data) {
          setProduct(data);
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
    
    // Check if user is authenticated
    if (!user) {
      const currentUrl = window.location.pathname;
      window.location.href = `/login?redirect=${encodeURIComponent(currentUrl)}`;
      return;
    }
    
    await addToCart(product.id, quantity);
    setIsAddedToCart(true);
    setTimeout(() => setIsAddedToCart(false), 2000);
  };

  const handleBuyNow = () => {
    if (!product) return;
    
    // Check if user is authenticated
    if (!user) {
      const currentUrl = window.location.pathname;
      window.location.href = `/login?redirect=${encodeURIComponent(currentUrl)}`;
      return;
    }
    
    // Add to cart first, then redirect to checkout
    addToCart(product.id, quantity).then(() => {
      window.location.href = '/checkout';
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
          <div className="space-y-4">
            <div className="aspect-square overflow-hidden rounded-lg bg-white">
              <img
                src={product.image_url || '/placeholder-product.jpg'}
                alt={product.name}
                className="h-full w-full object-cover"
              />
            </div>
          </div>

          {/* Product Info */}
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{product.name}</h1>
              <div className="mt-2 flex items-center space-x-4">
                <span className="text-3xl font-bold text-gray-900">${product.price.toFixed(2)}</span>
                <span className="text-sm text-gray-500">
                  {product.stock_quantity > 0 ? `${product.stock_quantity} in stock` : 'Out of stock'}
                </span>
              </div>
            </div>

            <div>
              <h2 className="text-lg font-medium text-gray-900 mb-2">Description</h2>
              <p className="text-gray-600 leading-relaxed">{product.description}</p>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium text-gray-900">Category:</span>
                <span className="ml-2 text-gray-600">{product.category}</span>
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
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="w-10 h-10 border border-gray-300 rounded-md flex items-center justify-center hover:bg-gray-50"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    id="quantity"
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                    min="1"
                    max={product.stock_quantity}
                    className="w-16 text-center border border-gray-300 rounded-md py-2"
                  />
                  <button
                    onClick={() => setQuantity(Math.min(product.stock_quantity, quantity + 1))}
                    className="w-10 h-10 border border-gray-300 rounded-md flex items-center justify-center hover:bg-gray-50"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Login Required Message */}
              {!user && (
                <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-yellow-800 text-sm">
                    <span className="font-medium">Login required:</span> Please sign in to add items to cart or make a purchase.
                  </p>
                  <Link 
                    href="/login" 
                    className="inline-block mt-2 text-blue-600 hover:text-blue-800 text-sm font-medium"
                  >
                    Click here to login →
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
                    {!user ? 'Login to Add to Cart' : 
                     isAddedToCart ? 'Added to Cart!' : 'Add to Cart'}
                  </span>
                </button>
                <button
                  onClick={handleBuyNow}
                  disabled={product.stock_quantity === 0}
                  className="flex-1 bg-gray-900 text-white py-3 px-6 rounded-lg font-medium hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {!user ? 'Login to Buy' : 'Buy Now'}
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
                  <span>{product.category}</span>
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
      </div>
    </div>
  );
}