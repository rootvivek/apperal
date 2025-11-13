'use client';

import { useState, useEffect, useRef } from 'react';
import ProductCard from './ProductCard';
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
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  
  // Use refs to track previous values and prevent unnecessary updates
  const prevProductsRef = useRef<Product[]>([]);
  const prevFilterRef = useRef<string>('');
  const prevSortByRef = useRef<string>('');
  const prevFilterTypeRef = useRef<string>('');

  // Update selectedFilter when initialFilter changes (for external control)
  useEffect(() => {
    if (initialFilter !== selectedFilter) {
      setSelectedFilter(initialFilter);
    }
  }, [initialFilter, selectedFilter]);

  // Filter and sort products
  useEffect(() => {
    // Check if products actually changed (by comparing length and IDs)
    const productsChanged = 
      products.length !== prevProductsRef.current.length ||
      (products.length > 0 && products.some((p, i) => p.id !== prevProductsRef.current[i]?.id));
    
    const filterChanged = selectedFilter !== prevFilterRef.current;
    const sortChanged = sortBy !== prevSortByRef.current;
    const filterTypeChanged = filterType !== prevFilterTypeRef.current;
    
    // Only process if something actually changed
    if (!productsChanged && !filterChanged && !sortChanged && !filterTypeChanged) {
      return;
    }
    
    // Update refs BEFORE processing to prevent re-triggering
    prevProductsRef.current = products;
    prevFilterRef.current = selectedFilter;
    prevSortByRef.current = sortBy;
    prevFilterTypeRef.current = filterType;

    if (!products || products.length === 0) {
      // Only update if filteredProducts is not already empty
      setFilteredProducts(prev => {
        if (prev.length === 0) {
          return prev; // Already empty, no need to update
        }
        return []; // Update to empty
      });
      return;
    }

    let filtered = [...products];

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
          } else if (filterType === 'subcategory') {
            return product.subcategory?.toLowerCase() === selectedOption.name.toLowerCase();
          }
          return false;
        });
      }
    }

    // Sort products
    const sorted = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'price-low':
          return a.price - b.price;
        case 'price-high':
          return b.price - a.price;
        case 'newest':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'oldest':
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case 'featured':
        default:
          return 0; // Keep original order
      }
    });

    // Only update state if the result actually changed
    setFilteredProducts(prev => {
      const resultChanged = 
        sorted.length !== prev.length ||
        sorted.some((p, i) => p.id !== prev[i]?.id);
      
      return resultChanged ? sorted : prev;
    });
  }, [selectedFilter, sortBy, products, filterOptions, filterType]);

  // Notify parent of filter change
  useEffect(() => {
    if (onFilterChange) {
      onFilterChange(selectedFilter);
    }
  }, [selectedFilter, onFilterChange]);

  const getFilterButtonText = () => {
    if (selectedFilter === 'all') {
      return `Filter (${products.length})`;
    }
    const selectedOption = filterOptions.find(
      opt => opt.slug === selectedFilter || opt.name === selectedFilter
    );
    return selectedOption?.name || selectedFilter;
  };

  const getFilterOptionCount = (option: FilterOption) => {
    if (filterType === 'category') {
      return products.filter(product => {
        const categoryName = typeof product.category === 'string'
          ? product.category
          : product.category?.name || '';
        return categoryName.toLowerCase() === option.name.toLowerCase();
      }).length;
    } else if (filterType === 'subcategory') {
      return products.filter(product => 
        product.subcategory?.toLowerCase() === option.name.toLowerCase()
      ).length;
    }
    return 0;
  };

  // Render filter and sort buttons (reusable component)
  const renderFilterSortButtons = (isDesktop: boolean = false) => (
    <div className={`flex items-center ${isDesktop ? 'justify-start gap-4' : 'justify-between gap-1'}`}>
      {/* Filter Button */}
      {showFilter && filterType !== 'none' ? (
        <div className={`${isDesktop ? 'w-auto' : 'flex-1'} relative`}>
          <button
            onClick={() => {
              setShowFilterDropdown(!showFilterDropdown);
              setShowSortDropdown(false);
            }}
            className={`${isDesktop ? 'px-4' : 'w-full'} flex items-center justify-center gap-2 border border-gray-300 rounded-md px-3 ${isDesktop ? 'py-2.5' : 'py-3.5'} text-sm bg-white hover:bg-gray-50 font-medium`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            <span>Filter By</span>
            <svg className={`w-4 h-4 transition-transform ${showFilterDropdown ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {showFilterDropdown && (
            <>
              <div
                className="fixed inset-0 z-30"
                onClick={() => setShowFilterDropdown(false)}
              ></div>
              <div className={`absolute ${isDesktop ? 'top-full left-0 mt-2' : 'bottom-full left-0 mb-2'} w-full bg-white border border-gray-200 rounded-md shadow-lg z-50 max-h-64 overflow-y-auto`}>
                <div className="py-2">
                  <label className="flex items-center px-4 py-2 hover:bg-gray-50 cursor-pointer">
                    <input
                      type="radio"
                      name="filter"
                      value="all"
                      checked={selectedFilter === 'all'}
                      onChange={(e) => {
                        setSelectedFilter(e.target.value);
                        setShowFilterDropdown(false);
                      }}
                      className="mr-3"
                    />
                    <span className="text-sm">All Products ({products.length})</span>
                  </label>
                  {filterOptions.map((option) => {
                    const count = getFilterOptionCount(option);
                    return (
                      <label key={option.id} className="flex items-center px-4 py-2 hover:bg-gray-50 cursor-pointer">
                        <input
                          type="radio"
                          name="filter"
                          value={option.slug || option.name}
                          checked={selectedFilter === (option.slug || option.name)}
                          onChange={(e) => {
                            setSelectedFilter(e.target.value);
                            setShowFilterDropdown(false);
                          }}
                          className="mr-3"
                        />
                        <span className="text-sm">{option.name} ({count})</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      ) : (
        <div className={`${isDesktop ? 'w-auto' : 'flex-1'} relative`}>
          <button
            disabled
            className={`${isDesktop ? 'px-4' : 'w-full'} flex items-center justify-center gap-2 border border-gray-300 rounded-md px-3 py-2.5 text-sm bg-gray-100 text-gray-400 font-medium cursor-not-allowed`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            <span>Filter</span>
          </button>
        </div>
      )}

      {/* Sort Button */}
      <div className={`${isDesktop ? 'w-auto' : 'flex-1'} relative`}>
        <button
          onClick={() => {
            setShowSortDropdown(!showSortDropdown);
            setShowFilterDropdown(false);
          }}
            className={`${isDesktop ? 'px-4' : 'w-full'} flex items-center justify-center gap-2 border border-gray-300 rounded-md px-3 ${isDesktop ? 'py-2.5' : 'py-3.5'} text-sm bg-white hover:bg-gray-50 font-medium`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
          </svg>
          <span>Sort By</span>
          <svg className={`w-4 h-4 transition-transform ${showSortDropdown ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {showSortDropdown && (
          <>
            <div
              className="fixed inset-0 z-30"
              onClick={() => setShowSortDropdown(false)}
            ></div>
            <div className={`absolute ${isDesktop ? 'top-full right-0 mt-2' : 'bottom-full right-0 mb-2'} w-full bg-white border border-gray-200 rounded-md shadow-lg z-50`}>
              <div className="py-2">
                <label className="flex items-center px-4 py-2 hover:bg-gray-50 cursor-pointer">
                  <input
                    type="radio"
                    name="sort"
                    value="featured"
                    checked={sortBy === 'featured'}
                    onChange={(e) => {
                      setSortBy(e.target.value);
                      setShowSortDropdown(false);
                    }}
                    className="mr-3"
                  />
                  <span className="text-sm">Featured</span>
                </label>
                <label className="flex items-center px-4 py-2 hover:bg-gray-50 cursor-pointer">
                  <input
                    type="radio"
                    name="sort"
                    value="price-low"
                    checked={sortBy === 'price-low'}
                    onChange={(e) => {
                      setSortBy(e.target.value);
                      setShowSortDropdown(false);
                    }}
                    className="mr-3"
                  />
                  <span className="text-sm">Price: Low to High</span>
                </label>
                <label className="flex items-center px-4 py-2 hover:bg-gray-50 cursor-pointer">
                  <input
                    type="radio"
                    name="sort"
                    value="price-high"
                    checked={sortBy === 'price-high'}
                    onChange={(e) => {
                      setSortBy(e.target.value);
                      setShowSortDropdown(false);
                    }}
                    className="mr-3"
                  />
                  <span className="text-sm">Price: High to Low</span>
                </label>
                <label className="flex items-center px-4 py-2 hover:bg-gray-50 cursor-pointer">
                  <input
                    type="radio"
                    name="sort"
                    value="newest"
                    checked={sortBy === 'newest'}
                    onChange={(e) => {
                      setSortBy(e.target.value);
                      setShowSortDropdown(false);
                    }}
                    className="mr-3"
                  />
                  <span className="text-sm">Newest</span>
                </label>
                <label className="flex items-center px-4 py-2 hover:bg-gray-50 cursor-pointer">
                  <input
                    type="radio"
                    name="sort"
                    value="oldest"
                    checked={sortBy === 'oldest'}
                    onChange={(e) => {
                      setSortBy(e.target.value);
                      setShowSortDropdown(false);
                    }}
                    className="mr-3"
                  />
                  <span className="text-sm">Oldest</span>
                </label>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Products Grid */}
      <div className="min-h-screen bg-gray-50 pt-16 sm:pt-20">
        <div className="max-w-[1450px] mx-auto w-full px-2 pt-0 pb-8 !mt-3 sm:!mt-0">
          {/* Desktop: Filter and Sort at Top */}
          <div className="hidden md:block mb-6">
            <div className="bg-white border-b border-gray-200 py-4">
              <div className="max-w-[1450px] mx-auto w-full px-4 md:px-6 lg:px-8">
                {renderFilterSortButtons(true)}
              </div>
            </div>
          </div>

          {sidebar ? (
            <div className="flex flex-col lg:flex-row gap-8">
              {/* Sidebar */}
              {sidebar}
              
              {/* Products Grid */}
              <div className="flex-1">
                {filteredProducts.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-1.5 sm:gap-2">
                    {filteredProducts.map((product) => (
                      <ProductCard key={product.id} product={product as any} />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <p className="text-gray-600 text-lg">{emptyMessage}</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <>
              {filteredProducts.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-1.5 sm:gap-2">
                  {filteredProducts.map((product) => (
                    <ProductCard key={product.id} product={product as any} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <p className="text-gray-600 text-lg">{emptyMessage}</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Mobile: Sticky Bottom Bar - Filter and Sort */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-40">
        <div className="max-w-[1450px] mx-auto w-full px-2 py-3">
          {renderFilterSortButtons(false)}
        </div>
      </div>

      {/* Add padding to bottom on mobile to prevent content from being hidden behind sticky bar */}
      <div className="md:hidden h-20"></div>
    </>
  );
}

