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
    <div className="w-full">
      <h3 className="text-sm sm:text-base lg:text-lg font-semibold text-gray-900 mb-2 sm:mb-3 px-1">
        Payment Summary
      </h3>
      <div className="space-y-2 sm:space-y-3">
        <div className="space-y-2 sm:space-y-2.5 pb-2 sm:pb-3 border-b border-gray-200">
          <div className="px-1">
            <p className="text-gray-600 text-xs sm:text-sm mb-1">Order Date</p>
            <p className="text-sm sm:text-base font-medium text-gray-900 break-words">
              {formatDate(orderDate)}
            </p>
          </div>
          <div className="px-1">
            <p className="text-gray-600 text-xs sm:text-sm mb-1">Payment Method</p>
            <p className="text-sm sm:text-base font-medium text-gray-900 capitalize break-words">
              {paymentMethod === 'cod' ? 'Cash on Delivery' : paymentMethod}
            </p>
          </div>
          {paymentStatus && (
            <div className="px-1">
              <p className="text-gray-600 text-xs sm:text-sm mb-1">Payment Status</p>
              <p className="text-sm sm:text-base font-medium text-gray-900 capitalize break-words">
                {paymentStatus}
              </p>
            </div>
          )}
        </div>

        <div className="space-y-2 sm:space-y-2.5 px-1">
          <div className="flex justify-between items-center text-xs sm:text-sm gap-2">
            <span className="text-gray-600 flex-shrink-0">Subtotal</span>
            <span className="font-medium text-right break-words">{formatCurrency(subtotal)}</span>
          </div>
          <div className="flex justify-between items-center text-xs sm:text-sm gap-2">
            <span className="text-gray-600 flex-shrink-0">Shipping</span>
            <span className="font-medium text-right break-words">
              {shipping === 0 ? 'Free' : formatCurrency(shipping)}
            </span>
          </div>
          <div className="border-t border-gray-200 pt-2 sm:pt-3 mt-1">
            <div className="flex justify-between items-center text-sm sm:text-base gap-2">
              <span className="font-medium text-gray-900 flex-shrink-0">Total</span>
              <span className="font-semibold text-gray-900 text-right break-words">
                {formatCurrency(total)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

