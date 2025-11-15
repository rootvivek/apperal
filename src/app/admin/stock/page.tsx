'use client';

import { useState, useEffect } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import AdminGuard from '@/components/admin/AdminGuard';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface Product {
  id: string;
  name: string;
  price: number;
  image_url: string;
  stock_quantity: number;
  category?: string;
  created_at: string;
}

export default function StockPage() {
  const supabase = createClient();
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filterLowStock, setFilterLowStock] = useState(false);
  const [updatingProductId, setUpdatingProductId] = useState<string | null>(null);
  const [editStock, setEditStock] = useState<{ [key: string]: number }>({});

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select('id, name, price, image_url, stock_quantity, created_at')
        .order('name', { ascending: true });

      if (productsError) throw productsError;

      setProducts(productsData || []);
    } catch (error: any) {
      setError(error?.message || 'Failed to fetch products');
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  const handleStockUpdate = async (productId: string, newStock: number) => {
    // Use API route for stock updates (already exists and bypasses RLS)
    if (!user?.id) {
      alert('No active session. Please log in again.');
      return;
    }

    if (newStock < 0) {
      alert('Stock quantity cannot be negative');
      return;
    }

    try {
      setUpdatingProductId(productId);
      setError(null);

      const response = await fetch('/api/admin/update-stock', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': user.id,
        },
        body: JSON.stringify({
          productId,
          quantity: newStock,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update stock');
      }

      // Update local state
      setProducts(prevProducts =>
        prevProducts.map(p =>
          p.id === productId
            ? { ...p, stock_quantity: newStock }
            : p
        )
      );

      // Clear edit state
      const newEditStock = { ...editStock };
      delete newEditStock[productId];
      setEditStock(newEditStock);
    } catch (error: any) {
      alert(error?.message || 'Failed to update stock. Please try again.');
    } finally {
      setUpdatingProductId(null);
    }
  };

  const handleEditClick = (product: Product) => {
    setEditStock(prev => ({
      ...prev,
      [product.id]: product.stock_quantity
    }));
  };

  const handleCancelEdit = (productId: string) => {
    const newEditStock = { ...editStock };
    delete newEditStock[productId];
    setEditStock(newEditStock);
  };

  const filteredProducts = products.filter(product => {
    const matchesSearch = !search || 
      product.name.toLowerCase().includes(search.toLowerCase());
    
    const matchesLowStock = !filterLowStock || product.stock_quantity <= 10;
    
    return matchesSearch && matchesLowStock;
  });

  const lowStockCount = products.filter(p => p.stock_quantity <= 10).length;
  const outOfStockCount = products.filter(p => p.stock_quantity === 0).length;
  const totalStockValue = products.reduce((sum, p) => sum + (p.price * p.stock_quantity), 0);

  const getStockStatusColor = (stock: number) => {
    if (stock === 0) return 'bg-red-100 text-red-800';
    if (stock <= 10) return 'bg-yellow-100 text-yellow-800';
    return 'bg-green-100 text-green-800';
  };

  const getStockStatusText = (stock: number) => {
    if (stock === 0) return 'Out of Stock';
    if (stock <= 10) return 'Low Stock';
    return 'In Stock';
  };

  return (
    <AdminGuard>
      <AdminLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Stock Management</h1>
            <p className="text-gray-600">View and manage product stock levels</p>
          </div>

          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-sm text-gray-600">Total Products</p>
              <p className="text-2xl font-bold text-gray-900">{products.length}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-sm text-gray-600">Low Stock (≤10)</p>
              <p className="text-2xl font-bold text-yellow-600">{lowStockCount}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-sm text-gray-600">Out of Stock</p>
              <p className="text-2xl font-bold text-red-600">{outOfStockCount}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-sm text-gray-600">Total Stock Value</p>
              <p className="text-2xl font-bold text-blue-600">₹{totalStockValue.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</p>
            </div>
          </div>

          {/* Filters and Search */}
          <div className="bg-white rounded-lg shadow p-6">
            {error && (
              <div className="mb-4 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-md">
                <p className="font-semibold">Error</p>
                <p className="text-sm">{error}</p>
                <button
                  onClick={fetchProducts}
                  className="mt-2 text-sm underline hover:no-underline"
                >
                  Try again
                </button>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <input
                type="text"
                placeholder="Search products..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg"
              />
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filterLowStock}
                  onChange={(e) => setFilterLowStock(e.target.checked)}
                  className="rounded border-gray-300"
                />
                <span className="text-sm text-gray-700">Show only low stock (≤10)</span>
              </label>
            </div>

            {/* Products Table */}
            {loading ? (
              <div className="text-center py-12">
                <p className="text-gray-500">Loading products...</p>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500">No products found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Product
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Current Stock
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
                    {filteredProducts.map((product) => {
                      const isEditing = editStock.hasOwnProperty(product.id);
                      const editValue = editStock[product.id] ?? product.stock_quantity;

                      return (
                        <tr key={product.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              {product.image_url && (
                                <img
                                  src={product.image_url}
                                  alt={product.name}
                                  className="h-10 w-10 rounded object-cover mr-3"
                                />
                              )}
                              <div>
                                <div className="text-sm font-medium text-gray-900">
                                  {product.name}
                                </div>
                                <div className="text-sm text-gray-500">
                                  ₹{product.price.toFixed(2)}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {isEditing ? (
                              <input
                                type="number"
                                min="0"
                                value={editValue}
                                onChange={(e) =>
                                  setEditStock(prev => ({
                                    ...prev,
                                    [product.id]: parseInt(e.target.value) || 0
                                  }))
                                }
                                className="w-24 px-2 py-1 border border-gray-300 rounded text-sm"
                                autoFocus
                              />
                            ) : (
                              <span className="text-sm font-medium text-gray-900">
                                {product.stock_quantity}
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`px-2 py-1 rounded-full text-xs font-semibold ${getStockStatusColor(
                                product.stock_quantity
                              )}`}
                            >
                              {getStockStatusText(product.stock_quantity)}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            {isEditing ? (
                              <div className="flex items-center space-x-2">
                                <button
                                  onClick={() => handleStockUpdate(product.id, editValue)}
                                  disabled={updatingProductId === product.id}
                                  className="text-green-600 hover:text-green-900 disabled:opacity-50"
                                >
                                  {updatingProductId === product.id ? 'Saving...' : 'Save'}
                                </button>
                                <button
                                  onClick={() => handleCancelEdit(product.id)}
                                  className="text-gray-600 hover:text-gray-900"
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => handleEditClick(product)}
                                className="text-blue-600 hover:text-blue-900"
                              >
                                Edit
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </AdminLayout>
    </AdminGuard>
  );
}

