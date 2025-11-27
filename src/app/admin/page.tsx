'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import AdminLayout from '@/components/admin/AdminLayout';
import AdminGuard from '@/components/admin/AdminGuard';
import DashboardCard from '@/components/DashboardCard';
import EmptyState from '@/components/checkout/shared/EmptyState';
import DataTable from '@/components/DataTable';
import { Spinner } from '@/components/ui/spinner';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';
import { ProductEditModal } from '@/components/admin/products/ProductEditModal';
import { UserDetailsModal } from '@/components/admin/users/UserDetailsModal';
import { OrderDetailsModal } from '@/components/admin/orders/OrderDetailsModal';
import { updateOrderStatus } from '@/hooks/admin/useOrderActions';
import { saveProduct, deleteProduct } from '@/hooks/admin/useProductActions';
import { formatAdminDate, formatAdminCurrency } from '@/utils/adminFormat';
import { 
  useAdminDashboardUsers, 
  useAdminDashboardProducts, 
  useAdminDashboardOrders,
  type AdminUser,
  type AdminProduct,
  type AdminOrder
} from '@/hooks/admin/useAdminDashboard';
import { useOrderDetails } from '@/hooks/admin/useOrderDetails';
import { useUserDetails } from '@/hooks/admin/useUserDetails';
import { createClient } from '@/lib/supabase/client';

