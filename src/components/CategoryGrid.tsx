'use client';

import { useMemo, memo } from 'react';
import Card from './Card';
import { PLACEHOLDER_CATEGORY } from '@/utils/imageUtils';

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

// Memoized scroll style object - created once
const SCROLL_STYLE = { 
  scrollSnapType: 'x mandatory' as const,
  WebkitOverflowScrolling: 'touch' as const,
  touchAction: 'pan-x pan-y' as const,
  overscrollBehaviorX: 'contain' as const,
  overscrollBehaviorY: 'auto' as const
} as const;

function CategoryGrid({ categories }: CategoryGridProps) {
  // Memoize filtered categories
  const categoriesWithSubcats = useMemo(() => 
    categories.filter(cat => cat.subcategories && cat.subcategories.length > 0),
    [categories]
  );

  // Memoize category lookups with optimized matching
  const { accessoriesCategory, apparelCategory, coverCategory } = useMemo(() => {
    const accessories = categoriesWithSubcats.find(cat => {
      const name = cat.name.toLowerCase();
      const slug = cat.slug.toLowerCase();
      return name.includes('accessor') || slug.includes('accessor');
    });
    
    const apparel = categoriesWithSubcats.find(cat => {
      const name = cat.name.toLowerCase();
      const slug = cat.slug.toLowerCase();
      return name.includes('gen-z') || slug.includes('gen-z') || 
             name.includes('gen z') || slug.includes('gen z') ||
             name.includes('collections') || slug.includes('collections') ||
             name.includes('apperal') || slug.includes('apperal') ||
             name.includes('apparel') || slug.includes('apparel');
    });
    
    const cover = categoriesWithSubcats.find(cat => {
      const name = cat.name.toLowerCase();
      const slug = cat.slug.toLowerCase();
      return name.includes('cover') || slug.includes('cover');
    });

    return { accessoriesCategory: accessories, apparelCategory: apparel, coverCategory: cover };
  }, [categoriesWithSubcats]);

  // Memoize row 1 subcategories
  const row1Subcategories = useMemo(() => {
    const apparelSubs = apparelCategory?.subcategories?.map(sub => ({ 
      sub, 
      slug: apparelCategory.slug 
    })) || [];
    
    const accessoriesSubs = accessoriesCategory?.subcategories?.map(sub => ({ 
      sub, 
      slug: accessoriesCategory.slug 
    })) || [];
    
    return [...apparelSubs, ...accessoriesSubs];
  }, [apparelCategory, accessoriesCategory]);

  // Memoize desktop subcategories
  const desktopSubcategories = useMemo(() => 
    categoriesWithSubcats
      .flatMap(category => 
        category.subcategories?.map(subcat => ({
          ...subcat,
          category_slug: category.slug
        })) || []
      )
      .slice(0, 10),
    [categoriesWithSubcats]
  );

  return (
    <div className="pb-0 sm:py-0 px-1.5 sm:px-6 lg:px-8 h-auto">
      <div className="text-center mb-1 sm:mb-2">
        <h2 className="text-xl sm:text-2xl font-semibold text-gray-900">Categories</h2>
      </div>

      {/* Mobile: Row 1 - Gen-z Collections + Accessories */}
      <div className="sm:hidden flex flex-col gap-1.5">
        {row1Subcategories.length > 0 && (
          <div className="-mx-1.5 px-1.5">
            <div className="flex flex-nowrap gap-1.5 overflow-x-auto scrollbar-hide" style={SCROLL_STYLE}>
              {row1Subcategories.map(({ sub, slug }) => (
                <Card
                  key={sub.id}
                  href={`/products/${slug}/${sub.slug}`}
                  imageUrl={sub.image_url || PLACEHOLDER_CATEGORY}
                  title={sub.name}
                  variant="subcategory"
                  aspectRatio="5/6"
                  showOverlay={true}
                  overlayStyle="gradient"
                  titlePosition="overlay"
                  className="flex-shrink-0 rounded-[4px]"
                  mobileWidth="calc((100vw - 2rem) / 3 - 0.33rem)"
                />
              ))}
            </div>
          </div>
        )}

        {/* Mobile: Row 2 - Cover */}
        {coverCategory && coverCategory.subcategories && coverCategory.subcategories.length > 0 && (
          <div className="-mx-1.5 px-1.5">
            <div className="flex flex-nowrap gap-1.5 overflow-x-auto scrollbar-hide" style={SCROLL_STYLE}>
              {coverCategory.subcategories.map((sub) => (
                <Card
                  key={sub.id}
                  href={`/products/${coverCategory.slug}/${sub.slug}`}
                  imageUrl={sub.image_url || PLACEHOLDER_CATEGORY}
                  title={sub.name}
                  variant="subcategory"
                  aspectRatio="5/6"
                  showOverlay={true}
                  overlayStyle="gradient"
                  titlePosition="overlay"
                  className="flex-shrink-0 rounded-[4px]"
                  mobileWidth="calc((100vw - 2rem) / 3 - 0.33rem)"
                />
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
            {desktopSubcategories.map((subcategory) => (
              <Card
                key={subcategory.id}
                href={`/products/${subcategory.category_slug || ''}/${subcategory.slug}`}
                imageUrl={subcategory.image_url || PLACEHOLDER_CATEGORY}
                title={subcategory.name}
                variant="subcategory"
                aspectRatio="3/3.2"
                showOverlay={true}
                overlayStyle="glass"
                titlePosition="overlay"
                className="rounded-[4px]"
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default memo(CategoryGrid);
