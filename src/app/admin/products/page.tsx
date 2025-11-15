'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import AdminLayout from '@/components/admin/AdminLayout';
import AdminGuard from '@/components/admin/AdminGuard';
import { createClient } from '@/lib/supabase/client';
import { deleteFolderContents } from '@/utils/imageUpload';
import { useAuth } from '@/contexts/AuthContext';
import LoadingLogo from '@/components/LoadingLogo';

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  subcategories: string[]; // Updated to support multiple subcategories
  image_url: string;
  stock_quantity: number;
  is_active: boolean;
  created_at: string;
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const { user } = useAuth();
  const supabase = createClient();

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      
      // Use API route to fetch all products (including inactive) - bypasses RLS
      if (!user?.id) {
        setError('No active session. Please log in again.');
        setLoading(false);
        return;
      }

      const response = await fetch('/api/admin/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': user.id,
        },
        body: JSON.stringify({ userId: user.id }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch products');
      }

      const productsData = result.products || [];

      if (!productsData || productsData.length === 0) {
        setProducts([]);
        return;
      }

      // Get unique category IDs that need name resolution
      const categoryIds = Array.from(new Set(
        productsData
          .filter((p: any) => p.category_id && !p.category)
          .map((p: any) => p.category_id)
      ));

      // Get unique subcategory IDs that need name resolution
      const subcategoryIds = Array.from(new Set(
        productsData
          .filter((p: any) => p.subcategory_id && !p.subcategory)
          .map((p: any) => p.subcategory_id)
      ));

      // Fetch category names from UUIDs
      let categoryNameMap: { [key: string]: string } = {};
      if (categoryIds.length > 0) {
        const { data: categoriesData } = await supabase
          .from('categories')
          .select('id, name')
          .in('id', categoryIds);
        if (categoriesData) {
          categoryNameMap = Object.fromEntries(
            categoriesData.map((cat: any) => [cat.id, cat.name])
          );
        }
      }

      // Fetch subcategory names from UUIDs
      let subcategoryNameMap: { [key: string]: string } = {};
      if (subcategoryIds.length > 0) {
        const { data: subcategoriesData } = await supabase
          .from('subcategories')
          .select('id, name')
          .in('id', subcategoryIds);
        if (subcategoriesData) {
          subcategoryNameMap = Object.fromEntries(
            subcategoriesData.map((sub: any) => [sub.id, sub.name])
          );
        }
      }

      // Transform products with resolved names
      const transformedProducts = productsData.map((product: any) => {
        // Resolve category name - prefer legacy string, fallback to UUID lookup
        let categoryName = product.category || '';
        if (!categoryName && product.category_id) {
          categoryName = categoryNameMap[product.category_id] || '';
        }

        // Resolve subcategory name - prefer legacy string, fallback to UUID lookup
        let subcategoryName = product.subcategory || '';
        if (!subcategoryName && product.subcategory_id) {
          subcategoryName = subcategoryNameMap[product.subcategory_id] || '';
        }

        return {
        ...product,
          category: categoryName,
          subcategories: subcategoryName ? [subcategoryName] : []
        };
      });

      setProducts(transformedProducts);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    if (!confirm('Are you sure you want to delete this product? This action cannot be undone.')) return;

    try {
      setError(null);
      
      // Use API route to delete product (bypasses RLS)
      // The API route handles storage deletion, database deletion, and all related data
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      
      // Add user ID header for admin authentication
      if (user?.id) {
        headers['X-User-Id'] = user.id;
      }

      const deleteResponse = await fetch('/api/admin/delete-product', {
        method: 'POST',
        headers,
        body: JSON.stringify({ productId })
      });

      const responseData = await deleteResponse.json();

      if (!deleteResponse.ok) {
        throw new Error(responseData.error || 'Failed to delete product');
      }

      // Only remove from local state if API confirms successful deletion
      if (responseData.success) {
        setProducts(products.filter(p => p.id !== productId));
        alert('Product deleted successfully');
      } else {
        throw new Error('Deletion failed - product may still exist');
      }
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to delete product. Please try again.';
      setError(errorMessage);
      alert(errorMessage);
    }
  };

  const toggleProductStatus = async (productId: string, currentStatus: boolean | null | undefined) => {
    try {
      setError(null);
      // Handle null/undefined - default to true if not set
      const actualCurrentStatus = currentStatus ?? true;
      const newStatus = !actualCurrentStatus;
      
      if (!user) {
        const errorMsg = 'You must be logged in to perform this action';
        setError(errorMsg);
        alert(errorMsg);
        return;
      }
      
      const response = await fetch('/api/admin/toggle-product-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': user.id,
        },
        body: JSON.stringify({
          productId,
          isActive: newStatus,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        const errorMessage = result.error || 'Failed to update product status';
        setError(errorMessage);
        alert(errorMessage);
        return;
      }

      // Verify the response contains the updated product
      if (result.product && result.product.is_active === newStatus) {
        // Update local state with the actual response from server
        setProducts(prevProducts => {
          return prevProducts.map(p => 
            p.id === productId ? { ...p, is_active: result.product.is_active } : p
          );
        });
      } else {
        throw new Error('Status update verification failed');
      }
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to update product status';
      setError(errorMessage);
      alert(errorMessage);
    }
  };

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === 'all' || product.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  const categories = Array.from(new Set(products.map((p: any) => p.category ?? '')));

  const shortUuid = (id: string) => {
    if (!id) return '';
    return `${id.substring(0, 8)}…${id.substring(id.length - 4)}`;
  };

  const copyId = async (id: string) => {
    try {
      await navigator.clipboard.writeText(id);
      alert('Product ID copied to clipboard');
    } catch (e) {
      // Copy failed silently
    }
  };

  if (loading) {
    return (
      <AdminGuard>
        <AdminLayout>
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <LoadingLogo size="md" text="Loading products..." />
              <p className="mt-4 text-gray-600">Loading products...</p>
            </div>
          </div>
        </AdminLayout>
      </AdminGuard>
    );
  }

  return (
    <AdminGuard>
      <AdminLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Products</h1>
            <p className="mt-1 text-sm text-gray-500">
              Manage your product inventory and listings.
            </p>
          </div>
          <Link
            href="/admin/products/new"
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            ➕ Add New Product
          </Link>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <span className="text-red-400">⚠️</span>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error</h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>{error}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white shadow rounded-lg p-6">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor="search" className="block text-sm font-medium text-gray-700">
                Search Products
              </label>
              <input
                type="text"
                id="search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="Search by name or description..."
              />
            </div>
            <div>
              <label htmlFor="category" className="block text-sm font-medium text-gray-700">
                Filter by Category
              </label>
              <select
                id="category"
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              >
                <option value="all">All Categories</option>
                {categories.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Products Table */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="px-4 py-5 sm:p-6">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Image
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Product
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      UUID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Category
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Price
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Stock
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredProducts.map((product) => (
                    <tr key={product.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex-shrink-0">
                            <img
                            className="h-16 w-16 rounded-lg object-cover border border-gray-200"
                              src={product.image_url || '/placeholder-product.jpg'}
                              alt={product.name}
                            onError={(e) => {
                              e.currentTarget.src = '/placeholder-product.jpg';
                            }}
                            />
                          </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <div className="text-sm font-medium text-gray-900">
                                {product.name}
                              </div>
                              {product.is_active === false && (
                                <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-gray-500 text-white">
                                  Inactive
                                </span>
                              )}
                            </div>
                        <div className="text-sm text-gray-500 truncate max-w-xs">
                              {product.description}
                            </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex items-center gap-2">
                          <code className="px-1.5 py-0.5 bg-gray-100 rounded text-gray-700">
                            {shortUuid(product.id)}
                          </code>
                          <button
                            onClick={() => copyId(product.id)}
                            className="text-blue-600 hover:text-blue-800 text-xs"
                            title="Copy UUID"
                          >
                            Copy
                          </button>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div>{product.category}</div>
                        <div className="text-xs text-gray-400">
                          {product.subcategories.length > 0 
                            ? product.subcategories.join(', ') 
                            : 'No subcategories'
                          }
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        ₹{product.price.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {product.stock_quantity}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() => toggleProductStatus(product.id, product.is_active ?? true)}
                          disabled={loading}
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full transition-colors ${
                            product.is_active
                              ? 'bg-green-100 text-green-800 hover:bg-green-200'
                              : 'bg-red-100 text-red-800 hover:bg-red-200'
                          } disabled:opacity-50 disabled:cursor-not-allowed`}
                        >
                          {product.is_active ? 'Active' : 'Inactive'}
                        </button>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <Link
                            href={`/admin/products/${product.id}/edit`}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            Edit
                          </Link>
                          <button
                            onClick={() => handleDeleteProduct(product.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {filteredProducts.length === 0 && (
              <div className="text-center py-12">
                <div className="text-gray-400 text-6xl mb-4">📦</div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No products found</h3>
                <p className="text-gray-500 mb-4">
                  {searchTerm || filterCategory !== 'all' 
                    ? 'Try adjusting your search or filter criteria.'
                    : 'Get started by adding your first product.'
                  }
                </p>
                {!searchTerm && filterCategory === 'all' && (
                  <Link
                    href="/admin/products/new"
                    className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                  >
                    ➕ Add Your First Product
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      </AdminLayout>
    </AdminGuard>
  );
}
