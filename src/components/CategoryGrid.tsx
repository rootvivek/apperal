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
  const [showAll, setShowAll] = useState(false);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [subcategoriesLoading, setSubcategoriesLoading] = useState(true);
  const supabase = createClient();
  
  // Show maximum 10 categories (2 rows of 5) initially
  const maxInitialCategories = 10;
  const displayedCategories = showAll ? categories : categories.slice(0, maxInitialCategories);
  const hasMoreCategories = categories.length > maxInitialCategories;

  useEffect(() => {
    fetchSubcategories();
  }, []);

  const fetchSubcategories = async () => {
    try {
      // Get all categories first
      const { data: allCategories, error: allError } = await supabase
        .from('categories')
        .select('*')
        .order('name', { ascending: true });
      
      if (allError) {
        console.error('Error fetching all categories:', allError);
        return;
      }
      
      // Filter subcategories (those with parent_category_id)
      const subcategoriesData = allCategories?.filter(cat => cat.parent_category_id !== null) || [];
      
      setSubcategories(subcategoriesData);
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
    <div className="px-1.5 py-3">
      {/* Mobile: Subcategories Grid */}
      <div className="sm:hidden">
        <div className="grid grid-cols-4 gap-3">
          {subcategoriesLoading ? (
            <div className="col-span-4 text-gray-500 text-sm text-center py-8">Loading subcategories...</div>
          ) : subcategories.length === 0 ? (
            // Fallback to show categories if no subcategories
            categories.slice(0, 8).map((category) => (
              <Link
                key={category.id}
                href={`/products/${category.slug}`}
                className="group flex flex-col items-center text-center hover:scale-105 transition-transform duration-300"
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
                <h3 className="text-gray-900 text-xs font-medium group-hover:text-blue-600 transition-colors">
                  {category.name}
                </h3>
              </Link>
            ))
          ) : (
            subcategories.map((subcategory) => (
              <Link
                key={subcategory.id}
                href={`/products/${getParentCategorySlug(subcategory.parent_category_id)}/${subcategory.slug}`}
                className="group flex flex-col items-center text-center hover:scale-105 transition-transform duration-300"
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
                <h3 className="text-gray-900 text-xs font-medium group-hover:text-blue-600 transition-colors">
                  {subcategory.name}
                </h3>
              </Link>
            ))
          )}
        </div>
      </div>

      {/* Desktop: Categories Grid */}
      <div className="hidden sm:flex overflow-x-auto gap-4 sm:gap-10 justify-center">
        {displayedCategories.map((category) => (
          <Link
            key={category.id}
            href={`/products/${category.slug}`}
            className="group flex flex-col items-center text-center hover:scale-105 transition-transform duration-300 flex-shrink-0"
          >
            <div className="w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 lg:w-36 lg:h-36 xl:w-40 xl:h-40 rounded-full overflow-hidden mb-4 shadow-sm">
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
            <h3 className="text-gray-900 text-sm font-medium group-hover:text-blue-600 transition-colors">
              {category.name}
            </h3>
          </Link>
        ))}
      </div>

        {/* List View - Only shown when "View All" is clicked (Desktop only) */}
        {showAll && (
          <div className="mt-8">
            <h3 className="text-xl font-semibold mb-4 text-gray-800">All Categories</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {categories.map((category) => (
                <Link
                  key={category.id}
                  href={`/products/${category.slug}`}
                  className="flex items-center space-x-4 p-4 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow duration-300 border border-gray-100"
                >
                  <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0">
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
                  <div className="flex-1 min-w-0">
                    <h4 className="text-lg font-medium text-gray-900 truncate">{category.name}</h4>
                  </div>
                  <div className="flex-shrink-0">
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
        
        {hasMoreCategories && (
          <div className="text-center mt-6">
            <button
              onClick={() => setShowAll(!showAll)}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              {showAll ? 'Show Less' : `View All (${categories.length})`}
            </button>
          </div>
        )}
    </div>
  );
}
