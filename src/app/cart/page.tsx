'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import { useLoginModal } from '@/contexts/LoginModalContext';
import { getProductDetailType } from '@/utils/productDetailsMapping';
import EmptyState from '@/components/EmptyState';
import LoadingLogo from '@/components/LoadingLogo';

function CartContent() {
  const { cartItems, loading: cartLoading, updateQuantity, removeFromCart } = useCart();
  const { user, authLoading } = useAuth();
  const { openModal: openLoginModal } = useLoginModal();

  // Scroll to top on mount and ensure it happens after render
  useEffect(() => {
    // Use setTimeout to ensure scroll happens after DOM is fully rendered
    const scrollToTop = () => {
      // Try multiple methods to ensure scroll works
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
      if (document.documentElement) {
        document.documentElement.scrollTop = 0;
      }
      if (document.body) {
        document.body.scrollTop = 0;
      }
    };
    
    // Immediate scroll
    scrollToTop();
    
    // Also scroll after delays to handle any layout shifts
    const timeoutId1 = setTimeout(scrollToTop, 50);
    const timeoutId2 = setTimeout(scrollToTop, 100);
    const timeoutId3 = setTimeout(scrollToTop, 200);
    
    return () => {
      clearTimeout(timeoutId1);
      clearTimeout(timeoutId2);
      clearTimeout(timeoutId3);
    };
  }, []);

  const getSubtotal = () => {
    return cartItems.reduce((total, item) => total + (item.product.price * item.quantity), 0);
  };

  const getShipping = () => {
    const subtotal = getSubtotal();
    return subtotal >= 50 ? 0 : 0;
  };

  const getTotal = () => {
    return getSubtotal() + getShipping();
  };

  // Only show loading if user is logged in AND cart is loading
  // Guest users don't need to wait for cart loading since it's from localStorage
  if (cartLoading && user && !authLoading) {
    return <LoadingLogo fullScreen text="Loading cart..." />;
  }

  if (cartItems.length === 0) {
    return (
      <div className="h-[calc(100vh-64px)] sm:h-[calc(100vh-72px)] bg-gray-50 flex items-center justify-center px-4 py-8 sm:py-12 overflow-y-auto">
        <div className="max-w-[1450px] mx-auto w-full">
          <EmptyState
            icon="🛒"
            title="Your cart is empty"
            description="Looks like you haven't added any items to your cart yet."
            actionLabel="Start Shopping"
            actionHref="/products"
            variant="default"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24 sm:pb-0">
      <div className="max-w-[1450px] mx-auto w-full px-0 sm:px-4 md:px-6 lg:px-8 pt-1">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-8">
          {/* Cart Items and Order Summary - Combined on Mobile */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded shadow-sm border">
              {/* Cart Heading */}
              <div className="px-3 sm:px-6 py-3 sm:py-4 border-b border-gray-200">
                <h1 className="text-lg sm:text-3xl font-bold text-gray-900">Shopping Cart</h1>
                <p className="mt-1 sm:mt-2 text-sm sm:text-base text-gray-600">{cartItems.length} item(s) in your cart</p>
              </div>
              <div className="border-b border-gray-200 md:hidden"></div>
              <div className="px-0 py-3 sm:py-4 border-b border-gray-200 hidden md:block">
                <h2 className="text-base sm:text-lg font-medium text-gray-900 px-3 sm:px-6">Cart Items</h2>
              </div>
              <div className="divide-y divide-gray-200">
                {cartItems.map((item) => (
                  <div key={item.id} className="px-0 py-3 sm:py-6">
                    <div className="flex items-stretch gap-3 sm:gap-4 px-3 sm:px-6">
                      {/* Product Image - Left Column */}
                      <div className="flex-shrink-0 w-28 h-28 sm:w-32 sm:h-32 aspect-square">
                        <img
                          className="w-full h-full rounded object-cover"
                          src={item.product.image_url || '/placeholder-product.jpg'}
                          alt={item.product.name}
                          loading="lazy"
                          decoding="async"
                          width={128}
                          height={128}
                        />
                      </div>

                      {/* Product Data - Right Column */}
                      <div className="flex-1 min-w-0 flex flex-col justify-between relative h-28 sm:h-32">
                        {/* Remove Icon - Top Right */}
                        <button
                          onClick={() => removeFromCart(item.id)}
                          className="absolute top-0 right-0 text-gray-400 hover:text-red-600 transition-colors z-10"
                          aria-label="Remove item"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>

                        <div className="pr-6">
                          <h3 className="text-sm sm:text-lg font-medium text-gray-900 line-clamp-2">
                            {item.product.name}
                          </h3>
                          <p className="text-xs sm:text-sm text-gray-500 mt-1">
                            Stock: {item.product.stock_quantity} available
                          </p>
                          {(() => {
                            const detailType = getProductDetailType(
                              item.product.subcategory?.name,
                              item.product.subcategory?.slug,
                              item.product.subcategory?.detail_type || null
                            );
                            // Only show size for apparel products
                            if (detailType === 'apparel' && item.size) {
                              return (
                                <p className="text-xs sm:text-sm text-gray-500">
                                  Size: {item.size}
                                </p>
                              );
                            }
                            return null;
                          })()}
                        </div>

                        {/* Quantity and Price - Bottom of Data Column */}
                        <div className="flex items-center justify-between mt-3 sm:mt-4">
                          {/* Quantity Controls */}
                          <div className="flex items-center">
                            <select
                              value={item.quantity}
                              onChange={(e) => {
                                const newQuantity = parseInt(e.target.value, 10);
                                if (!isNaN(newQuantity) && newQuantity > 0) {
                                  updateQuantity(item.id, newQuantity);
                                }
                              }}
                              className="w-16 h-9 sm:w-20 sm:h-8 border border-gray-300 rounded px-2 text-sm sm:text-base font-medium text-gray-900 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent cursor-pointer"
                            >
                              {(() => {
                                const maxQuantity = item.product.stock_quantity > 10 ? 10 : item.product.stock_quantity;
                                return Array.from({ length: maxQuantity }, (_, i) => i + 1).map((num) => (
                                  <option key={num} value={num}>
                                    {num}
                                  </option>
                                ));
                              })()}
                            </select>
                          </div>

                          {/* Price - Bottom Right */}
                          <div>
                            <span className="text-sm sm:text-lg font-semibold text-gray-900">
                              ₹{item.product.price.toFixed(2)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Order Summary - Mobile (Inside same frame) */}
              <div className="lg:hidden border-t border-gray-200">
                <div className="px-3 py-3 space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Subtotal</span>
                    <span className="font-medium">₹{getSubtotal().toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Shipping</span>
                    <span className="font-medium">
                      {getShipping() === 0 ? 'Free' : `₹${getShipping().toFixed(2)}`}
                    </span>
                  </div>
                  {getSubtotal() < 50 && (
                    <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
                      Add ₹{(50 - getSubtotal()).toFixed(2)} more for free shipping!
                    </div>
                  )}
                  <div className="border-t border-gray-200 pt-3">
                    <div className="flex justify-between text-base">
                      <span className="font-medium text-gray-900">Total</span>
                      <span className="font-bold text-brand">
                        ₹{getTotal().toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* Order Summary - Desktop */}
          <div className="hidden lg:block lg:col-span-1">
            <div className="bg-white rounded shadow-sm border sticky top-4">
              <div className="px-0 py-3 sm:py-4 border-b border-gray-200">
                <h2 className="text-base sm:text-lg font-medium text-gray-900 px-3 sm:px-6">Order Summary</h2>
              </div>
              <div className="px-3 sm:px-6 py-2 sm:py-3 space-y-3 sm:space-y-4">
                <div className="flex justify-between text-sm sm:text-base">
                  <span className="text-gray-600">Subtotal</span>
                  <span className="font-medium">₹{getSubtotal().toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm sm:text-base">
                  <span className="text-gray-600">Shipping</span>
                  <span className="font-medium">
                    {getShipping() === 0 ? 'Free' : `₹${getShipping().toFixed(2)}`}
                  </span>
                </div>
                {getSubtotal() < 50 && (
                  <div className="text-xs sm:text-sm text-gray-500 bg-gray-50 p-2 rounded">
                    Add ₹{(50 - getSubtotal()).toFixed(2)} more for free shipping!
                  </div>
                )}
                <div className="border-t border-gray-200 pt-3 sm:pt-4">
                  <div className="flex justify-between text-base sm:text-lg">
                    <span className="font-medium text-gray-900">Total</span>
                    <span className="font-medium text-brand">
                      ₹{getTotal().toFixed(2)}
                    </span>
                  </div>
                </div>
                <div className="pt-3 sm:pt-4">
                  {!user && (
                    <button
                      onClick={() => openLoginModal()}
                      className="w-full bg-brand text-white py-3 px-4 rounded font-medium hover:bg-brand-600 active:bg-brand-700 transition-colors text-center block mb-2 text-sm sm:text-base"
                    >
                      Login to Checkout
                    </button>
                  )}
                  {user && (
                    <Link
                      href="/checkout"
                      className="w-full bg-brand text-white py-3 px-4 rounded font-medium hover:bg-brand-600 active:bg-brand-700 transition-colors text-center block text-sm sm:text-base"
                    >
                      Proceed to Checkout
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sticky Checkout Button - Mobile Only */}
        <div className="lg:hidden fixed bottom-0 left-0 right-0 w-full bg-white/50 backdrop-blur-md border-t border-gray-200/30 shadow-lg z-50" style={{ position: 'fixed', bottom: 0, left: 0, right: 0 }}>
          <div className="px-3 py-4">
            {!user && (
              <button
                onClick={() => openLoginModal()}
                className="w-full bg-brand text-white py-4 px-4 rounded-md font-semibold hover:bg-brand-600 active:bg-brand-700 transition-colors text-center block text-sm"
              >
                Login to Checkout
              </button>
            )}
            {user && (
              <Link
                href="/checkout"
                className="w-full bg-brand text-white py-4 px-4 rounded-md font-semibold hover:bg-brand-600 active:bg-brand-700 transition-colors text-center block text-sm"
              >
                Proceed to Checkout
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CartPage() {
  return <CartContent />;
}