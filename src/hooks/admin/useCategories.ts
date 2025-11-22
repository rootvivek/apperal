'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  image_url: string | null;
  parent_category_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  detail_type?: string | null;
}

interface UseCategoriesReturn {
  categories: Category[];
  subcategoriesList: Record<string, Category[]>;
  expandedCategories: string[];
  loadingSubcats: string[];
  loading: boolean;
  error: string | null;
  categorySearch: string;
  filteredCategories: Category[];
  setCategorySearch: (search: string) => void;
  fetchCategories: () => Promise<void>;
  toggleExpandCategory: (categoryId: string) => Promise<void>;
  loadSubcategories: (categoryId: string) => Promise<void>;
  toggleCategoryStatus: (categoryId: string, currentStatus: boolean | null | undefined, isSubcategory: boolean) => Promise<void>;
  refreshCategories: () => Promise<void>;
  updateCategoryInList: (category: Category) => void;
  updateSubcategoryInList: (parentId: string, subcategory: Category) => void;
  removeCategoryFromList: (categoryId: string) => void;
  removeSubcategoryFromList: (parentId: string, subcategoryId: string) => void;
  addCategoryToList: (category: Category) => void;
  addSubcategoryToList: (parentId: string, subcategory: Category) => void;
  deleteCategory: (categoryId: string, userId: string) => Promise<void>;
  deleteSubcategory: (subcategoryId: string, userId: string) => Promise<string | null>;
}

