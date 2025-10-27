'use client';

import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import CartIcon from './CartIcon';

export default function FloatingCartButton() {
  const { cartCount } = useCart();
  const { user } = useAuth();

  // Show cart button if there are items in cart (whether logged in or not)
  if (cartCount === 0) {
    return null;
  }

  return (
    <Link 
      href="/cart" 
      className="fixed bottom-6 right-6 z-50 bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-110"
    >
      <CartIcon showCount={true} count={cartCount} className="w-6 h-6" />
    </Link>
  );
}
