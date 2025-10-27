'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import ProductCard from '@/components/ProductCard';
import { createClient } from '@/lib/supabase/client';

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

function SearchPageContent() {
  const searchParams = useSearchParams();
  const query = searchParams.get('q') || '';
  
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    if (query.trim()) {
      searchProducts(query.trim());
    }
  }, [query]);

  const searchProducts = async (searchQuery: string) => {
    try {
      setLoading(true);
      setError(null);

      // FALLBACK: Use original search query if RPC function fails
      const { data: result, error: searchError } = await supabase.rpc('search_products', {
        search_query: searchQuery
      });

      let products: Product[] = [];

      if (searchError) {
        console.log('RPC search failed, using fallback method...');
        
        // FALLBACK: Search using original query method
        const { data: searchData, error } = await supabase
          .from('products')
          .select(`
            *,
            product_images (
              id,
              image_url,
              alt_text,
              display_order
            )
          `)
          .eq('is_active', true)
          .or(`name.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%,category.ilike.%${searchQuery}%,subcategory.ilike.%${searchQuery}%`)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Search error:', error);
          setError('Failed to search products');
          return;
        }

        // Transform products to include images array
        products = (searchData || []).map((product: any) => ({
          ...product,
          subcategories: product.subcategory ? [product.subcategory] : [],
          images: product.product_images || []
        }));
      } else {
        // Transform data from RPC function result
        products = (result || []).map((product: any) => ({
          id: product.id,
          name: product.name,
          description: product.description || '',
          price: product.price,
          category: product.category || '',
          subcategory: product.subcategory || '',
          image_url: product.main_image_url || product.image_url,
          stock_quantity: product.stock_quantity || 0,
          is_active: product.is_active !== undefined ? product.is_active : true,
          subcategories: product.subcategory ? [product.subcategory] : [],
          created_at: product.created_at,
          updated_at: product.updated_at || product.created_at,
          images: product.additional_images || []
        }));
      }

      setProducts(products);
    } catch (error) {
      console.error('Search error:', error);
      setError('Failed to search products');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-[1450px] mx-auto w-full px-2 sm:px-4 md:px-6 lg:px-8">
        {/* Search Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {query ? `Search Results for "${query}"` : 'Search Products'}
          </h1>
          {query && (
            <p className="text-gray-600">
              {loading ? 'Searching...' : `${products.length} products found`}
            </p>
          )}
        </div>

        {/* Search Results */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Searching products...</p>
            </div>
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <div className="text-red-500 text-6xl mb-4">⚠️</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Search Error</h3>
            <p className="text-gray-500">{error}</p>
          </div>
        ) : query ? (
          products.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="text-gray-400 text-6xl mb-4">🔍</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No products found</h3>
              <p className="text-gray-500 mb-4">
                We couldn&apos;t find any products matching &quot;{query}&quot;
              </p>
              <p className="text-sm text-gray-400">
                Try searching with different keywords or check your spelling
              </p>
            </div>
          )
        ) : (
          <div className="text-center py-12">
            <div className="text-gray-400 text-6xl mb-4">🔍</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Search Products</h3>
            <p className="text-gray-500 mb-4">
              Use the search bar to find products across our store
            </p>
            <Link
              href="/"
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Browse All Products
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center">Loading...</div>}>
      <SearchPageContent />
    </Suspense>
  );
}
