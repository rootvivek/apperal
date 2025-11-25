'use client';

import { useState, useCallback, useMemo } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import AdminGuard from '@/components/admin/AdminGuard';
import { useCategories } from '@/hooks/admin/useCategories';
import { useCategoryForm } from '@/hooks/admin/useCategoryForm';
import { useCategoryMedia } from '@/hooks/admin/useCategoryMedia';
import CategoryAccordion from '@/components/admin/categories/CategoryAccordion';
import CategoryFormModal from '@/components/admin/categories/CategoryFormModal';
import Alert from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { createClient } from '@/lib/supabase/client';
import { Category } from '@/hooks/admin/useCategories';

export default function CategoriesPage() {
  const supabase = createClient();
  const [showEditModal, setShowEditModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const {
    categories,
    subcategoriesList,
    expandedCategories,
    loadingSubcats,
    loading,
    error: categoriesError,
    categorySearch,
    filteredCategories,
    setCategorySearch,
    fetchCategories,
    toggleExpandCategory,
    toggleCategoryStatus,
    refreshCategories,
    updateCategoryInList,
    updateSubcategoryInList,
    addCategoryToList,
    addSubcategoryToList,
    deleteCategory,
    deleteSubcategory,
  } = useCategories();

  const handleFormSuccess = useCallback(() => {
    setShowEditModal(false);
    setFormError(null);
    setSuccessMessage('Category saved successfully');
    refreshCategories();
  }, [refreshCategories]);

  const handleFormError = useCallback((error: string) => {
    // Early return if error is empty or only whitespace
    if (!error || !error.trim()) {
      setFormError(null);
      return;
    }
    
    // Only set and show error if it has content
    setFormError(error);
    alert(error);
  }, []);

  const {
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
  } = useCategoryForm({
    onSuccess: handleFormSuccess,
    onError: handleFormError,
    onUpdateCategory: updateCategoryInList,
    onUpdateSubcategory: updateSubcategoryInList,
    onAddCategory: addCategoryToList,
    onAddSubcategory: addSubcategoryToList,
  });

  const handleImageUrlChange = useCallback((url: string) => {
    setFormData(prev => ({ ...prev, image_url: url }));
  }, [setFormData]);

  const handleCategoryUpdate = useCallback((category: Category) => {
    if (category.parent_category_id) {
      updateSubcategoryInList(category.parent_category_id, category);
    } else {
      updateCategoryInList(category);
    }
    setEditingCategory(category);
  }, [updateCategoryInList, updateSubcategoryInList, setEditingCategory]);

  const {
    uploadingImage,
    handleImageUpload,
    addCacheBusting,
  } = useCategoryMedia({
    editingCategory,
    isCreatingSubcategory,
    tempCategoryId,
    formData,
    categories,
    subcategoriesList,
    onImageUrlChange: handleImageUrlChange,
    onCategoryUpdate: handleCategoryUpdate,
    onError: handleFormError,
  });

  const handleEdit = useCallback((category: Category) => {
    initializeFormForEdit(category);
    setShowEditModal(true);
  }, [initializeFormForEdit]);

  const handleAddSubcategory = useCallback((parentId: string) => {
    initializeFormForSubcategory(parentId);
    setShowEditModal(true);
  }, [initializeFormForSubcategory]);

  const handleDelete = useCallback(async (categoryId: string) => {
    if (!confirm('Are you sure you want to delete this category? This will also delete all subcategories and products under it.')) {
      return;
    }

    try {
      // Get user ID from localStorage
      let userId: string | null = null;
      
      if (typeof window !== 'undefined') {
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
        handleFormError('User not authenticated. Please sign in again.');
        return;
      }

      await deleteCategory(categoryId, userId);
      setSuccessMessage('Category deleted successfully');
      await refreshCategories();
      
      // Double-check after a delay
      setTimeout(async () => {
        await refreshCategories();
      }, 1000);
    } catch (err: any) {
      handleFormError(err.message || 'Failed to delete category');
    }
  }, [supabase, deleteCategory, refreshCategories, handleFormError]);

  const handleDeleteSubcategory = useCallback(async (subcategoryId: string) => {
    if (!confirm('Are you sure you want to delete this subcategory? This will also delete all products under it and their images.')) {
      return;
    }

    try {
      // Get user ID from localStorage
      let userId: string | null = null;
      
      if (typeof window !== 'undefined') {
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
        handleFormError('User not authenticated. Please sign in again.');
        return;
      }

      await deleteSubcategory(subcategoryId, userId);
      setSuccessMessage('Subcategory deleted successfully');
      await refreshCategories();
    } catch (err: any) {
      handleFormError(err.message || 'Failed to delete subcategory');
    }
  }, [supabase, deleteSubcategory, refreshCategories, handleFormError]);

  const handleToggleStatus = useCallback(async (
    categoryId: string,
    currentStatus: boolean | null | undefined,
    isSubcategory: boolean
  ) => {
    try {
      await toggleCategoryStatus(categoryId, currentStatus, isSubcategory);
      setRefreshKey(prev => prev + 1);
    } catch (err: any) {
      handleFormError(err.message || 'Failed to update status');
    }
  }, [toggleCategoryStatus, handleFormError]);

  const handleCloseModal = useCallback(() => {
    setShowEditModal(false);
    resetForm();
    setIsCreatingSubcategory(false);
    setParentCategoryId(null);
  }, [resetForm, setIsCreatingSubcategory, setParentCategoryId]);

  const handleDismissError = useCallback(() => {
    // Error is managed by hooks
  }, []);

  const handleDismissSuccess = useCallback(() => {
    setSuccessMessage(null);
  }, []);

  const formatDate = useCallback((date: string) => {
    return new Date(date).toLocaleDateString();
  }, []);

  const handleFormDataChange = useCallback((updates: Partial<typeof formData>) => {
    setFormData(prev => ({ ...prev, ...updates }));
  }, [setFormData]);

  return (
    <AdminGuard>
      <AdminLayout>
        <div className="space-y-1">
          {(categoriesError || formError) && (
            <Alert 
              message={categoriesError || formError || ''} 
              variant="error" 
              onClose={() => { 
                if (categoriesError) handleDismissError();
                if (formError) setFormError(null);
              }} 
              className="mb-4"
            />
          )}
          {successMessage && (
            <Alert 
              message={successMessage} 
              variant="success" 
              onClose={handleDismissSuccess}
              autoDismiss={3000}
              className="mb-4"
            />
          )}

          {showEditModal && (
            <CategoryFormModal
              isOpen={showEditModal}
              onClose={handleCloseModal}
              formData={formData}
              onFormDataChange={handleFormDataChange}
              onSubmit={handleSubmit}
              editingCategory={editingCategory}
              isCreatingSubcategory={isCreatingSubcategory}
              editLoading={editLoading}
              uploadingImage={uploadingImage}
              onImageUpload={handleImageUpload}
              generateSlug={generateSlug}
              parentCategoryId={parentCategoryId}
            />
          )}

          {/* Accordion View */}
          <div className="bg-white rounded-lg shadow p-1 space-y-1">
            {/* Header with Add Button and Search */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => {
                  resetForm();
                  setShowEditModal(true);
                }}
                className="px-1 py-0.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium text-xs"
              >
                ➕ Add Category
              </button>
              <button
                onClick={() => refreshCategories()}
                className="px-1 py-0.5 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition font-medium text-xs"
                title="Refresh categories from database"
              >
                🔄 Refresh
              </button>
              <Input
                type="text"
                placeholder="Search categories..."
                value={categorySearch}
                onChange={(e) => setCategorySearch(e.target.value)}
                className="flex-1"
              />
              <span className="text-sm text-gray-600 whitespace-nowrap">
                {filteredCategories.length} found
              </span>
            </div>

            {/* Categories Accordion */}
            <CategoryAccordion
              categories={filteredCategories}
              subcategoriesList={subcategoriesList}
              expandedCategories={expandedCategories}
              loadingSubcats={loadingSubcats}
              loading={loading}
              refreshKey={refreshKey}
              onToggleExpand={toggleExpandCategory}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onDeleteSubcategory={handleDeleteSubcategory}
              onAddSubcategory={handleAddSubcategory}
              onToggleStatus={handleToggleStatus}
              addCacheBusting={addCacheBusting}
              formatDate={formatDate}
            />
          </div>
        </div>
      </AdminLayout>
    </AdminGuard>
  );
}

