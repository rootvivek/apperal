'use client';

import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { createClient } from '@/lib/supabase/client';
import { useState, useEffect } from 'react';
import CartIcon from './CartIcon';

interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  image_url: string;
}

interface Subcategory {
  id: string;
  name: string;
  slug: string;
  parent_category_id: string;
}

export default function Navigation() {
  const { user, signOut, loading, signingOut } = useAuth();
  const { cartCount } = useCart();
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [navLoading, setNavLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    fetchNavigationData();
  }, []);

  const fetchNavigationData = async () => {
    try {
      setNavLoading(true);
      
      // Fetch main categories
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('categories')
        .select('*')
        .is('parent_category_id', null)
        .order('name', { ascending: true });

      if (categoriesError) {
        console.error('Error fetching categories:', categoriesError);
        setCategories([]);
      } else {
        setCategories(categoriesData || []);
      }

      // Fetch subcategories
      const { data: subcategoriesData, error: subcategoriesError } = await supabase
        .from('categories')
        .select('*')
        .not('parent_category_id', 'is', null)
        .order('name', { ascending: true });

      if (subcategoriesError) {
        console.error('Error fetching subcategories:', subcategoriesError);
        setSubcategories([]);
      } else {
        setSubcategories(subcategoriesData || []);
      }
    } catch (error) {
      console.error('Error fetching navigation data:', error);
    } finally {
      setNavLoading(false);
    }
  };

  const getSubcategoriesForCategory = (categoryId: string) => {
    return subcategories.filter(sub => sub.parent_category_id === categoryId);
  };

  return (
    <nav className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center">
            <span className="text-2xl font-bold text-gray-900">Apperal</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            {navLoading ? (
              <div className="text-gray-500 text-sm">Loading...</div>
            ) : (
              categories.map((category) => {
                const categorySubcategories = getSubcategoriesForCategory(category.id);
                return (
                  <div key={category.id} className="relative group">
                    <Link
                      href={`/products/${category.slug}`}
                      className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                    >
                      {category.name}
                    </Link>
                    
                    {/* Dropdown Menu */}
                    {categorySubcategories.length > 0 && (
                      <div className="absolute top-full left-0 mt-1 w-48 bg-white rounded-md shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                        <div className="py-1">
                          {categorySubcategories.map((subcategory) => (
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
                );
              })
            )}
          </div>

          {/* Right side icons */}
          <div className="flex items-center space-x-4">
            <button className="text-gray-700 hover:text-blue-600 p-2">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>
            <button className="text-gray-700 hover:text-blue-600 p-2">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </button>
            {user && (
              <Link href="/cart" className="text-gray-700 hover:text-blue-600 nav-cart-link">
                <CartIcon showCount={true} count={cartCount} />
              </Link>
            )}
            
            {/* Auth Section */}
            <div className="hidden md:flex items-center space-x-2 ml-4">
              {loading ? (
                <div className="text-gray-500 text-sm">Loading...</div>
              ) : user ? (
                <div className="flex items-center space-x-3">
                  <span className="text-gray-700 text-sm">
                    Welcome, {user.email}
                  </span>
                  <button
                    onClick={() => signOut()}
                    disabled={signingOut}
                    className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {signingOut ? 'Signing Out...' : 'Sign Out'}
                  </button>
                </div>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                  >
                    Sign In
                  </Link>
                  <Link
                    href="/signup"
                    className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 transition-colors"
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