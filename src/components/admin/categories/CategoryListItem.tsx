'use client';

import { memo } from 'react';
import { Category } from '@/hooks/admin/useCategories';

interface CategoryListItemProps {
  category: Category;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onAddSubcategory: () => void;
  onToggleStatus: () => void;
  refreshKey: number;
  addCacheBusting: (url: string | null, updatedAt?: string) => string;
  formatDate: (date: string) => string;
}

const CategoryListItem = memo(function CategoryListItem({
  category,
  isExpanded,
  onToggleExpand,
  onEdit,
  onDelete,
  onAddSubcategory,
  onToggleStatus,
  refreshKey,
  addCacheBusting,
  formatDate,
}: CategoryListItemProps) {
  return (
    <div className="flex items-center justify-between p-4 bg-white hover:bg-gray-50 transition">
      <div className="flex items-center flex-1 gap-4">
        {/* Expand Button */}
        <button
          onClick={onToggleExpand}
          className="text-gray-600 hover:text-gray-900 transition"
          title={isExpanded ? "Collapse" : "Expand"}
        >
          <svg 
            className={`w-5 h-5 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>

        {/* Category Image */}
        {category.image_url ? (
          <img
            src={addCacheBusting(category.image_url, category.updated_at)}
            alt={category.name}
            className="h-10 w-10 object-cover rounded"
            key={`img-${category.id}-${category.updated_at}`}
          />
        ) : (
          <div className="h-10 w-10 bg-gray-200 rounded flex items-center justify-center">
            <span className="text-xs text-gray-500">No</span>
          </div>
        )}

        {/* Category Info */}
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900">{category.name}</h3>
          <p className="text-sm text-gray-600">{category.description || 'No description'}</p>
        </div>

        {/* Date */}
        <div className="text-sm text-gray-500 hidden md:block">
          {formatDate(category.created_at)}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center space-x-2 ml-4" key={`actions-${category.id}-${refreshKey}`}>
        <button
          onClick={onToggleStatus}
          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full transition-colors ${
            (category.is_active ?? true)
              ? 'bg-green-100 text-green-800 hover:bg-green-200'
              : 'bg-red-100 text-red-800 hover:bg-red-200'
          }`}
          title="Toggle Status"
        >
          {(category.is_active ?? true) ? 'Active' : 'Inactive'}
        </button>
        <button
          onClick={onAddSubcategory}
          className="px-3 py-1 text-sm text-green-600 hover:text-green-900 font-medium"
          title="Add Subcategory"
        >
          ➕ SubCat
        </button>
        <button
          onClick={onEdit}
          className="px-3 py-1 text-sm text-blue-600 hover:text-blue-900 font-medium"
          title="Edit"
        >
          ✏️
        </button>
        <button
          onClick={onDelete}
          className="px-3 py-1 text-sm text-red-600 hover:text-red-900 font-medium"
          title="Delete"
        >
          🗑️
        </button>
      </div>
    </div>
  );
});

export default CategoryListItem;

