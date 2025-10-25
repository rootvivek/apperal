'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface SearchBarProps {
  variant?: 'desktop' | 'mobile';
  onClose?: () => void;
}

export default function SearchBar({ variant = 'desktop', onClose }: SearchBarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const router = useRouter();

  useEffect(() => {
    if (variant === 'mobile' && onClose) {
      const handleInputBlur = () => {
        // Small delay to allow for form submission
        setTimeout(() => {
          onClose();
        }, 100);
      };

      const handleClickOutside = (event: MouseEvent) => {
        const target = event.target as Element;
        const searchContainer = document.getElementById('mobile-search-container');
        const searchInput = document.getElementById('mobile-search-input');
        
        if (searchContainer && !searchContainer.contains(target) && !searchInput?.contains(target)) {
          onClose();
        }
      };

      const input = document.getElementById('mobile-search-input');
      if (input) {
        input.addEventListener('blur', handleInputBlur);
      }

      document.addEventListener('mousedown', handleClickOutside);

      return () => {
        if (input) {
          input.removeEventListener('blur', handleInputBlur);
        }
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [variant, onClose]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      if (onClose) {
        onClose();
      }
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  if (variant === 'mobile') {
    return (
      <div id="mobile-search-container" className="sm:hidden flex-1 flex items-center ml-2">
        <form onSubmit={handleSearch} className="relative w-full" style={{ width: '100%' }}>
          <input
            type="text"
            placeholder="Search products..."
            value={searchQuery}
            onChange={handleInputChange}
            className="w-full px-2 py-1.5 pl-6 pr-6 text-gray-700 bg-gray-100 border border-gray-300 rounded-[999px] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            style={{ width: '100%' }}
            autoFocus
          />
          <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="absolute inset-y-0 right-0 pr-2 flex items-center text-gray-400 hover:text-red-600 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </form>
      </div>
    );
  }

  return (
    <div className="hidden sm:flex flex-1 mx-4 lg:mx-8">
      <form onSubmit={handleSearch} className="relative w-full">
        <input
          type="text"
          placeholder="Search products..."
          value={searchQuery}
          onChange={handleInputChange}
          className="w-full py-2 pl-10 pr-4 text-gray-700 bg-gray-100 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
        />
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <button
          type="submit"
          className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-blue-600 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </button>
      </form>
    </div>
  );
}
