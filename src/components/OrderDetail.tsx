'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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
  shippingAddress?: {
    address_line1: string;
    address_line2?: string | null;
    city: string;
    state: string;
    zip_code: string;
    full_name?: string | null;
    phone?: number | null;
  } | null;
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
  shippingAddress,
  onOrderUpdate
}: OrderDetailProps) {
  const router = useRouter();
  const supabase = createClient();
  const [showCancelItemModal, setShowCancelItemModal] = useState(false);
  const [currentOrder, setCurrentOrder] = useState<OrderDetailData>(order);
  const [selectedItem, setSelectedItem] = useState<OrderDetailItem | null>(null);
  const [cancellingItemId, setCancellingItemId] = useState<string | null>(null);

  // Update local order state when prop changes
  useEffect(() => {
    setCurrentOrder(order);
  }, [order]);


  const handleCancelItem = (item: OrderDetailItem) => {
    setSelectedItem(item);
    setShowCancelItemModal(true);
  };

  const confirmCancelItem = async () => {
    if (!selectedItem) {
      return;
    }

    const remainingQuantity = selectedItem.quantity - (selectedItem.cancelled_quantity || 0);

    if (remainingQuantity <= 0) {
      alert('This item is already fully cancelled');
      return;
    }

    setCancellingItemId(selectedItem.id);
    try {
      const response = await fetch('/api/orders/cancel-item', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_item_id: selectedItem.id,
          cancelled_quantity: 1,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to cancel item');
      }

      // Wait a moment to ensure database update is complete
      await new Promise(resolve => setTimeout(resolve, 200));

      // Refresh order data to get updated totals
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .select('*')
        .eq('id', currentOrder.id)
        .single();

      if (orderError) throw orderError;

      // Fetch updated order items - ensure we get fresh data
      const { data: itemsData, error: itemsError } = await supabase
        .from('order_items')
        .select(`
          *,
          products:product_id (
            name,
            image_url
          )
        `)
        .eq('order_id', currentOrder.id)
        .order('created_at', { ascending: true }); // Consistent ordering

      if (itemsError) throw itemsError;

      // Process items with product data
      const updatedItems = (itemsData || []).map((item: any) => {
        const product = item.products || {};
        const cancelledQty = item.cancelled_quantity || 0;
        const activeQty = item.quantity - cancelledQty;
        
        return {
          id: item.id,
          product_id: item.product_id,
          product_name: product.name || 'Product not found',
          product_image: product.image_url || null,
          product_price: item.product_price,
          quantity: item.quantity,
          total_price: item.product_price * activeQty,
          size: item.size,
          is_cancelled: activeQty === 0,
          cancelled_quantity: cancelledQty,
        };
      });

      // Update local state
      const updatedOrder = {
        ...currentOrder,
        ...orderData,
        items: updatedItems,
        status: data.order.status,
        subtotal: data.order.subtotal,
        total_amount: data.order.total_amount,
      };
      
      setCurrentOrder(updatedOrder);
      
      // Notify parent component if callback provided
      if (onOrderUpdate) {
        onOrderUpdate(updatedOrder);
      }

      setShowCancelItemModal(false);
      setSelectedItem(null);
      
      alert('Item cancelled successfully!');
      setTimeout(() => {
        router.push('/orders');
      }, 500); // Small delay to show the alert
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
    <div className="space-y-0">
      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-0">
        {/* Left Column: Order ID, Shipping Info, Order Items */}
        <div className="lg:col-span-2 lg:pr-8 lg:border-r lg:border-gray-200">
          {/* Order Header */}
          <div className="px-3 sm:px-4 py-2 sm:py-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h2 className="text-base sm:text-xl lg:text-2xl font-semibold text-gray-900 mb-1">
                  Order #{currentOrder.order_number}
                </h2>
                <p className="text-xs sm:text-sm text-gray-600">{formatDate(currentOrder.created_at)}</p>
              </div>
              <span className={`px-3 py-1.5 rounded-full text-xs sm:text-sm font-medium inline-block ${getStatusColor(currentOrder.status)}`}>
                {currentOrder.status.charAt(0).toUpperCase() + currentOrder.status.slice(1)}
              </span>
            </div>
          </div>

          {/* Separator */}
          <div className="px-3 sm:px-4 py-2 sm:py-6">
            <div className="border-t border-gray-200"></div>
          </div>

          {/* Shipping Information */}
          {showCustomerInfo && (customerName || customerPhone || shippingAddress) && (
            <>
              <div className="px-3 sm:px-4 py-2 sm:py-4">
                <h3 className="text-sm sm:text-base lg:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">Shipping Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {customerName && (
                    <div>
                      <p className="text-gray-600 text-xs sm:text-sm mb-1">Name</p>
                      <p className="font-medium text-gray-900 text-sm sm:text-base">{customerName}</p>
                    </div>
                  )}
                  {customerPhone && (
                    <div>
                      <p className="text-gray-600 text-xs sm:text-sm mb-1">Phone</p>
                      <p className="font-medium text-gray-900 text-sm sm:text-base">{customerPhone}</p>
                    </div>
                  )}
                  {shippingAddress && (
                    <div className="md:col-span-2">
                      <p className="text-gray-600 text-xs sm:text-sm mb-1">Shipping Address</p>
                      <div className="font-medium text-gray-900 text-xs sm:text-sm">
                        <p>{shippingAddress.address_line1 || ''}</p>
                        {shippingAddress.address_line2 && <p>{shippingAddress.address_line2}</p>}
                        <p>{shippingAddress.city || ''}, {shippingAddress.state || ''} {shippingAddress.zip_code || ''}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Separator */}
              <div className="px-3 sm:px-4 py-2 sm:py-6">
                <div className="border-t border-gray-200"></div>
              </div>
            </>
          )}

          {/* Order Items */}
          <div className="px-3 sm:px-4 py-2 sm:py-4">
            <h3 className="text-sm sm:text-base lg:text-lg font-semibold text-gray-900 mb-1">Order Items</h3>
            <p className="text-xs text-gray-600 mb-3 sm:mb-4">{currentOrder.items.length} item(s) in this order</p>

            {currentOrder.items.length === 0 ? (
              <div className="py-6">
                <EmptyState
                  title="No items found"
                  variant="minimal"
                />
              </div>
            ) : (
              <div className="space-y-0">
                {currentOrder.items.map((item, index) => (
                  <div key={item.id}>
                    {index > 0 && (
                      <div className="my-4 sm:my-6">
                        <div className="border-t border-gray-200"></div>
                      </div>
                    )}
                    <div className="flex items-stretch gap-3 sm:gap-4">
                      <div className="flex-shrink-0 w-20 h-20 sm:w-28 sm:h-28 aspect-square">
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
                            <svg className="w-8 h-8 sm:w-10 sm:h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0 flex flex-col justify-between relative h-20 sm:h-28">
                        <div className="pr-6">
                          <h4 className="text-xs sm:text-base font-medium text-gray-900 line-clamp-2">
                            {item.product_name}
                          </h4>
                          <div className="mt-1 space-y-0.5">
                            <p className="text-xs text-gray-500">
                              Price: {formatCurrency(item.product_price)}
                            </p>
                            {item.size && (
                              <p className="text-xs text-gray-500">
                                Size: {item.size}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center justify-between mt-2 sm:mt-3">
                          <div className="flex items-center gap-2 sm:gap-3">
                            <div className="text-xs text-gray-600">
                              Qty: {item.quantity}
                              {(item.cancelled_quantity || 0) > 0 && (
                                <span className="ml-1.5 text-red-600">
                                  ({item.cancelled_quantity} cancelled)
                                </span>
                              )}
                            </div>
                            {item.is_cancelled && (
                              <span className="px-1.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                Cancelled
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 sm:gap-3">
                            <span className="text-xs sm:text-base font-semibold text-gray-900">
                              {formatCurrency(item.total_price)}
                            </span>
                            {canCancelItem(item) && (
                              <Button
                                variant="danger"
                                size="sm"
                                onClick={() => handleCancelItem(item)}
                                className="text-xs px-2 py-1"
                              >
                                Cancel
                              </Button>
                            )}
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

        {/* Right Column: Payment Summary */}
        <div className="lg:col-span-1">
          <div className="lg:sticky lg:top-4">
            <div className="px-3 sm:px-4 py-2 sm:py-4">
              <h3 className="text-sm sm:text-base lg:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">Payment Summary</h3>
              <div className="space-y-3 sm:space-y-4">
                <div className="space-y-3 pb-3 border-b border-gray-200">
                  <div>
                    <p className="text-gray-600 text-xs sm:text-sm mb-1">Order Date</p>
                    <p className="text-sm sm:text-base font-medium text-gray-900">{formatDate(currentOrder.created_at)}</p>
                  </div>
                  <div>
                    <p className="text-gray-600 text-xs sm:text-sm mb-1">Payment Method</p>
                    <p className="text-sm sm:text-base font-medium text-gray-900 capitalize">
                      {currentOrder.payment_method === 'cod' ? 'Cash on Delivery' : currentOrder.payment_method}
                    </p>
                  </div>
                  {currentOrder.payment_status && (
                    <div>
                      <p className="text-gray-600 text-xs sm:text-sm mb-1">Payment Status</p>
                      <p className="text-sm sm:text-base font-medium text-gray-900 capitalize">{currentOrder.payment_status}</p>
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between text-xs sm:text-sm">
                    <span className="text-gray-600">Subtotal</span>
                    <span className="font-medium">{formatCurrency(getSubtotal())}</span>
                  </div>
                  <div className="flex justify-between text-xs sm:text-sm">
                    <span className="text-gray-600">Shipping</span>
                    <span className="font-medium">
                      {getShipping() === 0 ? 'Free' : formatCurrency(getShipping())}
                    </span>
                  </div>
                  <div className="border-t border-gray-200 pt-3 sm:pt-4">
                    <div className="flex justify-between text-sm sm:text-base">
                      <span className="font-medium text-gray-900">Total</span>
                      <span className="font-bold text-blue-600">
                        {formatCurrency(currentOrder.total_amount)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Cancel Item Modal */}
      {showCancelItemModal && selectedItem && (
        <Modal
          isOpen={showCancelItemModal}
          onClose={() => {
            setShowCancelItemModal(false);
            setSelectedItem(null);
          }}
          title={`Cancel Item from Order #${currentOrder.order_number}`}
          variant="simple"
          size="lg"
        >
          <div className="space-y-4">
            <div className="flex items-start gap-4">
              {selectedItem.product_image && (
                <div className="flex-shrink-0 w-20 h-20 sm:w-24 sm:h-24">
                  <ImageWithFallback
                    src={selectedItem.product_image}
                    alt={selectedItem.product_name}
                    className="w-full h-full rounded object-cover"
                    fallbackType="product"
                    loading="lazy"
                    decoding="async"
                    width={96}
                    height={96}
                    responsive={true}
                    responsiveSizes={[96, 128]}
                    quality={85}
                  />
                </div>
              )}
              <div className="flex-1">
                <p className="text-sm text-gray-600 mb-1">Product</p>
                <p className="text-sm font-medium text-gray-900">{selectedItem.product_name}</p>
              </div>
            </div>
            
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <p className="text-sm text-yellow-800">
                Only 1 item will be cancelled. You can cancel remaining items separately if needed.
              </p>
            </div>
            
            <div className="flex gap-3 mt-6">
              <Button
                variant="secondary"
                fullWidth
                onClick={() => {
                  setShowCancelItemModal(false);
                  setSelectedItem(null);
                }}
                disabled={cancellingItemId === selectedItem.id}
              >
                Keep Item
              </Button>
              <Button
                variant="danger"
                fullWidth
                onClick={confirmCancelItem}
                disabled={cancellingItemId === selectedItem.id}
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

