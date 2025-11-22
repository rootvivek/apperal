'use client';

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { NAVIGATION_CACHE } from '@/constants';

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  image_url: string;
  parent_category_id?: string | null;
  subcategories?: Subcategory[];
}

export interface Subcategory {
  id: string;
  name: string;
  slug: string;
  description: string;
  image_url: string;
  parent_category_id: string;
}

export function useCategoryFiltering() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [openCategoryId, setOpenCategoryId] = useState<string | null>(null);
  const [dropdownTimeout, setDropdownTimeout] = useState<ReturnType<typeof setTimeout> | null>(null);
  const dataFetchedRef = useRef(false);
  const supabase = createClient();

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (dropdownTimeout) {
        clearTimeout(dropdownTimeout);
      }
    };
  }, [dropdownTimeout]);

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

  const fetchCategories = async () => {
    if (dataFetchedRef.current) return;
    
    // Check client-side cache first
    if (typeof window !== 'undefined') {
      const cached = sessionStorage.getItem(NAVIGATION_CACHE.KEY);
      if (cached) {
        try {
          const { data, expires } = JSON.parse(cached);
          if (expires && Date.now() < expires) {
            setCategories(data);
            dataFetchedRef.current = true;
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
      dataFetchedRef.current = true;
      
      // Cache the results
      if (typeof window !== 'undefined') {
        const cacheData = categoriesWithSubcategories;
        const expires = Date.now() + (NAVIGATION_CACHE.TTL * 1000); // Convert seconds to milliseconds
        sessionStorage.setItem(NAVIGATION_CACHE.KEY, JSON.stringify({ data: cacheData, expires }));
      }
    } catch (error) {
      // Error handled silently
      setCategories([]);
    }
  };

  useEffect(() => {
    if (!dataFetchedRef.current) {
      fetchCategories();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    categories,
    categoriesLoading,
    openCategoryId,
    setOpenCategoryId,
    dropdownTimeout,
    setDropdownTimeout,
  };
}

