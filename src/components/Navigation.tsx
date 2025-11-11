'use client';

import Link from 'next/link';
import { useState, useEffect, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
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
  parent_category_id?: string | null;
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
  const pathname = usePathname();
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const [dataFetched, setDataFetched] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [userFullName, setUserFullName] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    // Only fetch data if not already fetched (prevents refetch on refresh)
    if (!dataFetched) {
      fetchCategories();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataFetched]);

  // Fetch user's full name from Supabase profile
  const fetchUserFullName = useCallback(async () => {
    if (!user?.id) {
      setUserFullName(null);
      return;
    }

        try {
          const { data, error } = await supabase
            .from('user_profiles')
            .select('full_name')
            .eq('id', user.id)
            .maybeSingle();

      if (!error && data?.full_name) {
        setUserFullName(data.full_name);
      } else {
        setUserFullName(null);
      }
    } catch (error) {
      console.error('Error fetching user full name:', error);
      setUserFullName(null);
    }
  }, [user?.id, supabase]);

  useEffect(() => {
    fetchUserFullName();
  }, [fetchUserFullName]);

  // Listen for profile updates
  useEffect(() => {
    const handleProfileUpdate = (event: CustomEvent) => {
      if (event.detail?.full_name !== undefined) {
        setUserFullName(event.detail.full_name);
      } else {
        // If no name in event, refetch from database
        fetchUserFullName();
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('profileUpdated', handleProfileUpdate as EventListener);
      return () => {
        window.removeEventListener('profileUpdated', handleProfileUpdate as EventListener);
      };
    }
  }, [fetchUserFullName]);


  useEffect(() => {
    // Close mobile search when clicking outside
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      
      if (showMobileSearch) {
        const searchContainer = document.getElementById('mobile-search-container');
        const searchInput = document.getElementById('mobile-search-input');
        
        if (searchContainer && !searchContainer.contains(target) && !searchInput?.contains(target)) {
          closeMobileSearch();
        }
      }

      // Close user dropdown when clicking outside
      if (showUserDropdown) {
        const userDropdown = document.getElementById('user-dropdown');
        if (userDropdown && !userDropdown.contains(target)) {
          setShowUserDropdown(false);
        }
      }
    };

    if (showMobileSearch || showUserDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showMobileSearch, showUserDropdown]);

  const fetchCategories = async () => {
    try {
      setCategoriesLoading(true);
      
      // Skip RPC call and use optimized parallel queries directly
      // This prevents timeout delays from waiting for non-existent RPC function
      await fetchCategoriesFallback();
    } catch (error) {
      console.error('Error fetching categories:', error);
      setCategories([]);
    } finally {
      setCategoriesLoading(false);
    }
  };

  const fetchCategoriesFallback = async () => {
    try {
      // Fetch main categories and subcategories in parallel for better performance
      const [categoriesResult, subcategoriesResult] = await Promise.all([
        supabase
          .from('categories')
          .select('*')
          .is('parent_category_id', null)
          .eq('is_active', true)
          .order('name', { ascending: true }),
        supabase
          .from('subcategories')
          .select('*')
          .eq('is_active', true)
          .order('name', { ascending: true })
      ]);

      if (categoriesResult.error) {
        console.error('Error fetching categories:', categoriesResult.error);
        setCategories([]);
        return;
      }

      if (subcategoriesResult.error) {
        console.error('Error fetching subcategories:', subcategoriesResult.error);
        // Continue without subcategories
      }

      // Attach subcategories to their parent categories
      const categoriesWithSubcategories = (categoriesResult.data || []).map((category: Category) => ({
        ...category,
        subcategories: (subcategoriesResult.data || []).filter(
          (subcat: Subcategory) => subcat.parent_category_id === category.id
        )
      }));

      setCategories(categoriesWithSubcategories);
      setDataFetched(true);
    } catch (error) {
      console.error('Fallback error:', error);
      setCategories([]);
    }
  };


  const openMobileSearch = () => {
    setShowMobileSearch(true);
  };

  const closeMobileSearch = () => {
    setShowMobileSearch(false);
  };

  // Get all categories for mobile display (showing categories instead of subcategories)
  const getAllCategories = () => {
    // Filter to only show main categories (those without parent_category_id or is null)
    return categories.filter(category => !category.parent_category_id);
  };

  return (
    <>
      <nav className="shadow-sm border-b sticky top-0 z-50 py-3.5 sm:py-5" style={{ backgroundColor: '#000000' }}>
        <div className={showMobileSearch ? "w-full" : "max-w-[1450px] mx-auto w-full px-2 sm:px-4 md:px-6 lg:px-8"}>
          <div className="flex justify-between items-center relative">
          {/* Logo */}
          <Link href="/" className={`flex items-center ${showMobileSearch ? 'hidden' : 'flex'}`}>
            <span className="text-lg font-normal text-white mr-0">Apperal</span>
          </Link>

          {/* Categories Navigation - Hidden on mobile, visible on larger screens */}
          <div className={`hidden lg:flex items-center space-x-4 ml-12 ${showMobileSearch ? 'hidden' : 'flex'}`}>
            {categoriesLoading ? (
              <div className="text-white text-sm opacity-70">Loading...</div>
            ) : (
              categories.map((category) => (
                <div key={category.id} className="relative group">
                  <Link
                    href={`/products/${category.slug}`}
                    className="text-white hover:text-gray-300 text-base font-normal transition-colors flex items-center"
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
          <div className={`flex items-center space-x-1 sm:space-x-2 ${showMobileSearch ? 'hidden' : 'flex'}`}>
            {/* Mobile Search Icon */}
            {!showMobileSearch && (
              <button 
                onClick={() => {
                  // Handle mobile search icon click
                  openMobileSearch();
                }}
                className="sm:hidden text-white hover:text-gray-300 p-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>
            )}

            {/* Wishlist Icon */}
            <Link href="/wishlist" className={`text-white hover:text-gray-300 nav-wishlist-link flex items-center justify-center h-full p-2 ${showMobileSearch ? 'invisible' : 'visible'}`}>
              <WishlistIcon showCount={true} count={wishlistCount} />
            </Link>

            {/* Cart Icon - Show for all users (logged in and guests) */}
            <Link href="/cart" className={`text-white hover:text-gray-300 nav-cart-link flex items-center justify-center h-full p-2 ${showMobileSearch ? 'invisible' : 'visible'}`}>
              <CartIcon showCount={true} count={cartCount} />
            </Link>
            
            {/* Auth Section */}
            <div className={`flex items-center space-x-1 sm:space-x-2 ml-1 sm:ml-2 h-full ${showMobileSearch ? 'invisible' : 'visible'}`}>
              {loading ? (
                <div className="text-white text-sm sm:text-base flex items-center h-full opacity-70">Loading...</div>
              ) : user ? (
                <div 
                  id="user-dropdown" 
                  className="relative flex items-center h-full"
                >
                  {/* Desktop: User name/icon button */}
                    <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowUserDropdown(!showUserDropdown);
                    }}
                    className="hidden sm:flex items-center space-x-1.5 text-white hover:text-gray-300 transition-colors cursor-pointer"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                      <span className="text-sm sm:text-base">
                      {userFullName || 'Hi, User'}
                    </span>
                    <svg 
                      className={`w-4 h-4 transition-transform ${showUserDropdown ? 'rotate-180' : ''}`} 
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                  
                  {/* Mobile: User icon button */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowUserDropdown(!showUserDropdown);
                    }}
                    className="sm:hidden text-white hover:text-gray-300 p-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </button>
                  
                  {/* Dropdown Menu */}
                  {showUserDropdown && (
                    <div 
                      className="absolute right-0 top-full mt-2 w-48 bg-white rounded-md shadow-xl border border-gray-200 z-[100]"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="py-1">
                        <Link
                          href="/profile"
                          onClick={() => setShowUserDropdown(false)}
                          className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-blue-600 transition-colors cursor-pointer"
                        >
                          <div className="flex items-center space-x-2">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                            <span>View Profile</span>
                          </div>
                        </Link>
                        <Link
                          href="/orders"
                          onClick={() => setShowUserDropdown(false)}
                          className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-blue-600 transition-colors cursor-pointer"
                        >
                          <div className="flex items-center space-x-2">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                          </svg>
                          <span>Orders</span>
                          </div>
                        </Link>
                        <div className="border-t border-gray-200 my-1"></div>
                        <button
                          type="button"
                          onClick={async (e) => {
                            e.stopPropagation();
                            setShowUserDropdown(false);
                            await signOut();
                          }}
                          disabled={signingOut}
                          className="w-full text-left block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-red-600 transition-colors disabled:opacity-50 cursor-pointer"
                        >
                          <div className="flex items-center space-x-2">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                            </svg>
                            <span>{signingOut ? 'Signing out...' : 'Sign Out'}</span>
                          </div>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  {/* Mobile: User Icon */}
                  <Link
                    href="/login"
                    className="sm:hidden text-white hover:text-gray-300 p-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </Link>
                  
                  {/* Desktop: Sign In button */}
                  <div className="hidden sm:flex items-center">
                    <Link
                      href="/login"
                      className="bg-white text-black px-3 sm:px-4 py-1 sm:py-2 rounded-md text-sm sm:text-base font-normal hover:bg-gray-100 transition-colors"
                    >
                      Sign In
                    </Link>
                  </div>
                </>
              )}
              </div>
          </div>
          </div>
        </div>
      </nav>

      {/* Mobile Subcategories Section - Only visible on mobile and home page */}
      {!showMobileSearch && pathname === '/' && (
        <div className="sm:hidden bg-white border-t border-gray-100 pt-1 pb-2">
          <div className="flex justify-center items-center">
            {categoriesLoading ? (
              <div className="flex flex-wrap justify-center gap-3" style={{ width: 'fit-content' }}>
                {[...Array(10)].map((_, index) => (
                    <div key={index} className="flex flex-col items-center text-center">
                      <div className="w-20 h-20 bg-gray-200 animate-pulse rounded-[2px] mb-1.5"></div>
                      <div className="h-3 w-16 bg-gray-200 animate-pulse rounded"></div>
                    </div>
                ))}
              </div>
            ) : getAllCategories().length > 0 ? (
              <div className="flex flex-wrap justify-center gap-3" style={{ width: 'fit-content' }}>
                  {getAllCategories().slice(0, 20).map((category) => {
                    return (
                      <Link
                        key={category.id}
                        href={`/products/${category.slug}`}
                        className="flex flex-col items-center text-center group"
                      >
                        <div className="w-20 h-20 overflow-hidden mb-1.5 rounded-[2px] shadow-sm">
                          <img
                            src={category.image_url || '/images/categories/placeholder.svg'}
                            alt={category.name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.src = '/images/categories/placeholder.svg';
                            }}
                          />
                        </div>
                        <span className="text-xs text-gray-700 group-hover:text-blue-600 transition-colors line-clamp-2 text-center max-w-[80px]">
                          {category.name}
                        </span>
                      </Link>
                    );
                  })}
              </div>
            ) : (
              <div className="text-gray-500 text-xs text-center">No categories available</div>
            )}
          </div>
        </div>
      )}
    </>
  );
}