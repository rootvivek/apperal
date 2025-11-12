import Link from 'next/link';
import { useMemo } from 'react';

interface Category {
  id: string;
  name: string;
  slug: string;
  image_url?: string;
  image?: string;
  parent_category_id?: string | null;
  subcategories?: Subcategory[];
}

interface Subcategory {
  id: string;
  name: string;
  slug: string;
  image_url?: string;
  image?: string;
  parent_category_id: string;
  category_slug?: string;
}

interface CategoryGridProps {
  categories: Category[];
}

export default function CategoryGrid({ categories }: CategoryGridProps) {
  // Extract all subcategories from all categories
  const allSubcategories = useMemo(() => {
    const subcats: Subcategory[] = [];
    categories.forEach(category => {
      if (category.subcategories && category.subcategories.length > 0) {
        category.subcategories.forEach(subcat => {
          subcats.push({
            ...subcat,
            category_slug: category.slug
          });
        });
      }
    });
    return subcats;
  }, [categories]);


  return (
    <div className="pt-0 pb-0 sm:py-0 mx-3 sm:mx-6 lg:mx-8 h-auto">
      {/* Title */}
      <div className="text-center mb-4 sm:mb-6">
        <h2 className="text-xl sm:text-2xl font-semibold text-gray-900">Categories</h2>
      </div>

      {/* Mobile: Subcategories Grid - Horizontal scroll, 3 items visible */}
      <div className="sm:hidden px-0">
        {allSubcategories.length === 0 ? (
          <div className="w-full text-gray-500 text-sm text-center py-8">No subcategories available</div>
        ) : (
          <div className="overflow-x-auto scrollbar-hide -mx-3 sm:-mx-6 lg:-mx-8 px-3 sm:px-6 lg:px-8">
            <div className="flex gap-2" style={{ width: 'max-content' }}>
              {allSubcategories.map((subcategory) => (
                <Link
                  key={subcategory.id}
                  href={`/products/${subcategory.category_slug}/${subcategory.slug}`}
                  className="group relative rounded-[2px] shadow-sm overflow-hidden flex-shrink-0"
                  style={{ width: 'calc((100vw - 2rem) / 3 - 0.5rem)' }}
                >
                  <div className="w-full aspect-[3/4] overflow-hidden relative">
                    <img
                      src={subcategory.image_url || subcategory.image || '/images/categories/placeholder.svg'}
                      alt={subcategory.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = '/images/categories/placeholder.svg';
                      }}
                    />
                    {/* Name glass effect at middle-bottom */}
                    <div className="absolute bottom-0 left-0 right-0 bg-white/20 backdrop-blur-md border-t border-white/30 shadow-lg px-1.5 py-2">
                      <span className="text-xs font-medium text-gray-900 line-clamp-2 text-center leading-tight block">
                        {subcategory.name}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Desktop: Subcategories Grid - Max 10 items in 2 rows (5 per row) */}
      <div className="hidden sm:block">
        {allSubcategories.length === 0 ? (
          <div className="w-full text-gray-500 text-sm text-center py-8">No subcategories available</div>
        ) : (
          <div className="grid grid-cols-5 gap-2 max-w-full">
            {allSubcategories.slice(0, 10).map((subcategory) => (
              <Link
                key={subcategory.id}
                href={`/products/${subcategory.category_slug}/${subcategory.slug}`}
                className="group relative bg-white rounded-[4px] shadow-sm hover:shadow-md transition-shadow duration-300 overflow-hidden block border border-gray-200"
              >
                <div className="aspect-[3/4] overflow-hidden relative">
                  <img
                    src={subcategory.image_url || subcategory.image || '/images/categories/placeholder.svg'}
                    alt={subcategory.name}
                    className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = '/images/categories/placeholder.svg';
                    }}
                  />
                  {/* Name glass effect at middle-bottom */}
                  <div className="absolute bottom-0 left-0 right-0 bg-white/20 backdrop-blur-md border-t border-white/30 shadow-lg p-4">
                    <h3 className="font-medium text-gray-900 line-clamp-2 text-center group-hover:text-brand transition-colors text-base sm:text-lg block">
                      {subcategory.name}
                    </h3>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
