'use client';

import { useState } from 'react';
import { ShoppingCart } from 'lucide-react';
import Modal from '@/components/Modal';
import { getColorHex, getSizeAbbreviation } from '@/utils/productHelpers';

interface ProductBottomActionsProps {
  product: {
    stock_quantity: number;
    product_apparel_details?: {
      size: string;
      color: string;
    };
  };
  selectedSize: string;
  setSelectedSize: (size: string) => void;
  selectedColor: string;
  setSelectedColor: (color: string) => void;
  handleAddToCart: () => void;
  handleBuyNow: () => void;
  isAddedToCart: boolean;
  user: any;
  slug: string;
}

export default function ProductBottomActions({
  product,
  selectedSize,
  setSelectedSize,
  selectedColor,
  setSelectedColor,
  handleAddToCart,
  handleBuyNow,
  isAddedToCart,
  user,
  slug,
}: ProductBottomActionsProps) {
  const [showSelectionModal, setShowSelectionModal] = useState(false);
  const [modalErrors, setModalErrors] = useState<{size?: boolean; color?: boolean}>({});

  const checkSelections = (showModal = true, showErrors = false): boolean => {
    if (!product.product_apparel_details) return true;
    
    const errors: {size?: boolean; color?: boolean} = {};
    let hasMissing = false;
    
    if (!selectedSize) {
      if (showErrors) errors.size = true;
      hasMissing = true;
    }
    if (!selectedColor) {
      if (showErrors) errors.color = true;
      hasMissing = true;
    }
    
    if (hasMissing) {
      if (showErrors) {
        setModalErrors(errors);
      }
      if (showModal) {
        setShowSelectionModal(true);
      }
      return false;
    }
    setModalErrors({});
    return true;
  };

  const handleAddToCartClick = () => {
    if (checkSelections()) {
      handleAddToCart();
    }
  };

  const handleBuyNowClick = () => {
    if (checkSelections()) {
      handleBuyNow();
    }
  };

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 w-full bg-white/50 backdrop-blur-md border-t border-gray-200/30 shadow-lg z-50 sm:hidden" style={{ position: 'fixed', bottom: 0, left: 0, right: 0, paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <div className="px-3 pt-2 pb-1 flex gap-2" style={{ paddingBottom: 'max(4px, env(safe-area-inset-bottom))' }}>
          <button
            onClick={handleAddToCartClick}
            disabled={product.stock_quantity === 0}
            className="flex-1 bg-yellow-500 text-white py-4 px-4 rounded-md font-medium hover:bg-yellow-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2 text-sm"
          >
            <ShoppingCart className="w-4 h-4 flex-shrink-0" />
            <span>
              {isAddedToCart ? 'Added!' : 'Add to Cart'}
            </span>
          </button>
          <button
            onClick={handleBuyNowClick}
            disabled={product.stock_quantity === 0}
            className="flex-1 bg-orange-500 text-white py-4 px-4 rounded-md font-medium hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 text-sm"
          >
            Buy Now
          </button>
        </div>
      </div>

      {/* Selection Required Modal */}
      <Modal
        isOpen={showSelectionModal}
        onClose={() => {
          setShowSelectionModal(false);
          setModalErrors({}); // Clear errors when modal closes
        }}
        title="Select Options"
        size="lg"
      >
        <div className="space-y-6">
          {product.product_apparel_details && (() => {
            const availableSizes = product.product_apparel_details.size
              ? product.product_apparel_details.size.split(',').map((s: string) => s.trim()).filter(Boolean)
              : [];
            const availableColors = product.product_apparel_details.color
              ? product.product_apparel_details.color.split(',').map((c: string) => c.trim()).filter(Boolean)
              : [];

            return (
              <>
                {/* Size Selection */}
                {availableSizes.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">
                      Select Size <span className="text-red-500">*</span>
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {availableSizes.map((size) => {
                        const displaySize = getSizeAbbreviation(size);
                        const isSelected = selectedSize === size;
                        return (
                          <button
                            key={size}
                            type="button"
                            onClick={() => {
                              setSelectedSize(size);
                              setModalErrors(prev => ({ ...prev, size: false }));
                              if (typeof window !== 'undefined' && slug) {
                                localStorage.setItem(`selectedSize_${slug}`, size);
                              }
                            }}
                            className={`px-4 py-2 rounded-md border font-medium text-sm transition-all duration-200 ${
                              isSelected
                                ? 'bg-black text-white border-black shadow-md'
                                : 'bg-white text-gray-900 border-gray-300 hover:border-gray-400 cursor-pointer'
                            }`}
                          >
                            {displaySize}
                          </button>
                        );
                      })}
                    </div>
                    {modalErrors.size && (
                      <p className="mt-2 text-sm text-red-600 font-medium">Please select a size</p>
                    )}
                  </div>
                )}

                {/* Divider */}
                {availableSizes.length > 0 && availableColors.length > 0 && (
                  <div className="border-t border-gray-200"></div>
                )}

                {/* Color Selection */}
                {availableColors.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">
                      Select Colour <span className="text-red-500">*</span>
                    </label>
                    <div className="flex flex-wrap gap-3">
                      {availableColors.map((color) => {
                        const isSelected = selectedColor === color;
                        const colorHex = getColorHex(color);
                        return (
                          <button
                            key={color}
                            type="button"
                            onClick={() => {
                              setSelectedColor(color);
                              setModalErrors(prev => ({ ...prev, color: false }));
                              if (typeof window !== 'undefined' && slug) {
                                localStorage.setItem(`selectedColor_${slug}`, color);
                              }
                            }}
                            className={`relative w-10 h-10 rounded-full transition-all duration-200 ${
                              isSelected 
                                ? 'ring-2 ring-black ring-offset-1' 
                                : 'border border-gray-300 hover:border-gray-400'
                            }`}
                            style={{ 
                              backgroundColor: colorHex,
                              ...(isSelected && {
                                boxShadow: 'inset 0 0 0 2px white, 0 0 0 3px black'
                              })
                            }}
                            aria-label={`Select ${color}`}
                            title={color}
                          />
                        );
                      })}
                        </div>
                    {modalErrors.color && (
                      <p className="mt-2 text-sm text-red-600 font-medium">Please select a colour</p>
                    )}
                  </div>
                )}
              </>
            );
          })()}

          <div className="flex gap-3 pt-4">
                <button
                  onClick={() => {
                    if (checkSelections(false, true)) {
                      setShowSelectionModal(false);
                      handleAddToCart();
                    }
                  }}
                  className="flex-1 bg-yellow-500 text-white py-3 px-6 rounded-md font-medium hover:bg-yellow-600 transition-colors flex items-center justify-center gap-2"
                >
                  <ShoppingCart className="w-4 h-4 flex-shrink-0" />
                  Add to Cart
                </button>
                <button
                  onClick={() => {
                    if (checkSelections(false, true)) {
                      setShowSelectionModal(false);
                      handleBuyNow();
                    }
                  }}
                  className="flex-1 bg-orange-500 text-white py-3 px-6 rounded-md font-medium hover:bg-orange-600 transition-colors"
                >
                  Buy Now
                </button>
          </div>
        </div>
      </Modal>
    </>
  );
}

