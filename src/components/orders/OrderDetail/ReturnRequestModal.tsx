'use client';

import { useEffect } from 'react';
import Modal from '@/components/Modal';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import ImageWithFallback from '@/components/ImageWithFallback';
import { OrderDetailItem } from './OrderDetail';

interface ReturnRequestModalProps {
  isOpen: boolean;
  selectedItem: OrderDetailItem | null;
  quantity: number;
  reason: string;
  maxQuantity: number;
  loading: boolean;
  onQuantityChange: (quantity: number) => void;
  onReasonChange: (reason: string) => void;
  onConfirm: () => void;
  onClose: () => void;
}

export default function ReturnRequestModal({
  isOpen,
  selectedItem,
  quantity,
  reason,
  maxQuantity,
  loading,
  onQuantityChange,
  onReasonChange,
  onConfirm,
  onClose,
}: ReturnRequestModalProps) {
  if (!selectedItem) return null;

  const handleQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    if (!isNaN(value) && value >= 1 && value <= maxQuantity) {
      onQuantityChange(value);
    }
  };

  const canSubmit = reason.trim().length > 0 && quantity > 0 && quantity <= maxQuantity;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Request Return for Order Item`}
      size="lg"
    >
      <div className="space-y-4">
        <div className="flex items-start gap-4">
          {selectedItem.product_image && (
            <div className="flex-shrink-0 w-16 h-16 sm:w-20 sm:h-20">
              <ImageWithFallback
                src={selectedItem.product_image}
                alt={selectedItem.product_name}
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
            </div>
          )}
          <div className="flex-1">
            <p className="text-sm text-gray-600 mb-1">Product</p>
            <p className="text-sm font-medium text-gray-900">{selectedItem.product_name}</p>
            <p className="text-xs text-gray-500 mt-1">
              Available for return: {maxQuantity} item(s)
            </p>
          </div>
        </div>

        <div>
          <Label htmlFor="return-quantity" className="text-sm font-medium text-gray-700">
            Quantity to Return
          </Label>
          <input
            id="return-quantity"
            type="number"
            min={1}
            max={maxQuantity}
            value={quantity}
            onChange={handleQuantityChange}
            disabled={loading}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          />
          <p className="mt-1 text-xs text-gray-500">
            Maximum {maxQuantity} item(s) can be returned
          </p>
        </div>

        <div>
          <Label htmlFor="return-reason" className="text-sm font-medium text-gray-700">
            Reason for Return <span className="text-red-500">*</span>
          </Label>
          <Textarea
            id="return-reason"
            value={reason}
            onChange={(e) => onReasonChange(e.target.value)}
            disabled={loading}
            placeholder="Please provide a reason for returning this item..."
            rows={4}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          />
          <p className="mt-1 text-xs text-gray-500">
            {reason.length} characters
          </p>
        </div>
        
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p className="text-sm text-blue-800">
            Your return request will be reviewed by our team. You will be notified once a decision is made.
          </p>
        </div>
        
        <div className="flex gap-3 mt-6">
          <Button
            variant="secondary"
            className="w-full"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            variant="default"
            className="w-full"
            onClick={onConfirm}
            disabled={loading || !canSubmit}
          >
            {loading ? 'Submitting...' : 'Submit Return Request'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

