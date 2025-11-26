'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Heart, ArrowRight, ShoppingCart, Sparkles } from 'lucide-react';
import { useWishlist } from '@/contexts/WishlistContext';
import { useAuth } from '@/contexts/AuthContext';
import { useLoginModal } from '@/contexts/LoginModalContext';
import ProductCard from '@/components/ProductCard';
import LoadingOverlay from '@/components/ui/loading-overlay';

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
    return <LoadingOverlay message="Loading wishlist..." />;
  }

  if (wishlist.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-12">
            <h1 className="text-gray-900 mb-2">My Wishlist</h1>
            <p className="text-gray-600">Save your favorite items for later</p>
          </div>

          {/* Empty State */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="bg-white rounded-3xl p-12 md:p-16 text-center shadow-sm"
          >
            {/* Icon */}
            <div className="mb-8 flex justify-center">
              <div className="relative">
                <div 
                  className="w-32 h-32 rounded-full flex items-center justify-center"
                  style={{ background: 'linear-gradient(135deg, #D7882B 0%, #B87024 100%)' }}
                >
                  <Heart className="w-16 h-16 text-white fill-white" />
                </div>
                
                {/* Floating sparkles */}
                <motion.div
                  animate={{ 
                    y: [0, -10, 0],
                    rotate: [0, 5, 0]
                  }}
                  transition={{ 
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                  className="absolute -top-2 -right-4"
                >
                  <Sparkles className="w-8 h-8" style={{ color: '#D7882B' }} />
                </motion.div>
                
                <motion.div
                  animate={{ 
                    y: [0, -8, 0],
                    rotate: [0, -5, 0]
                  }}
                  transition={{ 
                    duration: 2.5,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: 0.5
                  }}
                  className="absolute -bottom-2 -left-4"
                >
                  <Sparkles className="w-6 h-6" style={{ color: '#D7882B' }} />
                </motion.div>
              </div>
            </div>

            {/* Text Content */}
            <h2 className="text-gray-900 mb-4">Your Wishlist is Empty</h2>
            <p className="text-gray-600 max-w-md mx-auto mb-8">
              You haven't saved any favorites yet. Start exploring and add items you love to your wishlist!
            </p>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link 
                href="/products"
                className="px-8 py-4 text-white rounded-xl hover:shadow-xl transition-all hover:scale-105 flex items-center gap-2"
                style={{ backgroundColor: '#D7882B' }}
              >
                Discover Products
                <ArrowRight className="w-5 h-5" />
              </Link>
              <Link 
                href="/cart"
                className="px-8 py-4 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-all flex items-center gap-2"
              >
                <ShoppingCart className="w-5 h-5" />
                View Cart
              </Link>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-gray-900 mb-2">My Wishlist</h1>
          <p className="text-gray-600">
            {`You have ${wishlist.length} item${wishlist.length === 1 ? '' : 's'} in your wishlist.`}
          </p>
        </div>

        {/* Products Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-6">
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
