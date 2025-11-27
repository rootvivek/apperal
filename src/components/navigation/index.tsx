'use client';

import { useState } from 'react';
import { Menu, X, Heart, ShoppingCart } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { useWishlist } from '@/contexts/WishlistContext';
import { useCategoryFiltering } from '@/hooks/navigation/useCategoryFiltering';
import DesktopCategories from './DesktopCategories';
import Logo from './Logo';
import SearchBar from './SearchBar';
import IconButtonWithBadge from './IconButtonWithBadge';
import AccountDropdown from './AccountDropdown';
import MobileMenu from './MobileMenu';
import { NAVBAR_CONTAINER_CLASSES, NAVBAR_HEIGHT_CLASSES, BUTTON_BASE_CLASSES } from './constants';

export default function Navigation() {
  const { user, signOut } = useAuth();
  const { cartCount } = useCart();
  const { wishlistCount } = useWishlist();
  const categoryFiltering = useCategoryFiltering();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const toggleMobileMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen);
  const closeMobileMenu = () => setIsMobileMenuOpen(false);

  return (
    <nav className="bg-white fixed top-0 left-0 right-0 z-50 shadow-sm">
      {/* Main Navbar */}
      <div className="border-b border-gray-100">
        <div className={NAVBAR_CONTAINER_CLASSES}>
          <div className={`flex justify-between items-center ${NAVBAR_HEIGHT_CLASSES}`}>
            {/* Logo Section */}
            <div className="flex items-center gap-1">
              <button 
                className={`lg:hidden p-2 sm:p-2.5 ${BUTTON_BASE_CLASSES}`}
                onClick={toggleMobileMenu}
              >
                {isMobileMenuOpen ? (
                  <X className="w-4 h-4 sm:w-5 sm:h-5 text-gray-700" />
                ) : (
                  <Menu className="w-4 h-4 sm:w-5 sm:h-5 text-gray-700" />
                )}
              </button>
              <div className="pl-0">
                <Logo className="h-6 sm:h-7 md:h-8 lg:h-10 w-auto" maxWidth="150px" />
              </div>
            </div>

            {/* Desktop Categories with Subcategories */}
            <DesktopCategories
              categories={categoryFiltering.categories}
              categoriesLoading={categoryFiltering.categoriesLoading}
              openCategoryId={categoryFiltering.openCategoryId}
              setOpenCategoryId={categoryFiltering.setOpenCategoryId}
              dropdownTimeout={categoryFiltering.dropdownTimeout}
              setDropdownTimeout={categoryFiltering.setDropdownTimeout}
            />

            {/* Search Bar - All Screen Sizes */}
            <div className="flex flex-1 mx-1 sm:mx-2 md:mx-3 lg:mx-4">
              <SearchBar />
            </div>

            {/* Right Icons */}
            <div className="flex items-center gap-1">
              {user && (
                <IconButtonWithBadge
                  href="/wishlist"
                  icon={Heart}
                  count={wishlistCount}
                  showOnMobile={false}
                  hoverEffect="color"
                />
              )}
              <IconButtonWithBadge
                href="/cart"
                icon={ShoppingCart}
                count={cartCount}
                hoverEffect="scale"
              />
              <AccountDropdown user={user} onLogout={signOut} />
            </div>
          </div>
        </div>
      </div>

      <MobileMenu isOpen={isMobileMenuOpen} onClose={closeMobileMenu} onLogout={signOut} />
    </nav>
  );
}
