'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import AdminLayout from '@/components/admin/AdminLayout';
import AdminGuard from '@/components/admin/AdminGuard';
import DashboardCard from '@/components/DashboardCard';
import DataTable from '@/components/DataTable';
import { createClient } from '@/lib/supabase/client';

interface User {
  id: string;
  email: string;
  full_name: string;
  phone: string;
  created_at: string;
}

interface Product {
  id: string;
  name: string;
  price: number;
  original_price?: number;
  stock_quantity: number;
  rating: number;
  review_count: number;
  created_at: string;
  description?: string;
  category?: string;
  subcategory?: string;
  badge?: string;
  is_active?: boolean;
  show_in_hero?: boolean;
  image_url?: string;
}

interface Order {
  id: string;
  order_number: string;
  user_id: string;
  total_amount: number;
  status: string;
  payment_method: string;
  created_at: string;
  notes?: string;
  razorpay_payment_id?: string;
  razorpay_order_id?: string;
  first_item_image?: string;
  item_count?: number;
  user_number?: string;
}

interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  product_name: string;
  product_image?: string;
  product_price: number;
  quantity: number;
  total_price: number;
  size?: string | null;
}

function AdminDashboardContent() {
  const supabase = createClient();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<'overview' | 'products' | 'orders'>('products');
  
  // Users
  const [users, setUsers] = useState<User[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [userSearch, setUserSearch] = useState('');

  // Products
  const [products, setProducts] = useState<Product[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [productSearch, setProductSearch] = useState('');

  // Orders
  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [orderSearch, setOrderSearch] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [showOrderDetails, setShowOrderDetails] = useState(false);
  const [userEmail, setUserEmail] = useState<string>('');
  const [userName, setUserName] = useState<string>('');
  const [userPhone, setUserPhone] = useState<string>('');
  const [userAddress, setUserAddress] = useState<any>(null);
  const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set());

  // User detail modal
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showUserDetails, setShowUserDetails] = useState(false);
  const [userOrders, setUserOrders] = useState<Order[]>([]);
  
  // Cart and Wishlist items
  const [userCartItems, setUserCartItems] = useState<any[]>([]);
  const [userWishlistItems, setUserWishlistItems] = useState<any[]>([]);
  const [userDetailsTab, setUserDetailsTab] = useState<'orders' | 'cart' | 'wishlist'>('orders');

  // Product edit modal
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showProductEdit, setShowProductEdit] = useState(false);
  const [editProductLoading, setEditProductLoading] = useState(false);
  const [editFormData, setEditFormData] = useState<Product | null>(null);

  useEffect(() => {
    const initialTab = searchParams.get('tab') as 'overview' | 'products' | 'orders' | null;
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, []);

  // Fetch data based on active tab
  useEffect(() => {
    if (activeTab === 'products') fetchProducts();
    else if (activeTab === 'orders') fetchOrders();
    else if (activeTab === 'overview') {
      fetchUsers();
      fetchProducts();
      fetchOrders();
    }
  }, [activeTab]);

  const fetchUsers = async () => {
    try {
      setUsersLoading(true);
      console.log('📝 Fetching users from user_profiles table...');
      const { data, error } = await supabase
        .from('user_profiles')
        .select('id, email, full_name, phone, created_at')
        .order('created_at', { ascending: false });
      
      console.log('📊 Fetched data:', data);
      console.log('❌ Error (if any):', error);
      console.log('📈 Total users:', data?.length || 0);
      
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setUsersLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      setProductsLoading(true);
      const { data } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });
      setProducts(data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setProductsLoading(false);
    }
  };

  const fetchOrders = async () => {
    try {
      setOrdersLoading(true);
      const { data } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false }) as any;
      
      // Get unique user IDs
      const userIds = Array.from(new Set((data || []).map((o: Order) => o.user_id).filter(Boolean)));
      
      // Fetch user numbers for all users
      const userNumberMap: { [key: string]: string } = {};
      if (userIds.length > 0) {
        const { data: userProfiles } = await supabase
          .from('user_profiles')
          .select('id, user_number')
          .in('id', userIds);
        
        if (userProfiles) {
          userProfiles.forEach((profile: any) => {
            if (profile.user_number) {
              userNumberMap[profile.id] = profile.user_number;
            }
          });
        }
      }
      
      // Fetch first item image for each order
      const ordersWithImages = await Promise.all(
        (data || []).map(async (order: Order) => {
          let firstItemImage = null;
          let itemCount = 0;
          
          try {
            const { data: itemsData, error: itemsError } = await supabase
            .from('order_items')
            .select('product_image')
            .eq('order_id', order.id)
              .limit(1);
            
            if (!itemsError && itemsData && itemsData.length > 0) {
              firstItemImage = itemsData[0]?.product_image || null;
            }
          } catch (error) {
            console.log('Note: Could not fetch product_image for order:', order.id);
          }
          
          try {
            const { count, error: countError } = await supabase
            .from('order_items')
            .select('*', { count: 'exact', head: true })
              .eq('order_id', order.id);
            
            if (!countError) {
              itemCount = count || 0;
            }
          } catch (error) {
            console.log('Note: Could not count items for order:', order.id);
          }
          
          return {
            ...order,
            first_item_image: firstItemImage,
            item_count: itemCount,
            user_number: userNumberMap[order.user_id] || null
          };
        })
      );
      
      setOrders(ordersWithImages);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setOrdersLoading(false);
    }
  };

  const handleOrderClick = async (order: Order) => {
    setSelectedOrder(order);
    
    try {
      // Fetch order items
      const { data: itemsData } = await supabase
        .from('order_items')
        .select('*')
        .eq('order_id', order.id) as any;
      
      // Fetch product images for each order item
      const itemsWithImages = await Promise.all(
        (itemsData || []).map(async (item: any) => {
          let productImage = item.product_image;
      
          // If no product_image in order_items, fetch from products table
          if (!productImage && item.product_id) {
            const { data: productData } = await supabase
              .from('products')
              .select('image_url')
              .eq('id', item.product_id)
              .single();
            
            if (productData?.image_url) {
              productImage = productData.image_url;
            }
          }
          
          return {
            ...item,
            product_image: productImage || null
          };
        })
      );
      
      setOrderItems(itemsWithImages);
      
      // Fetch user information if user_id exists
      if (order.user_id) {
        // Fetch user profile (name, phone, email)
        const { data: userProfile } = await supabase
          .from('user_profiles')
          .select('email, full_name, phone')
          .eq('id', order.user_id)
          .single() as any;
        
        // Prioritize order customer info (from checkout form) over profile data
        // This ensures we show what was actually entered during checkout
        setUserEmail((order as any).customer_email || userProfile?.email || 'N/A');
        setUserName((order as any).customer_name || userProfile?.full_name || 'N/A');
        setUserPhone((order as any).customer_phone || userProfile?.phone || 'N/A');
        
        // Priority 1: Check if address is stored directly in the order
        if ((order as any).shipping_address) {
          setUserAddress({
            address_line1: (order as any).shipping_address || '',
            address_line2: (order as any).shipping_address_line2 || null,
            city: (order as any).shipping_city || '',
            state: (order as any).shipping_state || '',
            zip_code: (order as any).shipping_zip_code || '',
            country: (order as any).shipping_country || 'India'
          });
        } 
        // Priority 2: Check if order has shipping_address_id
        else if ((order as any).shipping_address_id) {
          const { data: addressData } = await supabase
            .from('addresses')
            .select('*')
            .eq('id', (order as any).shipping_address_id)
            .single() as any;
          
          setUserAddress(addressData || null);
        } 
        // Priority 3: Try to fetch default shipping address for user
        else {
          const { data: addressData } = await supabase
            .from('addresses')
            .select('*')
            .eq('user_id', order.user_id)
            .eq('address_type', 'shipping')
            .order('is_default', { ascending: false })
            .limit(1)
            .maybeSingle() as any;
          
          setUserAddress(addressData || null);
        }
      } else {
        // Guest order - use customer information from order
        setUserEmail((order as any).customer_email || 'N/A');
        setUserName((order as any).customer_name || 'Guest User');
        setUserPhone((order as any).customer_phone || 'N/A');
        
        // Use shipping address from order if available
        if ((order as any).shipping_address) {
          setUserAddress({
            address_line1: (order as any).shipping_address || '',
            address_line2: (order as any).shipping_address_line2 || null,
            city: (order as any).shipping_city || '',
            state: (order as any).shipping_state || '',
            zip_code: (order as any).shipping_zip_code || '',
            country: (order as any).shipping_country || 'India'
          });
        } else {
          setUserAddress(null);
        }
      }
      
    } catch (error) {
      console.error('Error fetching order details:', error);
    }
    
    setShowOrderDetails(true);
  };

  const handleUpdateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      // If cancelling, prompt for reason
      let cancellationReason = '';
      let updateData: any = { status: newStatus };
      
      if (newStatus === 'cancelled') {
        const reason = prompt('Please provide a reason for cancellation:');
        if (!reason || !reason.trim()) {
          alert('Cancellation reason is required');
          return;
        }
        cancellationReason = reason;
        updateData = {
          status: 'cancelled',
          cancellation_reason: cancellationReason.trim(),
          cancelled_by: 'admin',
          cancelled_at: new Date().toISOString()
        };
      } else {
        // For other status updates, clear cancellation fields if they exist
        updateData = {
          status: newStatus,
          cancellation_reason: null,
          cancelled_by: null,
          cancelled_at: null
        };
      }
      
      const { error } = await supabase
        .from('orders')
        .update(updateData)
        .eq('id', orderId);
      
      if (error) throw error;
      
      // Update local state
      setOrders(orders.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder({ ...selectedOrder, status: newStatus });
      }
      
      alert('Order status updated successfully!');
    } catch (error: any) {
      console.error('Error updating order status:', error);
      alert('Failed to update order status: ' + error.message);
    }
  };

  const handleUserClick = async (user: User) => {
    setSelectedUser(user);
    setUserDetailsTab('orders');
    
    try {
      // Fetch orders
      const { data: orders } = await supabase
        .from('orders')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      setUserOrders(orders || []);
      
      // Fetch cart items with product details
      const { data: cartData, error: cartError } = await supabase
        .from('cart_items')
        .select(`
          id,
          quantity,
          product:products(id, name, price, image_url)
        `)
        .eq('cart_id', (await supabase
          .from('carts')
          .select('id')
          .eq('user_id', user.id)
          .single()).data?.id || '');
      
      if (cartError) console.error('Cart error:', cartError);
      setUserCartItems(cartData || []);
      
      // Fetch wishlist items - Fixed query syntax
      const { data: wishlistData, error: wishlistError } = await supabase
        .from('wishlist')
        .select('id, product_id, products(id, name, price, image_url)')
        .eq('user_id', user.id);
      
      if (wishlistError) {
        console.error('Wishlist error:', wishlistError);
      } else {
        console.log('Wishlist data fetched:', wishlistData);
      }
      
      // Transform wishlist data to match expected format
      const transformedWishlist = (wishlistData || []).map((item: any) => ({
        id: item.id,
        product: item.products
      }));
      
      setUserWishlistItems(transformedWishlist);
    } catch (error) {
      console.error('Error fetching user details:', error);
    }
    
    setShowUserDetails(true);
  };

  const handleEditProduct = (product: Product) => {
    setSelectedProduct(product);
    setEditFormData({ ...product });
    setShowProductEdit(true);
  };

  const handleSaveProduct = async () => {
    if (!editFormData || !selectedProduct) return;

    try {
      setEditProductLoading(true);
      const { error } = await supabase
        .from('products')
        .update({
          name: editFormData.name,
          description: editFormData.description,
          price: editFormData.price,
          original_price: editFormData.original_price,
          badge: editFormData.badge,
          category: editFormData.category,
          subcategory: editFormData.subcategory,
          stock_quantity: editFormData.stock_quantity,
          is_active: editFormData.is_active,
          show_in_hero: editFormData.show_in_hero,
          updated_at: new Date().toISOString(),
        })
        .eq('id', selectedProduct.id);

      if (error) throw error;

      // Update local products list
      setProducts(products.map(p => p.id === selectedProduct.id ? editFormData : p));
      setShowProductEdit(false);
      alert('Product updated successfully!');
    } catch (error: any) {
      console.error('Error saving product:', error);
      alert('Failed to update product: ' + error.message);
    } finally {
      setEditProductLoading(false);
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    if (!confirm('Are you sure you want to delete this product?')) return;

    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', productId);

      if (error) throw error;

      setProducts(products.filter(p => p.id !== productId));
      alert('Product deleted successfully');
    } catch (error: any) {
      console.error('Error deleting product:', error);
      alert('Failed to delete product: ' + error.message);
    }
  };

  const filteredUsers = users.filter(user =>
    user.email?.toLowerCase().includes(userSearch.toLowerCase()) ||
    user.full_name?.toLowerCase().includes(userSearch.toLowerCase())
  );

  const filteredProducts = products.filter(product =>
    product.name?.toLowerCase().includes(productSearch.toLowerCase())
  );

  const formatDate = (date: string) => {
    const d = new Date(date);
    return d.toLocaleString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };
  const formatCurrency = (value: number) => `₹${(value || 0).toFixed(2)}`;

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-600">Manage users, products, and orders all in one place</p>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white rounded-lg shadow border-b border-gray-200">
          <div className="flex space-x-1 px-6">
            {[
              { id: 'overview', label: '📊 Overview' },
              { id: 'products', label: '📦 Products' },
              { id: 'orders', label: '🛒 Orders' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-4 py-3 font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <DashboardCard title="Total Users" value={users.length} icon="👥" color="blue" />
              <DashboardCard title="Total Products" value={products.length} icon="📦" color="blue" />
              <DashboardCard title="Total Orders" value={orders.length} icon="🛒" color="amber" />
              <DashboardCard
                title="Total Revenue"
                value={formatCurrency(orders.reduce((sum, o) => sum + (o.total_amount || 0), 0))}
                icon="💰"
                color="blue"
              />
            </div>
          </div>
        )}

        {/* Products Tab */}
        {activeTab === 'products' && (
          <div className="bg-white rounded-lg shadow p-6 space-y-4">
            <div className="flex items-center space-x-2">
              <input
                type="text"
                placeholder="Search products..."
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg"
              />
              <span className="text-sm text-gray-600">Found {filteredProducts.length} products</span>
            </div>
            <DataTable
              columns={[
                {
                  key: 'image_url' as const,
                  label: 'Image',
                  sortable: false,
                  render: (value: string, row: Product) => (
                    <div className="flex-shrink-0">
                      <img
                        className="h-12 w-12 rounded-lg object-cover border border-gray-200"
                        src={row.image_url || '/placeholder-product.jpg'}
                        alt={row.name}
                        onError={(e) => {
                          e.currentTarget.src = '/placeholder-product.jpg';
                        }}
                      />
                    </div>
                  ),
                },
                { key: 'name' as const, label: 'Product', sortable: true },
                {
                  key: 'price' as const,
                  label: 'Price',
                  sortable: true,
                  render: (value: number) => formatCurrency(value),
                },
                { key: 'stock_quantity' as const, label: 'Stock', sortable: true },
                { key: 'rating' as const, label: 'Rating', sortable: true },
                { key: 'review_count' as const, label: 'Reviews', sortable: true },
                {
                  key: 'id' as const,
                  label: 'Actions',
                  sortable: false,
                  render: (value: string, row: Product) => (
                    <div className="flex space-x-2">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleEditProduct(row); }}
                        className="text-blue-600 hover:text-blue-900 text-sm font-medium"
                      >
                        Edit
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDeleteProduct(row.id); }}
                        className="text-red-600 hover:text-red-900 text-sm font-medium"
                      >
                        Delete
                      </button>
                    </div>
                  ),
                },
              ]}
              data={filteredProducts}
              rowKey="id"
              isLoading={productsLoading}
              itemsPerPage={10}
            />
          </div>
        )}

        {/* Orders Tab */}
        {activeTab === 'orders' && (
          <div className="bg-white rounded-lg shadow p-6 space-y-4">
            <div className="flex items-center space-x-2">
              <input
                type="text"
                placeholder="Search orders by number..."
                value={orderSearch}
                onChange={(e) => setOrderSearch(e.target.value)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg"
              />
              <span className="text-sm text-gray-600">Found {orders.filter(o => o.order_number?.toLowerCase().includes(orderSearch.toLowerCase())).length} orders</span>
            </div>
            
            {/* Individual Orders View */}
            <div className="space-y-4">
                {ordersLoading ? (
                  <div className="text-center py-12">
                    <p className="text-gray-600">Loading orders...</p>
                  </div>
                ) : (() => {
                  const filteredOrders = orders
                    .filter(order => 
                      !orderSearch || 
                      order.order_number?.toLowerCase().includes(orderSearch.toLowerCase())
                    );
                  
                  if (filteredOrders.length === 0) {
                    return (
                      <div className="text-center py-12">
                        <p className="text-gray-600">No orders found</p>
                      </div>
                    );
                  }

                  return filteredOrders.map((order) => {
                    // For guest orders, show customer name if available, otherwise show "Guest User"
                    // For registered users, show user number or shortened ID
                    const userDisplayId = order.user_id === 'guest' || !order.user_id
                      ? ((order as any).customer_name || 'Guest User')
                      : (order.user_number || `User ID: ${order.user_id.substring(0, 8)}...`);
                    
                    return (
                        <div 
                          key={order.id} 
                        className="border rounded-lg bg-white hover:shadow-md transition-shadow cursor-pointer"
                          onClick={() => handleOrderClick(order)}
                        >
                        <div className="px-6 py-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-4 flex-1">
                              {order.first_item_image && (
                                <img
                                  src={order.first_item_image}
                                  alt="Product"
                                  className="w-12 h-12 object-cover rounded"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).src = '/placeholder-product.jpg';
                                  }}
                                />
                              )}
                              <div>
                                <div className="flex items-center space-x-3">
                                <button className="text-blue-600 hover:text-blue-900 font-medium">
                                  #{order.order_number}
                                </button>
                                  <span className="text-sm text-gray-500">•</span>
                                  <span className="text-sm text-gray-600">{userDisplayId}</span>
                                </div>
                                <p className="text-sm text-gray-600 mt-1 font-medium">{formatDate(order.created_at)}</p>
                              </div>
                            </div>
                            <div className="flex items-center space-x-6">
                              <span className={`px-3 py-1 rounded text-xs font-medium ${
                                order.status === 'delivered' ? 'bg-green-100 text-green-800' :
                                order.status === 'shipped' ? 'bg-blue-100 text-blue-800' :
                                order.status === 'processing' ? 'bg-yellow-100 text-yellow-800' :
                                order.status === 'pending' ? 'bg-orange-100 text-orange-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {order.status}
                              </span>
                              <span className="font-semibold w-24 text-right">
                                {formatCurrency(order.total_amount)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
          </div>
        )}
      </div>

      {/* Product Edit Modal */}
      {showProductEdit && selectedProduct && editFormData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center sticky top-0 bg-white">
              <h2 className="text-xl font-bold">Edit Product</h2>
              <button onClick={() => setShowProductEdit(false)} className="text-2xl">✕</button>
            </div>
            <div className="p-6 space-y-4">
              {/* Product Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Product Name *</label>
                <input
                  type="text"
                  value={editFormData.name || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Product name"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
                <textarea
                  value={editFormData.description || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Product description"
                />
              </div>

              {/* Price Row */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Price (₹) *</label>
                  <input
                    type="number"
                    value={editFormData.price || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, price: parseFloat(e.target.value) || 0 })}
                    step="0.01"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Price"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Original Price (₹)</label>
                  <input
                    type="number"
                    value={editFormData.original_price || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, original_price: e.target.value ? parseFloat(e.target.value) : undefined })}
                    step="0.01"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Original price"
                  />
                </div>
              </div>

              {/* Category & Subcategory Row */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <input
                    type="text"
                    value={editFormData.category || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, category: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Category"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Subcategory</label>
                  <input
                    type="text"
                    value={editFormData.subcategory || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, subcategory: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Subcategory"
                  />
                </div>
              </div>

              {/* Badge & Stock Row */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Badge</label>
                  <select
                    value={editFormData.badge || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, badge: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">No Badge</option>
                    <option value="NEW">NEW</option>
                    <option value="SALE">SALE</option>
                    <option value="HOT">HOT</option>
                    <option value="FEATURED">FEATURED</option>
                    <option value="LIMITED">LIMITED</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Stock Quantity *</label>
                  <input
                    type="number"
                    value={editFormData.stock_quantity || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, stock_quantity: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Stock"
                  />
                </div>
              </div>

              {/* Checkboxes */}
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={editFormData.is_active !== false}
                    onChange={(e) => setEditFormData({ ...editFormData, is_active: e.target.checked })}
                    className="h-4 w-4 text-blue-600"
                  />
                  <span className="ml-2 text-sm text-gray-700">Product is active</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={editFormData.show_in_hero === true}
                    onChange={(e) => setEditFormData({ ...editFormData, show_in_hero: e.target.checked })}
                    className="h-4 w-4 text-blue-600"
                  />
                  <span className="ml-2 text-sm text-gray-700">Show in hero section</span>
                </label>
              </div>
            </div>
            <div className="p-6 border-t border-gray-200 flex space-x-3 sticky bottom-0 bg-white">
              <button
                onClick={() => setShowProductEdit(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveProduct}
                disabled={editProductLoading}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {editProductLoading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* User Details Modal */}
      {showUserDetails && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center sticky top-0 bg-white">
              <h2 className="text-xl font-bold">{selectedUser.full_name}</h2>
              <button onClick={() => setShowUserDetails(false)} className="text-2xl">✕</button>
            </div>
            
            {/* Tabs */}
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
                🛒 Cart ({userCartItems.length})
              </button>
              <button
                onClick={() => setUserDetailsTab('wishlist')}
                className={`px-4 py-2 font-medium border-b-2 transition-colors ${
                  userDetailsTab === 'wishlist'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                ❤️ Wishlist ({userWishlistItems.length})
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              {/* User Info */}
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
              
              {/* Orders Tab */}
              {userDetailsTab === 'orders' && (
                <div>
                  <h3 className="font-semibold mb-4">All Orders ({userOrders.length})</h3>
                  {userOrders.length === 0 ? (
                    <p className="text-gray-600">No orders</p>
                  ) : (
                    <div className="space-y-3">
                      {userOrders.map((order) => (
                        <div key={order.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <span className="font-medium text-blue-600">#{order.order_number}</span>
                              <p className="text-xs text-gray-500 mt-1">{formatDate(order.created_at)}</p>
                            </div>
                            <span className="font-semibold">{formatCurrency(order.total_amount || 0)}</span>
                          </div>
                          <div className="flex items-center space-x-4 text-sm">
                            <span className={`px-2 py-1 rounded text-xs font-medium capitalize ${
                              order.status === 'delivered' ? 'bg-green-100 text-green-800' :
                              order.status === 'shipped' ? 'bg-blue-100 text-blue-800' :
                              order.status === 'processing' ? 'bg-yellow-100 text-yellow-800' :
                              order.status === 'pending' ? 'bg-orange-100 text-orange-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {order.status}
                            </span>
                            <span className="text-gray-600 capitalize">
                              {order.payment_method === 'cod' ? 'Cash on Delivery' : order.payment_method}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
              
              {/* Cart Tab */}
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
              
              {/* Wishlist Tab */}
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

      {/* Order Details Modal */}
      {showOrderDetails && selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center sticky top-0 bg-white">
              <div>
                <h2 className="text-xl font-bold">Order #{selectedOrder.order_number}</h2>
                <p className="text-sm text-gray-600">{userEmail}</p>
              </div>
              <button onClick={() => setShowOrderDetails(false)} className="text-2xl">✕</button>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Customer Information */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold mb-4 text-gray-900">Customer Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-gray-600 text-sm mb-1">Name</p>
                    <p className="font-medium">{userName || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-gray-600 text-sm mb-1">Email</p>
                    <p className="font-medium">{userEmail || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-gray-600 text-sm mb-1">Phone Number</p>
                    <p className="font-medium">{userPhone || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-gray-600 text-sm mb-1">Address</p>
                    {userAddress ? (
                      <div className="font-medium text-sm">
                        <p>{userAddress.address_line1 || ''}</p>
                        {userAddress.address_line2 && <p>{userAddress.address_line2}</p>}
                        <p>{userAddress.city || ''}, {userAddress.state || ''} {userAddress.zip_code || ''}</p>
                        {userAddress.country && <p>{userAddress.country}</p>}
                      </div>
                    ) : (
                      <p className="font-medium text-sm text-gray-500">No address available</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Order Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-gray-600 text-sm">Date</p>
                  <p className="font-medium">{formatDate(selectedOrder.created_at)}</p>
                </div>
                <div>
                  <p className="text-gray-600 text-sm">Payment Method</p>
                  <p className="font-medium capitalize">{selectedOrder.payment_method === 'cod' ? 'Cash on Delivery' : selectedOrder.payment_method}</p>
                </div>
                <div>
                  <p className="text-gray-600 text-sm">Total Amount</p>
                  <p className="font-bold text-lg text-blue-600">{formatCurrency(selectedOrder.total_amount)}</p>
                </div>
                <div>
                  <p className="text-gray-600 text-sm">Status</p>
                  <select
                    value={selectedOrder.status}
                    onChange={(e) => handleUpdateOrderStatus(selectedOrder.id, e.target.value)}
                    className="mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="pending">Pending</option>
                    <option value="processing">Processing</option>
                    <option value="shipped">Shipped</option>
                    <option value="delivered">Delivered</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
                {selectedOrder.payment_method === 'razorpay' && (
                  <>
                    {selectedOrder.razorpay_payment_id && (
                      <div>
                        <p className="text-gray-600 text-sm">Razorpay Payment ID</p>
                        <p className="font-medium text-sm font-mono">{selectedOrder.razorpay_payment_id}</p>
                      </div>
                    )}
                    {selectedOrder.razorpay_order_id && (
                      <div>
                        <p className="text-gray-600 text-sm">Razorpay Order ID</p>
                        <p className="font-medium text-sm font-mono">{selectedOrder.razorpay_order_id}</p>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Order Items */}
              <div>
                <h3 className="font-semibold mb-4">Order Items</h3>
                {orderItems.length === 0 ? (
                  <p className="text-gray-600">No items found</p>
                ) : (
                  <div className="space-y-3">
                    {orderItems.map((item) => (
                      <div key={item.id} className="border rounded-lg p-4">
                        <div className="flex items-start space-x-4">
                          {item.product_image ? (
                            <img
                              src={item.product_image}
                              alt={item.product_name}
                              className="w-20 h-20 object-cover rounded-lg"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = '/placeholder-product.jpg';
                              }}
                            />
                          ) : (
                            <div className="w-20 h-20 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                            </div>
                          )}
                          <div className="flex-1">
                            <h4 className="font-medium">{item.product_name}</h4>
                            <p className="text-sm text-gray-600">
                              Price: {formatCurrency(item.product_price)} × Quantity: {item.quantity}
                              <span className="ml-2">| Size: {item.size || 'Select Size'}</span>
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold">{formatCurrency(item.total_price)}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Order Summary */}
              <div className="border-t pt-4">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold">Total</span>
                  <span className="text-2xl font-bold text-blue-600">
                    {formatCurrency(selectedOrder.total_amount)}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="p-6 border-t border-gray-200">
              <button
                onClick={() => setShowOrderDetails(false)}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

export default function AdminDashboard() {
  return (
    <AdminGuard>
      <Suspense fallback={
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading...</p>
          </div>
        </div>
      }>
        <AdminDashboardContent />
      </Suspense>
    </AdminGuard>
  );
}
