'use client';

interface ProductDetailsProps {
  product: {
    description?: string;
    product_cover_details?: {
      brand: string;
      compatible_model: string;
      type: string;
      color: string;
    };
    product_apparel_details?: {
      brand: string;
      material: string;
      fit_type: string;
      pattern: string;
      color: string;
      size: string;
    };
    product_accessories_details?: {
      accessory_type: string;
      compatible_with: string;
      material: string;
      color: string;
    };
  };
}

export default function ProductDetails({ product }: ProductDetailsProps) {
  const hasDetails = product.product_cover_details || product.product_accessories_details || product.product_apparel_details || product.description;

  if (!hasDetails) {
    return null;
  }

  return (
    <div>
      <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-2">Product Details</h3>
      <div className="space-y-1">
        {/* Phone Cover Details */}
        {product.product_cover_details?.brand && (
          <div className="flex items-center gap-1.5 sm:gap-3">
            <span className="font-medium text-gray-700 min-w-[90px] sm:min-w-[120px] text-[14px]">Brand:</span>
            <span className="text-gray-900 text-[14px]">{product.product_cover_details.brand}</span>
          </div>
        )}
        {product.product_cover_details?.compatible_model && (
          <div className="flex items-center gap-1.5 sm:gap-3">
            <span className="font-medium text-gray-700 min-w-[90px] sm:min-w-[120px] text-[14px]">Compatible Model:</span>
            <span className="text-gray-900 text-[14px]">{product.product_cover_details.compatible_model}</span>
          </div>
        )}
        {product.product_cover_details?.type && (
          <div className="flex items-center gap-1.5 sm:gap-3">
            <span className="font-medium text-gray-700 min-w-[90px] sm:min-w-[120px] text-[14px]">Type:</span>
            <span className="text-gray-900 text-[14px]">{product.product_cover_details.type}</span>
          </div>
        )}
        {product.product_cover_details?.color && (
          <div className="flex items-center gap-1.5 sm:gap-3">
            <span className="font-medium text-gray-700 min-w-[90px] sm:min-w-[120px] text-[14px]">Color:</span>
            <span className="text-gray-900 text-[14px]">{product.product_cover_details.color}</span>
          </div>
        )}

        {/* Accessories Details */}
        {product.product_accessories_details?.accessory_type && (
          <div className="flex items-center gap-1.5 sm:gap-3">
            <span className="font-medium text-gray-700 min-w-[90px] sm:min-w-[120px] text-[14px]">Accessory Type:</span>
            <span className="text-gray-900 text-[14px]">{product.product_accessories_details.accessory_type}</span>
          </div>
        )}
        {product.product_accessories_details?.compatible_with && (
          <div className="flex items-center gap-1.5 sm:gap-3">
            <span className="font-medium text-gray-700 min-w-[90px] sm:min-w-[120px] text-[14px]">Compatible With:</span>
            <span className="text-gray-900 text-[14px]">{product.product_accessories_details.compatible_with}</span>
          </div>
        )}
        {product.product_accessories_details?.material && (
          <div className="flex items-center gap-1.5 sm:gap-3">
            <span className="font-medium text-gray-700 min-w-[90px] sm:min-w-[120px] text-[14px]">Material:</span>
            <span className="text-gray-900 text-[14px]">{product.product_accessories_details.material}</span>
          </div>
        )}
        {product.product_accessories_details?.color && (
          <div className="flex items-center gap-1.5 sm:gap-3">
            <span className="font-medium text-gray-700 min-w-[90px] sm:min-w-[120px] text-[14px]">Color:</span>
            <span className="text-gray-900 text-[14px]">{product.product_accessories_details.color}</span>
          </div>
        )}

        {/* Apparel Details */}
        {product.product_apparel_details?.brand && (
          <div className="flex items-center gap-1.5 sm:gap-3">
            <span className="font-medium text-gray-700 min-w-[90px] sm:min-w-[120px] text-[14px]">Brand:</span>
            <span className="text-gray-900 text-[14px]">{product.product_apparel_details.brand}</span>
          </div>
        )}
        {product.product_apparel_details?.material && (
          <div className="flex items-center gap-1.5 sm:gap-3">
            <span className="font-medium text-gray-700 min-w-[90px] sm:min-w-[120px] text-[14px]">Material:</span>
            <span className="text-gray-900 text-[14px]">{product.product_apparel_details.material}</span>
          </div>
        )}
        
        {/* Description */}
        {product.description && (
          <div className="flex items-start gap-1.5 sm:gap-3">
            <span className="font-medium text-gray-700 min-w-[90px] sm:min-w-[120px] text-[14px]">Description:</span>
            <span className="text-gray-900 leading-relaxed text-sm">{product.description}</span>
          </div>
        )}
      </div>
    </div>
  );
}

