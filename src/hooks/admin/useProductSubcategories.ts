import { useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Category } from '@/types/admin';

interface UseProductSubcategoriesReturn {
  subcategories: Category[];
  subcategoriesLoading: boolean;
  fetchSubcategories: (categoryName: string, categories: Category[]) => Promise<void>;
}

/**
 * Hook for managing product subcategories
 */
export function useProductSubcategories(): UseProductSubcategoriesReturn {
  const [subcategories, setSubcategories] = useState<Category[]>([]);
  const [subcategoriesLoading, setSubcategoriesLoading] = useState(false);
  const supabase = createClient();

  const fetchSubcategories = useCallback(async (categoryName: string, categories: Category[]) => {
    if (!categoryName) {
      setSubcategories([]);
      return;
    }

    try {
      setSubcategoriesLoading(true);
      
      const selectedCategory = categories.find(cat => cat.name === categoryName);
      
      if (!selectedCategory) {
        setSubcategories([]);
        setSubcategoriesLoading(false);
        return;
      }

      let { data: categorySubcategories, error: categoryError } = await supabase
        .from('subcategories')
        .select('id, name, slug, description, parent_category_id, detail_type')
        .eq('parent_category_id', selectedCategory.id)
        .order('name', { ascending: true });

      if (categoryError && categoryError.message?.includes('is_active')) {
        const { data, error } = await supabase
          .from('subcategories')
          .select('id, name, slug, description, parent_category_id, detail_type')
          .eq('parent_category_id', selectedCategory.id)
          .order('name', { ascending: true });
        categorySubcategories = data;
        categoryError = error;
      } else {
        if (categorySubcategories) {
          categorySubcategories = categorySubcategories.filter((sub: any) => 
            sub.is_active === undefined || sub.is_active === true
          );
        }
      }

      if (categoryError) {
        setSubcategories([]);
      } else {
        setSubcategories(categorySubcategories || []);
      }
    } catch {
      setSubcategories([]);
    } finally {
      setSubcategoriesLoading(false);
    }
  }, [supabase]);

  return {
    subcategories,
    subcategoriesLoading,
    fetchSubcategories,
  };
}

