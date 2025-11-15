// Image utility functions and constants

// Placeholder image paths
export const PLACEHOLDER_CATEGORY = '/images/categories/placeholder.svg';
export const PLACEHOLDER_PRODUCT = '/placeholder-product.jpg';

/**
 * Handles image loading errors by replacing with placeholder
 * @param placeholder - The placeholder image path to use
 */
export const createImageErrorHandler = (placeholder: string) => {
  return (e: React.SyntheticEvent<HTMLImageElement>) => {
    const target = e.target as HTMLImageElement;
    if (target.src !== placeholder) {
      target.src = placeholder;
    }
  };
};

/**
 * Default error handler for category/subcategory images
 */
export const handleCategoryImageError = createImageErrorHandler(PLACEHOLDER_CATEGORY);

/**
 * Default error handler for product images
 */
export const handleProductImageError = createImageErrorHandler(PLACEHOLDER_PRODUCT);

/**
 * Gets the appropriate placeholder image based on type
 */
export const getPlaceholderImage = (type: 'category' | 'product' = 'product'): string => {
  return type === 'category' ? PLACEHOLDER_CATEGORY : PLACEHOLDER_PRODUCT;
};

