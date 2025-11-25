'use client';

import { useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Category } from './useCategories';
import { generateUuid } from '@/utils/uuid';

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
      
      // Get user ID from Firebase (since we use Firebase phone auth)
      let userId: string | null = null;
      
      try {
        if (typeof window !== 'undefined') {
          // Get user from localStorage
          const storedUser = localStorage.getItem('user');
          if (storedUser) {
            try {
              const user = JSON.parse(storedUser);
              userId = user.id;
            } catch {
              // Invalid stored user
            }
          }
        }
      } catch {
        // Continue to fallback
      }
      
      if (!userId && typeof window !== 'undefined') {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
          try {
            const user = JSON.parse(storedUser);
            userId = user.id;
          } catch {
            // Invalid stored user
          }
        }
      }
      
      if (!userId) {
        onError('User not authenticated. Please sign in again.');
        return;
      }

      // Clean image_url - only include if it's a valid URL
      const imageUrl = formData.image_url.trim();
      const cleanImageUrlValue = imageUrl && imageUrl.startsWith('http') ? cleanImageUrl(imageUrl) : null;
      
      let categoryData: any = {
        name: formData.name.trim(),
        slug: generateSlug(formData.name, isCreatingSubcategory, parentCategoryId || undefined),
        description: formData.description.trim() || undefined,
        image_url: cleanImageUrlValue,
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
              'X-User-Id': userId,
            },
            body: JSON.stringify({
              subcategoryId: editingCategory.id,
              ...categoryData
            }),
          });

          // Read response once
          const responseText = await response.text();
          let data;
          try {
            data = JSON.parse(responseText);
          } catch {
            const errorMessage = responseText || `Server error: ${response.status}`;
            throw new Error(errorMessage);
          }

          if (!response.ok) {
            const errorMessage = data.error || data.details || 'Failed to update subcategory';
            throw new Error(errorMessage);
          }
        
          const updatedSubcategory: Category = {
            ...editingCategory,
            ...(data.subcategory || categoryData)
          };
          onUpdateSubcategory(editingCategory.parent_category_id, updatedSubcategory);
        } else {
          // Update parent category
          const response = await fetch('/api/admin/update-category', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-User-Id': userId,
            },
            body: JSON.stringify({
              categoryId: editingCategory.id,
              ...categoryData
            }),
          });

          // Read response once
          const responseText = await response.text();
          let data;
          try {
            data = JSON.parse(responseText);
          } catch {
            const errorMessage = responseText || `Server error: ${response.status}`;
            throw new Error(errorMessage);
          }

          if (!response.ok) {
            const errorMessage = data.error || data.details || 'Failed to update category';
            throw new Error(errorMessage);
          }

          const updatedCategory: Category = {
            ...editingCategory,
            ...(data.category || categoryData)
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
              'X-User-Id': userId,
            },
            body: JSON.stringify({
              ...categoryData,
              parent_category_id: parentCategoryId
            }),
          });

          // Read response once
          const responseText = await response.text();
          let data;
          try {
            data = JSON.parse(responseText);
          } catch {
            const errorMessage = responseText || `Server error: ${response.status}`;
            throw new Error(errorMessage);
          }

          if (!response.ok) {
            const errorMessage = data.error || data.details || 'Failed to create subcategory';
            throw new Error(errorMessage);
          }

          if (data.success && data.subcategory) {
            const newSubcategory: Category = {
              ...data.subcategory,
              parent_category_id: parentCategoryId
            };
            onAddSubcategory(parentCategoryId, newSubcategory);
          } else {
            throw new Error('Invalid response from server');
          }
        } else {
          // Create parent category
          const response = await fetch('/api/admin/create-category', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-User-Id': userId,
            },
            body: JSON.stringify(categoryData),
          });

          // Read response once
          const responseText = await response.text();
          let data;
          try {
            data = JSON.parse(responseText);
          } catch {
            const errorMessage = responseText || `Server error: ${response.status}`;
            throw new Error(errorMessage);
          }

          if (!response.ok) {
            const errorMessage = data.error || data.details || 'Failed to create category';
            throw new Error(errorMessage);
          }

          if (data.success && data.category) {
            onAddCategory(data.category);
          } else {
            throw new Error('Invalid response from server');
          }
        }
      }

      resetForm();
      onSuccess();
    } catch (err: any) {
      // Extract error message safely
      let errorMessage = 'Failed to save category';
      
      if (err) {
        if (typeof err === 'string') {
          errorMessage = err.trim() || errorMessage;
        } else if (err.message && typeof err.message === 'string' && err.message.trim()) {
          errorMessage = err.message.trim();
        } else if (err.toString && typeof err.toString === 'function') {
          const stringError = err.toString();
          if (stringError && stringError !== '[object Object]' && stringError.trim()) {
            errorMessage = stringError.trim();
          }
        }
      }
      
      // Only call onError with a valid, non-empty error message
      onError(errorMessage);
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

  // Initialize form for subcategory creation
  const initializeFormForSubcategory = useCallback((parentId: string) => {
    setIsCreatingSubcategory(true);
    setParentCategoryId(parentId);
    if (!tempCategoryId) {
      const newId = generateUuid();
      setTempCategoryId(newId);
    }
    resetForm();
  }, [tempCategoryId, resetForm]);

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

