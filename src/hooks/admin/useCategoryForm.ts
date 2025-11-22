'use client';

import { useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Category } from './useCategories';

interface CategoryFormData {
  name: string;
  slug: string;
  description: string;
  image_url: string;
  is_active: boolean;
  detail_type: string | null;
}

interface UseCategoryFormProps {
  onSuccess: () => void;
  onError: (error: string) => void;
  onUpdateCategory: (category: Category) => void;
  onUpdateSubcategory: (parentId: string, subcategory: Category) => void;
  onAddCategory: (category: Category) => void;
  onAddSubcategory: (parentId: string, subcategory: Category) => void;
}

interface UseCategoryFormReturn {
  formData: CategoryFormData;
  setFormData: React.Dispatch<React.SetStateAction<CategoryFormData>>;
  editLoading: boolean;
  editingCategory: Category | null;
  isCreatingSubcategory: boolean;
  parentCategoryId: string | null;
  tempCategoryId: string | null;
  setEditingCategory: (category: Category | null) => void;
  setIsCreatingSubcategory: (value: boolean) => void;
  setParentCategoryId: (id: string | null) => void;
  generateSlug: (name: string, isSubcategory?: boolean, parentCatId?: string) => string;
  handleSubmit: (e: React.FormEvent) => Promise<void>;
  resetForm: () => void;
  initializeFormForEdit: (category: Category) => void;
  initializeFormForSubcategory: (parentId: string) => void;
}

