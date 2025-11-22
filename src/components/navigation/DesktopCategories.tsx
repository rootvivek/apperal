'use client';

import Link from 'next/link';
import { ChevronDownIcon } from './Icons';
import { mobileTypography } from '@/utils/mobileTypography';
import type { Category } from './useCategoryFiltering';

interface DesktopCategoriesProps {
  categories: Category[];
  categoriesLoading: boolean;
  openCategoryId: string | null;
  setOpenCategoryId: (id: string | null) => void;
  dropdownTimeout: ReturnType<typeof setTimeout> | null;
  setDropdownTimeout: (timeout: ReturnType<typeof setTimeout> | null) => void;
  showMobileSearch: boolean;
}

export default function DesktopCategories({
  categories,
  categoriesLoading,
  openCategoryId,
  setOpenCategoryId,
  dropdownTimeout,
  setDropdownTimeout,
  showMobileSearch,
}: DesktopCategoriesProps) {
  return (
    <div className={`hidden lg:flex items-center space-x-4 ml-12 ${showMobileSearch ? 'hidden' : 'flex'}`}>
      {categoriesLoading ? (
        <div className="text-gray-900 text-sm opacity-70 w-0 h-0"></div>
      ) : (
        categories.map((category) => (
          <div 
            key={category.id} 
            className="relative group category-dropdown-container"
            onMouseEnter={() => {
              // Clear any pending timeout
              if (dropdownTimeout) {
                clearTimeout(dropdownTimeout);
                setDropdownTimeout(null);
              }
              // Open dropdown if category has subcategories
              if (category.subcategories && category.subcategories.length > 0) {
                setOpenCategoryId(category.id);
              }
            }}
            onMouseLeave={() => {
              // Close dropdown after a short delay to allow moving to dropdown menu
              const timeout = setTimeout(() => {
                setOpenCategoryId(null);
              }, 150);
              setDropdownTimeout(timeout);
            }}
          >
            <Link
              href={`/products/${category.slug}`}
              className="text-gray-900 hover:text-brand-500 text-base font-normal transition-colors flex items-center"
            >
              {category.name}
              {category.subcategories && category.subcategories.length > 0 && (
                <ChevronDownIcon className="ml-0.5 w-4 h-4" rotated={openCategoryId === category.id} />
              )}
            </Link>
            
            {/* Subcategories Dropdown */}
            {category.subcategories && category.subcategories.length > 0 && (
              <div 
                className={`absolute top-full left-0 mt-1 w-48 bg-white rounded-md shadow-lg border border-gray-200 transition-all duration-200 z-[110] ${
                  openCategoryId === category.id ? 'opacity-100 visible' : 'opacity-0 invisible pointer-events-none'
                }`}
                onMouseEnter={() => {
                  // Clear timeout when entering dropdown
                  if (dropdownTimeout) {
                    clearTimeout(dropdownTimeout);
                    setDropdownTimeout(null);
                  }
                  setOpenCategoryId(category.id);
                }}
                onMouseLeave={() => {
                  // Close dropdown when leaving
                  setOpenCategoryId(null);
                }}
              >
                <div className="py-2">
                  {category.subcategories.map((subcategory) => {
                    const subcategoryImage = subcategory.image_url || '/images/categories/placeholder.svg';
                    return (
                      <Link
                        key={subcategory.id}
                        href={`/products/${category.slug}/${subcategory.slug}`}
                        className={`flex items-center gap-3 px-4 py-2 ${mobileTypography.title14} text-gray-700 hover:bg-gray-100 hover:text-brand-500 transition-colors`}
                        onClick={() => {
                          // Close dropdown when clicking a subcategory
                          setOpenCategoryId(null);
                        }}
                      >
                        <img
                          src={subcategoryImage}
                          alt={subcategory.name}
                          className="w-10 h-10 object-cover rounded flex-shrink-0"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            if (target.src !== '/images/categories/placeholder.svg') {
                              target.src = '/images/categories/placeholder.svg';
                            }
                          }}
                        />
                        <span className="flex-1">{subcategory.name}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}

