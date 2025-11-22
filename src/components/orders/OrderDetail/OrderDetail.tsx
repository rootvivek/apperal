'use client';

import { Spinner } from '@/components/ui/spinner';
import EmptyState from '@/components/EmptyState';
import { mobileTypography } from '@/utils/mobileTypography';
import { useOrderDetail } from './useOrderDetail';
import OrderItem from './OrderItem';
import CancelItemModal from './CancelItemModal';
import ReturnRequestModal from './ReturnRequestModal';
import OrderSummary from './OrderSummary';
export interface OrderReturn {
  id: string;
  order_id: string;
  order_item_id: string;
  user_id: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected' | 'refunded' | 'cancelled';
  requested_quantity: number;
  approved_quantity: number | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

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
  return_requests?: OrderReturn[];
  returned_quantity?: number;
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
  const {
    currentOrder,
    cancelModal,
    returnModal,
    canCancelItem,
    canReturnItem,
    getReturnStatus,
    handleCancelItem,
    handleRequestReturn,
    closeCancelModal,
    closeReturnModal,
    updateReturnModal,
    confirmCancelItem,
    submitReturnRequest,
  } = useOrderDetail({ order, onOrderUpdate });

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <Spinner className="size-12 text-blue-600 mx-auto" />
            <p className="mt-4 text-gray-600">Loading order details...</p>
          </div>
        </div>
      </div>
    );
  }

  const getSubtotal = () => {
    return currentOrder.items.reduce((total, item) => total + item.total_price, 0);
  };

  const getShipping = () => {
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
                <p className={`${mobileTypography.body12} sm:text-sm text-gray-600`}>{formatDate(currentOrder.created_at)}</p>
              </div>
              <span className={`px-3 py-1.5 rounded-full ${mobileTypography.body12Medium} sm:text-sm inline-block ${getStatusColor(currentOrder.status)}`}>
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
                <h3 className={`${mobileTypography.title14Bold} sm:text-base lg:text-lg text-gray-900 mb-3 sm:mb-4`}>Shipping Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {customerName && (
                    <div>
                      <p className={`text-gray-600 ${mobileTypography.body12} sm:text-sm mb-1`}>Name</p>
                      <p className={`font-medium text-gray-900 ${mobileTypography.title14} sm:text-base`}>{customerName}</p>
                    </div>
                  )}
                  {customerPhone && (
                    <div>
                      <p className={`text-gray-600 ${mobileTypography.body12} sm:text-sm mb-1`}>Phone</p>
                      <p className={`font-medium text-gray-900 ${mobileTypography.title14} sm:text-base`}>{customerPhone}</p>
                    </div>
                  )}
                  {shippingAddress && (
                    <div className="md:col-span-2">
                      <p className={`text-gray-600 ${mobileTypography.body12} sm:text-sm mb-1`}>Shipping Address</p>
                      <div className={`font-medium text-gray-900 ${mobileTypography.body12} sm:text-sm`}>
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
                    <OrderItem
                      item={item}
                      canCancel={canCancelItem(item)}
                      canReturn={canReturnItem(item)}
                      returnStatus={getReturnStatus(item)}
                      onCancel={handleCancelItem}
                      onRequestReturn={handleRequestReturn}
                      formatCurrency={formatCurrency}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Payment Summary */}
        <div className="lg:col-span-1">
          <div className="lg:sticky lg:top-4">
            <OrderSummary
              orderDate={currentOrder.created_at}
              paymentMethod={currentOrder.payment_method}
              paymentStatus={currentOrder.payment_status}
              subtotal={getSubtotal()}
              shipping={getShipping()}
              total={currentOrder.total_amount}
              formatDate={formatDate}
              formatCurrency={formatCurrency}
            />
          </div>
        </div>
      </div>

      {/* Cancel Item Modal */}
      <CancelItemModal
        isOpen={cancelModal.modalOpen}
        selectedItem={cancelModal.selectedItem}
        orderNumber={currentOrder.order_number}
        loading={cancelModal.isCancelling}
        onConfirm={confirmCancelItem}
        onClose={closeCancelModal}
      />

      {/* Return Request Modal */}
      {returnModal.selectedItem && (() => {
        const remainingQuantity = returnModal.selectedItem!.quantity - (returnModal.selectedItem!.cancelled_quantity || 0);
        const returnStatus = getReturnStatus(returnModal.selectedItem);
        const availableForReturn = remainingQuantity - returnStatus.returnedQuantity;
        
        return (
          <ReturnRequestModal
            isOpen={returnModal.modalOpen}
            selectedItem={returnModal.selectedItem}
            quantity={returnModal.quantity}
            reason={returnModal.reason}
            maxQuantity={availableForReturn}
            loading={returnModal.isSubmitting}
            onQuantityChange={(qty) => updateReturnModal({ quantity: qty })}
            onReasonChange={(reason) => updateReturnModal({ reason })}
            onConfirm={submitReturnRequest}
            onClose={closeReturnModal}
          />
        );
      })()}
    </div>
  );
}

