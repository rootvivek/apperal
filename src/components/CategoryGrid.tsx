import Link from 'next/link';
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

interface Category {
  id: string;
  name: string;
  slug: string;
  image_url?: string;
  image?: string;
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
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [subcategoriesLoading, setSubcategoriesLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    fetchSubcategories();
  }, []);

  const fetchSubcategories = async () => {
    try {
      // Fetch subcategories from the separate subcategories table (only active subcategories)
      const { data: subcategoriesData, error } = await supabase
        .from('subcategories')
        .select('*')
        .eq('is_active', true)
        .order('name', { ascending: true });
      
      if (error) {
        console.error('Error fetching subcategories:', error);
        setSubcategories([]);
        return;
      }
      
      setSubcategories(subcategoriesData || []);
    } catch (error) {
      console.error('Error fetching subcategories:', error);
    } finally {
      setSubcategoriesLoading(false);
    }
  };

  const getParentCategorySlug = (parentCategoryId: string) => {
    const parentCategory = categories.find(cat => cat.id === parentCategoryId);
    return parentCategory?.slug || 'unknown';
  };

  return (
    <div className="py-3 mx-3 sm:mx-6 lg:mx-8">
      {/* Desktop: Subcategories Grid - Smaller cards */}
      <div className="hidden sm:flex sm:justify-center px-1.5 sm:px-6 lg:px-8">
        <div className="flex flex-wrap justify-center gap-5">
        {subcategoriesLoading ? (
          <div className="w-full text-gray-500 text-sm text-center py-8">Loading subcategories...</div>
        ) : subcategories.length === 0 ? (
          // Fallback to show categories if no subcategories
          categories.slice(0, 8).map((category) => (
            <Link
              key={category.id}
              href={`/products/${category.slug}`}
              className="group flex flex-col items-center text-center hover:scale-105 transition-transform duration-300 w-[100px]"
            >
              <div className="w-full aspect-square rounded-lg overflow-hidden mb-2 shadow-sm">
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
        ) : (
          subcategories.map((subcategory) => (
            <Link
              key={subcategory.id}
              href={`/products/${getParentCategorySlug(subcategory.parent_category_id)}/${subcategory.slug}`}
              className="group flex flex-col items-center text-center hover:scale-105 transition-transform duration-300 w-[100px]"
            >
              <div className="w-full aspect-square rounded-lg overflow-hidden mb-2 shadow-sm">
                <img
                  src={subcategory.image_url || subcategory.image || '/images/categories/placeholder.svg'}
                  alt={subcategory.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = '/images/categories/placeholder.svg';
                  }}
                />
              </div>
              <h3 className="text-gray-900 text-xs sm:text-sm font-medium group-hover:text-blue-600 transition-colors">
                {subcategory.name}
              </h3>
            </Link>
          ))
        )}
        </div>
      </div>
    </div>
  );
}
