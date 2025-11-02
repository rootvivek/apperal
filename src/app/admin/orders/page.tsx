'use client';

import { useState, useEffect } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import { createClient } from '@/lib/supabase/client';

interface Order {
  id: string;
  order_number: string;
  user_id: string;
  total_amount: number;
  status: string;
  payment_method: string;
  created_at: string;
  first_item_image?: string;
  item_count?: number;
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
}

export default function OrdersPage() {
  const supabase = createClient();
  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [orderSearch, setOrderSearch] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [showOrderDetails, setShowOrderDetails] = useState(false);
  const [userEmail, setUserEmail] = useState<string>('');
  const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      setOrdersLoading(true);
      const { data } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false }) as any;
      setOrders(data || []);
      const ordersWithImages = await Promise.all(
        (data || []).map(async (order: Order) => {
          const { data: itemsData } = await supabase
            .from('order_items')
            .select('product_image')
            .eq('order_id', order.id)
            .limit(1) as any;
          const { count } = await supabase
            .from('order_items')
            .select('*', { count: 'exact', head: true })
            .eq('order_id', order.id) as any;
          return {
            ...order,
            first_item_image: itemsData?.[0]?.product_image,
            item_count: count || 0
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
      const { data: itemsData } = await supabase
        .from('order_items')
        .select('*')
        .eq('order_id', order.id) as any;
      setOrderItems(itemsData || []);
      if (order.user_id) {
        const { data: userData } = await supabase
          .from('profiles')
          .select('email')
          .eq('id', order.user_id)
          .single() as any;
        setUserEmail(userData?.email || 'Guest User');
      } else {
        setUserEmail('Guest User');
      }
    } catch (error) {
      console.error('Error fetching order details:', error);
    }
    setShowOrderDetails(true);
  };

  const handleUpdateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', orderId);
      if (error) throw error;
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

  const formatDate = (date: string) => new Date(date).toLocaleDateString();
  const formatCurrency = (value: number) => `₹${(value || 0).toFixed(2)}`;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Orders Management</h1>
          <p className="text-gray-600">View and manage all orders grouped by user</p>
        </div>

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
          
          <div className="space-y-6">
            {ordersLoading ? (
              <div className="text-center py-12">
                <p className="text-gray-600">Loading orders...</p>
              </div>
            ) : (() => {
              const filteredOrders = orders.filter(order => !orderSearch || order.order_number?.toLowerCase().includes(orderSearch.toLowerCase()));
              const groupedOrders = filteredOrders.reduce((acc, order) => {
                const userId = order.user_id || 'guest';
                if (!acc[userId]) acc[userId] = [];
                acc[userId].push(order);
                return acc;
              }, {} as Record<string, Order[]>);

              if (Object.keys(groupedOrders).length === 0) return <div className="text-center py-12"><p className="text-gray-600">No orders found</p></div>;

              return Object.entries(groupedOrders).map(([userId, userOrders]) => {
                const isExpanded = expandedUsers.has(userId);
                const toggleExpand = () => {
                  const newExpanded = new Set(expandedUsers);
                  if (isExpanded) newExpanded.delete(userId);
                  else newExpanded.add(userId);
                  setExpandedUsers(newExpanded);
                };

                return (
                  <div key={userId} className="border rounded-lg overflow-hidden">
                    <div className="bg-gray-100 px-6 py-4 border-b cursor-pointer hover:bg-gray-200 transition-colors" onClick={toggleExpand}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <svg className={`w-5 h-5 text-gray-600 transform transition-transform ${isExpanded ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                          <div>
                            <h3 className="font-bold text-gray-900">{userId === 'guest' ? 'Guest User' : `User ID: ${userId}`}</h3>
                            <p className="text-sm text-gray-600">{userOrders.length} order(s)</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-600">Total</p>
                          <p className="font-bold text-blue-600">{formatCurrency(userOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0))}</p>
                        </div>
                      </div>
                    </div>
                    {isExpanded && (
                      <div className="bg-white divide-y">
                        {userOrders.map((order) => (
                          <div key={order.id} className="px-6 py-4 hover:bg-gray-50 cursor-pointer transition-colors" onClick={() => handleOrderClick(order)}>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-4 flex-1">
                                {order.first_item_image && <img src={order.first_item_image} alt="Product" className="w-12 h-12 object-cover rounded" onError={(e) => (e.target as HTMLImageElement).src = '/placeholder-product.jpg'} />}
                                <div>
                                  <button className="text-blue-600 hover:text-blue-900 font-medium">#{order.order_number}</button>
                                  <p className="text-xs text-gray-500 mt-1">{formatDate(order.created_at)}</p>
                                </div>
                              </div>
                              <div className="flex items-center space-x-6">
                                <span className={`px-3 py-1 rounded text-xs font-medium ${order.status === 'delivered' ? 'bg-green-100 text-green-800' : order.status === 'shipped' ? 'bg-blue-100 text-blue-800' : order.status === 'processing' ? 'bg-yellow-100 text-yellow-800' : order.status === 'pending' ? 'bg-orange-100 text-orange-800' : 'bg-gray-100 text-gray-800'}`}>{order.status}</span>
                                <span className="font-semibold w-24 text-right">{formatCurrency(order.total_amount)}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              });
            })()}
          </div>
        </div>

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
                <div className="grid grid-cols-2 gap-4">
                  <div><p className="text-gray-600 text-sm">Date</p><p className="font-medium">{formatDate(selectedOrder.created_at)}</p></div>
                  <div><p className="text-gray-600 text-sm">Payment Method</p><p className="font-medium capitalize">{selectedOrder.payment_method === 'cod' ? 'Cash on Delivery' : selectedOrder.payment_method}</p></div>
                  <div><p className="text-gray-600 text-sm">Total Amount</p><p className="font-bold text-lg text-blue-600">{formatCurrency(selectedOrder.total_amount)}</p></div>
                  <div><p className="text-gray-600 text-sm">Status</p><select value={selectedOrder.status} onChange={(e) => handleUpdateOrderStatus(selectedOrder.id, e.target.value)} className="mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"><option value="pending">Pending</option><option value="processing">Processing</option><option value="shipped">Shipped</option><option value="delivered">Delivered</option><option value="cancelled">Cancelled</option></select></div>
                </div>

                <div>
                  <h3 className="font-semibold mb-4">Order Items</h3>
                  {orderItems.length === 0 ? <p className="text-gray-600">No items found</p> : (
                    <div className="space-y-3">
                      {orderItems.map((item) => (
                        <div key={item.id} className="border rounded-lg p-4">
                          <div className="flex items-start space-x-4">
                            {item.product_image && <img src={item.product_image} alt={item.product_name} className="w-20 h-20 object-cover rounded-lg" onError={(e) => (e.target as HTMLImageElement).src = '/placeholder-product.jpg'} />}
                            <div className="flex-1">
                              <h4 className="font-medium">{item.product_name}</h4>
                              <p className="text-sm text-gray-600">Price: {formatCurrency(item.product_price)} × Quantity: {item.quantity}</p>
                            </div>
                            <div className="text-right"><p className="font-semibold">{formatCurrency(item.total_price)}</p></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="border-t pt-4">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-semibold">Total</span>
                    <span className="text-2xl font-bold text-blue-600">{formatCurrency(selectedOrder.total_amount)}</span>
                  </div>
                </div>
              </div>
              
              <div className="p-6 border-t border-gray-200">
                <button onClick={() => setShowOrderDetails(false)} className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Close</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
