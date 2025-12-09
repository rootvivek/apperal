'use client';

import { useState, useEffect } from 'react';
import ProductCard from './ProductCard';
import EmptyState from '@/components/checkout/shared/EmptyState';
import FilterSortBar, {
  type FilterOption as FilterSortBarOption,
} from './FilterSortBar';
import {
  CATEGORY_GRID_CLASSES_ALT,
  PRODUCT_GRID_CLASSES_RESPONSIVE,
} from '@/utils/layoutUtils';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
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
    <div className={`${PRODUCT_GRID_CLASSES_RESPONSIVE} px-2 lg:px-0`}>
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
      {/* Desktop: Fixed Left Sidebar for Filters */}
      {showFilter && filterType !== 'none' && (
        <div className="hidden lg:block fixed top-16 lg:top-20 left-2 bg-white border border-gray-200 p-4 w-64 h-[calc(100vh-4rem)] lg:h-[calc(100vh-5rem)] overflow-y-auto z-40">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Filter By</h3>
          <RadioGroup
            value={selectedFilter}
            onValueChange={setSelectedFilter}
            className="space-y-0.5"
          >
            <div className="flex items-center space-x-2 px-3 py-1 rounded-md hover:bg-gray-50 cursor-pointer">
              <RadioGroupItem value="all" id="filter-all" />
              <Label
                htmlFor="filter-all"
                className="text-sm text-gray-700 font-normal cursor-pointer flex-1"
              >
                All Products ({products.length})
              </Label>
            </div>
            {filterOptions.map((option) => {
              const count = getFilterOptionCount(option);
              const value = option.slug || option.name;
              return (
                <div
                  key={option.id}
                  className="flex items-center space-x-2 px-3 py-1 rounded-md hover:bg-gray-50 cursor-pointer"
                >
                  <RadioGroupItem value={value} id={`filter-${option.id}`} />
                  <Label
                    htmlFor={`filter-${option.id}`}
                    className="text-sm text-gray-700 font-normal cursor-pointer flex-1"
                  >
                    {option.name} ({count})
                  </Label>
                </div>
              );
            })}
          </RadioGroup>
          
          {/* Sort Options */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Sort By</h3>
            <RadioGroup
              value={sortBy}
              onValueChange={setSortBy}
              className="space-y-0.5"
            >
              <div className="flex items-center space-x-2 px-3 py-1 rounded-md hover:bg-gray-50 cursor-pointer">
                <RadioGroupItem value="featured" id="sort-featured" />
                <Label
                  htmlFor="sort-featured"
                  className="text-sm text-gray-700 font-normal cursor-pointer flex-1"
                >
                  Featured
                </Label>
              </div>
              <div className="flex items-center space-x-2 px-3 py-1 rounded-md hover:bg-gray-50 cursor-pointer">
                <RadioGroupItem value="price-low" id="sort-price-low" />
                <Label
                  htmlFor="sort-price-low"
                  className="text-sm text-gray-700 font-normal cursor-pointer flex-1"
                >
                  Price: Low to High
                </Label>
              </div>
              <div className="flex items-center space-x-2 px-3 py-1 rounded-md hover:bg-gray-50 cursor-pointer">
                <RadioGroupItem value="price-high" id="sort-price-high" />
                <Label
                  htmlFor="sort-price-high"
                  className="text-sm text-gray-700 font-normal cursor-pointer flex-1"
                >
                  Price: High to Low
                </Label>
              </div>
              <div className="flex items-center space-x-2 px-3 py-1 rounded-md hover:bg-gray-50 cursor-pointer">
                <RadioGroupItem value="newest" id="sort-newest" />
                <Label
                  htmlFor="sort-newest"
                  className="text-sm text-gray-700 font-normal cursor-pointer flex-1"
                >
                  Newest
                </Label>
              </div>
              <div className="flex items-center space-x-2 px-3 py-1 rounded-md hover:bg-gray-50 cursor-pointer">
                <RadioGroupItem value="oldest" id="sort-oldest" />
                <Label
                  htmlFor="sort-oldest"
                  className="text-sm text-gray-700 font-normal cursor-pointer flex-1"
                >
                  Oldest
                </Label>
              </div>
            </RadioGroup>
          </div>
        </div>
      )}

      {/* Products Grid */}
      <div className="min-h-screen bg-gray-50">
        <div className="w-full pt-0 pb-8 !mt-0">
          <div className="flex flex-col lg:flex-row gap-2 lg:gap-[10px]">
            {/* Main Content Area */}
            <div className="flex-1 pt-2 lg:pr-2 lg:pl-0 lg:ml-[274px]">
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
                      <div className={PRODUCT_GRID_CLASSES_RESPONSIVE}>
                        {filteredProducts.map((product) => (
                          <ProductCard
                            key={product.id}
                            product={product as any}
                          />
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

