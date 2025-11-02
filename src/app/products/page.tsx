'use client';

import { useState, useEffect } from 'react';
import CategoryGrid from '@/components/CategoryGrid';
import { createClient } from '@/lib/supabase/client';

interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  image_url: string;
}

export default function ProductsPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .is('parent_category_id', null) // Only main categories
        .eq('is_active', true)
        .order('name', { ascending: true });

      if (error) throw error;
      
      setCategories(data || []);
    } catch (error) {
      setCategories([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white py-6">
          <div className="px-2 sm:px-4 md:px-6 lg:px-8">
            <div className="text-center">
              <h1 className="text-3xl font-bold text-gray-900 mb-4">Our Products</h1>
              <p className="text-xl text-gray-600">
                Discover our carefully curated collection of clothing and accessories for every occasion
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading categories...</p>
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white py-6">
        <div className="px-2 sm:px-4 md:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">Our Products</h1>
            <p className="text-xl text-gray-600">
              Discover our carefully curated collection of clothing and accessories for every occasion
            </p>
          </div>
        </div>
      </div>
      
      <div className="max-w-[1450px] mx-auto w-full px-1.5 sm:px-5">
        <CategoryGrid categories={categories} />
      </div>
    </div>
  );
}
