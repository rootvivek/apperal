import Link from 'next/link';
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

interface Category {
  id: string;
  name: string;
  slug: string;
  image_url?: string;
  image?: string;
  parent_category_id?: string | null;
}

interface Subcategory {
  id: string;
  name: string;
  slug: string;
  image_url?: string;
  image?: string;
  parent_category_id: string;
}

interface CategoryGridProps {
  categories: Category[];
}

export default function CategoryGrid({ categories }: CategoryGridProps) {
  // Filter to only show main categories (those without parent_category_id or is null)
  const mainCategories = categories.filter(category => !category.parent_category_id);

  return (
    <div className="pt-0 pb-0 sm:py-0 mx-3 sm:mx-6 lg:mx-8 h-auto">
      {/* Desktop: Categories Grid - Larger cards */}
      <div className="hidden sm:flex sm:justify-center px-0 sm:px-0 lg:px-0">
        <div className="flex flex-wrap justify-center gap-8">
        {mainCategories.length === 0 ? (
          <div className="w-full text-gray-500 text-sm text-center py-8">No categories available</div>
        ) : (
          mainCategories.map((category) => (
            <Link
              key={category.id}
              href={`/products/${category.slug}`}
              className="group flex flex-col items-center text-center hover:scale-105 transition-transform duration-300 w-[100px] sm:w-[90px]"
            >
              <div className="w-full aspect-square rounded-lg overflow-hidden mb-1 shadow-sm">
                <img
                  src={category.image_url || category.image || '/images/categories/placeholder.svg'}
                  alt={category.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = '/images/categories/placeholder.svg';
                  }}
                />
              </div>
              <h3 className="text-gray-900 text-xs sm:text-sm font-medium group-hover:text-blue-600 transition-colors">
                {category.name}
              </h3>
            </Link>
          ))
        )}
        </div>
      </div>
    </div>
  );
}
