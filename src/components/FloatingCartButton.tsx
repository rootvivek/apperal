'use client';

import Link from 'next/link';
import { ShoppingCart } from 'lucide-react';
import { useCart } from '@/contexts/CartContext';

export default function FloatingCartButton() {
  const { cartCount } = useCart();

  // Show cart button if there are items in cart
  if (cartCount === 0) {
    return null;
  }

  return (
    <Link 
      href="/cart" 
      className="fixed bottom-6 right-6 z-50 bg-emerald-500 hover:bg-emerald-600 text-white p-3 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-110"
    >
      <div className="relative">
        <ShoppingCart className="w-6 h-6" />
        {cartCount > 0 && (
          <span className="absolute -top-1 -right-1 inline-flex items-center justify-center rounded-full bg-white text-emerald-600 text-[10px] min-w-[16px] h-[16px] px-1 font-semibold">
            {cartCount > 9 ? '9+' : cartCount}
          </span>
        )}
      </div>
    </Link>
  );
}
