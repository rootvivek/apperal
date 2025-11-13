'use client';

import Link from 'next/link';
import { Swiper, SwiperSlide } from 'swiper/react';
import { FreeMode } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/free-mode';

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
  // Filter categories that have subcategories
  const categoriesWithSubcats = categories.filter(category => 
    category.subcategories && category.subcategories.length > 0
  );

  return (
    <div className="pb-0 sm:py-0 px-1.5 sm:px-6 lg:px-8 h-auto">
      {/* Title */}
      <div className="text-center mb-2 sm:mb-4">
        <h2 className="text-xl sm:text-2xl font-semibold text-gray-900">Categories</h2>
      </div>

      {/* Mobile: Each category in its own row with horizontal scroll using Swiper */}
      <div className="sm:hidden flex flex-col gap-1.5" style={{ touchAction: 'pan-x pan-y' }}>
        {categoriesWithSubcats.map((category) => (
          <div key={category.id} className="-mx-1.5 sm:-mx-6 lg:-mx-8 px-1.5 sm:px-6 lg:px-8" style={{ touchAction: 'pan-x pan-y' }}>
            <Swiper
              modules={[FreeMode]}
              spaceBetween={6}
              slidesPerView="auto"
              freeMode={true}
              grabCursor={true}
              className="!overflow-visible"
              style={{ touchAction: 'pan-x pan-y' }}
            >
              {category.subcategories?.map((subcategory) => (
                <SwiperSlide key={subcategory.id} className="!w-auto">
                  <Link
                    href={`/products/${category.slug}/${subcategory.slug}`}
                    className="group relative rounded-[2px] shadow-sm overflow-hidden block"
                    style={{ width: 'calc((100vw - 2rem) / 3 - 0.33rem)' }}
                  >
                    <div className="w-full aspect-[3/3.2] overflow-hidden relative">
                      <img
                        src={subcategory.image_url || subcategory.image || '/images/categories/placeholder.svg'}
                        alt={subcategory.name}
                        className="w-full h-full object-cover"
                        loading="lazy"
                        decoding="async"
                        width={400}
                        height={427}
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = '/images/categories/placeholder.svg';
                        }}
                      />
                      {/* Name glass effect at middle-bottom */}
                      <div className="absolute bottom-0 left-0 right-0 bg-white/20 backdrop-blur-md border-t border-white/30 shadow-lg px-1.5 py-2 overflow-hidden">
                        <span className="text-xs font-medium text-gray-900 text-center leading-tight block truncate whitespace-nowrap">
                          {subcategory.name}
                        </span>
                      </div>
                    </div>
                  </Link>
                </SwiperSlide>
              ))}
            </Swiper>
          </div>
        ))}
      </div>

      {/* Desktop: Subcategories Grid - Max 10 items in 2 rows (5 per row) */}
      <div className="hidden sm:block">
        {categoriesWithSubcats.length === 0 ? (
          <div className="w-full text-gray-500 text-sm text-center py-8">No subcategories available</div>
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
                  {/* Name glass effect at middle-bottom */}
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
