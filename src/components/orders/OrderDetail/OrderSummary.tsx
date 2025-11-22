'use client';

interface OrderSummaryProps {
  orderDate: string;
  paymentMethod: string;
  paymentStatus?: string;
  subtotal: number;
  shipping: number;
  total: number;
  formatDate: (date: string) => string;
  formatCurrency: (value: number) => string;
}

export default function OrderSummary({
  orderDate,
  paymentMethod,
  paymentStatus,
  subtotal,
  shipping,
  total,
  formatDate,
  formatCurrency,
}: OrderSummaryProps) {
  return (
    <div className="px-3 sm:px-4 py-2 sm:py-4">
      <h3 className="text-sm sm:text-base lg:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">Payment Summary</h3>
      <div className="space-y-3 sm:space-y-4">
        <div className="space-y-3 pb-3 border-b border-gray-200">
          <div>
            <p className="text-gray-600 text-xs sm:text-sm mb-1">Order Date</p>
            <p className="text-sm sm:text-base font-medium text-gray-900">{formatDate(orderDate)}</p>
          </div>
          <div>
            <p className="text-gray-600 text-xs sm:text-sm mb-1">Payment Method</p>
            <p className="text-sm sm:text-base font-medium text-gray-900 capitalize">
              {paymentMethod === 'cod' ? 'Cash on Delivery' : paymentMethod}
            </p>
          </div>
          {paymentStatus && (
            <div>
              <p className="text-gray-600 text-xs sm:text-sm mb-1">Payment Status</p>
              <p className="text-sm sm:text-base font-medium text-gray-900 capitalize">{paymentStatus}</p>
            </div>
          )}
        </div>

        <div className="space-y-3">
          <div className="flex justify-between text-xs sm:text-sm">
            <span className="text-gray-600">Subtotal</span>
            <span className="font-medium">{formatCurrency(subtotal)}</span>
          </div>
          <div className="flex justify-between text-xs sm:text-sm">
            <span className="text-gray-600">Shipping</span>
            <span className="font-medium">
              {shipping === 0 ? 'Free' : formatCurrency(shipping)}
            </span>
          </div>
          <div className="border-t border-gray-200 pt-3 sm:pt-4">
            <div className="flex justify-between text-sm sm:text-base">
              <span className="font-medium text-gray-900">Total</span>
              <span className="font-normal text-gray-900">
                {formatCurrency(total)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

