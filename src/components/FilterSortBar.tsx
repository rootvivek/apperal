'use client';

import { useState } from 'react';

export interface FilterOption {
  id: string;
  name: string;
  slug?: string;
}

export interface SortOption {
  value: string;
  label: string;
}

interface FilterSortBarProps {
  // Filter props
  showFilter?: boolean;
  filterOptions?: FilterOption[];
  selectedFilter: string;
  onFilterChange: (filter: string) => void;
  getFilterOptionCount?: (option: FilterOption) => number;
  totalProductsCount?: number;
  filterLabel?: string;
  
  // Sort props
  sortOptions?: SortOption[];
  selectedSort: string;
  onSortChange: (sort: string) => void;
  sortLabel?: string;
  
  // Layout props
  variant?: 'mobile' | 'desktop';
  className?: string;
}

const DEFAULT_SORT_OPTIONS: SortOption[] = [
  { value: 'featured', label: 'Featured' },
  { value: 'price-low', label: 'Price: Low to High' },
  { value: 'price-high', label: 'Price: High to Low' },
  { value: 'newest', label: 'Newest' },
  { value: 'oldest', label: 'Oldest' },
];

export default function FilterSortBar({
  showFilter = true,
  filterOptions = [],
  selectedFilter,
  onFilterChange,
  getFilterOptionCount,
  totalProductsCount = 0,
  filterLabel = 'Filter By',
  sortOptions = DEFAULT_SORT_OPTIONS,
  selectedSort,
  onSortChange,
  sortLabel = 'Sort By',
  variant = 'mobile',
  className = '',
}: FilterSortBarProps) {
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [showSortDropdown, setShowSortDropdown] = useState(false);

  const isDesktop = variant === 'desktop';

  const handleFilterSelect = (value: string) => {
    onFilterChange(value);
    setShowFilterDropdown(false);
  };

  const handleSortSelect = (value: string) => {
    onSortChange(value);
    setShowSortDropdown(false);
  };

  return (
    <div className={`flex items-center ${isDesktop ? 'justify-start gap-4' : 'justify-between gap-1'} ${className}`}>
      {/* Filter Button */}
      {showFilter && filterOptions.length > 0 ? (
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
            <span>{filterLabel}</span>
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
                      onChange={(e) => handleFilterSelect(e.target.value)}
                      className="mr-3"
                    />
                    <span className="text-sm">All Products ({totalProductsCount})</span>
                  </label>
                  {filterOptions.map((option) => {
                    const count = getFilterOptionCount ? getFilterOptionCount(option) : 0;
                    return (
                      <label key={option.id} className="flex items-center px-4 py-2 hover:bg-gray-50 cursor-pointer">
                        <input
                          type="radio"
                          name="filter"
                          value={option.slug || option.name}
                          checked={selectedFilter === (option.slug || option.name)}
                          onChange={(e) => handleFilterSelect(e.target.value)}
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
      ) : showFilter ? (
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
      ) : null}

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
          <span>{sortLabel}</span>
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
                {sortOptions.map((option) => (
                  <label key={option.value} className="flex items-center px-4 py-2 hover:bg-gray-50 cursor-pointer">
                    <input
                      type="radio"
                      name="sort"
                      value={option.value}
                      checked={selectedSort === option.value}
                      onChange={(e) => handleSortSelect(e.target.value)}
                      className="mr-3"
                    />
                    <span className="text-sm">{option.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

