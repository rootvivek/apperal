'use client';

import { memo } from 'react';
import EmptyState from '@/components/checkout/shared/EmptyState';
import { Category } from '@/hooks/admin/useCategories';
import CategoryListItem from './CategoryListItem';
import SubcategoryListItem from './SubcategoryListItem';

interface CategoryAccordionProps {
  categories: Category[];
  subcategoriesList: Record<string, Category[]>;
  expandedCategories: string[];
  loadingSubcats: string[];
  loading: boolean;
  refreshKey: number;
  onToggleExpand: (categoryId: string) => void;
  onEdit: (category: Category) => void;
  onDelete: (categoryId: string) => void;
  onDeleteSubcategory: (subcategoryId: string) => void;
  onAddSubcategory: (parentId: string) => void;
  onToggleStatus: (categoryId: string, currentStatus: boolean | null | undefined, isSubcategory: boolean) => void;
  addCacheBusting: (url: string | null, updatedAt?: string) => string;
  formatDate: (date: string) => string;
}

const CategoryAccordion = memo(function CategoryAccordion({
  categories,
  subcategoriesList,
  expandedCategories,
  loadingSubcats,
  loading,
  refreshKey,
  onToggleExpand,
  onEdit,
  onDelete,
  onDeleteSubcategory,
  onAddSubcategory,
  onToggleStatus,
  addCacheBusting,
  formatDate,
}: CategoryAccordionProps) {
  if (loading) {
    return (
      <div className="text-center py-8 text-gray-500">Loading categories...</div>
    );
  }

  if (categories.length === 0) {
    return (
      <EmptyState
        title="No categories found"
        variant="compact"
      />
    );
  }

  return (
    <div className="space-y-2">
      {categories.map((category) => (
        <div key={category.id} className="border border-gray-200 rounded-lg overflow-hidden">
          {/* Category Row */}
          <CategoryListItem
            category={category}
            isExpanded={expandedCategories.includes(category.id)}
            onToggleExpand={() => onToggleExpand(category.id)}
            onEdit={() => onEdit(category)}
            onDelete={() => onDelete(category.id)}
            onAddSubcategory={() => onAddSubcategory(category.id)}
            onToggleStatus={async () => {
              await onToggleStatus(category.id, category.is_active ?? true, false);
            }}
            refreshKey={refreshKey}
            addCacheBusting={addCacheBusting}
            formatDate={formatDate}
          />

          {/* Subcategories (Expandable) */}
          {expandedCategories.includes(category.id) && (
            <div className="bg-gray-50 border-t border-gray-200">
              {loadingSubcats.includes(category.id) ? (
                <div className="p-4 text-center text-gray-500">Loading subcategories...</div>
              ) : (subcategoriesList[category.id]?.length || 0) > 0 ? (
                <div className="divide-y divide-gray-200">
                  {subcategoriesList[category.id].map((subcat) => (
                    <SubcategoryListItem
                      key={subcat.id}
                      subcategory={subcat}
                      onEdit={() => onEdit(subcat)}
                      onDelete={() => onDeleteSubcategory(subcat.id)}
                      onToggleStatus={async () => {
                        await onToggleStatus(subcat.id, subcat.is_active ?? true, true);
                      }}
                      refreshKey={refreshKey}
                    />
                  ))}
                </div>
              ) : (
                <div className="p-4 text-center text-gray-500 ml-12">
                  No subcategories yet
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
});

export default CategoryAccordion;

