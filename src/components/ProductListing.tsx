'use client';

import { useState, useEffect } from 'react';
import ProductCard from './ProductCard';
import EmptyState from './EmptyState';
import FilterSortBar, { type FilterOption as FilterSortBarOption } from './FilterSortBar';
import { CATEGORY_GRID_CLASSES_ALT } from '@/utils/layoutUtils';
import type { ReactNode } from 'react';

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string | { id: string; name: string; slug: string };
  subcategory: string;
  image_url: string;
  stock_quantity: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  slug?: string;
  badge?: string;
  product_images?: {
    id: string;
    image_url: string;
    alt_text?: string;
    display_order: number;
  }[];
  images?: {
    id: string;
    image_url: string;
    alt_text?: string;
    display_order: number;
  }[];
}

interface FilterOption {
  id: string;
  name: string;
  slug?: string;
}

// Re-export FilterOption for backward compatibility
export type { FilterOption };

interface ProductListingProps {
  products: Product[];
  filterOptions?: FilterOption[];
  filterType?: 'category' | 'subcategory' | 'none';
  initialFilter?: string;
  onFilterChange?: (filter: string) => void;
  showFilter?: boolean;
  emptyMessage?: string;
  sidebar?: ReactNode;
}

export default function ProductListing({
  products,
  filterOptions = [],
  filterType = 'none',
  initialFilter = 'all',
  onFilterChange,
  showFilter = true,
  emptyMessage = 'No products found.',
  sidebar,
}: ProductListingProps) {
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [selectedFilter, setSelectedFilter] = useState<string>(initialFilter);
  const [sortBy, setSortBy] = useState<string>('featured');

  // Update selectedFilter when initialFilter changes
  useEffect(() => {
    setSelectedFilter(initialFilter);
  }, [initialFilter]);

  // Filter and sort products
  useEffect(() => {
    if (!products || products.length === 0) {
      setFilteredProducts([]);
      return;
    }

    let filtered = products;

    // Apply filter
    if (filterType !== 'none' && selectedFilter !== 'all') {
      const selectedOption = filterOptions.find(
        opt => opt.slug === selectedFilter || opt.name === selectedFilter
      );
      
      if (selectedOption) {
        filtered = products.filter(product => {
          if (filterType === 'category') {
            const categoryName = typeof product.category === 'string'
              ? product.category
              : product.category?.name || '';
            return categoryName.toLowerCase() === selectedOption.name.toLowerCase();
          }
          return product.subcategory?.toLowerCase() === selectedOption.name.toLowerCase();
        });
      }
    }

    // Sort products
    const sorted = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'price-low': return a.price - b.price;
        case 'price-high': return b.price - a.price;
        case 'newest': return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'oldest': return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        default: return 0;
      }
    });

    setFilteredProducts(sorted);
  }, [selectedFilter, sortBy, products, filterOptions, filterType]);

  // Notify parent of filter change
  useEffect(() => {
    onFilterChange?.(selectedFilter);
  }, [selectedFilter, onFilterChange]);

  const getFilterOptionCount = (option: FilterOption) => {
    return products.filter(product => {
      if (filterType === 'category') {
        const categoryName = typeof product.category === 'string'
          ? product.category
          : product.category?.name || '';
        return categoryName.toLowerCase() === option.name.toLowerCase();
      }
      return product.subcategory?.toLowerCase() === option.name.toLowerCase();
    }).length;
  };

  const filterSortBarOptions: FilterSortBarOption[] = filterOptions.map(opt => ({
    id: opt.id,
    name: opt.name,
    slug: opt.slug,
  }));

  const hasFilterSidebar = showFilter && filterType !== 'none';
  const productsGrid = filteredProducts.length > 0 ? (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 gap-2 px-2 lg:px-0">
      {filteredProducts.map((product) => (
        <ProductCard key={product.id} product={product as any} />
      ))}
    </div>
  ) : (
    <div className="text-center py-12">
      <p className="text-gray-600 text-lg">{emptyMessage}</p>
    </div>
  );

  return (
    <>
      {/* Products Grid */}
      <div className="min-h-screen bg-gray-50">
        <div className="w-full pt-0 pb-8 !mt-0">
          <div className="flex flex-col lg:flex-row gap-2 lg:gap-3">
            {/* Desktop: Sticky Left Sidebar for Filters */}
            {showFilter && filterType !== 'none' && (
              <div className="hidden lg:block w-64 flex-shrink-0">
                <div className="sticky top-[72px] bg-white border border-gray-200 p-4 h-[calc(100vh-72px)] overflow-y-auto">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Filter By</h3>
                  <div className="space-y-2">
                    <label className="flex items-center px-3 py-2 rounded-md hover:bg-gray-50 cursor-pointer">
                      <input
                        type="radio"
                        name="filter"
                        value="all"
                        checked={selectedFilter === 'all'}
                        onChange={(e) => {
                          setSelectedFilter(e.target.value);
                        }}
                        className="mr-3"
                      />
                      <span className="text-sm text-gray-700">All Products ({products.length})</span>
                    </label>
                    {filterOptions.map((option) => {
                      const count = getFilterOptionCount(option);
                      return (
                        <label key={option.id} className="flex items-center px-3 py-2 rounded-md hover:bg-gray-50 cursor-pointer">
                          <input
                            type="radio"
                            name="filter"
                            value={option.slug || option.name}
                            checked={selectedFilter === (option.slug || option.name)}
                            onChange={(e) => {
                              setSelectedFilter(e.target.value);
                            }}
                            className="mr-3"
                          />
                          <span className="text-sm text-gray-700">{option.name} ({count})</span>
                        </label>
                      );
                    })}
                  </div>
                  
                  {/* Sort Options */}
                  <div className="mt-6 pt-6 border-t border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Sort By</h3>
                    <div className="space-y-2">
                      <label className="flex items-center px-3 py-2 rounded-md hover:bg-gray-50 cursor-pointer">
                        <input
                          type="radio"
                          name="sort"
                          value="featured"
                          checked={sortBy === 'featured'}
                          onChange={(e) => setSortBy(e.target.value)}
                          className="mr-3"
                        />
                        <span className="text-sm text-gray-700">Featured</span>
                      </label>
                      <label className="flex items-center px-3 py-2 rounded-md hover:bg-gray-50 cursor-pointer">
                        <input
                          type="radio"
                          name="sort"
                          value="price-low"
                          checked={sortBy === 'price-low'}
                          onChange={(e) => setSortBy(e.target.value)}
                          className="mr-3"
                        />
                        <span className="text-sm text-gray-700">Price: Low to High</span>
                      </label>
                      <label className="flex items-center px-3 py-2 rounded-md hover:bg-gray-50 cursor-pointer">
                        <input
                          type="radio"
                          name="sort"
                          value="price-high"
                          checked={sortBy === 'price-high'}
                          onChange={(e) => setSortBy(e.target.value)}
                          className="mr-3"
                        />
                        <span className="text-sm text-gray-700">Price: High to Low</span>
                      </label>
                      <label className="flex items-center px-3 py-2 rounded-md hover:bg-gray-50 cursor-pointer">
                        <input
                          type="radio"
                          name="sort"
                          value="newest"
                          checked={sortBy === 'newest'}
                          onChange={(e) => setSortBy(e.target.value)}
                          className="mr-3"
                        />
                        <span className="text-sm text-gray-700">Newest</span>
                      </label>
                      <label className="flex items-center px-3 py-2 rounded-md hover:bg-gray-50 cursor-pointer">
                        <input
                          type="radio"
                          name="sort"
                          value="oldest"
                          checked={sortBy === 'oldest'}
                          onChange={(e) => setSortBy(e.target.value)}
                          className="mr-3"
                        />
                        <span className="text-sm text-gray-700">Oldest</span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Main Content Area */}
            <div className="flex-1 pt-2 lg:pr-2 lg:pl-0">
              {/* Desktop: Filter and Sort at Top (when no filter sidebar) */}
              {!hasFilterSidebar && (
                <div className="hidden md:block mb-6">
                  <div className="bg-white border-b border-gray-200 py-4">
                    <div className="w-full px-4 md:px-6 lg:px-8">
                      <FilterSortBar
                        variant="desktop"
                        showFilter={hasFilterSidebar}
                        filterOptions={filterSortBarOptions}
                        selectedFilter={selectedFilter}
                        onFilterChange={setSelectedFilter}
                        getFilterOptionCount={getFilterOptionCount}
                        totalProductsCount={products.length}
                        selectedSort={sortBy}
                        onSortChange={setSortBy}
                      />
                    </div>
                  </div>
                </div>
              )}

              {sidebar ? (
                <div className="flex flex-col lg:flex-row gap-8">
                  {sidebar}
                  <div className="flex-1">
                    {filteredProducts.length > 0 ? (
                      <div className={CATEGORY_GRID_CLASSES_ALT}>
                        {filteredProducts.map((product) => (
                          <ProductCard key={product.id} product={product as any} />
                        ))}
                      </div>
                    ) : (
                      <EmptyState title={emptyMessage} variant="compact" />
                    )}
                  </div>
                </div>
              ) : (
                productsGrid
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile: Sticky Bottom Bar - Filter and Sort */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 w-full bg-white/50 backdrop-blur-md border-t border-gray-200/30 shadow-lg z-40" style={{ position: 'fixed', bottom: 0, left: 0, right: 0, paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <div className="px-3 pt-2 pb-1" style={{ paddingBottom: 'max(4px, env(safe-area-inset-bottom))' }}>
          <FilterSortBar
            variant="mobile"
            showFilter={hasFilterSidebar}
            filterOptions={filterSortBarOptions}
            selectedFilter={selectedFilter}
            onFilterChange={setSelectedFilter}
            getFilterOptionCount={getFilterOptionCount}
            totalProductsCount={products.length}
            selectedSort={sortBy}
            onSortChange={setSortBy}
          />
        </div>
      </div>

      {/* Add padding to bottom on mobile to prevent content from being hidden behind sticky bar */}
      <div className="md:hidden h-20"></div>
    </>
  );
}

