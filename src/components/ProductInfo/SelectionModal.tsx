import Modal from '@/components/Modal';
import { ShoppingCart } from 'lucide-react';
import SizeSelector from './SizeSelector';
import ColorSelector from './ColorSelector';

interface SelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  availableSizes: string[];
  availableColors: string[];
  selectedSize: string;
  selectedColor: string;
  modalErrors: {size?: boolean; color?: boolean};
  user: any;
  onSelectSize: (size: string) => void;
  onSelectColor: (color: string) => void;
  onAddToCart: () => void;
  onBuyNow: () => void;
}

export default function SelectionModal({
  isOpen,
  onClose,
  availableSizes,
  availableColors,
  selectedSize,
  selectedColor,
  modalErrors,
  user,
  onSelectSize,
  onSelectColor,
  onAddToCart,
  onBuyNow,
}: SelectionModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Select Options"
      size="lg"
    >
      <div className="space-y-6">
        {/* Size Selection */}
        {availableSizes.length > 0 && (
          <>
            <SizeSelector
              availableSizes={availableSizes}
              selectedSize={selectedSize}
              onSelect={onSelectSize}
            />
            {modalErrors.size && (
              <p className="mt-2 text-sm text-red-600 font-medium">Please select a size</p>
            )}
          </>
        )}

        {/* Divider */}
        {availableSizes.length > 0 && availableColors.length > 0 && (
          <div className="border-t border-gray-200"></div>
        )}

        {/* Color Selection */}
        {availableColors.length > 0 && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Select Colour <span className="text-red-500">*</span>
              </label>
              <ColorSelector
                availableColors={availableColors}
                selectedColor={selectedColor}
                onSelect={onSelectColor}
                showLabel={false}
              />
            </div>
            {modalErrors.color && (
              <p className="mt-2 text-sm text-red-600 font-medium">Please select a colour</p>
            )}
          </>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4">
          <button
            onClick={onAddToCart}
            className="flex-1 bg-yellow-500 text-white py-3 px-6 rounded-md font-medium hover:bg-yellow-600 transition-colors flex items-center justify-center gap-2"
          >
            <ShoppingCart className="w-5 h-5 flex-shrink-0" />
            Add to Cart
          </button>
          <button
            onClick={onBuyNow}
            className="flex-1 bg-orange-500 text-white py-3 px-6 rounded-md font-medium hover:bg-orange-600 transition-colors"
          >
            Buy Now
          </button>
        </div>
      </div>
    </Modal>
  );
}

