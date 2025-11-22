'use client';

import { memo } from 'react';
import ImageWithFallback from '@/components/ImageWithFallback';
import { PLACEHOLDER_CATEGORY } from '@/utils/imageUtils';
import { Category } from '@/hooks/admin/useCategories';

interface SubcategoryListItemProps {
  subcategory: Category;
  onEdit: () => void;
  onDelete: () => void;
  onToggleStatus: () => void;
  refreshKey: number;
}

const SubcategoryListItem = memo(function SubcategoryListItem({
  subcategory,
  onEdit,
  onDelete,
  onToggleStatus,
  refreshKey,
}: SubcategoryListItemProps) {
  const subcategoryImage = subcategory.image_url || PLACEHOLDER_CATEGORY;

  return (
    <div className="p-4 flex items-center justify-between ml-12 bg-gray-50 hover:bg-gray-100">
      <div className="flex items-center gap-3 flex-1">
        <ImageWithFallback
          src={subcategoryImage}
          alt={subcategory.name}
          className="w-12 h-12 object-cover rounded flex-shrink-0"
          fallbackType="category"
        />
        <div className="flex-1">
          <h4 className="font-medium text-gray-800">{subcategory.name}</h4>
          <p className="text-sm text-gray-600">{subcategory.description || 'No description'}</p>
        </div>
      </div>
      <div className="flex items-center space-x-2 ml-4" key={`subcat-actions-${subcategory.id}-${refreshKey}`}>
        <button
          onClick={onToggleStatus}
          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full transition-colors ${
            (subcategory.is_active ?? true)
              ? 'bg-green-100 text-green-800 hover:bg-green-200'
              : 'bg-red-100 text-red-800 hover:bg-red-200'
          }`}
          title="Toggle Status"
        >
          {(subcategory.is_active ?? true) ? 'Active' : 'Inactive'}
        </button>
        <button
          onClick={onEdit}
          className="px-2 py-1 text-xs text-blue-600 hover:text-blue-900"
        >
          Edit
        </button>
        <button
          onClick={onDelete}
          className="px-2 py-1 text-xs text-red-600 hover:text-red-900"
        >
          Delete
        </button>
      </div>
    </div>
  );
});

export default SubcategoryListItem;

