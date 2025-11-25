import { useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';

export interface Subcategory {
  id: string;
  name: string;
  slug: string;
  description: string;
  image_url: string | null;
  parent_category_id: string;
  is_active?: boolean;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  name: string;
}

/**
 * Hook for fetching subcategories and categories data
 */
export function useSubcategoryData() {
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  const fetchCategories = useCallback(async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from('categories')
        .select('id, name')
        .is('parent_category_id', null)
        .order('name', { ascending: true });

      if (fetchError) throw fetchError;
      
      setCategories(data || []);
    } catch {
      // Error handled silently
    }
  }, [supabase]);

  const fetchSubcategories = useCallback(async (selectedParentId: string | null) => {
    try {
      setLoading(true);
      
      let query = supabase
        .from('subcategories')
        .select('*')
        .order('name', { ascending: true });

      // Filter by parent category if one is selected
      if (selectedParentId) {
        query = query.eq('parent_category_id', selectedParentId);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;
      
      setSubcategories(data || []);
      setError(null);
    } catch (err: any) {
      setError(err.message);
      setSubcategories([]);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  return {
    subcategories,
    categories,
    loading,
    error,
    setSubcategories,
    setError,
    fetchCategories,
    fetchSubcategories,
  };
}

