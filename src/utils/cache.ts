// Cache utility functions for performance optimization

import { unstable_cache } from 'next/cache';
import { cache } from 'react';

// Cache duration constants (in seconds)
export const CACHE_DURATIONS = {
  SHORT: 60, // 1 minute
  MEDIUM: 300, // 5 minutes
  LONG: 3600, // 1 hour
  VERY_LONG: 86400, // 24 hours
} as const;

// Cache tags for revalidation
export const CACHE_TAGS = {
  PRODUCTS: 'products',
  CATEGORIES: 'categories',
  SUBCATEGORIES: 'subcategories',
  PRODUCT_DETAIL: 'product-detail',
  CATEGORY_PRODUCTS: 'category-products',
} as const;

/**
 * Create a cached function for database queries
 */
export function createCachedQuery<T>(
  fn: () => Promise<T>,
  key: string,
  tags: string[] = [],
  revalidate: number = CACHE_DURATIONS.MEDIUM
) {
  return unstable_cache(
    async () => {
      return await fn();
    },
    [key],
    {
      tags,
      revalidate,
    }
  );
}

/**
 * Client-side cache helper using sessionStorage
 */
export const clientCache = {
  get: <T>(key: string): T | null => {
    if (typeof window === 'undefined') return null;
    try {
      const item = sessionStorage.getItem(key);
      if (!item) return null;
      const { data, expires } = JSON.parse(item);
      if (expires && Date.now() > expires) {
        sessionStorage.removeItem(key);
        return null;
      }
      return data as T;
    } catch {
      return null;
    }
  },

  set: <T>(key: string, data: T, ttl: number = 300000): void => {
    if (typeof window === 'undefined') return;
    try {
      const expires = Date.now() + ttl;
      sessionStorage.setItem(key, JSON.stringify({ data, expires }));
    } catch {
      // Storage quota exceeded or disabled
    }
  },

  remove: (key: string): void => {
    if (typeof window === 'undefined') return;
    try {
      sessionStorage.removeItem(key);
    } catch {
      // Ignore errors
    }
  },

  clear: (): void => {
    if (typeof window === 'undefined') return;
    try {
      sessionStorage.clear();
    } catch {
      // Ignore errors
    }
  },
};

/**
 * React cache wrapper for data fetching
 */
export function cachedFetch<T>(
  fn: () => Promise<T>,
  key: string
): Promise<T> {
  return cache(async () => {
    return await fn();
  })();
}

