'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { useWishlist } from '@/contexts/WishlistContext';
import { createClient } from '@/lib/supabase/client';
import CartIcon from './CartIcon';
import WishlistIcon from './WishlistIcon';

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
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('categories')
        .select('*')
        .is('parent_category_id', null)
        .order('name', { ascending: true });

      if (categoriesError) {
        console.error('Error fetching categories:', categoriesError);
        return;
      }

      // Fetch subcategories for each category
      const categoriesWithSubcategories = await Promise.all(
        (categoriesData || []).map(async (category) => {
          const { data: subcategoriesData, error: subcategoriesError } = await supabase
            .from('categories')
            .select('*')
            .eq('parent_category_id', category.id)
            .order('name', { ascending: true });

          if (subcategoriesError) {
            console.error(`Error fetching subcategories for ${category.name}:`, subcategoriesError);
          }

          return {
            ...category,
            subcategories: subcategoriesData || []
          };
        })
      );

      setCategories(categoriesWithSubcategories);
    } catch (error) {
      console.error('Error fetching categories:', error);
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

  return (
    <nav className="bg-white shadow-sm border-b">
      <div className="max-w-[1450px] mx-auto w-full" style={{ paddingLeft: '10px', paddingRight: '10px' }}>
        <div className="flex justify-between items-center h-16 sm:h-20">
          {/* Logo */}
          <Link href="/" className="flex items-center">
            <span className="text-2xl sm:text-3xl font-bold text-gray-900">Apperal</span>
          </Link>

          {/* Categories Navigation - Hidden on mobile, visible on larger screens */}
          <div className="hidden lg:flex items-center space-x-6 ml-12">
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
          <div className="hidden sm:flex flex-1 mx-4 lg:mx-8">
            <div className="relative w-full">
              <input
                type="text"
                placeholder="Search products..."
                className="w-full px-4 py-2 pl-10 pr-4 text-gray-700 bg-gray-100 border border-gray-300 rounded-[999px] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>
          </div>

          {/* Right side icons */}
          <div className="flex items-center space-x-2 sm:space-x-3 h-16">
            {/* Mobile Search Icon */}
            <button className="sm:hidden text-gray-700 hover:text-blue-600 p-2">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>

            {/* Wishlist Icon */}
            <Link href="/wishlist" className="text-gray-700 hover:text-blue-600 nav-wishlist-link flex items-center justify-center h-full p-2">
              <WishlistIcon showCount={true} count={wishlistCount} />
            </Link>
            
            {user && (
              <Link href="/cart" className="text-gray-700 hover:text-blue-600 nav-cart-link flex items-center justify-center h-full p-2">
                <CartIcon showCount={true} count={cartCount} />
              </Link>
            )}
            
            {/* Auth Section */}
            <div className="flex items-center space-x-2 sm:space-x-3 ml-1 sm:ml-2 h-full">
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
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}