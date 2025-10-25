'use client';

import { notFound } from 'next/navigation';
import ProductCard from '@/components/ProductCard';
import { createClient } from '@/lib/supabase/client';
import { useState, useEffect } from 'react';

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
  parent_category_id: string;
}

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  subcategory: string;
  image_url: string;
  stock_quantity: number;
  is_active: boolean;
}

interface SubcategoryPageProps {
  params: {
    category: string;
    subcategory: string;
  };
}

export default function SubcategoryPage({ params }: SubcategoryPageProps) {
  const [category, setCategory] = useState<Category | null>(null);
  const [subcategory, setSubcategory] = useState<Subcategory | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    fetchSubcategoryAndProducts();
  }, [params.category, params.subcategory]);

  const fetchSubcategoryAndProducts = async () => {
    try {
      setLoading(true);
      
      // Fetch category
      const { data: categoryData, error: categoryError } = await supabase
        .from('categories')
        .select('*')
        .eq('slug', params.category)
        .single();

      if (categoryError) {
        console.error('Error fetching category:', categoryError);
        notFound();
        return;
      }

      setCategory(categoryData);

      // Fetch subcategory
      const { data: subcategoryData, error: subcategoryError } = await supabase
        .from('categories')
        .select('*')
        .eq('slug', params.subcategory)
        .eq('parent_category_id', categoryData.id)
        .single();

      if (subcategoryError) {
        console.error('Error fetching subcategory:', subcategoryError);
        notFound();
        return;
      }

      setSubcategory(subcategoryData);

      // Fetch products for this subcategory
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select('*')
        .eq('category', categoryData.name)
        .eq('subcategory', subcategoryData.name)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (productsError) {
        console.error('Error fetching products:', productsError);
        setProducts([]);
      } else {
        setProducts(productsData || []);
      }
    } catch (error) {
      console.error('Error:', error);
      notFound();
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!category || !subcategory) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Breadcrumb */}
      <div className="bg-white border-b">
        <div className="w-full py-2" style={{ paddingLeft: '10px', paddingRight: '10px' }}>
          <nav className="flex" aria-label="Breadcrumb">
            <ol className="flex items-center space-x-2">
              <li>
                <a href="/products" className="text-gray-500 hover:text-blue-600">Products</a>
              </li>
              <li className="flex items-center">
                <svg className="w-4 h-4 text-gray-400 mx-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
                <a href={`/products/${category.slug}`} className="text-gray-500 hover:text-blue-600">
                  {category.name}
                </a>
              </li>
              <li className="flex items-center">
                <svg className="w-4 h-4 text-gray-400 mx-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
                <span className="text-gray-900 font-medium">{subcategory.name}</span>
              </li>
            </ol>
          </nav>
        </div>
      </div>

      {/* Subcategory Header */}
      <div className="bg-white py-12">
        <div className="max-w-[1450px] mx-auto w-full" style={{ paddingLeft: '10px', paddingRight: '10px' }}>
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">{subcategory.name}</h1>
          </div>
        </div>
      </div>

      {/* Products Grid */}
      <div className="max-w-[1450px] mx-auto w-full py-8" style={{ paddingLeft: '20px', paddingRight: '20px' }}>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">
            {products.length} Products
          </h2>
          <div className="flex items-center space-x-4">
            <select className="border border-gray-300 rounded-md px-3 py-2 text-sm">
              <option>Sort by: Featured</option>
              <option>Price: Low to High</option>
              <option>Price: High to Low</option>
              <option>Customer Rating</option>
              <option>Newest</option>
            </select>
          </div>
        </div>

        {products.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">No products found in this subcategory.</p>
          </div>
        )}
      </div>
    </div>
  );
}