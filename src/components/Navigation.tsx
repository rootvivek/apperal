'use client';

import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { useWishlist } from '@/contexts/WishlistContext';
import CartIcon from './CartIcon';
import WishlistIcon from './WishlistIcon';

export default function Navigation() {
  const { user, signOut, loading, signingOut } = useAuth();
  const { cartCount } = useCart();
  const { wishlistCount } = useWishlist();

  // Helper function to get user display name
  const getUserDisplayName = () => {
    if (!user) return '';
    
    // Try to get name from user_metadata first
    const firstName = user.user_metadata?.first_name;
    const lastName = user.user_metadata?.last_name;
    
    if (firstName && lastName) {
      return `${firstName} ${lastName}`;
    } else if (firstName) {
      return firstName;
    } else if (lastName) {
      return lastName;
    }
    
    // Fallback to email if no name is available
    return user.email || 'User';
  };

  return (
    <nav className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center">
            <span className="text-2xl font-bold text-gray-900">Apperal</span>
          </Link>

          {/* Search Bar - Full Width */}
          <div className="flex-1 mx-8">
            <div className="relative">
              <input
                type="text"
                placeholder="Search products..."
                className="w-full px-4 py-2 pl-10 pr-4 text-gray-700 bg-gray-100 border border-gray-300 rounded-[999px] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>
          </div>

          {/* Right side icons */}
          <div className="flex items-center space-x-3 h-16">
            {/* Wishlist Icon */}
            <Link href="/wishlist" className="text-gray-700 hover:text-blue-600 nav-wishlist-link flex items-center justify-center h-full p-2">
              <WishlistIcon showCount={true} count={wishlistCount} />
            </Link>
            
            {user && (
              <Link href="/cart" className="text-gray-700 hover:text-blue-600 nav-cart-link flex items-center justify-center h-full p-2">
                <CartIcon showCount={true} count={cartCount} />
              </Link>
            )}
            
            {/* Auth Section */}
            <div className="hidden md:flex items-center space-x-3 ml-2 h-full">
              {loading ? (
                <div className="text-gray-500 text-sm flex items-center h-full">Loading...</div>
              ) : user ? (
                <div className="flex items-center space-x-3 h-full">
                  <div className="flex items-center space-x-2 h-full">
                    <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    <span className="text-gray-700 text-sm">
                      Welcome, {getUserDisplayName()}
                    </span>
                  </div>
                  <button
                    onClick={() => signOut()}
                    disabled={signingOut}
                    className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center h-full"
                  >
                    {signingOut ? 'Signing Out...' : 'Sign Out'}
                  </button>
                </div>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                  >
                    Sign In
                  </Link>
                  <Link
                    href="/signup"
                    className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 transition-colors"
                  >
                    Sign Up
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}