export function useCategoryForm({
  onSuccess,
  onError,
  onUpdateCategory,
  onUpdateSubcategory,
  onAddCategory,
  onAddSubcategory,
}: UseCategoryFormProps): UseCategoryFormReturn {
  const supabase = createClient();
  const [formData, setFormData] = useState<CategoryFormData>({
    name: '',
    slug: '',
    description: '',
    image_url: '',
    is_active: true,
    detail_type: null,
  });
  const [editLoading, setEditLoading] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [isCreatingSubcategory, setIsCreatingSubcategory] = useState(false);
  const [parentCategoryId, setParentCategoryId] = useState<string | null>(null);
  const [tempCategoryId, setTempCategoryId] = useState<string | null>(null);

  // Generate slug from name
  const generateSlug = useCallback((name: string, isSubcategory: boolean = false, parentCatId?: string): string => {
    let slug = name.toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    
    if (isSubcategory && parentCatId) {
      const parentContext = parentCatId.substring(0, 8);
      slug = `${slug}-${parentContext}`;
    }
    
    return slug;
  }, []);

  // Clean image URL (remove query params)
  const cleanImageUrl = useCallback((url: string): string => {
    return url.split('?')[0];
  }, []);

  // Handle form submit
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      onError('Category name is required');
      return;
    }
    
    try {
      setEditLoading(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.id) {
        onError('User not authenticated');
        return;
      }

      let categoryData: any = {
        name: formData.name.trim(),
        slug: generateSlug(formData.name, isCreatingSubcategory, parentCategoryId || undefined),
        description: formData.description.trim(),
        image_url: formData.image_url.trim() ? cleanImageUrl(formData.image_url.trim()) : null,
        is_active: formData.is_active,
      };
      
      // Add detail_type for PARENT CATEGORIES only
      if (!isCreatingSubcategory && !editingCategory?.parent_category_id) {
        if (formData.detail_type && formData.detail_type !== '') {
          categoryData.detail_type = formData.detail_type;
        }
      }

      if (isCreatingSubcategory && parentCategoryId) {
        categoryData.parent_category_id = parentCategoryId;
      } else if (editingCategory && editingCategory.parent_category_id) {
        categoryData.parent_category_id = editingCategory.parent_category_id;
      }

      if (editingCategory) {
        // Update existing category/subcategory
        if (editingCategory.parent_category_id) {
          // Update subcategory
          const response = await fetch('/api/admin/update-subcategory', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-User-Id': user.id,
            },
            body: JSON.stringify({
              subcategoryId: editingCategory.id,
              ...categoryData
            }),
          });

          const data = await response.json();

          if (!response.ok) {
            throw new Error(data.error || 'Failed to update subcategory');
          }
        
          const updatedSubcategory: Category = {
            ...editingCategory,
            ...categoryData
          };
          onUpdateSubcategory(editingCategory.parent_category_id, updatedSubcategory);
        } else {
          // Update parent category
          const response = await fetch('/api/admin/update-category', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-User-Id': user.id,
            },
            body: JSON.stringify({
              categoryId: editingCategory.id,
              ...categoryData
            }),
          });

          const data = await response.json();

          if (!response.ok) {
            throw new Error(data.error || 'Failed to update category');
          }

          const updatedCategory: Category = {
            ...editingCategory,
            ...categoryData
          };
          onUpdateCategory(updatedCategory);
        }
      } else {
        // Create new category/subcategory
        if (tempCategoryId) {
          categoryData.id = tempCategoryId;
        }

        if (isCreatingSubcategory && parentCategoryId) {
          // Create subcategory
          const response = await fetch('/api/admin/create-subcategory', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-User-Id': user.id,
            },
            body: JSON.stringify({
              ...categoryData,
              parent_category_id: parentCategoryId
            }),
          });

          const data = await response.json();

          if (!response.ok) {
            throw new Error(data.error || 'Failed to create subcategory');
          }

          const newSubcategory: Category = {
            ...data.subcategory,
            parent_category_id: parentCategoryId
          };
          onAddSubcategory(parentCategoryId, newSubcategory);
        } else {
          // Create parent category
          const response = await fetch('/api/admin/create-category', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-User-Id': user.id,
            },
            body: JSON.stringify(categoryData),
          });

          const data = await response.json();

          if (!response.ok) {
            throw new Error(data.error || 'Failed to create category');
          }

          onAddCategory(data.category);
        }
      }

      resetForm();
      onSuccess();
    } catch (err: any) {
      onError(err.message || 'Failed to save category');
    } finally {
      setEditLoading(false);
    }
  }, [
    formData,
    isCreatingSubcategory,
    parentCategoryId,
    editingCategory,
    tempCategoryId,
    generateSlug,
    cleanImageUrl,
    supabase,
    onSuccess,
    onError,
    onUpdateCategory,
    onUpdateSubcategory,
    onAddCategory,
    onAddSubcategory,
  ]);

  // Initialize form for editing
  const initializeFormForEdit = useCallback((category: Category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      slug: category.slug,
      description: category.description || '',
      image_url: category.image_url || '',
      is_active: category.is_active !== undefined ? category.is_active : true,
      detail_type: (category as any).detail_type || null
    });
  }, []);

  // Initialize form for subcategory creation
  const initializeFormForSubcategory = useCallback((parentId: string) => {
    setIsCreatingSubcategory(true);
    setParentCategoryId(parentId);
    if (!tempCategoryId) {
      const newId = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
      setTempCategoryId(newId);
    }
    resetForm();
  }, [tempCategoryId]);

  // Reset form
  const resetForm = useCallback(() => {
    setFormData({
      name: '',
      slug: '',
      description: '',
      image_url: '',
      is_active: true,
      detail_type: null,
    });
    setEditingCategory(null);
    setIsCreatingSubcategory(false);
    setParentCategoryId(null);
    setTempCategoryId(null);
  }, []);

  return {
    formData,
    setFormData,
    editLoading,
    editingCategory,
    isCreatingSubcategory,
    parentCategoryId,
    tempCategoryId,
    setEditingCategory,
    setIsCreatingSubcategory,
    setParentCategoryId,
    generateSlug,
    handleSubmit,
    resetForm,
    initializeFormForEdit,
    initializeFormForSubcategory,
  };
}