export function useCategories(): UseCategoriesReturn {
  const supabase = createClient();
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategoriesList, setSubcategoriesList] = useState<Record<string, Category[]>>({});
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);
  const [loadingSubcats, setLoadingSubcats] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [categorySearch, setCategorySearch] = useState('');

  // Fetch categories
  const fetchCategories = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { data, error: fetchError } = await supabase
        .from('categories')
        .select('*')
        .is('parent_category_id', null)
        .order('name', { ascending: true });

      if (fetchError) throw fetchError;
      
      const categoriesWithActive = (data || []).map((cat: any) => ({
        ...cat,
        is_active: cat.is_active !== undefined ? cat.is_active : true
      }));
      
      setCategories(categoriesWithActive);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch categories');
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  // Load subcategories for a category
  const loadSubcategories = useCallback(async (categoryId: string) => {
    if (subcategoriesList[categoryId]) {
      return; // Already loaded
    }

    setLoadingSubcats(prev => [...prev, categoryId]);
    try {
      const { data, error: subError } = await supabase
        .from('subcategories')
        .select('*, detail_type')
        .eq('parent_category_id', categoryId)
        .order('name', { ascending: true });

      if (subError) throw subError;

      const subcategoriesWithActive = (data || []).map((subcat: any) => ({
        ...subcat,
        is_active: subcat.is_active !== undefined ? subcat.is_active : true
      }));

      setSubcategoriesList(prev => ({
        ...prev,
        [categoryId]: subcategoriesWithActive
      }));
    } catch (err: any) {
      setError(`Failed to load subcategories: ${err.message}`);
    } finally {
      setLoadingSubcats(prev => prev.filter(id => id !== categoryId));
    }
  }, [supabase, subcategoriesList]);

  // Toggle expand/collapse category
  const toggleExpandCategory = useCallback(async (categoryId: string) => {
    const isExpanded = expandedCategories.includes(categoryId);
    
    if (isExpanded) {
      setExpandedCategories(prev => prev.filter(id => id !== categoryId));
    } else {
      await loadSubcategories(categoryId);
      setExpandedCategories(prev => [...prev, categoryId]);
    }
  }, [expandedCategories, loadSubcategories]);

  // Toggle category status
  const toggleCategoryStatus = useCallback(async (
    categoryId: string,
    currentStatus: boolean | null | undefined,
    isSubcategory: boolean = false
  ) => {
    try {
      setError(null);
      const actualCurrentStatus = currentStatus ?? true;
      const newStatus = !actualCurrentStatus;
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('You must be logged in to perform this action');
      }
      
      const response = await fetch('/api/admin/toggle-category-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': user.id,
        },
        body: JSON.stringify({
          categoryId,
          isActive: newStatus,
          isSubcategory,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update status');
      }

      const updatedItem = isSubcategory ? result.subcategory : result.category;
      if (updatedItem && updatedItem.is_active === newStatus) {
        if (isSubcategory) {
          setSubcategoriesList(prev => {
            const updated = { ...prev };
            let found = false;
            for (const parentId in updated) {
              const subcatIndex = updated[parentId].findIndex(sub => sub.id === categoryId);
              if (subcatIndex !== -1) {
                updated[parentId] = updated[parentId].map((sub, idx) => 
                  idx === subcatIndex 
                    ? { ...sub, is_active: updatedItem.is_active }
                    : sub
                );
                found = true;
                break;
              }
            }
            return found ? updated : prev;
          });
        } else {
          setCategories(prev => {
            const index = prev.findIndex(cat => cat.id === categoryId);
            if (index === -1) return prev;
            const updated = [...prev];
            updated[index] = { ...updated[index], is_active: updatedItem.is_active };
            return updated;
          });
        }
      } else {
        throw new Error('Status update verification failed');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to update status');
      throw err;
    }
  }, [supabase]);

  // Filter categories by search
  const filteredCategories = useMemo(() => {
    if (!categorySearch.trim()) return categories;
    
    const searchLower = categorySearch.toLowerCase();
    return categories.filter(cat =>
      cat.name?.toLowerCase().includes(searchLower) ||
      cat.slug?.toLowerCase().includes(searchLower)
    );
  }, [categories, categorySearch]);

  // Update category in list
  const updateCategoryInList = useCallback((category: Category) => {
    setCategories(prev => prev.map(cat => 
      cat.id === category.id ? category : cat
    ));
  }, []);

  // Update subcategory in list
  const updateSubcategoryInList = useCallback((parentId: string, subcategory: Category) => {
    setSubcategoriesList(prev => ({
      ...prev,
      [parentId]: (prev[parentId] || []).map(cat =>
        cat.id === subcategory.id ? subcategory : cat
      )
    }));
  }, []);

  // Remove category from list
  const removeCategoryFromList = useCallback((categoryId: string) => {
    setCategories(prev => prev.filter(cat => cat.id !== categoryId));
  }, []);

  // Remove subcategory from list
  const removeSubcategoryFromList = useCallback((parentId: string, subcategoryId: string) => {
    setSubcategoriesList(prev => ({
      ...prev,
      [parentId]: (prev[parentId] || []).filter(sub => sub.id !== subcategoryId)
    }));
  }, []);

  // Add category to list
  const addCategoryToList = useCallback((category: Category) => {
    setCategories(prev => [...prev, category]);
  }, []);

  // Add subcategory to list
  const addSubcategoryToList = useCallback((parentId: string, subcategory: Category) => {
    setSubcategoriesList(prev => ({
      ...prev,
      [parentId]: [...(prev[parentId] || []), subcategory]
    }));
  }, []);

  // Delete category
  const deleteCategory = useCallback(async (categoryId: string, userId: string): Promise<void> => {
    const response = await fetch('/api/admin/delete-category', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': userId,
      },
      body: JSON.stringify({ categoryId }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to delete category');
    }

    removeCategoryFromList(categoryId);
    // Also remove from subcategories list if it was a parent
    setSubcategoriesList(prev => {
      const updated = { ...prev };
      delete updated[categoryId];
      return updated;
    });
  }, [removeCategoryFromList]);

  // Delete subcategory
  const deleteSubcategory = useCallback(async (subcategoryId: string, userId: string): Promise<string | null> => {
    const response = await fetch('/api/admin/delete-subcategory', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': userId,
      },
      body: JSON.stringify({ subcategoryId }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to delete subcategory');
    }

    // Find parent category ID
    let parentId: string | null = null;
    for (const pid in subcategoriesList) {
      if (subcategoriesList[pid].some(sub => sub.id === subcategoryId)) {
        parentId = pid;
        break;
      }
    }

    if (parentId) {
      removeSubcategoryFromList(parentId, subcategoryId);
      
      // Reload subcategories for the parent
      await loadSubcategories(parentId);
    }

    return parentId;
  }, [subcategoriesList, removeSubcategoryFromList, loadSubcategories]);

  // Refresh categories
  const refreshCategories = useCallback(async () => {
    await fetchCategories();
  }, [fetchCategories]);

  // Initial fetch
  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  return {
    categories,
    subcategoriesList,
    expandedCategories,
    loadingSubcats,
    loading,
    error,
    categorySearch,
    filteredCategories,
    setCategorySearch,
    fetchCategories,
    toggleExpandCategory,
    loadSubcategories,
    toggleCategoryStatus,
    refreshCategories,
    updateCategoryInList,
    updateSubcategoryInList,
    removeCategoryFromList,
  removeSubcategoryFromList,
  addCategoryToList,
  addSubcategoryToList,
  deleteCategory,
  deleteSubcategory,
};
}

