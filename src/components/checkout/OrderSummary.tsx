'use client';

import { useState } from 'react';
import { getProductDetailType } from '@/utils/productDetailsMapping';
import Image from 'next/image';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface OrderItem {
  id?: string;
  product: {
    id: string;
    name: string;
    price: number;
    image_url: string;
  };
  quantity: number;
  size?: string;
}

interface OrderSummaryProps {
  items: OrderItem[];
  subtotal: number;
  shipping: number;
  total: number;
  productSubcategories: Record<string, { name: string | null; slug: string | null; detail_type: string | null }>;
  loading?: boolean;
  isDirectPurchase?: boolean;
}

export function OrderSummary({ items, subtotal, shipping, total, productSubcategories, loading, isDirectPurchase }: OrderSummaryProps) {
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const tax = 0; // Tax is currently 0, but can be calculated if needed

  if (loading) {
    return (
      <Card className="rounded-[4px]">
        <CardContent className="p-2.5">
          <h2 className="text-sm sm:text-lg font-semibold mb-3">Order Summary</h2>
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (items.length === 0) {
    return (
      <Card className="rounded-[4px]">
        <CardContent className="p-2.5">
          <h2 className="text-sm sm:text-lg font-semibold mb-3">Order Summary</h2>
          <div className="text-center py-8">
            <p className="text-muted-foreground">Your cart is empty</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-[4px]">
      <CardContent className="p-2.5">
        <h2 className="text-sm sm:text-lg font-semibold mb-3">Order Summary</h2>
        <div className="space-y-4">
          <div className="space-y-3">
            {items.map((item, index) => {
              const productId = item.product.id;
              const subcategoryInfo = productSubcategories[productId];
              const detailType = subcategoryInfo
                ? getProductDetailType(
                    subcategoryInfo.name,
                    subcategoryInfo.slug,
                    subcategoryInfo.detail_type
                  )
                : 'none';

              return (
                <div key={item.id || `item-${index}`} className="flex items-center space-x-3">
                  <div className="relative w-12 h-12 rounded-md overflow-hidden">
                    <Image
                      src={item.product.image_url || '/placeholder-product.jpg'}
                      alt={item.product.name}
                      fill
                      className="object-cover"
                      sizes="48px"
                    />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-sm font-medium">{item.product.name}</h3>
                    <p className="text-xs text-muted-foreground">
                      Qty: {item.quantity}
                      {detailType === 'apparel' && item.size && (
                        <span className="ml-2">| Size: {item.size}</span>
                      )}
                    </p>
                  </div>
                  <span className="text-sm font-medium">
                    ₹{(item.product.price * item.quantity).toFixed(2)}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="space-y-3 border-t pt-4">
            {/* Accordion for Price Breakdown */}
            <button
              type="button"
              onClick={() => setIsDetailsOpen(!isDetailsOpen)}
              className="w-full flex items-center justify-between text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <span>Price Breakdown</span>
              {isDetailsOpen ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>
            
            {isDetailsOpen && (
              <div className="space-y-2 pl-4 border-l-2 border-gray-200">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-medium">₹{subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Shipping</span>
                  <span className="font-medium">
                    {shipping === 0 ? 'Free' : `₹${shipping.toFixed(2)}`}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Tax</span>
                  <span className="font-medium">₹{tax.toFixed(2)}</span>
                </div>
              </div>
            )}
            
            <div className="border-t pt-3">
              <div className="flex justify-between text-lg font-semibold">
                <span>Total</span>
                <span>₹{total.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

