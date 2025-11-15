'use client';

import { useWishlist } from '@/contexts/WishlistContext';
import { useAuth } from '@/contexts/AuthContext';
import { useLoginModal } from '@/contexts/LoginModalContext';
import { useEffect } from 'react';
import ProductCard from '@/components/ProductCard';
import Link from 'next/link';
import EmptyState from '@/components/EmptyState';
import LoadingLogo from '@/components/LoadingLogo';
import { PRODUCT_GRID_CLASSES } from '@/utils/layoutUtils';

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
    return <LoadingLogo fullScreen text="Loading wishlist..." />;
  }

  if (wishlist.length === 0) {
    return (
      <div className="h-[calc(100vh-64px)] sm:h-[calc(100vh-72px)] bg-gray-50 flex items-center justify-center px-4 py-8 sm:py-12 overflow-y-auto">
        <div className="max-w-[1450px] mx-auto w-full">
          <EmptyState
            icon="❤️"
            title="Your wishlist is empty"
            description="Looks like you haven't added any items to your wishlist yet."
            actionLabel="Start Shopping"
            actionHref="/products"
            variant="default"
          />
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

        <div className={PRODUCT_GRID_CLASSES}>
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
