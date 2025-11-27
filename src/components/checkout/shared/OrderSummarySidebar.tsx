'use client';

import { Package, Check } from 'lucide-react';
import Image from 'next/image';
import PriceBreakdown from './PriceBreakdown';

interface OrderItem {
  id?: string;
  product: {
    id: string;
    name: string;
    price: number;
    image_url: string;
  };
  quantity: number;
}

interface OrderSummarySidebarProps {
  items: OrderItem[];
  subtotal: number;
  shipping: number;
  tax?: number;
  total: number;
  showTrustBadges?: boolean;
  checkout?: any;
}

export default function OrderSummarySidebar({
  items,
  subtotal,
  shipping,
  tax,
  total,
  showTrustBadges = false,
  checkout,
}: OrderSummarySidebarProps) {
  const itemCount = items.reduce((acc, item) => acc + item.quantity, 0);
  const calculatedTax = tax ?? subtotal * 0.1;

  return (
    <>
      <div className="bg-card rounded-2xl p-3 sm:p-4 lg:p-6 border border-border sticky top-24">
        <div className="flex items-center gap-2 mb-4 sm:mb-6">
          <Package className="w-4 h-4 sm:w-5 sm:h-5" />
          <h2 className="text-base sm:text-lg lg:text-xl">Order Summary</h2>
        </div>
        
        {/* Product List */}
        <div className="space-y-3 sm:space-y-4 mb-0 max-h-64 overflow-y-auto">
          {items.map((item, index) => (
            <div key={item.id || `item-${index}`} className="flex gap-2 sm:gap-3">
              <div className="relative w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 bg-muted rounded-lg overflow-hidden flex-shrink-0">
                <Image
                  src={item.product.image_url || '/placeholder-product.jpg'}
                  alt={item.product.name}
                  fill
                  className="object-cover"
                  sizes="64px"
                />
                <div className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-[10px] sm:text-xs w-4 h-4 sm:w-5 sm:h-5 rounded-full flex items-center justify-center">
                  {item.quantity}
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm line-clamp-2 mb-0.5 sm:mb-1">{item.product.name}</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground">₹{item.product.price.toFixed(2)} each</p>
              </div>
              <p className="text-xs sm:text-sm flex-shrink-0">₹{(item.product.price * item.quantity).toFixed(2)}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Price Breakdown - Separate Card aligned with Shipping Address */}
      <div className="bg-card rounded-2xl p-3 sm:p-4 lg:p-6 border border-border mt-4 sm:mt-6">
        <PriceBreakdown
          subtotal={subtotal}
          shipping={shipping}
          tax={tax}
          total={total}
          itemCount={itemCount}
          showTax={calculatedTax > 0}
        />
      </div>

      {/* Submit Button - Desktop (Outside Card) */}
      {checkout && (
        <div className="hidden lg:block mt-4">
          <button
            type="submit"
            form="checkout-form"
            disabled={checkout.isSubmitting}
            className="w-full bg-primary text-primary-foreground py-4 rounded-xl hover:opacity-90 transition-all flex items-center justify-center gap-2 disabled:opacity-50 text-sm sm:text-base"
          >
            <Check className="w-5 h-5" />
            <span>
              {checkout.isSubmitting
                ? 'Processing...'
                : checkout.paymentMethod === 'cod'
                ? `Place Order (Cash on Delivery) - ₹${checkout.total.toFixed(2)}`
                : checkout.paymentMethod === 'upi'
                ? `Pay with UPI - ₹${checkout.total.toFixed(2)}`
                : `Complete Order - ₹${checkout.total.toFixed(2)}`}
            </span>
          </button>
        </div>
      )}
    </>
  );
}

