'use client';

import { useState, useEffect, Suspense, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import ProductCard from '@/components/ProductCard';
import { createClient } from '@/lib/supabase/client';
import EmptyState from '@/components/EmptyState';
import LoadingSpinner from '@/components/LoadingSpinner';
import LoadingLogo from '@/components/LoadingLogo';
import Button from '@/components/Button';
import Card from '@/components/Card';
import ErrorState from '@/components/ErrorState';

import { PLACEHOLDER_CATEGORY } from '@/utils/imageUtils';
import { CATEGORY_GRID_CLASSES, PRODUCT_GRID_CLASSES } from '@/utils/layoutUtils';

// Helper Functions
const sanitizeQuery = (query: string): string => query.replace(/[%_\\]/g, '');
const createSearchPattern = (query: string): string => `%${query.replace(/[%_\\]/g, '\\$&')}%`;

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  original_price?: number;
  category: string;
  subcategory: string;
  image_url: string;
  stock_quantity: number;
  is_active: boolean;
  subcategories: string[];
  created_at: string;
  updated_at: string;
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

interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  image_url: string;
}

interface Subcategory {
  id: string;
  name: string;
  slug: string;
  description: string;
  image_url: string;
  parent_category_id: string;
  category_slug?: string;
}

function SearchPageContent() {
  const searchParams = useSearchParams();
  const query = searchParams.get('q') || '';
  
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  const clearResults = useCallback(() => {
    setProducts([]);
    setCategories([]);
    setSubcategories([]);
  }, []);

  const handleSearchResult = useCallback((result: any, setter: (data: any) => void, errorMessage?: string) => {
    if (result.error) {
      console.error(errorMessage || 'Search error:', result.error);
      if (errorMessage) setError(errorMessage);
    } else {
      setter(result.data || []);
    }
  }, [setError]);

  const searchAll = useCallback(async (searchQuery: string) => {
    try {
      setLoading(true);
      setError(null);
      const searchPattern = createSearchPattern(searchQuery);

      // Search categories - use separate queries and combine for better reliability
      const [categoriesByName, categoriesBySlug, categoriesByDesc] = await Promise.all([
        supabase
          .from('categories')
          .select('id, name, slug, description, image_url')
          .eq('is_active', true)
          .ilike('name', searchPattern)
          .limit(10),
        supabase
          .from('categories')
          .select('id, name, slug, description, image_url')
          .eq('is_active', true)
          .ilike('slug', searchPattern)
          .limit(10),
        supabase
          .from('categories')
          .select('id, name, slug, description, image_url')
          .eq('is_active', true)
          .ilike('description', searchPattern)
          .limit(10)
      ]);

      // Combine and deduplicate categories
      const allCategories = [
        ...(categoriesByName.data || []),
        ...(categoriesBySlug.data || []),
        ...(categoriesByDesc.data || [])
      ];
      const uniqueCategories = Array.from(
        new Map(allCategories.map(cat => [cat.id, cat])).values()
      ).slice(0, 10);

      // Search subcategories
      const [subcategoriesByName, subcategoriesBySlug, subcategoriesByDesc] = await Promise.all([
        supabase
          .from('subcategories')
          .select('id, name, slug, description, image_url, parent_category_id, categories(slug)')
          .eq('is_active', true)
          .ilike('name', searchPattern)
          .limit(10),
        supabase
          .from('subcategories')
          .select('id, name, slug, description, image_url, parent_category_id, categories(slug)')
          .eq('is_active', true)
          .ilike('slug', searchPattern)
          .limit(10),
        supabase
          .from('subcategories')
          .select('id, name, slug, description, image_url, parent_category_id, categories(slug)')
          .eq('is_active', true)
          .ilike('description', searchPattern)
          .limit(10)
      ]);

      // Combine and deduplicate subcategories
      const allSubcategories = [
        ...(subcategoriesByName.data || []),
        ...(subcategoriesBySlug.data || []),
        ...(subcategoriesByDesc.data || [])
      ];
      const uniqueSubcategories = Array.from(
        new Map(allSubcategories.map(sub => [sub.id, sub])).values()
      ).slice(0, 10);

      // Search products
      const [productsByName, productsByDesc] = await Promise.all([
        supabase
          .from('products')
          .select('*, product_images (id, image_url, alt_text, display_order)')
          .eq('is_active', true)
          .ilike('name', searchPattern)
          .order('created_at', { ascending: false })
          .limit(50),
        supabase
          .from('products')
          .select('*, product_images (id, image_url, alt_text, display_order)')
          .eq('is_active', true)
          .ilike('description', searchPattern)
          .order('created_at', { ascending: false })
          .limit(50)
      ]);

      // Combine and deduplicate products
      const allProducts = [
        ...(productsByName.data || []),
        ...(productsByDesc.data || [])
      ];
      const uniqueProducts = Array.from(
        new Map(allProducts.map(prod => [prod.id, prod])).values()
      ).slice(0, 50);

      // Log errors for debugging and handle RLS/permission errors
      if (categoriesByName.error || categoriesBySlug.error || categoriesByDesc.error) {
        const error = categoriesByName.error || categoriesBySlug.error || categoriesByDesc.error;
        console.error('Categories search errors:', {
          name: categoriesByName.error,
          slug: categoriesBySlug.error,
          desc: categoriesByDesc.error
        });
        // If RLS error, show helpful message
        if (error?.code === '42501' || error?.message?.includes('permission') || error?.message?.includes('policy')) {
          setError('Search failed: Permission denied. Please ensure RLS policies are set up correctly.');
          return;
        }
      }
      if (subcategoriesByName.error || subcategoriesBySlug.error || subcategoriesByDesc.error) {
        const error = subcategoriesByName.error || subcategoriesBySlug.error || subcategoriesByDesc.error;
        console.error('Subcategories search errors:', {
          name: subcategoriesByName.error,
          slug: subcategoriesBySlug.error,
          desc: subcategoriesByDesc.error
        });
        // If RLS error, show helpful message
        if (error?.code === '42501' || error?.message?.includes('permission') || error?.message?.includes('policy')) {
          setError('Search failed: Permission denied. Please ensure RLS policies are set up correctly.');
          return;
        }
      }
      if (productsByName.error || productsByDesc.error) {
        const error = productsByName.error || productsByDesc.error;
        console.error('Products search errors:', {
          name: productsByName.error,
          desc: productsByDesc.error
        });
        // If RLS error, show helpful message
        if (error?.code === '42501' || error?.message?.includes('permission') || error?.message?.includes('policy')) {
          setError('Search failed: Permission denied. Please ensure RLS policies are set up correctly.');
          return;
        }
      }

      // Set results
      setCategories(uniqueCategories);
      setSubcategories(uniqueSubcategories.map((sub: any) => ({
        ...sub,
        category_slug: sub.categories?.slug || ''
      })));
      setProducts(uniqueProducts.map((product: any) => ({
        ...product,
        subcategories: product.subcategory ? [product.subcategory] : [],
        images: product.product_images || []
      })));

    } catch (error: any) {
      console.error('Search error:', error);
      setError(error?.message || 'Failed to search. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    const trimmedQuery = query.trim();
    if (trimmedQuery) {
      const sanitizedQuery = sanitizeQuery(trimmedQuery);
      if (sanitizedQuery.length >= 1) {
        searchAll(sanitizedQuery);
      } else {
        clearResults();
      }
    } else {
      clearResults();
    }
  }, [query, clearResults, searchAll]);

  const totalResults = categories.length + subcategories.length + products.length;
  const hasResults = totalResults > 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-[1450px] mx-auto w-full px-1 sm:px-4 md:px-6 lg:px-8 py-2">
        {/* Search Header */}
        <div className="mb-2">
          <h1 className="text-xl sm:text-2xl font-semibold text-gray-900 mb-1">
            {query ? `Search Results for "${query}"` : 'Search Products'}
          </h1>
          {query && !loading && (
            <p className="text-gray-600">
              {hasResults 
                ? `${totalResults} result${totalResults !== 1 ? 's' : ''} found`
                : 'No results found'
              }
            </p>
          )}
        </div>

        {/* Search Results */}
        {loading ? (
          <LoadingLogo fullScreen text="Searching..." />
        ) : error ? (
          <ErrorState
            icon="⚠️"
            title="Search Error"
            message={error}
            actionLabel="Try Again"
            onAction={() => {
              const sanitizedQuery = sanitizeQuery(query.trim());
              if (sanitizedQuery.length >= 1) searchAll(sanitizedQuery);
            }}
          />
        ) : query ? (
          hasResults ? (
            <div className="space-y-8">
              {/* Category/Subcategory Card Component */}
              {categories.length > 0 && (
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">Categories</h2>
                  <div className={CATEGORY_GRID_CLASSES}>
                    {categories.map((category) => (
                      <Card
                        key={category.id}
                        href={`/products/${category.slug}`}
                        imageUrl={category.image_url || PLACEHOLDER_CATEGORY}
                        title={category.name}
                        variant="category"
                        aspectRatio="square"
                        titlePosition="below"
                      />
                    ))}
                  </div>
                </div>
              )}

              {subcategories.length > 0 && (
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">Subcategories</h2>
                  <div className={CATEGORY_GRID_CLASSES}>
                    {subcategories.map((subcategory) => (
                      <Card
                        key={subcategory.id}
                        href={`/products/${subcategory.category_slug}/${subcategory.slug}`}
                        imageUrl={subcategory.image_url || PLACEHOLDER_CATEGORY}
                        title={subcategory.name}
                        variant="subcategory"
                        aspectRatio="square"
                        titlePosition="below"
                      />
                    ))}
                  </div>
                </div>
              )}

              {products.length > 0 && (
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">Products</h2>
                  <div className={PRODUCT_GRID_CLASSES}>
                    {products.map((product) => (
                      <ProductCard key={product.id} product={product} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <EmptyState
              icon="🔍"
              title="No results found"
              description={
                <>
                  <p className="mb-2">
                    We couldn&apos;t find any categories, subcategories, or products matching &quot;{query}&quot;
                  </p>
                  <div className="space-y-1 text-sm text-gray-400">
                    <p>Try searching with different keywords or check your spelling</p>
                    <p>You can search by category name, subcategory name, or product name</p>
                  </div>
                </>
              }
              actionLabel="Browse All Products"
              actionHref="/products"
            />
          )
        ) : (
          <EmptyState
            icon="🔍"
            title="Search Products"
            description="Use the search bar to find products, categories, and subcategories across our store"
            actionLabel="Browse All Products"
            actionHref="/products"
          />
        )}
      </div>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<LoadingLogo fullScreen text="Loading..." />}>
      <SearchPageContent />
    </Suspense>
  );
}
