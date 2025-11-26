'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, User, Heart, X, Package } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useWishlist } from '@/contexts/WishlistContext';
import { useLoginModal } from '@/contexts/LoginModalContext';
import { useCategoryFiltering } from '@/hooks/navigation/useCategoryFiltering';
import { ChevronDownIcon } from './Icons';
import Logo from './Logo';
import SearchBar from './SearchBar';
import { mobileTypography } from '@/utils/mobileTypography';

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onLogout?: () => void;
}

export default function MobileMenu({ isOpen, onClose, onLogout }: MobileMenuProps) {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const { wishlistCount } = useWishlist();
  const { openModal: openLoginModal } = useLoginModal();
  const categoryFiltering = useCategoryFiltering();
  const [openMobileCategoryId, setOpenMobileCategoryId] = useState<string | null>(null);

  const handleLogout = async () => {
    if (onLogout) {
      await onLogout();
    } else {
      await signOut();
    }
    onClose();
  };

  const handleSearch = (query: string) => {
    router.push(`/search?q=${encodeURIComponent(query)}`);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={onClose}
          />

          {/* Slide-in Menu */}
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="fixed top-0 left-0 bottom-0 w-80 max-w-[85vw] bg-white z-50 lg:hidden shadow-2xl overflow-y-auto"
          >
            <div className="p-6 space-y-6">
              {/* Menu Header */}
              <div className="flex items-center justify-between pb-4 border-b border-gray-100">
                <Link href="/" className="flex items-center" onClick={onClose}>
                  <Logo className="h-6 sm:h-8 md:h-10 w-auto" maxWidth="150px" />
                </Link>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-gray-50 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-700" />
                </button>
              </div>

              {/* Mobile Search */}
              <SearchBar
                placeholder="Search products..."
                onSearch={handleSearch}
                onClose={onClose}
              />

              {/* Mobile Categories */}
              <div className="pt-4 border-t border-gray-100">
                <p className="px-4 mb-2 text-sm text-gray-500">Categories</p>
                <div className="space-y-1">
                  {categoryFiltering.categoriesLoading ? (
                    <div className="px-4 py-2 text-sm text-gray-500">Loading categories...</div>
                  ) : (
                    categoryFiltering.categories.map((category) => (
                      <div key={category.id}>
                        <div className="flex items-center justify-between">
                          <Link
                            href={`/products/${category.slug}`}
                            className="flex items-center gap-3 py-3 px-4 text-gray-700 hover:bg-gray-50 rounded-lg transition-colors flex-1"
                            onClick={() => {
                              onClose();
                              setOpenMobileCategoryId(null);
                            }}
                          >
                            <span className="flex-1">{category.name}</span>
                          </Link>
                          {category.subcategories && category.subcategories.length > 0 && (
                            <button
                              onClick={() =>
                                setOpenMobileCategoryId(
                                  openMobileCategoryId === category.id ? null : category.id
                                )
                              }
                              className="p-3 text-gray-500 hover:bg-gray-50 rounded-lg transition-colors"
                            >
                              <ChevronDownIcon
                                className="w-4 h-4"
                                rotated={openMobileCategoryId === category.id}
                              />
                            </button>
                          )}
                        </div>
                        {/* Mobile Subcategories */}
                        {category.subcategories &&
                          category.subcategories.length > 0 &&
                          openMobileCategoryId === category.id && (
                            <div className="ml-4 space-y-1 border-l-2 border-gray-100 pl-2">
                              {category.subcategories.map((subcategory) => {
                                const subcategoryImage =
                                  subcategory.image_url || '/images/categories/placeholder.svg';
                                return (
                                  <Link
                                    key={subcategory.id}
                                    href={`/products/${category.slug}/${subcategory.slug}`}
                                    className="flex items-center gap-3 py-2 px-4 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
                                    onClick={() => {
                                      onClose();
                                      setOpenMobileCategoryId(null);
                                    }}
                                  >
                                    <img
                                      src={subcategoryImage}
                                      alt={subcategory.name}
                                      className="w-8 h-8 object-cover rounded flex-shrink-0"
                                      onError={(e) => {
                                        const target = e.target as HTMLImageElement;
                                        if (
                                          target.src !== '/images/categories/placeholder.svg'
                                        ) {
                                          target.src = '/images/categories/placeholder.svg';
                                        }
                                      }}
                                    />
                                    <span className={mobileTypography.title14}>
                                      {subcategory.name}
                                    </span>
                                  </Link>
                                );
                              })}
                            </div>
                          )}
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Mobile Account Links */}
              <div className="pt-4 border-t border-gray-100 space-y-1">
                {user ? (
                  <>
                    <Link
                      href="/profile"
                      className="flex items-center gap-3 py-3 px-4 text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
                      onClick={onClose}
                    >
                      <User className="w-5 h-5" />
                      My Account
                    </Link>
                    <Link
                      href="/wishlist"
                      className="flex items-center gap-3 py-3 px-4 text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
                      onClick={onClose}
                    >
                      <Heart className="w-5 h-5" />
                      Wishlist
                      {wishlistCount > 0 && (
                        <span
                          className="ml-auto px-2 py-0.5 text-xs text-white rounded-full"
                          style={{ backgroundColor: '#D7882B' }}
                        >
                          {wishlistCount > 9 ? '9+' : wishlistCount}
                        </span>
                      )}
                    </Link>
                    <Link
                      href="/orders"
                      className="flex items-center gap-3 py-3 px-4 text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
                      onClick={onClose}
                    >
                      <Package className="w-5 h-5" />
                      Orders
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-3 py-3 px-4 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <X className="w-5 h-5" />
                      Logout
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => {
                      openLoginModal();
                      onClose();
                    }}
                    className="w-full flex items-center gap-3 py-3 px-4 text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
                  >
                    <User className="w-5 h-5" />
                    Sign In
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

