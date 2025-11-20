'use client';

import { useState, useEffect } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import AdminGuard from '@/components/admin/AdminGuard';
import DataTable from '@/components/DataTable';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface User {
  id: string;
  full_name: string;
  phone: string;
  created_at: string;
  user_number?: string;
  total_orders?: number;
  isAdmin?: boolean;
  is_active?: boolean;
  deleted_at?: string;
}

interface Order {
  id: string;
  order_number: string;
  total_amount: number;
  status: string;
  created_at: string;
}

export default function UsersPage() {
  const supabase = createClient();
  const { user, loading: authLoading } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'active' | 'deleted'>('active');
  
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showUserDetails, setShowUserDetails] = useState(false);
  const [userOrders, setUserOrders] = useState<Order[]>([]);
  const [userCartItems, setUserCartItems] = useState<any[]>([]);
  const [userWishlistItems, setUserWishlistItems] = useState<any[]>([]);
  const [userDetailsTab, setUserDetailsTab] = useState<'orders' | 'cart' | 'wishlist'>('orders');
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const [togglingUserId, setTogglingUserId] = useState<string | null>(null);
  const [reactivatingUserId, setReactivatingUserId] = useState<string | null>(null);

  useEffect(() => {
    // Wait for auth to finish loading before fetching users
    if (!authLoading) {
      fetchUsers();
    }
  }, [authLoading, user?.id, activeTab]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      
      // Get Firebase user ID for API authentication
      if (!user?.id) {
        setError('No active session. Please log in again.');
        setLoading(false);
        return;
      }
      
      // Fetch users via API route (uses service role key, bypasses RLS)
      const url = `/api/admin/users?deleted=${activeTab === 'deleted' ? 'true' : 'false'}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': user.id, // Send Firebase user ID in header
        },
        body: JSON.stringify({ userId: user.id }), // Also send in body
      });

      const result = await response.json();

      if (!response.ok) {
        const errorMessage = result.error || result.details || 'Failed to fetch users';
        throw new Error(errorMessage);
      }
      
      setUsers(result.users || []);
      setError(null);
    } catch (error: any) {
      setUsers([]);
      setError(error?.message || 'Failed to fetch users. Please check your database permissions (RLS policies).');
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
      // Error handled silently
    }
    
    setShowUserDetails(true);
  };

  const handleDeleteUser = async (userToDelete: User) => {
    const confirmMessage = `Are you sure you want to delete user "${userToDelete.full_name || userToDelete.phone || 'User'}"?\n\nThis will delete all user data and mark the profile as deleted.\n\nThis action cannot be undone!`;
    
    if (!confirm(confirmMessage)) {
      return;
    }

    try {
      setDeletingUserId(userToDelete.id);
      setError(null);
      setSuccess(false);

      // Get Firebase user ID for API authentication
      if (!user?.id) {
        throw new Error('No active session. Please log in again.');
      }

      // Call API route to soft delete user (deletes data, keeps profile marked as deleted)
      const response = await fetch('/api/admin/delete-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': user.id, // Send Firebase user ID in header
        },
        body: JSON.stringify({ userId: userToDelete.id }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete user');
      }

      // Refresh users list
      await fetchUsers();
      
      // Close user details modal if it's open for this user
      if (selectedUser?.id === userToDelete.id) {
        setShowUserDetails(false);
        setSelectedUser(null);
      }

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (error: any) {
      setError(error?.message || 'Failed to delete user. Please try again.');
    } finally {
      setDeletingUserId(null);
    }
  };

  const handleReactivateUser = async (userToReactivate: User) => {
    const confirmMessage = `Are you sure you want to reactivate user "${userToReactivate.full_name || userToReactivate.phone || 'User'}"?\n\nThis will:\n- Restore the user account\n- Allow the user to log in again\n- The phone number will be associated with this reactivated account`;
    
    if (!confirm(confirmMessage)) {
      return;
    }

    try {
      setReactivatingUserId(userToReactivate.id);
      setError(null);
      setSuccess(false);

      // Get Firebase user ID for API authentication
      if (!user?.id) {
        throw new Error('No active session. Please log in again.');
      }

      // Call API route to reactivate user
      const response = await fetch('/api/admin/reactivate-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': user.id,
        },
        body: JSON.stringify({ userId: userToReactivate.id }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to reactivate user');
      }

      // Refresh users list (will move from deleted to active tab)
      await fetchUsers();
      
      // Close user details modal if it's open for this user
      if (selectedUser?.id === userToReactivate.id) {
        setShowUserDetails(false);
        setSelectedUser(null);
      }

      // Switch to active tab to see the reactivated user
      setActiveTab('active');
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (error: any) {
      setError(error?.message || 'Failed to reactivate user. Please try again.');
    } finally {
      setReactivatingUserId(null);
    }
  };

  const filteredUsers = users.filter(user => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      user.full_name?.toLowerCase().includes(searchLower) ||
      user.phone?.toLowerCase().includes(searchLower)
    );
  });

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
            {error && (
              <div className="mb-4 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-md">
                <p className="font-semibold">Error loading users</p>
                <p className="text-sm">{error}</p>
                <button
                  onClick={fetchUsers}
                  className="mt-2 text-sm underline hover:no-underline"
                >
                  Try again
                </button>
              </div>
            )}
            
            {success && (
              <div className="mb-4 bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-md">
                {activeTab === 'deleted' 
                  ? 'User account reactivated successfully! User can now log in again.'
                  : 'User deleted successfully!'}
              </div>
            )}
            
            {/* Tabs for Active/Deleted Users */}
            <div className="mb-6 border-b border-gray-200">
              <nav className="flex space-x-8" aria-label="Tabs">
                <button
                  onClick={() => {
                    setActiveTab('active');
                    setSearch('');
                  }}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'active'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Active Users
                </button>
                <button
                  onClick={() => {
                    setActiveTab('deleted');
                    setSearch('');
                  }}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'deleted'
                      ? 'border-red-500 text-red-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Deleted Users
                </button>
              </nav>
            </div>
            
            <div className="flex items-center justify-between mb-4">
              <div className={`px-4 py-2 rounded-lg ${
                activeTab === 'active' ? 'bg-blue-50' : 'bg-red-50'
              }`}>
                <p className="text-sm text-gray-600">
                  {activeTab === 'active' ? 'Total Active Users' : 'Total Deleted Users'}
                </p>
                <p className={`text-2xl font-bold ${
                  activeTab === 'active' ? 'text-blue-600' : 'text-red-600'
                }`}>
                  {users.length}
                </p>
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
                  key: 'full_name',
                  label: 'User',
                  sortable: true,
                  render: (value: string, row: User) => (
                    <div className="flex items-center space-x-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold ${
                        row.isAdmin ? 'bg-red-600' : 'bg-blue-600'
                      } text-white`}>
                        {row.full_name?.[0]?.toUpperCase() || 'U'}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <p className="font-medium text-gray-900">{row.full_name || 'Unnamed'}</p>
                          {row.isAdmin && (
                            <span className="px-2 py-0.5 text-xs font-semibold bg-red-100 text-red-800 rounded-full">
                              ADMIN
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-500">{row.phone || 'No phone'}</p>
                      </div>
                    </div>
                  ),
                },
                {
                  key: 'user_number',
                  label: 'User ID',
                  sortable: false,
                  render: (value: string, row: User) => (
                    <span className="text-sm font-mono text-gray-700">
                      {row.user_number || row.id.substring(0, 8) + '...'}
                    </span>
                  ),
                },
                { 
                  key: 'phone', 
                  label: 'Phone', 
                  sortable: false,
                  render: (value: string, row: User) => (
                    <div className="flex items-center space-x-2">
                      <span>{value || '—'}</span>
                      {row.isAdmin && (
                        <span className="text-xs text-red-600 font-medium">(Admin)</span>
                      )}
                    </div>
                  ),
                },
                {
                  key: 'created_at',
                  label: 'Member Since',
                  sortable: true,
                  render: (value: string) => formatDate(value),
                },
                {
                  key: 'is_active',
                  label: 'Status',
                  sortable: false,
                  render: (value: boolean, row: User) => {
                    if (row.deleted_at) {
                      return (
                        <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-800">
                          Deleted
                        </span>
                      );
                    }
                    return (
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${value === false ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`}>
                        {value === false ? 'Deactivated' : 'Active'}
                      </span>
                    );
                  },
                },
                ...(activeTab === 'deleted' ? [{
                  key: 'deleted_at',
                  label: 'Deleted On',
                  sortable: true,
                  render: (value: string) => value ? formatDate(value) : '—',
                }] : []),
                {
                  key: 'total_orders',
                  label: 'Total Orders',
                  sortable: true,
                  render: (value: number, row: User) => (
                    <span className="font-medium text-gray-900">
                      {row.total_orders || 0}
                    </span>
                  ),
                },
                {
                  key: 'actions',
                  label: 'Actions',
                  sortable: false,
                  render: (value: any, row: User) => (
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleUserClick(row);
                        }}
                        className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                      >
                        View
                      </button>
                      {!row.isAdmin && activeTab === 'active' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteUser(row);
                          }}
                          disabled={deletingUserId === row.id}
                          className="px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Delete user and all their data"
                        >
                          {deletingUserId === row.id ? 'Deleting...' : 'Delete'}
                        </button>
                      )}
                      {!row.isAdmin && activeTab === 'deleted' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleReactivateUser(row);
                          }}
                          disabled={reactivatingUserId === row.id}
                          className="px-3 py-1 text-sm bg-green-600 text-white hover:bg-green-700 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Reactivate user account (allows user to log in again)"
                        >
                          {reactivatingUserId === row.id ? 'Reactivating...' : 'Reactivate'}
                        </button>
                      )}
                      {!row.isAdmin && activeTab === 'active' && (
                        <button
                          onClick={async (e) => {
                            e.stopPropagation();
                            // Toggle active/deactivated state
                            if (!user?.id) return;
                            const action = row.is_active === false ? 'activate' : 'deactivate';
                            if (!confirm(`Are you sure you want to ${action} this user?`)) return;
                            try {
                              setTogglingUserId(row.id);
                              const res = await fetch('/api/admin/deactivate-user', {
                                method: 'POST',
                                headers: {
                                  'Content-Type': 'application/json',
                                  'X-User-Id': user.id,
                                },
                                body: JSON.stringify({ userId: row.id, action }),
                              });
                              const result = await res.json();
                              if (!res.ok) throw new Error(result.error || 'Failed');
                              // Refresh users
                              await fetchUsers();
                            } catch (err) {
                              alert((err as any)?.message || 'Failed to update user status');
                            } finally {
                              setTogglingUserId(null);
                            }
                          }}
                          disabled={togglingUserId === row.id}
                          className="px-3 py-1 text-sm bg-yellow-50 text-yellow-800 rounded hover:bg-yellow-100 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {togglingUserId === row.id ? 'Processing...' : (row.is_active === false ? 'Activate' : 'Deactivate')}
                        </button>
                      )}
                      {row.isAdmin && (
                        <span className="px-3 py-1 text-sm text-gray-500 italic">
                          Protected
                        </span>
                      )}
                    </div>
                  ),
                },
              ]}
              data={filteredUsers}
              isLoading={loading}
              emptyMessage={activeTab === 'deleted' ? 'No deleted users found' : 'No users found'}
              onRowClick={handleUserClick}
              rowKey="id"
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
                      <p className="text-gray-600 text-sm">Phone</p>
                      <p className="font-medium">{selectedUser.phone || '-'}</p>
                    </div>
                    <div>
                      <p className="text-gray-600 text-sm">User ID</p>
                      <p className="font-medium font-mono">{selectedUser.user_number || selectedUser.id.substring(0, 8) + '...'}</p>
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
                              <span>{formatCurrency(order.total_amount || 0)}</span>
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
