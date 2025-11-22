'use client';

import Modal from '@/components/Modal';
import { Button } from '@/components/ui/button';
import ImageWithFallback from '@/components/ImageWithFallback';
import { OrderDetailItem } from './OrderDetail';

interface CancelItemModalProps {
  isOpen: boolean;
  selectedItem: OrderDetailItem | null;
  orderNumber: string;
  loading: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export default function CancelItemModal({
  isOpen,
  selectedItem,
  orderNumber,
  loading,
  onConfirm,
  onClose,
}: CancelItemModalProps) {
  if (!selectedItem) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Cancel Item from Order #${orderNumber}`}
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
            className="w-full"
            onClick={onClose}
            disabled={loading}
          >
            Keep Item
          </Button>
          <Button
            variant="destructive"
            className="w-full"
            onClick={onConfirm}
            disabled={loading}
          >
            Confirm Cancellation
          </Button>
        </div>
      </div>
    </Modal>
  );
}

