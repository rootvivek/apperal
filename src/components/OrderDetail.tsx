'use client';

import { useState, useEffect } from 'react';
import ImageWithFallback from './ImageWithFallback';
import EmptyState from './EmptyState';
import LoadingLogo from './LoadingLogo';
import Modal from './Modal';
import Button from './Button';
import { createClient } from '@/lib/supabase/client';

export interface OrderDetailItem {
  id: string;
  product_id: string;
  product_name: string;
  product_image?: string;
  product_price: number;
  quantity: number;
  total_price: number;
  size?: string | null;
  is_cancelled?: boolean;
  cancelled_quantity?: number;
}

export interface OrderDetailData {
  id: string;
  order_number: string;
  status: string;
  payment_method: string;
  payment_status?: string;
  total_amount: number;
  created_at: string;
  items: OrderDetailItem[];
}

interface OrderDetailProps {
  order: OrderDetailData;
  loading?: boolean;
  showCustomerInfo?: boolean;
  customerName?: string;
  customerPhone?: string;
  onOrderUpdate?: (updatedOrder: OrderDetailData) => void;
}

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
    case 'paid':
      return 'bg-green-100 text-green-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

export default function OrderDetail({ 
  order, 
  loading = false,
  showCustomerInfo = false,
  customerName,
  customerPhone,
  onOrderUpdate
}: OrderDetailProps) {
  const supabase = createClient();
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showCancelItemModal, setShowCancelItemModal] = useState(false);
  const [cancellationReason, setCancellationReason] = useState('');
  const [isCancelling, setIsCancelling] = useState(false);
  const [currentOrder, setCurrentOrder] = useState<OrderDetailData>(order);
  const [selectedItem, setSelectedItem] = useState<OrderDetailItem | null>(null);
  const [cancellingItemId, setCancellingItemId] = useState<string | null>(null);

  // Update local order state when prop changes
  useEffect(() => {
    setCurrentOrder(order);
  }, [order]);

  const canCancelOrder = () => {
    // Can cancel until order is delivered or already cancelled
    const nonCancelableStatuses = ['delivered', 'cancelled'];
    return !nonCancelableStatuses.includes(currentOrder.status);
  };

  const handleCancelOrder = async () => {
    if (!cancellationReason.trim()) {
      alert('Please provide a reason for cancellation');
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
        .eq('id', currentOrder.id);

      if (error) throw error;

      // Update local state
      const updatedOrder = {
        ...currentOrder,
        status: 'cancelled'
      };
      setCurrentOrder(updatedOrder);
      
      // Notify parent component if callback provided
      if (onOrderUpdate) {
        onOrderUpdate(updatedOrder);
      }

      setShowCancelModal(false);
      setCancellationReason('');
      alert('Order cancelled successfully!');
    } catch (error: any) {
      alert('Failed to cancel order: ' + (error.message || 'Unknown error'));
    } finally {
      setIsCancelling(false);
    }
  };

  const handleCancelItem = (item: OrderDetailItem) => {
    setSelectedItem(item);
    setShowCancelItemModal(true);
  };

  const confirmCancelItem = async () => {
    if (!selectedItem || !cancellationReason.trim()) {
      alert('Please provide a reason for cancellation');
      return;
    }

    setCancellingItemId(selectedItem.id);
    try {
      // Fetch the current order_item to get its quantity
      const { data: orderItem, error: fetchError } = await supabase
        .from('order_items')
        .select('quantity, cancelled_quantity')
        .eq('id', selectedItem.id)
        .single();

      if (fetchError) {
        throw new Error('Failed to fetch order item details');
      }

      const currentQuantity = orderItem.quantity || 1;
      const cancelledQuantity = (orderItem.cancelled_quantity || 0) + 1;
      const remainingQuantity = currentQuantity - cancelledQuantity;

      // Try to update cancelled_quantity first
      const { error: updateError } = await supabase
        .from('order_items')
        .update({
          cancelled_quantity: cancelledQuantity,
          cancellation_reason: cancellationReason.trim(),
          cancelled_at: new Date().toISOString()
        })
        .eq('id', selectedItem.id);

      if (updateError) {
        // If cancelled_quantity column doesn't exist, decrease quantity instead
        if (remainingQuantity > 0) {
          const { error: quantityError } = await supabase
            .from('order_items')
            .update({
              quantity: remainingQuantity
            })
            .eq('id', selectedItem.id);
          
          if (quantityError) {
            console.warn('Could not update order_item quantity:', quantityError);
          }
        } else {
          // All items cancelled, mark the order_item as cancelled
          const { error: cancelError } = await supabase
            .from('order_items')
            .update({
              is_cancelled: true,
              cancellation_reason: cancellationReason.trim(),
              cancelled_at: new Date().toISOString()
            })
            .eq('id', selectedItem.id);
          
          if (cancelError) {
            console.warn('Could not mark order_item as cancelled:', cancelError);
          }
        }
      }

      // Update local state
      setCurrentOrder(prevOrder => {
        const updatedItems = prevOrder.items.map(item =>
          item.id === selectedItem.id
            ? { ...item, is_cancelled: true, cancelled_quantity: cancelledQuantity }
            : item
        );

        // Check if all items are cancelled
        const activeItems = updatedItems.filter(item => !item.is_cancelled);
        
        // If all items are cancelled, update order status
        if (activeItems.length === 0 && updatedItems.length > 0) {
          supabase
            .from('orders')
            .update({
              status: 'cancelled',
              cancellation_reason: cancellationReason.trim(),
              cancelled_by: 'customer',
              cancelled_at: new Date().toISOString()
            })
            .eq('id', currentOrder.id)
            .then(({ error }) => {
              if (!error) {
                const updatedOrder = {
                  ...prevOrder,
                  items: updatedItems.map(item => ({ ...item, is_cancelled: true })),
                  status: 'cancelled'
                };
                setCurrentOrder(updatedOrder);
                if (onOrderUpdate) {
                  onOrderUpdate(updatedOrder);
                }
              }
            });
        }

        return {
          ...prevOrder,
          items: updatedItems
        };
      });

      setShowCancelItemModal(false);
      setSelectedItem(null);
      setCancellationReason('');
      alert('Item cancelled successfully!');
    } catch (error: any) {
      alert('Failed to cancel item: ' + (error.message || 'Unknown error'));
    } finally {
      setCancellingItemId(null);
    }
  };

  const canCancelItem = (item: OrderDetailItem) => {
    // Can cancel if item is not cancelled and order is not delivered/cancelled
    return !item.is_cancelled && currentOrder.status !== 'delivered' && currentOrder.status !== 'cancelled';
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <LoadingLogo text="Loading order details..." />
      </div>
    );
  }

  const getSubtotal = () => {
    return currentOrder.items.reduce((total, item) => total + item.total_price, 0);
  };

  const getShipping = () => {
    // Calculate shipping if needed, for now assume it's included in total_amount
    const subtotal = getSubtotal();
    return currentOrder.total_amount - subtotal;
  };

  return (
    <div className="space-y-6">
      {/* Order Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-1">
              Order #{currentOrder.order_number}
            </h2>
            <p className="text-sm text-gray-600">{formatDate(currentOrder.created_at)}</p>
          </div>
          <span className={`px-4 py-2 rounded-full text-sm font-medium inline-block ${getStatusColor(currentOrder.status)}`}>
            {currentOrder.status.charAt(0).toUpperCase() + currentOrder.status.slice(1)}
          </span>
        </div>
      </div>

      {/* Customer Information */}
      {showCustomerInfo && (customerName || customerPhone) && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
          <h3 className="font-semibold text-lg text-gray-900 mb-4">Customer Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {customerName && (
              <div>
                <p className="text-gray-600 text-sm mb-1">Name</p>
                <p className="font-medium text-gray-900">{customerName}</p>
              </div>
            )}
            {customerPhone && (
              <div>
                <p className="text-gray-600 text-sm mb-1">Phone</p>
                <p className="font-medium text-gray-900">{customerPhone}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-8">
        {/* First Column: Product Details */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            {/* Heading */}
            <div className="px-3 sm:px-6 py-3 sm:py-4 border-b border-gray-200">
              <h3 className="text-base sm:text-lg font-medium text-gray-900">Order Items</h3>
              <p className="mt-1 text-sm text-gray-600">{currentOrder.items.length} item(s) in this order</p>
            </div>

            {/* Order Items */}
            {currentOrder.items.length === 0 ? (
              <div className="p-6">
                <EmptyState
                  title="No items found"
                  variant="minimal"
                />
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {currentOrder.items.map((item) => (
                  <div key={item.id} className="px-0 py-3 sm:py-6">
                    <div className="flex items-stretch gap-3 sm:gap-4 px-3 sm:px-6">
                      {/* Product Image */}
                      <div className="flex-shrink-0 w-28 h-28 sm:w-32 sm:h-32 aspect-square">
                        {item.product_image ? (
                          <ImageWithFallback
                            src={item.product_image}
                            alt={item.product_name}
                            className="w-full h-full rounded object-cover"
                            fallbackType="product"
                            loading="lazy"
                            decoding="async"
                            width={256}
                            height={256}
                            responsive={true}
                            responsiveSizes={[128, 256]}
                            quality={85}
                          />
                        ) : (
                          <div className="w-full h-full bg-gray-100 rounded flex items-center justify-center">
                            <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          </div>
                        )}
                      </div>

                      {/* Product Data */}
                      <div className="flex-1 min-w-0 flex flex-col justify-between relative h-28 sm:h-32">
                        <div className="pr-6">
                          <h4 className="text-sm sm:text-lg font-medium text-gray-900 line-clamp-2">
                            {item.product_name}
                          </h4>
                          <div className="mt-1 space-y-1">
                            <p className="text-xs sm:text-sm text-gray-500">
                              Price: {formatCurrency(item.product_price)}
                            </p>
                            {item.size && (
                              <p className="text-xs sm:text-sm text-gray-500">
                                Size: {item.size}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Quantity and Price - Bottom */}
                        <div className="flex items-center justify-between mt-3 sm:mt-4">
                          <div className="flex items-center gap-3">
                            <div className="text-xs sm:text-sm text-gray-600">
                              Quantity: {item.quantity}
                            </div>
                            {item.is_cancelled && (
                              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                Cancelled
                              </span>
                            )}
                          </div>
                          <div>
                            <span className="text-sm sm:text-lg font-semibold text-gray-900">
                              {formatCurrency(item.total_price)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Second Column: Price Summary */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 sticky top-4">
            <div className="px-3 sm:px-6 py-3 sm:py-4 border-b border-gray-200">
              <h3 className="text-base sm:text-lg font-medium text-gray-900">Order Summary</h3>
            </div>
            <div className="px-3 sm:px-6 py-3 sm:py-4 space-y-3 sm:space-y-4">
              {/* Order Info */}
              <div className="space-y-3 pb-3 border-b border-gray-200">
                <div>
                  <p className="text-xs sm:text-sm text-gray-600 mb-1">Order Date</p>
                  <p className="text-sm sm:text-base font-medium text-gray-900">{formatDate(currentOrder.created_at)}</p>
                </div>
                <div>
                  <p className="text-xs sm:text-sm text-gray-600 mb-1">Payment Method</p>
                  <p className="text-sm sm:text-base font-medium text-gray-900 capitalize">
                    {currentOrder.payment_method === 'cod' ? 'Cash on Delivery' : currentOrder.payment_method}
                  </p>
                </div>
                {currentOrder.payment_status && (
                  <div>
                    <p className="text-xs sm:text-sm text-gray-600 mb-1">Payment Status</p>
                    <p className="text-sm sm:text-base font-medium text-gray-900 capitalize">{currentOrder.payment_status}</p>
                  </div>
                )}
              </div>

              {/* Price Breakdown */}
              <div className="space-y-3">
                <div className="flex justify-between text-sm sm:text-base">
                  <span className="text-gray-600">Subtotal</span>
                  <span className="font-medium">{formatCurrency(getSubtotal())}</span>
                </div>
                <div className="flex justify-between text-sm sm:text-base">
                  <span className="text-gray-600">Shipping</span>
                  <span className="font-medium">
                    {getShipping() === 0 ? 'Free' : formatCurrency(getShipping())}
                  </span>
                </div>
                <div className="border-t border-gray-200 pt-3 sm:pt-4">
                  <div className="flex justify-between text-base sm:text-lg">
                    <span className="font-medium text-gray-900">Total</span>
                    <span className="font-bold text-blue-600">
                      {formatCurrency(currentOrder.total_amount)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Cancel Item Buttons */}
              {currentOrder.items.filter(item => canCancelItem(item)).length > 0 && (
                <div className="pt-3 sm:pt-4 border-t border-gray-200 space-y-2">
                  <p className="text-sm sm:text-base text-gray-600 mb-3">Cancel Items:</p>
                  {currentOrder.items
                    .filter(item => canCancelItem(item))
                    .map((item) => (
                      <Button
                        key={item.id}
                        variant="danger"
                        fullWidth
                        onClick={() => handleCancelItem(item)}
                        className="text-sm sm:text-base py-2.5"
                      >
                        Cancel: {item.product_name.length > 30 
                          ? `${item.product_name.substring(0, 30)}...` 
                          : item.product_name}
                      </Button>
                    ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Cancellation Modal */}
      {showCancelModal && (
        <Modal
          isOpen={showCancelModal}
          onClose={() => {
            setShowCancelModal(false);
            setCancellationReason('');
          }}
          title={`Cancel Order #${currentOrder.order_number}`}
          variant="simple"
          size="lg"
        >
          <div className="space-y-4">
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
            
            <div className="flex gap-3 mt-6">
              <Button
                variant="secondary"
                fullWidth
                onClick={() => {
                  setShowCancelModal(false);
                  setCancellationReason('');
                }}
                disabled={isCancelling}
              >
                Keep Order
              </Button>
              <Button
                variant="danger"
                fullWidth
                onClick={handleCancelOrder}
                disabled={isCancelling || !cancellationReason.trim()}
                loading={isCancelling}
              >
                Confirm Cancellation
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Cancel Item Modal */}
      {showCancelItemModal && selectedItem && (
        <Modal
          isOpen={showCancelItemModal}
          onClose={() => {
            setShowCancelItemModal(false);
            setSelectedItem(null);
            setCancellationReason('');
          }}
          title={`Cancel Item from Order #${currentOrder.order_number}`}
          variant="simple"
          size="lg"
        >
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-600 mb-2">
                Product: <span className="font-medium text-gray-900">{selectedItem.product_name}</span>
              </p>
            </div>
            <div>
              <label htmlFor="itemCancellationReason" className="block text-sm font-medium text-gray-700 mb-2">
                Reason for Cancellation <span className="text-red-500">*</span>
              </label>
              <textarea
                id="itemCancellationReason"
                value={cancellationReason}
                onChange={(e) => setCancellationReason(e.target.value)}
                placeholder="Please provide a reason for cancelling this item..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                rows={4}
              />
            </div>
            
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <p className="text-sm text-yellow-800">
                <strong>Note:</strong> Only this item will be cancelled. Other items in the order will remain active.
              </p>
            </div>
            
            <div className="flex gap-3 mt-6">
              <Button
                variant="secondary"
                fullWidth
                onClick={() => {
                  setShowCancelItemModal(false);
                  setSelectedItem(null);
                  setCancellationReason('');
                }}
                disabled={cancellingItemId === selectedItem.id}
              >
                Keep Item
              </Button>
              <Button
                variant="danger"
                fullWidth
                onClick={confirmCancelItem}
                disabled={cancellingItemId === selectedItem.id || !cancellationReason.trim()}
                loading={cancellingItemId === selectedItem.id}
              >
                Confirm Cancellation
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

