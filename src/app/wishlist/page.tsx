'use client';

import AuthGuard from '@/components/AuthGuard';
import { useWishlist } from '@/contexts/WishlistContext';
import ProductCard from '@/components/ProductCard';

function WishlistContent() {
  const { wishlist } = useWishlist();
  
  // Debug: Log wishlist data
  // Process wishlist data

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-[1450px] mx-auto w-full px-1 sm:px-4 md:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">My Wishlist</h1>
          <p className="text-gray-600">
            {wishlist.length === 0 
              ? "Your wishlist is empty. Start adding products you love!" 
              : `You have ${wishlist.length} item${wishlist.length === 1 ? '' : 's'} in your wishlist.`
            }
          </p>
        </div>

        {wishlist.length === 0 ? (
          <div className="text-center py-12">
            <svg className="w-24 h-24 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No items in your wishlist</h3>
            <p className="text-gray-500 mb-6">Browse our products and add items you love to your wishlist.</p>
            <a 
              href="/products" 
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 transition-colors"
            >
              Browse Products
            </a>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {wishlist.map((product: any) => (
              <ProductCard 
                key={product.id} 
                product={product as any}
                hideStockOverlay={true}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function WishlistPage() {
  return (
    <AuthGuard>
      <WishlistContent />
    </AuthGuard>
  );
}
