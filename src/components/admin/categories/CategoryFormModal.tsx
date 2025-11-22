'use client';

import { memo } from 'react';
import Modal from '@/components/Modal';
import ImageUpload from '@/components/ImageUpload';
import { Category } from '@/hooks/admin/useCategories';

export interface CategoryFormData {
  name: string;
  slug: string;
  description: string;
  image_url: string;
  is_active: boolean;
  detail_type: string | null;
}

interface CategoryFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  formData: CategoryFormData;
  onFormDataChange: (updates: Partial<CategoryFormData>) => void;
  onSubmit: (e: React.FormEvent) => Promise<void>;
  editingCategory: Category | null;
  isCreatingSubcategory: boolean;
  editLoading: boolean;
  uploadingImage: boolean;
  onImageUpload: (file: File) => Promise<void>;
  generateSlug: (name: string, isSubcategory?: boolean, parentCatId?: string) => string;
  parentCategoryId: string | null;
}

const CategoryFormModal = memo(function CategoryFormModal({
  isOpen,
  onClose,
  formData,
  onFormDataChange,
  onSubmit,
  editingCategory,
  isCreatingSubcategory,
  editLoading,
  uploadingImage,
  onImageUpload,
  generateSlug,
  parentCategoryId,
}: CategoryFormModalProps) {
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onFormDataChange({
      name: e.target.value,
      slug: generateSlug(e.target.value, isCreatingSubcategory, parentCategoryId || undefined),
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editingCategory ? 'Edit Category' : isCreatingSubcategory ? 'Add New Subcategory' : 'Add New Category'}
      size="xl"
      className="max-h-[90vh] overflow-y-auto"
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Category Name *
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={handleNameChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            placeholder="Enter category name"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Description
          </label>
          <textarea
            rows={3}
            value={formData.description}
            onChange={(e) => onFormDataChange({ description: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            placeholder="Enter category description"
          />
        </div>

        {/* Detail Type - Only for PARENT CATEGORIES (not subcategories) */}
        {!isCreatingSubcategory && (!editingCategory || !editingCategory.parent_category_id) && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Product Detail Table Type
            </label>
            <select
              value={formData.detail_type || ''}
              onChange={(e) => onFormDataChange({ detail_type: e.target.value || null })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">None (Generic Products)</option>
              <option value="mobile">Mobile Details → All products use product_mobile_details table</option>
              <option value="apparel">Apparel Details → All products use product_apparel_details table</option>
              <option value="accessories">Accessories Details → All products use product_accessories_details table</option>
            </select>
            <p className="mt-1 text-xs text-gray-500">
              <strong>This creates a direct relationship:</strong> When you set this on a category, ALL subcategories and products under this category will automatically save their details to the selected table. 
              Set this once when creating/editing the parent category.
            </p>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Category Image
          </label>
          <ImageUpload
            onImageUpload={onImageUpload}
            currentImageUrl={formData.image_url}
            placeholder="Upload category image"
          />
          {uploadingImage && (
            <p className="mt-2 text-sm text-blue-600">Uploading image...</p>
          )}
        </div>

        <div className="flex items-center">
          <input
            type="checkbox"
            name="is_active"
            id="is_active"
            checked={formData.is_active}
            onChange={(e) => onFormDataChange({ is_active: e.target.checked })}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <label htmlFor="is_active" className="ml-2 block text-sm text-gray-900">
            Active
          </label>
        </div>

        <div className="p-6 border-t border-gray-200 flex space-x-3 sticky bottom-0 bg-white -m-6 mt-0">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={editLoading}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {editLoading ? 'Saving...' : editingCategory ? 'Update Category' : 'Create Category'}
          </button>
        </div>
      </form>
    </Modal>
  );
});

export default CategoryFormModal;

