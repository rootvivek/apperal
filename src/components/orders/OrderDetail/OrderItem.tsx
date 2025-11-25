'use client';

import ImageWithFallback from '@/components/ImageWithFallback';
import { Button } from '@/components/ui/button';
import { OrderDetailItem } from './OrderDetail';

interface OrderItemProps {
  item: OrderDetailItem;
  canCancel: boolean;
  canReturn: boolean;
  returnStatus: {
    status: 'none' | 'pending' | 'approved' | 'rejected' | 'refunded';
    returnedQuantity: number;
    pendingQuantity: number;
  };
  onCancel: (item: OrderDetailItem) => void;
  onRequestReturn: (item: OrderDetailItem) => void;
  formatCurrency: (value: number) => string;
}

const getReturnStatusBadge = (status: string) => {
  switch (status) {
    case 'pending':
      return { text: 'Return Requested', className: 'bg-yellow-100 text-yellow-800' };
    case 'approved':
      return { text: 'Return Approved', className: 'bg-blue-100 text-blue-800' };
    case 'refunded':
      return { text: 'Refunded', className: 'bg-green-100 text-green-800' };
    case 'rejected':
      return { text: 'Return Rejected', className: 'bg-red-100 text-red-800' };
    default:
      return null;
  }
};

export default function OrderItem({
  item,
  canCancel,
  canReturn,
  returnStatus,
  onCancel,
  onRequestReturn,
  formatCurrency,
}: OrderItemProps) {
  const returnBadge = getReturnStatusBadge(returnStatus.status);
  return (
    <div className="flex items-stretch gap-3 sm:gap-4">
      <div className="flex-shrink-0 w-14 h-14 sm:w-16 sm:h-16 aspect-square">
        {item.product_image ? (
          <ImageWithFallback
            src={item.product_image}
            alt={item.product_name}
            className="w-full h-full object-cover border border-gray-200"
            fallbackType="product"
            loading="lazy"
            decoding="async"
            width={64}
            height={64}
            responsive={true}
            responsiveSizes={[48, 64, 80]}
            quality={85}
          />
        ) : (
          <div className="w-full h-full bg-gray-100 flex items-center justify-center border border-gray-200">
            <svg className="w-6 h-6 sm:w-7 sm:h-7 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            <div className="text-xs text-gray-600">
              Qty: {item.quantity}
              {(item.cancelled_quantity || 0) > 0 && (
                <span className="ml-1.5 text-red-600">
                  ({item.cancelled_quantity} cancelled)
                </span>
              )}
              {returnStatus.returnedQuantity > 0 && (
                <span className="ml-1.5 text-blue-600">
                  ({returnStatus.returnedQuantity} returned)
                </span>
              )}
              {returnStatus.pendingQuantity > 0 && (
                <span className="ml-1.5 text-yellow-600">
                  ({returnStatus.pendingQuantity} return pending)
                </span>
              )}
            </div>
            {item.is_cancelled && (
              <span className="px-1.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                Cancelled
              </span>
            )}
            {returnBadge && (
              <span className={`px-1.5 py-0.5 rounded-full text-xs font-medium ${returnBadge.className}`}>
                {returnBadge.text}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            {canCancel && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => onCancel(item)}
                className="text-xs px-2 py-1"
              >
                Cancel
              </Button>
            )}
            {canReturn && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onRequestReturn(item)}
                className="text-xs px-2 py-1"
              >
                Request Return
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

