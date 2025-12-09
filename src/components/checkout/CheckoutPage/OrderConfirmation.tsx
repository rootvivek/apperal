'use client';

import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { Check, CreditCard, Wallet, Building2, Package, MapPin, Phone } from 'lucide-react';
import { CheckoutFormData } from '@/lib/schemas/checkout';
import Image from 'next/image';

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
interface OrderConfirmationProps {
  orderNumber: string;
  orderId?: string;
  formData: CheckoutFormData;
  orderedItems: OrderItem[];
  subtotal: number;
  total: number;
}

export default function OrderConfirmation({
  orderNumber,
  orderId,
  formData,
  orderedItems,
  subtotal,
  total,
}: OrderConfirmationProps) {
  const router = useRouter();
  const estimatedDelivery = new Date();
  estimatedDelivery.setDate(estimatedDelivery.getDate() + 5);

  return (
    <div className="min-h-screen bg-background pt-2 sm:pt-4 pb-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Success Animation */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center mb-8"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
            className="relative w-24 h-24 sm:w-28 sm:h-28 lg:w-32 lg:h-32 mx-auto mb-6"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.1 }}
              className="absolute inset-0 bg-green-500/20 rounded-full"
            />
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.15 }}
              className="absolute inset-3 sm:inset-4 bg-green-500/40 rounded-full"
            />
            <div className="absolute inset-6 sm:inset-7 lg:inset-8 bg-green-500 rounded-full flex items-center justify-center">
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 0.3, type: 'spring' }}
              >
                <Check className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 text-white" strokeWidth={3} />
              </motion.div>
            </div>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="text-xl sm:text-2xl lg:text-3xl mb-3"
          >
            Order Confirmed!
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="text-sm sm:text-base lg:text-lg text-muted-foreground"
          >
            Thank you for your purchase, {formData.fullName?.split(' ')[0] || 'Customer'}!
          </motion.p>
        </motion.div>

        {/* Order Number Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-2xl border border-border p-6 mb-6"
        >
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <p className="text-xs sm:text-sm text-muted-foreground mb-1">Order Number</p>
              <p className="text-lg sm:text-xl lg:text-2xl">#{orderNumber}</p>
            </div>
            <div className="flex gap-2 sm:gap-3">
              <div className="bg-card px-3 py-2 sm:px-4 sm:py-3 rounded-lg border border-border">
                <p className="text-[10px] sm:text-xs text-muted-foreground mb-1">Order Date</p>
                <p className="text-xs sm:text-sm">{new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
              </div>
              <div className="bg-card px-3 py-2 sm:px-4 sm:py-3 rounded-lg border border-border">
                <p className="text-[10px] sm:text-xs text-muted-foreground mb-1">Est. Delivery</p>
                <p className="text-xs sm:text-sm text-green-500">{estimatedDelivery.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Order Items & Shipping Address in One Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="bg-card rounded-2xl border border-border shadow-lg mb-6"
        >
          {/* Order Items Section */}
          <div className="p-4 sm:p-6 border-b border-border">
            <h3 className="text-base sm:text-lg mb-3 sm:mb-4 flex items-center gap-2">
              <Package className="w-3.5 h-3.5 sm:w-4 sm:h-4 lg:w-5 lg:h-5" />
              Order Items
            </h3>
            <div className="space-y-3 sm:space-y-4">
              {orderedItems.map((item, index) => (
                <div key={item.id || `item-${index}`} className="flex gap-3 sm:gap-4">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 bg-muted rounded-lg overflow-hidden flex-shrink-0 relative">
                    <Image
                      src={item.product.image_url || '/placeholder-product.jpg'}
                      alt={item.product.name}
                      fill
                      className="object-cover"
                      sizes="80px"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="mb-1 text-sm sm:text-base font-medium">{item.product.name}</p>
                    <p className="text-xs sm:text-sm text-muted-foreground">Quantity: {item.quantity}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm sm:text-base font-medium">₹{(item.product.price * item.quantity).toFixed(2)}</p>
                    <p className="text-xs sm:text-sm text-muted-foreground">₹{item.product.price.toFixed(2)} each</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Shipping Address Section */}
          <div className="p-4 sm:p-6">
            <h3 className="text-base sm:text-lg mb-3 sm:mb-4 flex items-center gap-2">
              <MapPin className="w-3.5 h-3.5 sm:w-4 sm:h-4 lg:w-5 lg:h-5" />
              Shipping Address
            </h3>
            <div className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm">
              <p className="font-medium">{formData.fullName}</p>
              <p className="text-muted-foreground break-words">{formData.address}</p>
              <p className="text-muted-foreground">
                {formData.city}, {formData.state} {formData.zipCode}
              </p>
              {formData.phone && (
                <p className="text-muted-foreground mt-2 sm:mt-3 flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                  <span>{formData.phone}</span>
                </p>
              )}
            </div>
          </div>
        </motion.div>

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="flex flex-col sm:flex-row gap-4"
        >
          <button
            onClick={() => router.push('/')}
            className="flex-1 border-2 border-border px-6 py-3 sm:px-8 sm:py-4 rounded-xl hover:border-primary transition-colors text-sm sm:text-base"
          >
            Continue Shopping
          </button>
          <button
            onClick={() => {
              if (orderId) {
                router.push(`/orders/${orderId}`);
              } else {
                // Fallback: try to find order by order number
                router.push(`/orders?orderNumber=${encodeURIComponent(orderNumber)}`);
              }
            }}
            className="flex-1 bg-primary text-primary-foreground px-6 py-3 sm:px-8 sm:py-4 rounded-xl hover:opacity-90 transition-opacity text-sm sm:text-base"
          >
            Track Order
          </button>
        </motion.div>
      </div>
    </div>
  );
}

