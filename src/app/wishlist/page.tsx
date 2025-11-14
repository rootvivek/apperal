'use client';

import { useWishlist } from '@/contexts/WishlistContext';
import { useAuth } from '@/contexts/AuthContext';
import { useLoginModal } from '@/contexts/LoginModalContext';
import { useEffect } from 'react';
import ProductCard from '@/components/ProductCard';
import Link from 'next/link';

function WishlistContent() {
  const { wishlist, loading } = useWishlist();
  const { user, loading: authLoading } = useAuth();
  const { openModal: openLoginModal } = useLoginModal();
  
  // Open login modal if user is not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      openLoginModal();
    }
  }, [user, authLoading, openLoginModal]);
  
  // Don't show anything if not logged in
  if (!authLoading && !user) {
    return null;
  }
  
  // Only show loading if user is logged in AND actually fetching wishlist data
  if (loading && user && !authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading wishlist...</p>
        </div>
      </div>
    );
  }

  if (wishlist.length === 0) {
    return (
      <div className="h-[calc(100vh-64px)] sm:h-[calc(100vh-72px)] bg-gray-50 flex items-center justify-center px-4 py-8 sm:py-12 overflow-y-auto">
        <div className="max-w-[1450px] mx-auto w-full">
          <div className="text-center">
            <div className="text-gray-400 text-6xl mb-4">❤️</div>
            <h1 className="text-xl sm:text-3xl font-bold text-gray-900 mb-4">Your wishlist is empty</h1>
            <p className="text-base sm:text-lg text-gray-600 mb-8">
              Looks like you haven&apos;t added any items to your wishlist yet.
            </p>
            <Link 
              href="/products" 
              className="inline-flex items-center px-6 py-3 border border-transparent text-sm sm:text-base font-medium rounded text-white bg-brand hover:bg-brand-600"
            >
              Start Shopping
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-[1450px] mx-auto w-full px-1 sm:px-4 md:px-6 lg:px-8 pt-1">
        <div className="mb-8">
          <h1 className="text-xl sm:text-3xl font-bold text-gray-900 mb-2">My Wishlist</h1>
          <p className="text-gray-600">
            {`You have ${wishlist.length} item${wishlist.length === 1 ? '' : 's'} in your wishlist.`}
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {wishlist.map((product: any) => (
            <ProductCard 
              key={product.id} 
              product={product as any}
              hideStockOverlay={true}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function WishlistPage() {
  return <WishlistContent />;
}
