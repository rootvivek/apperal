'use client';

import { useRouter } from 'next/navigation';
import { useCallback } from 'react';

interface UseBackNavigationProps {
  pathname: string;
  currentCategorySlug: string | null;
  currentSubcategorySlug: string | null;
}

export function useBackNavigation({ pathname, currentCategorySlug, currentSubcategorySlug }: UseBackNavigationProps) {
  const router = useRouter();

  const handleBack = useCallback(() => {
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
  }, [pathname, currentCategorySlug, currentSubcategorySlug, router]);

  return { handleBack };
}

