'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

export function useNavigation() {
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const router = useRouter();

  // Ensure component is mounted before rendering interactive elements
  // This prevents hydration mismatches
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Close mobile search and user dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      
      if (showMobileSearch) {
        const searchContainer = document.getElementById('mobile-search-container');
        const searchInput = document.getElementById('mobile-search-input');
        
        if (searchContainer && !searchContainer.contains(target) && !searchInput?.contains(target)) {
          closeMobileSearch();
        }
      }

      // Close user dropdown when clicking outside
      if (showUserDropdown) {
        const userDropdown = document.getElementById('user-dropdown');
        if (userDropdown && !userDropdown.contains(target)) {
          setShowUserDropdown(false);
        }
      }
    };

    if (showMobileSearch || showUserDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showMobileSearch, showUserDropdown]);

  const openMobileSearch = useCallback(() => {
    setShowMobileSearch(true);
  }, []);

  const closeMobileSearch = useCallback(() => {
    setShowMobileSearch(false);
    setSearchQuery('');
  }, []);

  const handleSearch = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      closeMobileSearch();
    }
  }, [searchQuery, router, closeMobileSearch]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  }, []);

  return {
    showMobileSearch,
    searchQuery,
    showUserDropdown,
    setShowUserDropdown,
    isMounted,
    openMobileSearch,
    closeMobileSearch,
    handleSearch,
    handleInputChange,
  };
}

