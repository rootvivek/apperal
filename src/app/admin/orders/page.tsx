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

export default function OrdersPage() {
  const supabase = createClient();
  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [orderSearch, setOrderSearch] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [showOrderDetails, setShowOrderDetails] = useState(false);
  const [userName, setUserName] = useState<string>('');
  const [userPhone, setUserPhone] = useState<string>('');
  const [userAddress, setUserAddress] = useState<any>(null);
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
            // Silently handle error - firstItemImage remains null
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
            // Silently handle error - itemCount remains 0
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
      // Error handled silently - orders state remains empty
    } finally {
      setOrdersLoading(false);
    }
  };

  const handleOrderClick = async (order: Order) => {
    setSelectedOrder(order);
    try {
      // Fetch order items with product data (JOIN)
      const { data: itemsData } = await supabase
        .from('order_items')
        .select(`
          *,
          products:product_id (
            name,
            image_url
          )
        `)
        .eq('order_id', order.id) as any;
      
      // Process items with product data from JOIN
      const itemsWithImages = (itemsData || []).map((item: any) => {
        const product = item.products || {};
        return {
          ...item,
          product_name: product.name || 'Product not found',
          product_image: product.image_url || null
        };
      });
      
      setOrderItems(itemsWithImages);
      
      // Fetch user information if user_id exists
      if (order.user_id) {
        // Priority 1: Check if order has shipping_address_id (new normalized approach)
        // Fetch customer name and phone from the address used for the order
        if ((order as any).shipping_address_id) {
          const { data: addressData } = await supabase
            .from('addresses')
            .select('*')
            .eq('id', (order as any).shipping_address_id)
            .single() as any;
          
          setUserAddress(addressData || null);
          
          // Fetch customer info from address (this is what was used for the order)
          setUserName(addressData?.full_name || 'N/A');
          setUserPhone(addressData?.phone ? String(addressData.phone) : 'N/A');
        } 
        // Priority 2: Check if address is stored directly in the order (old orders - backward compatibility)
        else if ((order as any).shipping_address) {
          setUserAddress({
            address_line1: (order as any).shipping_address || '',
            address_line2: (order as any).shipping_address_line2 || null,
            city: (order as any).shipping_city || '',
            state: (order as any).shipping_state || '',
            zip_code: (order as any).shipping_zip_code || '',
            country: (order as any).shipping_country || 'India'
          });
          // Old orders don't have name/phone in address, show N/A
          setUserName('N/A');
          setUserPhone('N/A');
        } 
        // Priority 3: Try to fetch default address for user
        else {
          const { data: addressData } = await supabase
            .from('addresses')
            .select('*')
            .eq('user_id', order.user_id)
            .order('is_default', { ascending: false })
            .limit(1)
            .maybeSingle() as any;
          
          setUserAddress(addressData || null);
          // Fetch customer info from address
          setUserName(addressData?.full_name || 'N/A');
          setUserPhone(addressData?.phone ? String(addressData.phone) : 'N/A');
        }
      } else {
        // Guest order - no user_id means no address available
        setUserName('Guest User');
        setUserPhone('N/A');
        
        // Use shipping address from order if available
        if ((order as any).shipping_address) {
          setUserAddress({
            address_line1: (order as any).shipping_address || '',
            address_line2: (order as any).shipping_address_line2 || null,
            city: (order as any).shipping_city || '',
            state: (order as any).shipping_state || '',
            zip_code: (order as any).shipping_zip_code || ''
          });
        } else {
          setUserAddress(null);
        }
      }
    } catch (error) {
      // Error handled silently
    }
    setShowOrderDetails(true);
  };

  const handleUpdateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      // If cancelling, use the cancellation API
      if (newStatus === 'cancelled') {
        if (!confirm('Are you sure you want to cancel this order?')) {
          return;
        }

        const response = await fetch('/api/orders/cancel', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            order_id: orderId,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to cancel order');
        }

        setOrders(orders.map(o => o.id === orderId ? { ...o, status: 'cancelled' } : o));
        if (selectedOrder && selectedOrder.id === orderId) {
          setSelectedOrder({ ...selectedOrder, status: 'cancelled' });
        }

        alert('Order cancelled successfully!');
      } else {
        // For other status updates, update directly
        const { error } = await supabase
          .from('orders')
          .update({ status: newStatus, updated_at: new Date().toISOString() })
          .eq('id', orderId);
        
        if (error) throw error;
        
        setOrders(orders.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
        if (selectedOrder && selectedOrder.id === orderId) {
          setSelectedOrder({ ...selectedOrder, status: newStatus });
        }
        
        alert('Order status updated successfully!');
      }
    } catch (error: any) {
      alert('Failed to update order status: ' + (error.message || 'Unknown error'));
    }
  };

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
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Orders Management</h1>
          <p className="text-gray-600">View and manage all orders</p>
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
          
          <div className="space-y-4">
            {ordersLoading ? (
              <div className="text-center py-12">
                <p className="text-gray-600">Loading orders...</p>
              </div>
            ) : (() => {
              const filteredOrders = orders.filter(order => !orderSearch || order.order_number?.toLowerCase().includes(orderSearch.toLowerCase()));

              if (filteredOrders.length === 0) {
                return <div className="text-center py-12"><p className="text-gray-600">No orders found</p></div>;
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
                              onError={(e) => (e.target as HTMLImageElement).src = '/placeholder-product.jpg'} 
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
                          <span className="font-semibold w-24 text-right">{formatCurrency(order.total_amount)}</span>
                        </div>
                      </div>
                    </div>
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

                <div className="grid grid-cols-2 gap-4">
                  <div><p className="text-gray-600 text-sm">Date</p><p className="font-medium">{formatDate(selectedOrder.created_at)}</p></div>
                  <div><p className="text-gray-600 text-sm">Payment Method</p><p className="font-medium capitalize">{selectedOrder.payment_method === 'cod' ? 'Cash on Delivery' : selectedOrder.payment_method}</p></div>
                  <div><p className="text-gray-600 text-sm">Total Amount</p><p className="font-bold text-lg text-blue-600">{formatCurrency(selectedOrder.total_amount)}</p></div>
                  <div><p className="text-gray-600 text-sm">Status</p><select value={selectedOrder.status} onChange={(e) => handleUpdateOrderStatus(selectedOrder.id, e.target.value)} className="mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"><option value="pending">Pending</option><option value="processing">Processing</option><option value="shipped">Shipped</option><option value="delivered">Delivered</option><option value="cancelled">Cancelled</option></select></div>
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

                <div>
                  <h3 className="font-semibold mb-4">Order Items</h3>
                  {orderItems.length === 0 ? <p className="text-gray-600">No items found</p> : (
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
