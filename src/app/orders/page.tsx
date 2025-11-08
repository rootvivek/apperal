'use client';

import { useState, useEffect } from 'react';
import AuthGuard from '@/components/AuthGuard';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface Order {
  id: string;
  order_number: string;
  user_id: string;
  total_amount: number;
  status: string;
  payment_method: string;
  created_at: string;
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

function OrdersContent() {
  const supabase = createClient();
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [showOrderDetails, setShowOrderDetails] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancellationReason, setCancellationReason] = useState('');
  const [isCancelling, setIsCancelling] = useState(false);

  useEffect(() => {
    if (user) {
      fetchOrders();
    }
  }, [user]);

  const fetchOrders = async () => {
    try {
      setOrdersLoading(true);
      const { data } = await supabase
        .from('orders')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });
      
      setOrders(data || []);
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
        .eq('order_id', order.id);
      
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
    } catch (error) {
      console.error('Error fetching order details:', error);
    }
    
    setShowOrderDetails(true);
  };

  const formatDate = (date: string) => {
    const d = new Date(date);
    return d.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCurrency = (value: number) => `₹${(value || 0).toFixed(2)}`;

  const canCancelOrder = (order: Order) => {
    // Can only cancel if order is pending or processing
    // Cannot cancel if order is delivered, shipped, or already cancelled
    const cancelableStatuses = ['pending', 'processing'];
    return cancelableStatuses.includes(order.status);
  };

  const handleCancelOrder = async () => {
    if (!selectedOrder || !cancellationReason.trim()) {
      alert('Please provide a reason for cancellation');
      return;
    }

    if (!canCancelOrder(selectedOrder)) {
      alert('This order cannot be cancelled. Only pending or processing orders can be cancelled.');
      return;
    }

    setIsCancelling(true);
    try {
      const { error } = await supabase
        .from('orders')
        .update({
          status: 'cancelled',
          cancellation_reason: cancellationReason.trim(),
          cancelled_by: 'customer',
          cancelled_at: new Date().toISOString()
        })
        .eq('id', selectedOrder.id);

      if (error) throw error;

      // Update local state
      setOrders(orders.map(o => 
        o.id === selectedOrder.id 
          ? { ...o, status: 'cancelled' as any } 
          : o
      ));
      
      setSelectedOrder({ ...selectedOrder, status: 'cancelled' as any });
      setShowCancelModal(false);
      setCancellationReason('');
      alert('Order cancelled successfully!');
    } catch (error: any) {
      console.error('Error cancelling order:', error);
      alert('Failed to cancel order: ' + (error.message || 'Unknown error'));
    } finally {
      setIsCancelling(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'delivered':
        return 'bg-green-100 text-green-800';
      case 'shipped':
        return 'bg-blue-100 text-blue-800';
      case 'processing':
        return 'bg-yellow-100 text-yellow-800';
      case 'pending':
        return 'bg-orange-100 text-orange-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (ordersLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your orders...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-[1450px] mx-auto w-full px-2 sm:px-4 md:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">My Orders</h1>
          <p className="text-gray-600">
            {orders.length === 0 
              ? "You haven't placed any orders yet." 
              : `You have ${orders.length} order${orders.length === 1 ? '' : 's'}.`
            }
          </p>
        </div>

        {orders.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
            <svg className="w-24 h-24 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No orders yet</h3>
            <p className="text-gray-500 mb-6">Start shopping to see your orders here.</p>
            <a 
              href="/products" 
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 transition-colors"
            >
              Browse Products
            </a>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <div 
                key={order.id} 
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => handleOrderClick(order)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4 flex-1">
                    <div className="flex-shrink-0">
                      <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center">
                        <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                        </svg>
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-1">
                        <h3 className="text-lg font-semibold text-gray-900">
                          Order #{order.order_number}
                        </h3>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                          {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 font-medium">{formatDate(order.created_at)}</p>
                      <p className="text-sm text-gray-600 mt-1">
                        {order.payment_method === 'cod' ? 'Cash on Delivery' : order.payment_method.charAt(0).toUpperCase() + order.payment_method.slice(1)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-blue-600">{formatCurrency(order.total_amount)}</p>
                    <p className="text-xs text-gray-500 mt-1">Total</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Order Details Modal */}
      {showOrderDetails && selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg w-full max-h-[90vh] flex flex-col max-w-full sm:max-w-lg md:max-w-2xl lg:max-w-3xl">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center flex-shrink-0">
              <div>
                <h2 className="text-xl font-bold">Order #{selectedOrder.order_number}</h2>
                <p className="text-sm text-gray-600">{formatDate(selectedOrder.created_at)}</p>
              </div>
              <button 
                onClick={() => setShowOrderDetails(false)} 
                className="text-2xl text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            
            <div className="p-6 space-y-6 overflow-y-auto flex-1">
              {/* Order Summary */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-gray-600 text-sm mb-1">Order Status</p>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium inline-block ${getStatusColor(selectedOrder.status)}`}>
                      {selectedOrder.status.charAt(0).toUpperCase() + selectedOrder.status.slice(1)}
                    </span>
                  </div>
                  <div>
                    <p className="text-gray-600 text-sm mb-1">Payment Method</p>
                    <p className="font-medium capitalize">
                      {selectedOrder.payment_method === 'cod' ? 'Cash on Delivery' : selectedOrder.payment_method}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600 text-sm mb-1">Order Date</p>
                    <p className="font-medium">{formatDate(selectedOrder.created_at)}</p>
                  </div>
                  <div>
                    <p className="text-gray-600 text-sm mb-1">Total Amount</p>
                    <p className="font-bold text-lg text-blue-600">{formatCurrency(selectedOrder.total_amount)}</p>
                  </div>
                </div>
              </div>

              {/* Order Items */}
              <div>
                <h3 className="font-semibold mb-4 text-gray-900">Order Items</h3>
                {orderItems.length === 0 ? (
                  <p className="text-gray-600">No items found</p>
                ) : (
                  <div className="space-y-3">
                    {orderItems.map((item) => (
                      <div key={item.id} className="border border-gray-200 rounded-lg p-4">
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
                            <div className="w-20 h-20 bg-gray-100 rounded-lg flex items-center justify-center">
                              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                            </div>
                          )}
                          <div className="flex-1">
                            <h4 className="font-medium text-gray-900">{item.product_name}</h4>
                            <p className="text-sm text-gray-600 mt-1">
                              ₹{item.product_price.toFixed(2)} × {item.quantity} item{item.quantity !== 1 ? 's' : ''}
                              <span className="ml-2">| Size: {item.size || 'Select Size'}</span>
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-gray-900">{formatCurrency(item.total_price)}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Order Total */}
              <div className="border-t border-gray-200 pt-4">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold text-gray-900">Order Total</span>
                  <span className="text-2xl font-bold text-blue-600">
                    {formatCurrency(selectedOrder.total_amount)}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="p-4 sm:p-6 border-t border-gray-200 bg-white flex-shrink-0">
              <div className="flex flex-col sm:flex-row gap-3">
                {canCancelOrder(selectedOrder) && (
                  <button
                    onClick={() => setShowCancelModal(true)}
                    className="w-full sm:flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm sm:text-base font-medium"
                  >
                    Cancel Order
                  </button>
                )}
                <button
                  onClick={() => setShowOrderDetails(false)}
                  className={`w-full ${canCancelOrder(selectedOrder) ? 'sm:flex-1' : ''} px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm sm:text-base font-medium`}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cancellation Modal */}
      {showCancelModal && selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-full sm:max-w-sm md:max-w-md lg:max-w-lg">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-bold text-gray-900">Cancel Order</h3>
              <p className="text-sm text-gray-600 mt-1">
                Order #{selectedOrder.order_number}
              </p>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label htmlFor="cancellationReason" className="block text-sm font-medium text-gray-700 mb-2">
                  Reason for Cancellation <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="cancellationReason"
                  value={cancellationReason}
                  onChange={(e) => setCancellationReason(e.target.value)}
                  placeholder="Please provide a reason for cancelling this order..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  rows={4}
                />
              </div>
              
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <p className="text-sm text-yellow-800">
                  <strong>Note:</strong> Once cancelled, this order cannot be restored. Are you sure you want to proceed?
                </p>
              </div>
            </div>
            
            <div className="p-6 border-t border-gray-200 flex gap-3">
              <button
                onClick={() => {
                  setShowCancelModal(false);
                  setCancellationReason('');
                }}
                disabled={isCancelling}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50"
              >
                Keep Order
              </button>
              <button
                onClick={handleCancelOrder}
                disabled={isCancelling || !cancellationReason.trim()}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {isCancelling ? 'Cancelling...' : 'Confirm Cancellation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function OrdersPage() {
  return (
    <AuthGuard>
      <OrdersContent />
    </AuthGuard>
  );
}

