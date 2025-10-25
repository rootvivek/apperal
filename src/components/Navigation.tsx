'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { useWishlist } from '@/contexts/WishlistContext';
import { createClient } from '@/lib/supabase/client';
import CartIcon from './CartIcon';
import WishlistIcon from './WishlistIcon';
import SearchBar from './SearchBar';

interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  image_url: string;
  subcategories?: Subcategory[];
}

interface Subcategory {
  id: string;
  name: string;
  slug: string;
  description: string;
  image_url: string;
  parent_category_id: string;
}

export default function Navigation() {
  const { user, signOut, loading, signingOut } = useAuth();
  const { cartCount } = useCart();
  const { wishlistCount } = useWishlist();
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const [dataFetched, setDataFetched] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    // Only fetch data if not already fetched (prevents refetch on refresh)
    if (!dataFetched) {
      fetchCategories();
    }
  }, [dataFetched]);

  useEffect(() => {
    // Close mobile search when clicking outside (but keep open when keyboard is active)
    const handleClickOutside = (event: MouseEvent) => {
      if (showMobileSearch) {
        const target = event.target as Element;
        const searchContainer = document.getElementById('mobile-search-container');
        const searchInput = document.getElementById('mobile-search-input');
        
        if (searchContainer && !searchContainer.contains(target) && !searchInput?.contains(target)) {
          closeMobileSearch();
        }
      }
    };

    if (showMobileSearch) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showMobileSearch]);

  const fetchCategories = async () => {
    try {
      setCategoriesLoading(true);
      
      // ULTRA-FAST: Single database call using optimized function
      const { data: result, error } = await supabase.rpc('get_navigation_categories');

      if (error) {
        console.error('Error fetching categories:', error);
        setCategories([]);
        return;
      }

      setCategories(result || []);
      setDataFetched(true); // Mark data as fetched
    } catch (error) {
      console.error('Error fetching categories:', error);
      setCategories([]);
    } finally {
      setCategoriesLoading(false);
    }
  };

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

  const openMobileSearch = () => {
    setShowMobileSearch(true);
  };

  const closeMobileSearch = () => {
    setShowMobileSearch(false);
  };

  return (
    <nav className="bg-white shadow-sm border-b sticky top-0 z-50">
      <div className={showMobileSearch ? "w-full" : "max-w-[1450px] mx-auto w-full"} style={{ paddingLeft: showMobileSearch ? '0px' : '6px', paddingRight: showMobileSearch ? '0px' : '6px' }}>
        <div className="flex justify-between items-center h-16 sm:h-20 relative">
          {/* Logo */}
          <Link href="/" className={`flex items-center ${showMobileSearch ? 'hidden' : 'flex'}`}>
            <span className="text-2xl sm:text-3xl font-bold text-gray-900 mr-0">Apperal</span>
          </Link>

          {/* Categories Navigation - Hidden on mobile, visible on larger screens */}
          <div className={`hidden lg:flex items-center space-x-6 ml-12 ${showMobileSearch ? 'hidden' : 'flex'}`}>
            {categoriesLoading ? (
              <div className="text-gray-500 text-sm">Loading...</div>
            ) : (
              categories.map((category) => (
                <div key={category.id} className="relative group">
                  <Link
                    href={`/products/${category.slug}`}
                    className="text-gray-700 hover:text-blue-600 text-sm font-medium transition-colors flex items-center"
                  >
                    {category.name}
                    {category.subcategories && category.subcategories.length > 0 && (
                      <svg className="ml-1 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    )}
                  </Link>
                  
                  {/* Subcategories Dropdown */}
                  {category.subcategories && category.subcategories.length > 0 && (
                    <div className="absolute top-full left-0 mt-1 w-48 bg-white rounded-md shadow-lg border border-gray-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                      <div className="py-2">
                        {category.subcategories.map((subcategory) => (
                          <Link
                            key={subcategory.id}
                            href={`/products/${category.slug}/${subcategory.slug}`}
                            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-blue-600 transition-colors"
                          >
                            {subcategory.name}
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Search Bar - Hidden on mobile, visible on larger screens */}
          {!showMobileSearch && <SearchBar variant="desktop" />}

          {/* Mobile Search Bar - Outside of hidden container */}
          {showMobileSearch && (
            <div className="sm:hidden w-full flex items-center px-4">
              <SearchBar variant="mobile" onClose={closeMobileSearch} />
            </div>
          )}

          {/* Right side icons */}
          <div className={`flex items-center space-x-2 sm:space-x-3 h-16 ${showMobileSearch ? 'hidden' : 'flex'}`}>
            {/* Mobile Search Icon */}
            {!showMobileSearch && (
              <button 
                onClick={() => {
                  console.log('Mobile search icon clicked');
                  openMobileSearch();
                }}
                className="sm:hidden text-gray-700 hover:text-blue-600 p-2"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>
            )}

            {/* Wishlist Icon */}
            <Link href="/wishlist" className={`text-gray-700 hover:text-blue-600 nav-wishlist-link flex items-center justify-center h-full p-2 ${showMobileSearch ? 'invisible' : 'visible'}`}>
              <WishlistIcon showCount={true} count={wishlistCount} />
            </Link>
            
            {user && (
              <Link href="/cart" className={`text-gray-700 hover:text-blue-600 nav-cart-link flex items-center justify-center h-full p-2 ${showMobileSearch ? 'invisible' : 'visible'}`}>
                <CartIcon showCount={true} count={cartCount} />
              </Link>
            )}
            
            {/* Auth Section */}
            <div className={`flex items-center space-x-2 sm:space-x-3 ml-1 sm:ml-2 h-full ${showMobileSearch ? 'invisible' : 'visible'}`}>
              {loading ? (
                <div className="text-gray-500 text-xs sm:text-sm flex items-center h-full">Loading...</div>
              ) : user ? (
                <div className="flex items-center space-x-1 sm:space-x-3 h-full">
                  <div className="hidden sm:flex items-center space-x-2 h-full">
                    <svg className="w-5 h-5 sm:w-6 sm:h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    <span className="text-gray-700 text-xs sm:text-sm">
                      Welcome, {getUserDisplayName()}
                    </span>
                  </div>
                  <button
                    onClick={() => signOut()}
                    disabled={signingOut}
                    className="text-gray-700 hover:text-blue-600 px-2 sm:px-3 py-1 sm:py-2 rounded-md text-xs sm:text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center h-full"
                  >
                    {signingOut ? 'Signing Out...' : 'Sign Out'}
                  </button>
                </div>
              ) : (
                <>
                  {/* Mobile: User Icon */}
                  <Link
                    href="/login"
                    className="sm:hidden text-gray-700 hover:text-blue-600 p-2"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </Link>
                  
                  {/* Desktop: Sign In and Sign Up buttons */}
                  <div className="hidden sm:flex items-center space-x-2">
                    <Link
                      href="/login"
                      className="text-gray-700 hover:text-blue-600 px-2 sm:px-3 py-1 sm:py-2 rounded-md text-xs sm:text-sm font-medium transition-colors"
                    >
                      Sign In
                    </Link>
                    <Link
                      href="/signup"
                      className="bg-blue-600 text-white px-3 sm:px-4 py-1 sm:py-2 rounded-md text-xs sm:text-sm font-medium hover:bg-blue-700 transition-colors"
                    >
                      Sign Up
                    </Link>
                  </div>
                </>
              )}
              </div>
          </div>
        </div>
      </div>

    </nav>
  );
}