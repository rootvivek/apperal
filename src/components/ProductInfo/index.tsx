'use client';

import { useProductSelections } from './useProductSelections';
import SizeSelector from './SizeSelector';
import ColorSelector from './ColorSelector';
import ActionButtons from './ActionButtons';
import SelectionModal from './SelectionModal';

interface ProductInfoProps {
  product: {
    id: string;
    name: string;
    price: number;
    original_price?: number | null;
    stock_quantity: number;
    rating?: number | null;
    review_count?: number | null;
    brand?: string | null;
    product_apparel_details?: {
      size: string;
      color: string;
      brand?: string;
    };
    product_cover_details?: {
      brand: string;
    };
  };
  quantity: number;
  setQuantity: (qty: number) => void;
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

export default function ProductInfo({
  product,
  quantity: externalQuantity,
  setQuantity: externalSetQuantity,
  selectedSize: externalSelectedSize,
  setSelectedSize: externalSetSelectedSize,
  selectedColor: externalSelectedColor,
  setSelectedColor: externalSetSelectedColor,
  handleAddToCart,
  handleBuyNow,
  isAddedToCart: externalIsAddedToCart,
  user,
  slug,
}: ProductInfoProps) {
  const selections = useProductSelections({
    slug,
    productApparelDetails: product.product_apparel_details,
    onAddToCart: handleAddToCart,
    onBuyNow: handleBuyNow,
  });

  // Use hook state as primary source, sync with external props when they change
  const quantity = externalQuantity || selections.quantity;
  const selectedSize = externalSelectedSize || selections.selectedSize;
  const selectedColor = externalSelectedColor || selections.selectedColor;
  const isAddedToCart = externalIsAddedToCart || selections.hasAddedToCart;

  return (
    <div className="pt-2 sm:pt-0">
      <h1 className="text-lg font-medium text-gray-900 mb-2 leading-tight">{product.name}</h1>
      
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <div className="flex items-baseline gap-3">
          <span className="text-lg font-medium text-brand">₹{product.price.toFixed(2)}</span>
          {product.original_price && product.original_price > product.price && (
            <>
              <span className="text-sm text-gray-500 line-through">₹{product.original_price.toFixed(2)}</span>
              <span className="text-sm font-medium text-green-600">
                ({Math.round(((product.original_price - product.price) / product.original_price) * 100)}% OFF)
              </span>
            </>
          )}
        </div>
      </div>

      {/* Selection Options and Actions */}
      <div className="space-y-3 sm:space-y-5 mt-4">
        {product.product_apparel_details && (
          <>
            <SizeSelector
              availableSizes={selections.availableSizes}
              selectedSize={selectedSize}
              onSelect={(size) => {
                externalSetSelectedSize(size);
                selections.selectSize(size);
              }}
            />

            <ColorSelector
              availableColors={selections.availableColors}
              selectedColor={selectedColor}
              onSelect={(color) => {
                externalSetSelectedColor(color);
                selections.selectColor(color);
              }}
            />
          </>
        )}

        <ActionButtons
          stockQuantity={product.stock_quantity}
          isAddedToCart={isAddedToCart}
          user={user}
          onAddToCart={selections.addToCartWithValidation}
          onBuyNow={selections.buyNowWithValidation}
        />

        <SelectionModal
          isOpen={selections.showSelectionModal}
          onClose={selections.closeModal}
          availableSizes={selections.availableSizes}
          availableColors={selections.availableColors}
          selectedSize={selectedSize}
          selectedColor={selectedColor}
          modalErrors={selections.modalErrors}
          user={user}
          onSelectSize={(size) => {
            externalSetSelectedSize(size);
            selections.selectSize(size);
          }}
          onSelectColor={(color) => {
            externalSetSelectedColor(color);
            selections.selectColor(color);
          }}
          onAddToCart={selections.handleModalAddToCart}
          onBuyNow={selections.handleModalBuyNow}
        />

        {product.stock_quantity === 0 && (
          <div className="text-center p-4 bg-red-50 border-2 border-red-200 rounded">
            <p className="text-gray-900 font-medium">This product is currently out of stock</p>
          </div>
        )}
      </div>
    </div>
  );
}

