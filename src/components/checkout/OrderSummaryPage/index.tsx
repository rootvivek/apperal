'use client';

import { motion } from 'framer-motion';
import { useRouter, useSearchParams } from 'next/navigation';
import { ShoppingCart, Trash2, Plus, Minus, Tag } from 'lucide-react';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import { useLoginModal } from '@/contexts/LoginModalContext';
import { useDirectPurchase } from '@/hooks/useDirectPurchase';
import { getProductDetailType } from '@/utils/productDetailsMapping';
import Image from 'next/image';
import EmptyState from '../shared/EmptyState';
import LoadingState from '../shared/LoadingState';
import PriceBreakdown from '../shared/PriceBreakdown';
import { calculateOrderTotals, getItemCount } from '../shared/utils';

export default function OrderSummaryPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { cartItems, loading: cartLoading, updateQuantity, removeFromCart } = useCart();
  const { user } = useAuth();
  const { openModal: openLoginModal } = useLoginModal();
  const { items: directPurchaseItems, isDirectPurchase, loading: loadingDirectProduct } = useDirectPurchase();

  // Determine items to show - prioritize direct purchase
  const items = isDirectPurchase ? directPurchaseItems : cartItems;
  const isLoading = isDirectPurchase ? loadingDirectProduct : cartLoading;
  const itemCount = getItemCount(items);
  const { subtotal, shipping, tax, total } = calculateOrderTotals(items);

  const handleQuantityChange = (cartItemId: string, currentQuantity: number, newQuantity: number) => {
    if (newQuantity < 1) {
      removeFromCart(cartItemId);
    } else {
      updateQuantity(cartItemId, newQuantity);
    }
  };

  const handleCheckout = () => {
    if (!user) {
      openLoginModal();
      return;
    }
    
    if (isDirectPurchase) {
      const params = new URLSearchParams();
      params.set('direct', 'true');
      ['productId', 'quantity', 'size'].forEach(key => {
        const value = searchParams.get(key);
        if (value) params.set(key, value);
      });
      router.push(`/checkout?${params.toString()}`);
    } else {
      router.push('/checkout');
    }
  };

  const handleBack = () => {
    router.push('/');
  };

  if (isLoading) {
    return <LoadingState message={isDirectPurchase ? "Loading product..." : "Loading cart..."} />;
  }

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-3 sm:px-4">
        <div className="max-w-7xl mx-auto w-full">
          <EmptyState
            icon={ShoppingCart}
            title="Your Cart is Empty"
            description="Looks like you haven't added any items to your cart yet."
            actionLabel="Start Shopping"
            onAction={handleBack}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pt-4 sm:pt-8 pb-20 sm:pb-12 px-3 sm:px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-3 sm:mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl sm:text-2xl lg:text-3xl mb-1 sm:mb-2">{isDirectPurchase ? 'Order Summary' : 'Shopping Cart'}</h1>
              <p className="text-sm sm:text-base text-muted-foreground">
                {isDirectPurchase 
                  ? `${itemCount} item${itemCount > 1 ? 's' : ''} in your order`
                  : `${itemCount} items in your cart`
                }
              </p>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-4">
            {items.map((item, index) => {
              const detailType = !isDirectPurchase ? getProductDetailType(
                item.product.subcategory?.name,
                item.product.subcategory?.slug,
                item.product.subcategory?.detail_type || null
              ) : (item.size ? 'apparel' : 'none');

              // Create a unique key combining multiple identifiers
              const uniqueKey = item.id 
                ? `${item.id}-${item.product.id}${item.size ? `-${item.size}` : ''}`
                : `item-${item.product.id}-${index}${item.size ? `-${item.size}` : ''}`;

              return (
                <motion.div
                  key={uniqueKey}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-card rounded-2xl p-2 sm:p-3 lg:p-4 border border-border"
                >
                  <div className="flex gap-2 sm:gap-3 lg:gap-4">
                    {/* Product Image */}
                    <div className="w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 bg-muted rounded-lg overflow-hidden flex-shrink-0 relative">
                      <Image
                        src={item.product.image_url || '/placeholder-product.jpg'}
                        alt={item.product.name}
                        fill
                        className="object-cover"
                        sizes="96px"
                      />
                    </div>

                    {/* Product Details */}
                    <div className="flex-1 min-w-0 flex flex-col justify-between">
                      <div className="flex items-start justify-between gap-2 mb-1.5 sm:mb-2">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-xs sm:text-sm lg:text-base mb-1 break-words">{item.product.name}</h3>
                          {!isDirectPurchase && item.product.subcategory && (
                            <div className="flex items-center gap-1 sm:gap-1.5 mb-1 flex-wrap">
                              <span className="inline-flex items-center gap-1 bg-primary/10 text-primary px-1.5 py-0.5 sm:px-2 sm:py-0.5 rounded-full text-[10px] sm:text-xs whitespace-nowrap">
                                <Tag className="w-2 h-2 sm:w-2.5 sm:h-2.5" />
                                {item.product.subcategory.name}
                              </span>
                            </div>
                          )}
                          {(detailType === 'apparel' || isDirectPurchase) && item.size && (
                            <p className="text-[10px] sm:text-xs text-muted-foreground mb-1">
                              Size: {item.size}
                            </p>
                          )}
                        </div>

                        {/* Remove Button - only for cart items */}
                        {!isDirectPurchase && (
                          <button
                            onClick={() => removeFromCart(item.id)}
                            className="p-1 sm:p-1.5 hover:bg-destructive/10 rounded-lg transition-colors group flex-shrink-0"
                            aria-label="Remove item"
                          >
                            <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground group-hover:text-destructive transition-colors" />
                          </button>
                        )}
                      </div>

                      {/* Price and Quantity */}
                      <div className="flex items-center justify-between gap-2 mt-auto">
                        {!isDirectPurchase ? (
                          <div className="flex items-center gap-1.5 sm:gap-2 border border-border rounded-lg p-0.5 flex-shrink-0">
                            <button
                              onClick={() => handleQuantityChange(item.id, item.quantity, item.quantity - 1)}
                              className="w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center hover:bg-accent rounded-lg transition-colors"
                            >
                              <Minus className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                            </button>
                            <span className="w-8 sm:w-10 text-center text-xs sm:text-sm">{item.quantity}</span>
                            <button
                              onClick={() => handleQuantityChange(item.id, item.quantity, item.quantity + 1)}
                              disabled={item.quantity >= item.product.stock_quantity}
                              className="w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center hover:bg-accent rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <Plus className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <div className="text-[10px] sm:text-xs text-muted-foreground">
                            Quantity: {item.quantity}
                          </div>
                        )}

                        <div className="text-right flex-shrink-0">
                          <p className="text-base sm:text-lg lg:text-xl text-primary whitespace-nowrap">₹{(item.product.price * item.quantity).toFixed(2)}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}

          </div>

          {/* Order Summary Sidebar */}
          <div className="lg:col-span-1">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-card rounded-xl p-3 sm:p-4 lg:p-6 border border-border sticky top-24"
            >
              <h2 className="text-lg sm:text-xl mb-4 sm:mb-6">Order Details</h2>

              {/* Price Breakdown */}
              <PriceBreakdown
                subtotal={subtotal}
                shipping={shipping}
                tax={tax}
                total={total}
                itemCount={itemCount}
                showTax={true}
              />
            </motion.div>

            {/* Checkout Button - Outside Card (Desktop) */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="hidden lg:block mt-3 sm:mt-4"
            >
              {!user ? (
                <button
                  onClick={() => openLoginModal()}
                  className="w-full bg-primary text-primary-foreground py-3 sm:py-4 rounded-xl hover:opacity-90 transition-opacity flex items-center justify-center gap-2 text-sm sm:text-base"
                >
                  <ShoppingCart className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span>Login to Checkout</span>
                </button>
              ) : (
                <button
                  onClick={handleCheckout}
                  className="w-full bg-primary text-primary-foreground py-3 sm:py-4 rounded-xl hover:opacity-90 transition-opacity flex items-center justify-center gap-2 text-sm sm:text-base"
                >
                  <ShoppingCart className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span>Proceed to Checkout</span>
                </button>
              )}
            </motion.div>
          </div>
        </div>

        {/* Checkout Button - Fixed Bottom (Mobile) */}
        <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 p-3 sm:p-4 bg-background border-t border-border shadow-lg">
          {!user ? (
            <button
              onClick={() => openLoginModal()}
              className="w-full bg-primary text-primary-foreground py-3 rounded-xl hover:opacity-90 transition-opacity flex items-center justify-center gap-2 text-sm sm:text-base"
            >
              <ShoppingCart className="w-4 h-4 sm:w-5 sm:h-5" />
              <span>Login to Checkout</span>
            </button>
          ) : (
            <button
              onClick={handleCheckout}
              className="w-full bg-primary text-primary-foreground py-3 rounded-xl hover:opacity-90 transition-opacity flex items-center justify-center gap-2 text-sm sm:text-base"
            >
              <ShoppingCart className="w-4 h-4 sm:w-5 sm:h-5" />
              <span>Proceed to Checkout</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

