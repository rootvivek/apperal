'use client';

import Link from 'next/link';

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
  const categoriesWithSubcats = categories.filter(cat => 
    cat.subcategories && cat.subcategories.length > 0
  );

  // Find specific categories
  const accessoriesCategory = categoriesWithSubcats.find(cat => {
    const name = cat.name.toLowerCase();
    const slug = cat.slug.toLowerCase();
    return name.includes('accessor') || slug.includes('accessor');
  });
  
  const apparelCategory = categoriesWithSubcats.find(cat => {
    const name = cat.name.toLowerCase();
    const slug = cat.slug.toLowerCase();
    return name.includes('gen-z') || slug.includes('gen-z') || 
           name.includes('gen z') || slug.includes('gen z') ||
           name.includes('collections') || slug.includes('collections') ||
           name.includes('apperal') || slug.includes('apperal') ||
           name.includes('apparel') || slug.includes('apparel');
  });
  
  const coverCategory = categoriesWithSubcats.find(cat => {
    const name = cat.name.toLowerCase();
    const slug = cat.slug.toLowerCase();
    return name.includes('cover') || slug.includes('cover');
  });

  // Combine subcategories for row 1 (Apparel + Accessories)
  const row1Subcategories = [
    ...(apparelCategory?.subcategories?.map(sub => ({ sub, slug: apparelCategory.slug })) || []),
    ...(accessoriesCategory?.subcategories?.map(sub => ({ sub, slug: accessoriesCategory.slug })) || [])
  ];

  const scrollStyle = { 
    scrollSnapType: 'x mandatory' as const,
    WebkitOverflowScrolling: 'touch' as const,
    touchAction: 'pan-x pan-y' as const,
    overscrollBehaviorX: 'contain' as const,
    overscrollBehaviorY: 'auto' as const
  };

  return (
    <div className="pb-0 sm:py-0 px-1.5 sm:px-6 lg:px-8 h-auto">
      <div className="text-center mb-2 sm:mb-4">
        <h2 className="text-xl sm:text-2xl font-semibold text-gray-900">Categories</h2>
      </div>

      {/* Mobile: Row 1 - Gen-z Collections + Accessories */}
      <div className="sm:hidden flex flex-col gap-1.5">
        {row1Subcategories.length > 0 && (
          <div className="-mx-1.5 px-1.5">
            <div className="flex flex-nowrap gap-1.5 overflow-x-auto scrollbar-hide" style={scrollStyle}>
              {row1Subcategories.map(({ sub, slug }) => (
                <Link
                  key={sub.id}
                  href={`/products/${slug}/${sub.slug}`}
                  className="flex-shrink-0 group relative bg-white rounded-[4px] shadow-sm hover:shadow-md transition-shadow duration-300 overflow-hidden block border border-gray-200"
                  style={{ 
                    width: 'calc((100vw - 2rem) / 3 - 0.33rem)',
                    scrollSnapAlign: 'start'
                  }}
                >
                  <div className="w-full aspect-[5/6] overflow-hidden relative">
                    <img
                      src={sub.image_url || sub.image || '/images/categories/placeholder.svg'}
                      alt={sub.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                      decoding="async"
                      width={400}
                      height={480}
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = '/images/categories/placeholder.svg';
                      }}
                    />
                  </div>
                  <div className="p-1.5">
                    <h3 className="font-medium sm:font-normal text-gray-900 line-clamp-1 group-hover:text-brand transition-colors text-xs sm:text-sm text-center" style={{ textShadow: '0.5px 0.5px 1px rgba(0,0,0,0.1)' }}>
                      {sub.name}
                    </h3>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Mobile: Row 2 - Cover */}
        {coverCategory && coverCategory.subcategories && coverCategory.subcategories.length > 0 && (
          <div className="-mx-1.5 px-1.5">
            <div className="flex flex-nowrap gap-1.5 overflow-x-auto scrollbar-hide" style={scrollStyle}>
              {coverCategory.subcategories.map((sub) => (
                <Link
                  key={sub.id}
                  href={`/products/${coverCategory.slug}/${sub.slug}`}
                  className="flex-shrink-0 group relative bg-white rounded-[4px] shadow-sm hover:shadow-md transition-shadow duration-300 overflow-hidden block border border-gray-200"
                  style={{ 
                    width: 'calc((100vw - 2rem) / 3 - 0.33rem)',
                    scrollSnapAlign: 'start'
                  }}
                >
                  <div className="w-full aspect-[5/6] overflow-hidden relative">
                    <img
                      src={sub.image_url || sub.image || '/images/categories/placeholder.svg'}
                      alt={sub.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                      decoding="async"
                      width={400}
                      height={480}
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = '/images/categories/placeholder.svg';
                      }}
                    />
                  </div>
                  <div className="p-1.5">
                    <h3 className="font-medium sm:font-normal text-gray-900 line-clamp-1 group-hover:text-brand transition-colors text-xs sm:text-sm text-center" style={{ textShadow: '0.5px 0.5px 1px rgba(0,0,0,0.1)' }}>
                      {sub.name}
                    </h3>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Desktop: Subcategories Grid */}
      <div className="hidden sm:block">
        {categoriesWithSubcats.length === 0 ? (
          <div className="w-full text-gray-500 text-sm text-center py-8">
            No subcategories available
          </div>
        ) : (
          <div className="grid grid-cols-5 gap-2 max-w-full">
            {categoriesWithSubcats.flatMap(category => 
              category.subcategories?.map(subcat => ({
                ...subcat,
                category_slug: category.slug
              })) || []
            ).slice(0, 10).map((subcategory) => (
              <Link
                key={subcategory.id}
                href={`/products/${subcategory.category_slug}/${subcategory.slug}`}
                className="group relative bg-white rounded-[4px] shadow-sm hover:shadow-md transition-shadow duration-300 overflow-hidden block border border-gray-200"
              >
                <div className="aspect-[3/3.2] overflow-hidden relative">
                  <img
                    src={subcategory.image_url || subcategory.image || '/images/categories/placeholder.svg'}
                    alt={subcategory.name}
                    className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                    decoding="async"
                    width={400}
                    height={427}
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = '/images/categories/placeholder.svg';
                    }}
                  />
                  <div className="absolute bottom-0 left-0 right-0 bg-white/20 backdrop-blur-md border-t border-white/30 shadow-lg p-4 overflow-hidden">
                    <h3 className="font-medium text-gray-900 text-center group-hover:text-brand transition-colors text-base sm:text-lg block truncate whitespace-nowrap">
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
