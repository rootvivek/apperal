'use client';

import { useState, useEffect } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import AdminGuard from '@/components/admin/AdminGuard';
import DataTable from '@/components/DataTable';
import { createClient } from '@/lib/supabase/client';

interface User {
  id: string;
  email: string;
  full_name: string;
  phone: string;
  created_at: string;
}

interface Order {
  id: string;
  order_number: string;
  total: number;
  status: string;
  created_at: string;
}

export default function UsersPage() {
  const supabase = createClient();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showUserDetails, setShowUserDetails] = useState(false);
  const [userOrders, setUserOrders] = useState<Order[]>([]);
  const [userCartItems, setUserCartItems] = useState<any[]>([]);
  const [userWishlistItems, setUserWishlistItems] = useState<any[]>([]);
  const [userDetailsTab, setUserDetailsTab] = useState<'orders' | 'cart' | 'wishlist'>('orders');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('user_profiles')
        .select('id, email, full_name, phone, created_at')
        .order('created_at', { ascending: false });
      
      console.log('Users fetched:', data?.length || 0);
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUserClick = async (user: User) => {
    setSelectedUser(user);
    setUserDetailsTab('orders');
    
    try {
      const { data: orders } = await supabase
        .from('orders')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      setUserOrders(orders || []);
      
      const cartResponse = await supabase
        .from('carts')
        .select('id')
        .eq('user_id', user.id)
        .single();
      
      if (cartResponse.data) {
        const { data: cartData } = await supabase
          .from('cart_items')
          .select('id, quantity, product:products(id, name, price, image_url)')
          .eq('cart_id', cartResponse.data.id);
        setUserCartItems(cartData || []);
      }
      
      // Fetch wishlist items - query product_ids first
      const { data: wishlistRows } = await supabase
        .from('wishlist')
        .select('id, product_id')
        .eq('user_id', user.id);
      
      if (wishlistRows && wishlistRows.length > 0) {
        const productIds = wishlistRows.map((row: any) => row.product_id).filter(Boolean);
        
        // Now fetch the actual products
        const { data: productsData } = await supabase
          .from('products')
          .select('id, name, price, image_url')
          .in('id', productIds);
        
        // Combine wishlist items with product data
        const transformedWishlist = wishlistRows.map((wishItem: any) => {
          const product = (productsData || []).find((p: { id: string }) => p.id === wishItem.product_id);
          return {
            id: wishItem.id,
            product: product || null
          };
        }).filter((item: any) => item.product !== null);
        
        setUserWishlistItems(transformedWishlist);
      } else {
        setUserWishlistItems([]);
      }
    } catch (error) {
      console.error('Error fetching user details:', error);
    }
    
    setShowUserDetails(true);
  };

  const filteredUsers = users.filter(user =>
    user.email?.toLowerCase().includes(search.toLowerCase()) ||
    user.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    user.phone?.toLowerCase().includes(search.toLowerCase())
  );

  const formatDate = (date: string) => new Date(date).toLocaleDateString();
  const formatCurrency = (value: number) => `₹${(value || 0).toFixed(2)}`;

  return (
    <AdminGuard>
      <AdminLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
            <p className="text-gray-600">View and manage all registered users</p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="px-4 py-2 bg-blue-50 rounded-lg">
                <p className="text-sm text-gray-600">Total Users</p>
                <p className="text-2xl font-bold text-blue-600">{users.length}</p>
              </div>
              <input
                type="text"
                placeholder="Search users..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="flex-1 max-w-md px-4 py-2 border border-gray-300 rounded-lg"
              />
            </div>

            <DataTable
              columns={[
                {
                  key: 'email',
                  label: 'User',
                  sortable: true,
                  render: (value: string, row: User) => (
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center text-lg font-bold">
                        {row.full_name?.[0]?.toUpperCase() || 'U'}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{row.full_name || 'Unnamed'}</p>
                        <p className="text-sm text-gray-500">{value || 'No email'}</p>
                      </div>
                    </div>
                  ),
                },
                { 
                  key: 'phone', 
                  label: 'Phone', 
                  sortable: false,
                  render: (value: string) => value || '—',
                },
                {
                  key: 'created_at',
                  label: 'Member Since',
                  sortable: true,
                  render: (value: string) => formatDate(value),
                },
              ]}
              data={filteredUsers}
              isLoading={loading}
              emptyMessage="No users found"
              onRowClick={handleUserClick}
            />
          </div>

          {/* User Details Modal */}
          {showUserDetails && selectedUser && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <div className="p-6 border-b border-gray-200 flex justify-between items-center sticky top-0 bg-white">
                  <h2 className="text-xl font-bold">{selectedUser.full_name}</h2>
                  <button onClick={() => setShowUserDetails(false)} className="text-2xl">✕</button>
                </div>
                
                <div className="flex space-x-1 px-6 pt-4 border-b border-gray-200">
                  <button
                    onClick={() => setUserDetailsTab('orders')}
                    className={`px-4 py-2 font-medium border-b-2 transition-colors ${
                      userDetailsTab === 'orders'
                        ? 'border-blue-600 text-blue-600'
                        : 'border-transparent text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Orders ({userOrders.length})
                  </button>
                  <button
                    onClick={() => setUserDetailsTab('cart')}
                    className={`px-4 py-2 font-medium border-b-2 transition-colors ${
                      userDetailsTab === 'cart'
                        ? 'border-blue-600 text-blue-600'
                        : 'border-transparent text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Cart ({userCartItems.length})
                  </button>
                  <button
                    onClick={() => setUserDetailsTab('wishlist')}
                    className={`px-4 py-2 font-medium border-b-2 transition-colors ${
                      userDetailsTab === 'wishlist'
                        ? 'border-blue-600 text-blue-600'
                        : 'border-transparent text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Wishlist ({userWishlistItems.length})
                  </button>
                </div>
                
                <div className="p-6 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-gray-600 text-sm">Email</p>
                      <p className="font-medium">{selectedUser.email}</p>
                    </div>
                    <div>
                      <p className="text-gray-600 text-sm">Phone</p>
                      <p className="font-medium">{selectedUser.phone || '-'}</p>
                    </div>
                    <div>
                      <p className="text-gray-600 text-sm">Joined</p>
                      <p className="font-medium">{formatDate(selectedUser.created_at)}</p>
                    </div>
                    <div>
                      <p className="text-gray-600 text-sm">Total Orders</p>
                      <p className="font-medium">{userOrders.length}</p>
                    </div>
                  </div>
                  
                  {userDetailsTab === 'orders' && (
                    <div>
                      <h3 className="font-semibold mb-2">Recent Orders</h3>
                      {userOrders.length === 0 ? (
                        <p className="text-gray-600">No orders</p>
                      ) : (
                        <div className="space-y-2">
                          {userOrders.map((order) => (
                            <div key={order.id} className="flex justify-between items-center border p-2 rounded">
                              <span className="font-medium">#{order.order_number}</span>
                              <span>{formatCurrency(order.total)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                  
                  {userDetailsTab === 'cart' && (
                    <div>
                      <h3 className="font-semibold mb-2">Shopping Cart</h3>
                      {userCartItems.length === 0 ? (
                        <p className="text-gray-600">Cart is empty</p>
                      ) : (
                        <div className="space-y-2">
                          {userCartItems.map((item: any) => (
                            <div key={item.id} className="flex justify-between items-center border p-2 rounded">
                              <div>
                                <p className="font-medium">{item.product?.name}</p>
                                <p className="text-sm text-gray-600">Qty: {item.quantity}</p>
                              </div>
                              <span className="font-medium">{formatCurrency(item.product?.price * item.quantity)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                  
                  {userDetailsTab === 'wishlist' && (
                    <div>
                      <h3 className="font-semibold mb-2">Wishlist</h3>
                      {userWishlistItems.length === 0 ? (
                        <p className="text-gray-600">No items in wishlist</p>
                      ) : (
                        <div className="space-y-2">
                          {userWishlistItems.map((item: any) => (
                            <div key={item.id} className="flex justify-between items-center border p-2 rounded">
                              <p className="font-medium">{item.product?.name}</p>
                              <span className="font-medium">{formatCurrency(item.product?.price)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
                
                <div className="p-6 border-t border-gray-200">
                  <button
                    onClick={() => setShowUserDetails(false)}
                    className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </AdminLayout>
    </AdminGuard>
  );
}
