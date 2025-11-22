'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { Category, Subcategory } from './useCategoryFiltering';

export function usePageTitle(pathname: string, categories: Category[]) {
  const [pageTitle, setPageTitle] = useState<string | null>(null);
  const [currentCategoryName, setCurrentCategoryName] = useState<string | null>(null);
  const [currentSubcategoryName, setCurrentSubcategoryName] = useState<string | null>(null);
  const [currentCategorySlug, setCurrentCategorySlug] = useState<string | null>(null);
  const [currentSubcategorySlug, setCurrentSubcategorySlug] = useState<string | null>(null);
  const [isAllProductsPage, setIsAllProductsPage] = useState(false);
  const supabase = createClient();

  // Get page title from pathname
  const getPageTitle = (path: string): string | null => {
    const normalizedPath = path.replace(/\/$/, ''); // Remove trailing slash
    
    // Page title mapping
    const pageTitles: Record<string, string> = {
      '/checkout': 'Checkout',
      '/checkout/success': 'Order Success',
      '/cart': 'Cart',
      '/profile': 'My Profile',
      '/orders': 'My Orders',
      '/wishlist': 'Wishlist',
      '/search': 'Search',
      '/contact': 'Contact Us',
      '/login': 'Sign In',
      '/signup': 'Sign Up',
      '/privacy': 'Privacy Policy',
      '/terms': 'Terms & Conditions',
      '/cookies': 'Cookie Policy',
      '/returns': 'Returns Policy',
      '/shipping': 'Shipping Information',
      '/size-guide': 'Size Guide',
      '/faq': 'FAQ',
      '/track-order': 'Track Order',
      '/products': 'All Products',
    };
    
    // Check exact matches first
    if (pageTitles[normalizedPath]) {
      return pageTitles[normalizedPath];
    }
    
    // Check dynamic routes
    if (normalizedPath.startsWith('/orders/')) {
      return 'Order Details';
    }
    
    if (normalizedPath.startsWith('/product/')) {
      return null; // Will be handled by product name
    }
    
    return null;
  };

  // Detect category/subcategory from pathname and fetch names
  useEffect(() => {
    const fetchCurrentCategoryInfo = async () => {
      const normalizedPath = pathname.replace(/\/$/, ''); // Remove trailing slash
      
      // Set page title first
      const title = getPageTitle(pathname);
      setPageTitle(title);
      
      // Check if we're on the profile page
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

  return {
    pageTitle,
    currentCategoryName,
    currentSubcategoryName,
    currentCategorySlug,
    currentSubcategorySlug,
    isAllProductsPage,
  };
}

