'use client';

import Link from 'next/link';
import { useState, useEffect, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { useWishlist } from '@/contexts/WishlistContext';
import { useLoginModal } from '@/contexts/LoginModalContext';
import { createClient } from '@/lib/supabase/client';
import { NAVIGATION_CACHE } from '@/constants';
import CartIcon from './CartIcon';
import WishlistIcon from './WishlistIcon';
import SearchBar from './SearchBar';

// Constants
const NAVBAR_PADDING = "px-4 sm:px-6 md:px-8 lg:px-10";
const BACK_ARROW_PATH = "M10 19l-7-7m0 0l7-7m-7 7h18";
const USER_ICON_PATH = "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z";
const CHEVRON_DOWN_PATH = "M19 9l-7 7-7-7";
const SEARCH_ICON_PATH = "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z";
const ORDERS_ICON_PATH = "M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z";
const SIGN_OUT_ICON_PATH = "M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1";
const ADMIN_ICON_PATH = "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z";

// Admin phone number
const ADMIN_PHONE = process.env.NEXT_PUBLIC_ADMIN_PHONE;

// Helper Components
const BackArrowIcon = ({ className = "w-4 h-4 sm:w-6 sm:h-6" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={BACK_ARROW_PATH} />
  </svg>
);

const UserIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={USER_ICON_PATH} />
  </svg>
);

const ChevronDownIcon = ({ className = "w-4 h-4", rotated = false }: { className?: string; rotated?: boolean }) => (
  <svg className={`${className} ${rotated ? 'rotate-180' : ''} transition-transform`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={CHEVRON_DOWN_PATH} />
  </svg>
);

const Logo = ({ className = "h-8 sm:h-10 w-auto", maxWidth = "120px" }: { className?: string; maxWidth?: string }) => (
  <Link href="/" className="flex items-center">
    <img 
      src="/logo.webp" 
      alt="Carts24" 
      className={className} 
      style={{ maxWidth }} 
      width={96}
      height={93}
      loading="eager"
      fetchPriority="high"
    />
  </Link>
);

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
  const { user, signOut, signingOut } = useAuth();
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
  const [currentCategoryName, setCurrentCategoryName] = useState<string | null>(null);
  const [currentSubcategoryName, setCurrentSubcategoryName] = useState<string | null>(null);
  const [currentCategorySlug, setCurrentCategorySlug] = useState<string | null>(null);
  const [currentSubcategorySlug, setCurrentSubcategorySlug] = useState<string | null>(null);
  const [isAllProductsPage, setIsAllProductsPage] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [openCategoryId, setOpenCategoryId] = useState<string | null>(null);
  const [dropdownTimeout, setDropdownTimeout] = useState<ReturnType<typeof setTimeout> | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const supabase = createClient();
  
  // Get login modal - safe to call as provider wraps this component
  const { openModal: openLoginModal } = useLoginModal();

  // Ensure component is mounted before rendering interactive elements
  // This prevents hydration mismatches
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Ensure user check is consistent (convert undefined to null for consistent rendering)
  const isUserLoggedIn = Boolean(user);

  // Check if user is admin
  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!user || !ADMIN_PHONE) {
        setIsAdmin(false);
        return;
      }

      try {
        const { data: profile, error } = await supabase
          .from('user_profiles')
          .select('phone')
          .eq('id', user.id)
          .maybeSingle();

        if (error) {
          setIsAdmin(false);
          return;
        }

        const userPhone = profile?.phone || user.phone || user.user_metadata?.phone || '';
        const normalizedUserPhone = userPhone.replace(/\D/g, '');
        const normalizedAdminPhone = ADMIN_PHONE.replace(/\D/g, '');
        const userLast10 = normalizedUserPhone.slice(-10);
        const adminLast10 = normalizedAdminPhone.slice(-10);
        
        const hasAdminAccess = userLast10 === adminLast10 && userLast10.length === 10;
        setIsAdmin(hasAdminAccess);
      } catch (error) {
        setIsAdmin(false);
      }
    };

    checkAdminStatus();
  }, [user, supabase]);

  // Close category dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.category-dropdown-container')) {
        setOpenCategoryId(null);
      }
    };

    if (openCategoryId) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [openCategoryId]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (dropdownTimeout) {
        clearTimeout(dropdownTimeout);
      }
    };
  }, [dropdownTimeout]);

  useEffect(() => {
    // Only fetch data if not already fetched (prevents refetch on refresh)
    if (!dataFetched) {
      fetchCategories();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataFetched]);

  // Detect category/subcategory from pathname and fetch names
  useEffect(() => {
    const fetchCurrentCategoryInfo = async () => {
      // Check if we're on the profile page
      const normalizedPath = pathname.replace(/\/$/, ''); // Remove trailing slash
      if (normalizedPath === '/profile') {
        setIsAllProductsPage(false);
        setCurrentCategoryName('My Profile');
        setCurrentSubcategoryName(null);
        setCurrentCategorySlug(null);
        setCurrentSubcategorySlug(null);
        return;
      }
      
      // Check if we're on the all products page (exact match or with trailing slash)
      if (normalizedPath === '/products') {
        setIsAllProductsPage(true);
        setCurrentCategoryName(null);
        setCurrentSubcategoryName(null);
        setCurrentCategorySlug(null);
        setCurrentSubcategorySlug(null);
        return;
      }
      
      setIsAllProductsPage(false);
      
      // Check if we're on a category or subcategory page
      const categoryMatch = pathname.match(/^\/products\/([^/]+)(?:\/([^/]+))?$/);
      
      if (!categoryMatch) {
        setCurrentCategoryName(null);
        setCurrentSubcategoryName(null);
        setCurrentCategorySlug(null);
        setCurrentSubcategorySlug(null);
        setIsAllProductsPage(false);
        return;
      }

      const categorySlug = decodeURIComponent(categoryMatch[1]);
      const subcategorySlug = categoryMatch[2] ? decodeURIComponent(categoryMatch[2]) : null;

      // Store slugs
      setCurrentCategorySlug(categorySlug);
      setCurrentSubcategorySlug(subcategorySlug);

      try {
        // Try to find category from already loaded categories first
        const foundCategory = categories.find(cat => cat.slug === categorySlug);
        
        if (foundCategory) {
          setCurrentCategoryName(foundCategory.name);
          
          // If subcategory, find it
          if (subcategorySlug && foundCategory.subcategories) {
            const foundSubcategory = foundCategory.subcategories.find(
              sub => sub.slug === subcategorySlug
            );
            if (foundSubcategory) {
              setCurrentSubcategoryName(foundSubcategory.name);
            } else {
              // Fetch subcategory if not in loaded categories
              const { data } = await supabase
                .from('subcategories')
                .select('name')
                .eq('slug', subcategorySlug)
                .eq('parent_category_id', foundCategory.id)
                .single();
              setCurrentSubcategoryName(data?.name || null);
            }
          } else {
            setCurrentSubcategoryName(null);
          }
        } else {
          // Fetch category if not in loaded categories
          const { data: categoryData } = await supabase
            .from('categories')
            .select('id, name')
            .eq('slug', categorySlug)
            .single();
          
          if (categoryData) {
            setCurrentCategoryName(categoryData.name);
            
            // Fetch subcategory if needed
            if (subcategorySlug) {
              const { data: subcategoryData } = await supabase
                .from('subcategories')
                .select('name')
                .eq('slug', subcategorySlug)
                .eq('parent_category_id', categoryData.id)
                .single();
              setCurrentSubcategoryName(subcategoryData?.name || null);
            } else {
              setCurrentSubcategoryName(null);
            }
          } else {
            setCurrentCategoryName(null);
            setCurrentSubcategoryName(null);
          }
        }
      } catch (error) {
        // Error handled silently
        setCurrentCategoryName(null);
        setCurrentSubcategoryName(null);
      }
    };

    fetchCurrentCategoryInfo();
  }, [pathname, categories, supabase]);

  const handleBack = () => {
    // Check if we're on a product detail page
    if (pathname.startsWith('/product/')) {
      // Try to get referrer from sessionStorage (set when navigating to product)
      const referrer = typeof window !== 'undefined' ? sessionStorage.getItem('productReferrer') : null;
      
      if (referrer && referrer.startsWith('/')) {
        // Navigate to the referrer page
        router.push(referrer);
        sessionStorage.removeItem('productReferrer');
        sessionStorage.removeItem('productCategorySlug');
        sessionStorage.removeItem('productSubcategorySlug');
        return;
      }
      
      // Fallback: navigate to products page or category page if we have category info
      // Check both state and sessionStorage for category slugs
      const categorySlug = currentCategorySlug || (typeof window !== 'undefined' ? sessionStorage.getItem('productCategorySlug') : null);
      const subcategorySlug = currentSubcategorySlug || (typeof window !== 'undefined' ? sessionStorage.getItem('productSubcategorySlug') : null);
      
      if (categorySlug) {
        if (subcategorySlug) {
          router.push(`/products/${categorySlug}/${subcategorySlug}`);
        } else {
          router.push(`/products/${categorySlug}`);
        }
        // Clean up sessionStorage
        if (typeof window !== 'undefined') {
          sessionStorage.removeItem('productCategorySlug');
          sessionStorage.removeItem('productSubcategorySlug');
        }
      } else {
        router.push('/products');
      }
      return;
    }
    
    // For other pages, use browser back
    // Check if there's history to go back to
    if (typeof window !== 'undefined' && window.history.length > 1) {
    router.back();
    } else {
      // No history, navigate to home
      router.push('/');
    }
  };

  const isCategoryPage = (pathname === '/products') || (pathname.startsWith('/products/') && pathname.split('/').length >= 3);

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
      // Error handled silently
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
    if (dataFetched) return; // Prevent duplicate calls
    
      // Check client-side cache first
      if (typeof window !== 'undefined') {
        const cached = sessionStorage.getItem(NAVIGATION_CACHE.KEY);
        if (cached) {
          try {
            const { data, expires } = JSON.parse(cached);
            if (expires && Date.now() < expires) {
              setCategories(data);
              setDataFetched(true);
              setCategoriesLoading(false);
              return;
            }
          } catch {
            // Invalid cache, continue to fetch
          }
        }
      }
    
    try {
      setCategoriesLoading(true);
      // Skip RPC call and use optimized parallel queries directly
      // This prevents timeout delays from waiting for non-existent RPC function
      await fetchCategoriesFallback();
    } catch (error) {
      // Error handled silently
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
        // Error handled silently
        setCategories([]);
        return;
      }

      if (subcategoriesResult.error) {
        // Error handled silently
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
      
      // Cache the results
      if (typeof window !== 'undefined') {
        const cacheData = categoriesWithSubcategories;
        const expires = Date.now() + NAVIGATION_CACHE.TTL;
        sessionStorage.setItem(NAVIGATION_CACHE.KEY, JSON.stringify({ data: cacheData, expires }));
      }
    } catch (error) {
      // Error handled silently
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

  const containerClassName = showMobileSearch 
    ? `w-full ${NAVBAR_PADDING}` 
    : `max-w-[1450px] mx-auto w-full ${NAVBAR_PADDING}`;

  return (
    <nav className="bg-white fixed top-0 left-0 right-0 z-[100] h-14 sm:h-[72px] border-b border-gray-200 flex items-center">
      <div className={containerClassName}>
          <div className="flex justify-between items-center relative h-full">
          {showMobileSearch ? (
            <div className="flex items-center h-full">
              <button
                onClick={closeMobileSearch}
                className="text-gray-500 hover:text-brand-500 transition-colors p-1.5 sm:p-2 flex-shrink-0"
                aria-label="Close search"
              >
                <BackArrowIcon />
              </button>
            </div>
          ) : (
            <>
              {/* Left side: Back button + Category/Subcategory name OR Logo */}
              {pathname !== '/' ? (
                <>
                  <div className="flex lg:hidden items-center gap-2 sm:gap-3">
                    <button
                      onClick={handleBack}
                      className="text-gray-500 hover:text-brand-500 transition-colors p-1.5 sm:p-2"
                      aria-label="Go back"
                    >
                      <BackArrowIcon />
                    </button>
                    <Logo className="h-6 sm:h-8 w-auto" maxWidth="100px" />
                    <span className="text-gray-900 text-sm sm:text-base font-medium truncate max-w-[120px] sm:max-w-[200px]">
                      {isAllProductsPage ? 'All Products' : (currentSubcategoryName || currentCategoryName || 'Back')}
                    </span>
                  </div>
                  
                  <div className="hidden lg:flex items-center gap-4">
                    <Logo />
                  </div>
                </>
              ) : (
                <Logo />
              )}
            </>
          )}

          {/* Categories Navigation - Hidden on mobile, always visible on larger screens */}
          <div className={`hidden lg:flex items-center space-x-4 ml-12 ${showMobileSearch ? 'hidden' : 'flex'}`}>
            {categoriesLoading ? (
              <div className="text-gray-900 text-sm opacity-70 w-0 h-0"></div>
            ) : (
              categories.map((category) => (
                <div 
                  key={category.id} 
                  className="relative group category-dropdown-container"
                  onMouseEnter={() => {
                    // Clear any pending timeout
                    if (dropdownTimeout) {
                      clearTimeout(dropdownTimeout);
                      setDropdownTimeout(null);
                    }
                    // Open dropdown if category has subcategories
                    if (category.subcategories && category.subcategories.length > 0) {
                      setOpenCategoryId(category.id);
                    }
                  }}
                  onMouseLeave={() => {
                    // Close dropdown after a short delay to allow moving to dropdown menu
                    const timeout = setTimeout(() => {
                      setOpenCategoryId(null);
                    }, 150);
                    setDropdownTimeout(timeout);
                  }}
                >
                  <Link
                    href={`/products/${category.slug}`}
                    className="text-gray-900 hover:text-brand-500 text-base font-normal transition-colors flex items-center"
                  >
                    {category.name}
                    {category.subcategories && category.subcategories.length > 0 && (
                      <ChevronDownIcon className="ml-0.5 w-4 h-4" rotated={openCategoryId === category.id} />
                    )}
                  </Link>
                  
                  {/* Subcategories Dropdown */}
                  {category.subcategories && category.subcategories.length > 0 && (
                    <div 
                      className={`absolute top-full left-0 mt-1 w-48 bg-white rounded-md shadow-lg border border-gray-200 transition-all duration-200 z-[110] ${
                        openCategoryId === category.id ? 'opacity-100 visible' : 'opacity-0 invisible pointer-events-none'
                      }`}
                      onMouseEnter={() => {
                        // Clear timeout when entering dropdown
                        if (dropdownTimeout) {
                          clearTimeout(dropdownTimeout);
                          setDropdownTimeout(null);
                        }
                        setOpenCategoryId(category.id);
                      }}
                      onMouseLeave={() => {
                        // Close dropdown when leaving
                        setOpenCategoryId(null);
                      }}
                    >
                      <div className="py-2">
                        {category.subcategories.map((subcategory) => {
                          const subcategoryImage = subcategory.image_url || '/images/categories/placeholder.svg';
                          return (
                            <Link
                              key={subcategory.id}
                              href={`/products/${category.slug}/${subcategory.slug}`}
                              className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-brand-500 transition-colors"
                              onClick={() => {
                                // Close dropdown when clicking a subcategory
                                setOpenCategoryId(null);
                              }}
                            >
                              <img
                                src={subcategoryImage}
                                alt={subcategory.name}
                                className="w-10 h-10 object-cover rounded flex-shrink-0"
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  if (target.src !== '/images/categories/placeholder.svg') {
                                    target.src = '/images/categories/placeholder.svg';
                                  }
                                }}
                              />
                              <span className="flex-1">{subcategory.name}</span>
                            </Link>
                          );
                        })}
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
            <div className="sm:hidden w-full flex items-center h-full">
              <SearchBar variant="mobile" onClose={closeMobileSearch} />
            </div>
          )}

          <div className={`flex items-center space-x-1 sm:space-x-2 ${showMobileSearch ? 'hidden' : 'flex'}`}>
            {/* Mobile Search Icon */}
            {!showMobileSearch && (
              <button 
                onClick={openMobileSearch}
                className="sm:hidden text-gray-500 hover:text-brand-500 p-2"
              >
                <svg className="w-[18px] h-[18px] sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={SEARCH_ICON_PATH} />
                </svg>
              </button>
            )}

            {/* Wishlist Icon - Only show when user is logged in */}
            {isUserLoggedIn && (
            <Link href="/wishlist" className={`text-gray-500 hover:text-brand-500 nav-wishlist-link flex items-center justify-center h-full p-2 ${showMobileSearch ? 'invisible' : 'visible'}`}>
              <WishlistIcon showCount={true} count={wishlistCount} className="w-[18px] h-[18px] sm:w-5 sm:h-5" />
            </Link>
            )}

            {/* Cart Icon - Show for all users (logged in and guests) */}
            <Link href="/cart" className={`text-gray-500 hover:text-brand-500 nav-cart-link flex items-center justify-center h-full p-2 ${showMobileSearch ? 'invisible' : 'visible'}`}>
              <CartIcon showCount={true} count={cartCount} className="w-[18px] h-[18px] sm:w-5 sm:h-5" />
            </Link>
            
            <div className={`flex items-center space-x-1 sm:space-x-2 h-full ${showMobileSearch ? 'invisible' : 'visible'}`} suppressHydrationWarning>
              {isUserLoggedIn ? (
                <div 
                  id="user-dropdown" 
                  className="relative flex items-center h-full"
                >
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowUserDropdown(!showUserDropdown);
                    }}
                    className="hidden sm:flex items-center space-x-1 text-gray-500 hover:text-brand-500 transition-colors cursor-pointer"
                  >
                    <UserIcon />
                    <span className="text-sm sm:text-base text-gray-900">
                      {userFullName || 'Hi, User'}
                    </span>
                    <ChevronDownIcon rotated={showUserDropdown} />
                  </button>
                  
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowUserDropdown(!showUserDropdown);
                    }}
                    className="sm:hidden text-gray-500 hover:text-brand-500 p-2"
                  >
                    <UserIcon className="w-[18px] h-[18px] sm:w-5 sm:h-5" />
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
                          className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-brand-500 transition-colors cursor-pointer"
                        >
                          <div className="flex items-center space-x-1.5">
                            <UserIcon className="w-4 h-4" />
                            <span>View Profile</span>
                          </div>
                        </Link>
                        <Link
                          href="/orders"
                          onClick={() => setShowUserDropdown(false)}
                          className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-brand-500 transition-colors cursor-pointer"
                        >
                          <div className="flex items-center space-x-1.5">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={ORDERS_ICON_PATH} />
                            </svg>
                            <span>Orders</span>
                          </div>
                        </Link>
                        {isAdmin && (
                          <Link
                            href="/admin"
                            onClick={() => setShowUserDropdown(false)}
                            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-purple-600 transition-colors cursor-pointer"
                          >
                            <div className="flex items-center space-x-1.5">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={ADMIN_ICON_PATH} />
                              </svg>
                              <span>Go to Admin Dashboard</span>
                            </div>
                          </Link>
                        )}
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
                          <div className="flex items-center space-x-1.5">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={SIGN_OUT_ICON_PATH} />
                            </svg>
                            <span suppressHydrationWarning>{signingOut ? 'Signing out...' : 'Sign Out'}</span>
                          </div>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => isMounted && openLoginModal()}
                    className="sm:hidden text-gray-500 hover:text-brand-500 p-2"
                    aria-label="Sign In"
                    suppressHydrationWarning
                  >
                    <UserIcon className="w-[18px] h-[18px] sm:w-5 sm:h-5" />
                  </button>
                  
                  <div className="hidden sm:flex items-center" suppressHydrationWarning>
                    <button
                      type="button"
                      onClick={() => isMounted && openLoginModal()}
                      className="bg-white text-brand-500 px-3 sm:px-4 py-1 sm:py-2 rounded-md text-sm sm:text-base font-normal hover:bg-brand-50 transition-colors"
                    >
                      Sign In
                    </button>
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