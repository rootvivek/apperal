'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import EmptyState from '@/components/EmptyState';

interface OrderDetailsModalProps {
  open: boolean;
  onClose: () => void;
  order: any | null;
  orderItems: any[];
  userName: string;
  userPhone: string;
  userAddress: any;
  onUpdateStatus: (orderId: string, newStatus: string) => void;
  formatDate: (date: string) => string;
  formatCurrency: (value: number) => string;
}

export function OrderDetailsModal({
  open,
  onClose,
  order,
  orderItems,
  userName,
  userPhone,
  userAddress,
  onUpdateStatus,
  formatDate,
  formatCurrency,
}: OrderDetailsModalProps) {
  if (!order) return null;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Order #{order.order_number}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-2">
          {/* Customer Information */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-semibold mb-4 text-gray-900">
              Customer Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-gray-600 text-sm mb-1">Name</p>
                <p className="font-medium">{userName || 'N/A'}</p>
              </div>
              <div>
                <p className="text-gray-600 text-sm mb-1">Phone Number</p>
                <p className="font-medium">{userPhone || 'N/A'}</p>
              </div>
              <div className="md:col-span-2">
                <p className="text-gray-600 text-sm mb-1">Address</p>
                {userAddress ? (
                  <div className="font-medium text-sm space-y-0.5">
                    <p>{userAddress.address_line1 || ''}</p>
                    {userAddress.address_line2 && (
                      <p>{userAddress.address_line2}</p>
                    )}
                    <p>
                      {userAddress.city || ''}, {userAddress.state || ''}{' '}
                      {userAddress.zip_code || ''}
                    </p>
                    {userAddress.country && <p>{userAddress.country}</p>}
                  </div>
                ) : (
                  <p className="font-medium text-sm text-gray-500">
                    No address available
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Order Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-gray-600 text-sm">Date</p>
              <p className="font-medium">{formatDate(order.created_at)}</p>
            </div>
            <div>
              <p className="text-gray-600 text-sm">Payment Method</p>
              <p className="font-medium capitalize">
                {order.payment_method === 'cod'
                  ? 'Cash on Delivery'
                  : order.payment_method}
              </p>
            </div>
            <div>
              <p className="text-gray-600 text-sm">Total Amount</p>
              <p className="font-bold text-lg text-blue-600">
                {formatCurrency(order.total_amount)}
              </p>
            </div>
            <div>
              <p className="text-gray-600 text-sm mb-1">Status</p>
              <select
                value={order.status}
                onChange={(e) => onUpdateStatus(order.id, e.target.value)}
                className="mt-1 px-3 py-2 border border-gray-300 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="pending">Pending</option>
                <option value="processing">Processing</option>
                <option value="shipped">Shipped</option>
                <option value="delivered">Delivered</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            {order.payment_method === 'razorpay' && (
              <>
                {order.razorpay_payment_id && (
                  <div>
                    <p className="text-gray-600 text-sm">Razorpay Payment ID</p>
                    <p className="font-medium text-sm font-mono">
                      {order.razorpay_payment_id}
                    </p>
                  </div>
                )}
                {order.razorpay_order_id && (
                  <div>
                    <p className="text-gray-600 text-sm">Razorpay Order ID</p>
                    <p className="font-medium text-sm font-mono">
                      {order.razorpay_order_id}
                    </p>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Order Items */}
          <div>
            <h3 className="font-semibold mb-4">Order Items</h3>
            {orderItems.length === 0 ? (
              <EmptyState title="No items found" variant="minimal" />
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
                            (e.target as HTMLImageElement).src =
                              '/placeholder-product.jpg';
                          }}
                        />
                      ) : (
                        <div className="w-20 h-20 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                          <svg
                            className="w-8 h-8 text-gray-400"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                            />
                          </svg>
                        </div>
                      )}
                      <div className="flex-1">
                        <h4 className="font-medium">{item.product_name}</h4>
                        <p className="text-sm text-gray-600">
                          Price: {formatCurrency(item.product_price)} × Quantity:{' '}
                          {item.quantity}
                          <span className="ml-2">
                            | Size: {item.size || 'Select Size'}
                          </span>
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">
                          {formatCurrency(item.total_price)}
                        </p>
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
                {formatCurrency(order.total_amount)}
              </span>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" className="w-full" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


