'use client';

import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { ShoppingCart, Heart } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { useWishlist } from '@/contexts/WishlistContext';
import { useLoginModal } from '@/contexts/LoginModalContext';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { mobileTypography } from '@/utils/mobileTypography';
import { BackArrowIcon, SearchIcon } from './Icons';
import Logo from './Logo';
import DesktopCategories from './DesktopCategories';
import MobileSearch from './MobileSearch';
import UserDropdown from './UserDropdown';
import { useNavigation } from '@/hooks/navigation/useNavigation';
import { useCategoryFiltering } from '@/hooks/navigation/useCategoryFiltering';
import { useUserInfo } from '@/hooks/navigation/useUserInfo';
import { usePageTitle } from '@/hooks/navigation/usePageTitle';
import { useBackNavigation } from '@/hooks/navigation/useBackNavigation';

const NAVBAR_PADDING = "px-4 sm:px-6 md:px-8 lg:px-10";

export default function Navigation() {
  const { user, signOut, signingOut } = useAuth();
  const { cartCount } = useCart();
  const { wishlistCount } = useWishlist();
  const { openModal: openLoginModal } = useLoginModal();
  const pathname = usePathname();
  const router = useRouter();

  // Ensure user check is consistent (convert undefined to null for consistent rendering)
  const isUserLoggedIn = Boolean(user);

  // Hooks
  const navigation = useNavigation();
  const categoryFiltering = useCategoryFiltering();
  const userInfo = useUserInfo(user);
  const pageTitle = usePageTitle(pathname, categoryFiltering.categories);
  const { handleBack } = useBackNavigation({
    pathname,
    currentCategorySlug: pageTitle.currentCategorySlug,
    currentSubcategorySlug: pageTitle.currentSubcategorySlug,
  });

  const containerClassName = navigation.showMobileSearch 
    ? `w-full ${NAVBAR_PADDING}` 
    : `max-w-[1450px] mx-auto w-full ${NAVBAR_PADDING}`;

  return (
    <nav className="bg-white fixed top-0 left-0 right-0 z-[100] h-14 sm:h-[72px] border-b border-gray-200 flex items-center">
      <div className={containerClassName}>
        <div className="flex justify-between items-center relative h-full">
          {navigation.showMobileSearch ? (
            <div className="flex items-center h-full">
              <button
                onClick={navigation.closeMobileSearch}
                className="text-gray-500 hover:text-brand-500 transition-colors p-1.5 sm:p-2 flex-shrink-0 flex items-center justify-center"
                aria-label="Close search"
              >
                <BackArrowIcon className="w-[18px] h-[18px] sm:w-5 sm:h-5" />
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
                      className="text-gray-500 hover:text-brand-500 transition-colors p-1.5 sm:p-2 flex items-center justify-center"
                      aria-label="Go back"
                    >
                      <BackArrowIcon className="w-[18px] h-[18px] sm:w-5 sm:h-5" />
                    </button>
                    <Logo className="h-6 sm:h-8 w-auto" maxWidth="100px" />
                    {pathname !== '/search' && (
                      <span className={`text-gray-900 ${mobileTypography.title14} sm:text-base font-medium truncate max-w-[120px] sm:max-w-[200px] flex-shrink-0`}>
                        {pageTitle.pageTitle || (pageTitle.isAllProductsPage ? 'All Products' : (pageTitle.currentSubcategoryName || pageTitle.currentCategoryName || 'Back'))}
                      </span>
                    )}
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
          <DesktopCategories
            categories={categoryFiltering.categories}
            categoriesLoading={categoryFiltering.categoriesLoading}
            openCategoryId={categoryFiltering.openCategoryId}
            setOpenCategoryId={categoryFiltering.setOpenCategoryId}
            dropdownTimeout={categoryFiltering.dropdownTimeout}
            setDropdownTimeout={categoryFiltering.setDropdownTimeout}
            showMobileSearch={navigation.showMobileSearch}
          />

          {/* Search Bar - Visible on all screens */}
          {!navigation.showMobileSearch && (
            <div className="flex flex-1 ml-2 sm:ml-4 lg:ml-8 mr-2 sm:mr-4 lg:mr-8">
              <form onSubmit={navigation.handleSearch} className="relative w-full">
                <Input
                  type="text"
                  placeholder="Search products..."
                  value={navigation.searchQuery}
                  onChange={navigation.handleInputChange}
                  className={cn(
                    "w-full py-1.5 sm:py-2.5 pl-7 pr-4 text-gray-700 bg-transparent text-xs sm:text-sm h-8 sm:h-10",
                    "border border-gray-300 focus-visible:ring-0 focus-visible:ring-offset-0"
                  )}
                  style={{ borderRadius: '999px' }}
                />
                <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center justify-center pointer-events-none">
                  <SearchIcon className="w-4 h-4 sm:w-4 sm:h-4 text-gray-400" />
                </div>
              </form>
            </div>
          )}

          {/* Mobile Search Bar - Outside of hidden container */}
          {navigation.showMobileSearch && (
            <MobileSearch
              searchQuery={navigation.searchQuery}
              onInputChange={navigation.handleInputChange}
              onSubmit={navigation.handleSearch}
              onClose={navigation.closeMobileSearch}
            />
          )}

          <div className={`flex items-center space-x-1 sm:space-x-2 ${navigation.showMobileSearch ? 'hidden' : 'flex'}`}>

            {/* Wishlist Icon - Only show when user is logged in */}
            {isUserLoggedIn && (
              <Link
                href="/wishlist"
                className={cn(
                  'relative text-gray-500 hover:text-brand-500 nav-wishlist-link flex items-center justify-center h-full px-1 py-2',
                  navigation.showMobileSearch ? 'invisible' : 'visible',
                )}
              >
                <Heart className="w-[18px] h-[18px] sm:w-5 sm:h-5" />
                {wishlistCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 inline-flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] sm:text-[11px] min-w-[16px] h-[16px] px-1">
                    {wishlistCount > 9 ? '9+' : wishlistCount}
                  </span>
                )}
              </Link>
            )}

            {/* Cart Icon - Show for all users (logged in and guests) */}
            <Link
              href="/cart"
              className={cn(
                'relative text-gray-500 hover:text-brand-500 nav-cart-link flex items-center justify-center h-full px-1 py-2',
                navigation.showMobileSearch ? 'invisible' : 'visible',
              )}
            >
              <ShoppingCart className="w-[18px] h-[18px] sm:w-5 sm:h-5" />
              {cartCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 inline-flex items-center justify-center rounded-full bg-emerald-500 text-white text-[10px] sm:text-[11px] min-w-[16px] h-[16px] px-1">
                  {cartCount > 9 ? '9+' : cartCount}
                </span>
              )}
            </Link>
            
            <div className={`flex items-center space-x-1 sm:space-x-2 h-full ${navigation.showMobileSearch ? 'invisible' : 'visible'}`} suppressHydrationWarning>
              <UserDropdown
                isUserLoggedIn={isUserLoggedIn}
                userFullName={userInfo.userFullName}
                isAdmin={userInfo.isAdmin}
                showUserDropdown={navigation.showUserDropdown}
                setShowUserDropdown={navigation.setShowUserDropdown}
                signingOut={signingOut}
                onSignOut={signOut}
                isMounted={navigation.isMounted}
                showMobileSearch={navigation.showMobileSearch}
              />
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}

