'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import { useLoginModal } from '@/contexts/LoginModalContext';
import { getProductDetailType } from '@/utils/productDetailsMapping';
import EmptyState from '@/components/EmptyState';
import LoadingOverlay from '@/components/ui/loading-overlay';
import ImageWithFallback from '@/components/ImageWithFallback';
import { mobileTypography } from '@/utils/mobileTypography';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X } from 'lucide-react';

function CartContent() {
  const { cartItems, loading: cartLoading, updateQuantity, removeFromCart } = useCart();
  const { user, loading: authLoading } = useAuth();
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
    return <LoadingOverlay message="Loading cart..." />;
  }

  if (cartItems.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-2.5">
        <div className="max-w-[1450px] mx-auto w-full">
          <Card className="rounded-[4px]">
            <CardContent className="p-2.5">
              <EmptyState
                icon="🛒"
                title="Your cart is empty"
                description="Looks like you haven't added any items to your cart yet."
                actionLabel="Start Shopping"
                actionHref="/products"
                variant="default"
              />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24 sm:pb-0">
      <div className="max-w-[1450px] mx-auto w-full p-2.5">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-2">
          {/* Cart Items and Order Summary - Combined on Mobile */}
          <div className="lg:col-span-2 space-y-2">
            <Card className="rounded-[4px]">
              <CardContent className="p-2.5">
                <h1 className={`${mobileTypography.h3} sm:text-lg text-gray-900 mb-1`}>Shopping Cart</h1>
                <p className={`${mobileTypography.body12} sm:text-sm text-gray-600`}>{cartItems.length} item(s) in your cart</p>
              </CardContent>
            </Card>
            
            {cartItems.map((item) => (
              <Card key={item.id} className="rounded-[4px]">
                <CardContent className="p-2.5">
                  <div className="flex items-stretch gap-3 sm:gap-4">
                    {/* Product Image - Left Column */}
                    <div className="flex-shrink-0 w-20 h-20 sm:w-32 sm:h-32 aspect-square">
                      <ImageWithFallback
                        className="w-full h-full rounded-[4px] object-cover"
                        src={item.product.image_url || '/placeholder-product.jpg'}
                        alt={item.product.name}
                        loading="lazy"
                        decoding="async"
                        width={80}
                        height={80}
                        fallbackType="product"
                        responsive={true}
                        responsiveSizes={[80, 128, 256]}
                        quality={85}
                      />
                    </div>

                    {/* Product Data - Right Column */}
                    <div className="flex-1 min-w-0 flex flex-col justify-between relative h-20 sm:h-32">
                      {/* Remove Icon - Top Right */}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeFromCart(item.id)}
                        className="absolute top-0 right-0 h-6 w-6 text-gray-400 hover:text-red-600 hover:bg-red-50 z-10"
                        aria-label="Remove item"
                      >
                        <X className="h-4 w-4" />
                      </Button>

                        <div className="pr-6">
                          <h3 className={`${mobileTypography.title14} sm:text-lg text-gray-900 line-clamp-2`}>
                            {item.product.name}
                          </h3>
                          {(() => {
                            const detailType = getProductDetailType(
                              item.product.subcategory?.name,
                              item.product.subcategory?.slug,
                              item.product.subcategory?.detail_type || null
                            );
                            // Only show size for apparel products
                            if (detailType === 'apparel' && item.size) {
                              return (
                                <p className={`${mobileTypography.body12} sm:text-sm text-gray-500`}>
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
                          <Select
                            value={item.quantity.toString()}
                            onValueChange={(value) => {
                              const newQuantity = parseInt(value, 10);
                              if (!isNaN(newQuantity) && newQuantity > 0) {
                                updateQuantity(item.id, newQuantity);
                              }
                            }}
                          >
                            <SelectTrigger className="w-16 h-9 sm:w-20 sm:h-8 text-sm sm:text-base">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {(() => {
                                const maxQuantity = item.product.stock_quantity > 10 ? 10 : item.product.stock_quantity;
                                return Array.from({ length: maxQuantity }, (_, i) => i + 1).map((num) => (
                                  <SelectItem key={num} value={num.toString()}>
                                    {num}
                                  </SelectItem>
                                ));
                              })()}
                            </SelectContent>
                          </Select>
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
                </CardContent>
              </Card>
            ))}

            {/* Order Summary - Mobile */}
            <div className="lg:hidden">
              <Card className="rounded-[4px]">
                <CardContent className="p-2.5 space-y-3">
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
                    <div className="text-xs font-medium text-brand-700 bg-brand-50 border border-brand-200 p-2 rounded">
                      Add ₹{(50 - getSubtotal()).toFixed(2)} more for free shipping!
                    </div>
                  )}
                  <div className="border-t border-gray-200 pt-3">
                    <div className="flex justify-between text-xs sm:text-base">
                      <span className="font-medium text-gray-900">Total</span>
                      <span className="font-bold text-brand">
                        ₹{getTotal().toFixed(2)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Order Summary - Desktop */}
          <div className="hidden lg:block lg:col-span-1">
            <Card className="rounded-[4px] sticky top-4">
              <CardContent className="p-2.5 space-y-3">
                <h2 className="text-sm sm:text-lg font-semibold mb-3">Order Summary</h2>
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
                  <div className="text-xs sm:text-sm font-medium text-brand-700 bg-brand-50 border border-brand-200 p-2 rounded">
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
                <div className="pt-3">
                  {!user && (
                    <Button
                      onClick={() => openLoginModal()}
                      className="w-full mb-2"
                      size="lg"
                    >
                      Login to Checkout
                    </Button>
                  )}
                  {user && (
                    <Button asChild className="w-full" size="lg">
                      <Link href="/checkout">
                        Proceed to Checkout
                      </Link>
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Sticky Checkout Button - Mobile Only */}
        <div className="lg:hidden fixed bottom-0 left-0 right-0 w-full bg-white/50 backdrop-blur-md border-t border-gray-200/30 shadow-lg z-50">
          <div className="p-2.5">
            {!user && (
              <Button
                onClick={() => openLoginModal()}
                className="w-full"
                size="lg"
              >
                Login to Checkout
              </Button>
            )}
            {user && (
              <Button asChild className="w-full" size="lg">
                <Link href="/checkout">
                  Proceed to Checkout
                </Link>
              </Button>
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