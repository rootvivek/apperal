import Link from 'next/link';
import { useState } from 'react';

interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  image_url?: string;
  image?: string;
}

interface CategoryGridProps {
  categories: Category[];
}

export default function CategoryGrid({ categories }: CategoryGridProps) {
  const [showAll, setShowAll] = useState(false);
  
  // Show maximum 10 categories (2 rows of 5) initially
  const maxInitialCategories = 10;
  const displayedCategories = showAll ? categories : categories.slice(0, maxInitialCategories);
  const hasMoreCategories = categories.length > maxInitialCategories;

  return (
    <div className="p-6">
      {/* Card Grid View - Always shown initially */}
      <div className="flex flex-wrap justify-center gap-8">
        {displayedCategories.map((category) => (
          <Link
            key={category.id}
            href={`/products/${category.slug}`}
            className="flex flex-col items-center cursor-pointer group"
          >
            <div className="w-40 h-40 rounded-full overflow-hidden shadow-xs hover:shadow-sm transition-shadow duration-200 group-hover:scale-105 transition-transform duration-300">
              {category.image_url || category.image ? (
                <img
                  src={category.image_url || category.image || '/images/categories/placeholder.svg'}
                  alt={category.name}
                  className="h-full w-full object-cover"
                  onError={(e) => {
                    console.error('Category image failed to load:', e.currentTarget.src);
                    e.currentTarget.style.display = 'none';
                    e.currentTarget.nextElementSibling.style.display = 'flex';
                  }}
                />
              ) : null}
              <div 
                className={`h-full w-full bg-gray-200 flex items-center justify-center group-hover:bg-gray-300 transition-colors duration-200 ${category.image_url || category.image ? 'hidden' : 'flex'}`}
              >
                <span className="text-gray-600 text-3xl">📁</span>
              </div>
            </div>
            <h3 className="mt-3 text-sm font-medium text-gray-900 text-center group-hover:text-blue-600 transition-colors duration-200">
              {category.name}
            </h3>
          </Link>
        ))}
      </div>

      {/* List View - Only shown when "View All" is clicked */}
      {showAll && (
        <div className="mt-8">
          <h3 className="text-xl font-semibold mb-4 text-gray-800">All Categories</h3>
          <div className="flex flex-wrap justify-center gap-8">
            {categories.map((category) => (
              <Link
                key={category.id}
                href={`/products/${category.slug}`}
                className="flex items-center space-x-4 p-4 bg-white rounded-sm shadow-xs hover:shadow-xs transition-shadow duration-300 border border-gray-200 w-80"
              >
                <div className="w-16 h-16 rounded-md overflow-hidden flex-shrink-0">
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
            className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium"
          >
            {showAll ? 'Show Less' : `View All (${categories.length})`}
          </button>
        </div>
      )}
    </div>
  );
}