function AdminDashboardContent() {
  const supabase = createClient();
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<'overview' | 'products' | 'orders'>('products');
  
  // Data fetching hooks
  const { users, loading: usersLoading, fetchUsers, setUsers } = useAdminDashboardUsers();
  const { products, loading: productsLoading, fetchProducts, setProducts } = useAdminDashboardProducts(user?.id);
  const { orders, loading: ordersLoading, fetchOrders, setOrders } = useAdminDashboardOrders();
  
  // Search states
  const [userSearch, setUserSearch] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [orderSearch, setOrderSearch] = useState('');

  // Order details
  const [selectedOrder, setSelectedOrder] = useState<AdminOrder | null>(null);
  const [showOrderDetails, setShowOrderDetails] = useState(false);
  const {
    orderItems,
    userName,
    userPhone,
    userAddress,
    fetchOrderDetails,
  } = useOrderDetails();

  // User details
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [showUserDetails, setShowUserDetails] = useState(false);
  const [userDetailsTab, setUserDetailsTab] = useState<'orders' | 'cart' | 'wishlist'>('orders');
  const {
    userOrders,
    userCartItems,
    userWishlistItems,
    fetchUserDetails,
  } = useUserDetails();

  // Product edit modal
  const [selectedProduct, setSelectedProduct] = useState<AdminProduct | null>(null);
  const [showProductEdit, setShowProductEdit] = useState(false);
  const [editProductLoading, setEditProductLoading] = useState(false);
  const [editFormData, setEditFormData] = useState<AdminProduct | null>(null);
  
  // Lock body scroll when any modal is open
  useBodyScrollLock(showProductEdit || showOrderDetails || showUserDetails);

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


  const handleOrderClick = async (order: AdminOrder) => {
    setSelectedOrder(order);
    await fetchOrderDetails(order);
    setShowOrderDetails(true);
  };

  const handleUpdateOrderStatus = async (orderId: string, newStatus: string) => {
    await updateOrderStatus({
      supabase,
      orderId,
      newStatus,
      orders,
      setOrders,
      selectedOrder,
      setSelectedOrder,
    });
  };

  const handleUserClick = async (user: AdminUser) => {
    setSelectedUser(user);
    setUserDetailsTab('orders');
    await fetchUserDetails(user.id);
    setShowUserDetails(true);
  };

  const handleEditProduct = (product: AdminProduct) => {
    setSelectedProduct(product);
    setEditFormData({ ...product });
    setShowProductEdit(true);
  };

  const handleSaveProduct = async () => {
    if (!editFormData || !selectedProduct || !user?.id) return;

    await saveProduct({
      userId: user.id,
      selectedProduct,
      editFormData,
      products,
      setProducts,
      setShowProductEdit,
      setEditProductLoading,
    });
  };

  const handleDeleteProduct = async (productId: string) => {
    if (!user?.id) {
      alert('User not authenticated');
      return;
    }

    await deleteProduct({
      userId: user.id,
      productId,
      products,
      setProducts,
    });
  };

  const filteredUsers = users.filter(user =>
    user.full_name?.toLowerCase().includes(userSearch.toLowerCase()) ||
    user.phone?.toLowerCase().includes(userSearch.toLowerCase())
  );

  const filteredProducts = products.filter(product =>
    product.name?.toLowerCase().includes(productSearch.toLowerCase())
  );

  const formatDate = formatAdminDate;
  const formatCurrency = formatAdminCurrency;

  return (
    <AdminLayout>
      <div className="space-y-2">
        {/* Tab Navigation */}
        <div className="bg-white rounded-[4px] shadow border-b border-gray-200">
          <div className="flex space-x-1 px-2 sm:px-3 overflow-x-auto">
            {[
              { id: 'overview', label: '📊 Overview' },
              { id: 'products', label: '📦 Products' },
              { id: 'orders', label: '🛒 Orders' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-2 sm:px-3 py-2 sm:py-2.5 font-medium border-b-2 transition-colors whitespace-nowrap text-sm ${
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
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
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
        )}

        {/* Products Tab */}
        {activeTab === 'products' && (
          <div className="bg-white rounded-[4px] shadow p-2.5 flex flex-col flex-1 min-h-0 space-y-2">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 flex-shrink-0">
              <Input
                type="text"
                placeholder="Search products..."
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                className="flex-1"
              />
              <span className="text-xs sm:text-sm text-gray-600 whitespace-nowrap">Found {filteredProducts.length} products</span>
            </div>
            <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
              <DataTable
                columns={[
                {
                  key: 'image_url' as const,
                  label: 'Image',
                  sortable: false,
                  render: (value: string, row: AdminProduct) => (
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
                {
                  key: 'name' as const,
                  label: 'Product',
                  sortable: true,
                  render: (value: string, row: AdminProduct) => (
                    <div className="flex items-center gap-2">
                      <span>{value}</span>
                      {row.is_active === false && (
                        <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-gray-500 text-white">
                          Inactive
                        </span>
                      )}
                    </div>
                  ),
                },
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
                  render: (value: string, row: AdminProduct) => (
                    <div className="flex gap-2">
                      <Button
                        onClick={(e) => { e.stopPropagation(); handleEditProduct(row); }}
                        variant="ghost"
                        size="sm"
                        className="h-8 text-blue-600 hover:text-blue-900 hover:bg-blue-50"
                      >
                        Edit
                      </Button>
                      <Button
                        onClick={(e) => { e.stopPropagation(); handleDeleteProduct(row.id); }}
                        variant="ghost"
                        size="sm"
                        className="h-8 text-red-600 hover:text-red-900 hover:bg-red-50"
                      >
                        Delete
                      </Button>
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
          </div>
        )}

        {/* Orders Tab */}
        {activeTab === 'orders' && (
          <div className="bg-white rounded-[4px] shadow p-2.5 space-y-2">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <Input
                type="text"
                placeholder="Search orders by number..."
                value={orderSearch}
                onChange={(e) => setOrderSearch(e.target.value)}
                className="flex-1"
              />
              <span className="text-xs sm:text-sm text-gray-600 whitespace-nowrap">Found {orders.filter(o => o.order_number?.toLowerCase().includes(orderSearch.toLowerCase())).length} orders</span>
            </div>
            
            {/* Individual Orders View */}
            <div className="space-y-2">
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
                      <EmptyState
                        title="No orders found"
                        variant="compact"
                      />
                    );
                  }

                  return filteredOrders.map((order) => {
                    // For guest orders, show "Guest User"
                    // For registered users, show user number or shortened ID
                    const userDisplayId = order.user_id === 'guest' || !order.user_id
                      ? 'Guest User'
                      : `User ID: ${order.user_id.substring(0, 8)}...`;
                    
                    return (
                        <div 
                          key={order.id} 
                        className="border rounded-[4px] bg-white hover:shadow-md transition-shadow md:cursor-pointer"
                          onClick={(e) => {
                            // On mobile, only click if clicking directly on the card (not on buttons)
                            const target = e.target as HTMLElement;
                            if (target.closest('button')) {
                              return; // Let button handle its own click
                            }
                            // On desktop (md+), allow card click
                            if (window.matchMedia('(min-width: 768px)').matches) {
                              handleOrderClick(order);
                            }
                          }}
                        >
                        <div className="p-2.5">
                          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-4">
                            <div className="flex items-center gap-2 sm:gap-3 md:gap-4 flex-1 min-w-0">
                              {order.first_item_image && (
                                <img
                                  src={order.first_item_image}
                                  alt="Product"
                                  className="w-10 h-10 sm:w-12 sm:h-12 object-cover rounded flex-shrink-0"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).src = '/placeholder-product.jpg';
                                  }}
                                />
                              )}
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 md:gap-3">
                                <Button 
                                  variant="link"
                                  size="sm"
                                  className="h-auto p-0 text-sm sm:text-base text-blue-600 hover:text-blue-900"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleOrderClick(order);
                                  }}
                                >
                                  #{order.order_number}
                                </Button>
                                  <span className="text-xs sm:text-sm text-gray-500 hidden sm:inline">•</span>
                                  <span className="text-xs sm:text-sm text-gray-600 truncate">{userDisplayId}</span>
                                </div>
                                <p className="text-xs sm:text-sm text-gray-600 mt-0.5 sm:mt-1 font-medium">{formatDate(order.created_at)}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 sm:gap-4 md:gap-6 w-full sm:w-auto justify-between sm:justify-end">
                              <Badge
                                className="whitespace-nowrap capitalize"
                                variant={
                                  order.status === 'delivered'
                                    ? 'secondary'
                                    : order.status === 'shipped'
                                    ? 'secondary'
                                    : order.status === 'processing'
                                    ? 'secondary'
                                    : order.status === 'pending'
                                    ? 'secondary'
                                    : 'outline'
                                }
                              >
                                {order.status}
                              </Badge>
                              <span className="font-semibold text-sm sm:text-base whitespace-nowrap">
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

      <ProductEditModal
        open={showProductEdit && !!selectedProduct && !!editFormData}
        product={selectedProduct as any}
        formData={editFormData as any}
        loading={editProductLoading}
        onClose={() => setShowProductEdit(false)}
        onChange={(data) => setEditFormData(data as any)}
        onSave={handleSaveProduct}
      />

      <UserDetailsModal
        open={showUserDetails && !!selectedUser}
        onClose={() => setShowUserDetails(false)}
        user={selectedUser}
        userOrders={userOrders}
        userCartItems={userCartItems}
        userWishlistItems={userWishlistItems}
        activeTab={userDetailsTab}
        onTabChange={setUserDetailsTab}
        formatDate={formatDate}
        formatCurrency={formatCurrency}
      />

      <OrderDetailsModal
        open={showOrderDetails && !!selectedOrder}
        onClose={() => setShowOrderDetails(false)}
        order={selectedOrder}
        orderItems={orderItems}
        userName={userName}
        userPhone={userPhone}
        userAddress={userAddress}
        onUpdateStatus={handleUpdateOrderStatus}
        formatDate={formatDate}
        formatCurrency={formatCurrency}
      />
    </AdminLayout>
  );
}

export default function AdminDashboard() {
  return (
    <AdminGuard>
      <Suspense fallback={
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-sm">
          <div className="text-center">
            <Spinner className="size-12 text-blue-600 mx-auto" />
            <p className="mt-4 text-gray-600">Loading...</p>
          </div>
        </div>
      }>
        <AdminDashboardContent />
      </Suspense>
    </AdminGuard>
  );
}
