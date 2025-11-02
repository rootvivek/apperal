/**
 * Maps subcategories to their corresponding product detail table types
 * This determines which detail fields should be shown and which table to save to
 * 
 * Now uses the detail_type column from subcategories table for reliable mapping
 */

export type ProductDetailType = 'mobile' | 'apparel' | 'accessories' | 'none';

/**
 * Determines the product detail type based on subcategory name/slug
 * Simple and reliable: checks subcategory name/slug for mobile or apparel keywords
 * 
 * @param subcategoryName - The name of the subcategory
 * @param subcategorySlug - The slug of the subcategory (optional)
 * @param subcategoryDetailType - Optional: detail_type from database (if exists)
 * @returns The detail type: 'mobile', 'apparel', or 'none'
 */
export function getProductDetailType(
  subcategoryName?: string | null,
  subcategorySlug?: string | null,
  subcategoryDetailType?: string | null
): ProductDetailType {
  // First priority: Use explicit detail_type from database if available
  if (subcategoryDetailType === 'mobile') return 'mobile';
  if (subcategoryDetailType === 'apparel') return 'apparel';
  if (subcategoryDetailType === 'accessories') return 'accessories';

  // Second priority: Keyword matching based on name/slug (most reliable)
  if (!subcategoryName && !subcategorySlug) {
    return 'none';
  }

  const name = (subcategoryName || '').toLowerCase().trim();
  const slug = (subcategorySlug || '').toLowerCase().trim();

  // Mobile-related keywords - comprehensive list for auto-detection
  const mobileKeywords = [
    'mobile', 'phone', 'smartphone', 'iphone', 'samsung', 'android', 
    'device', 'cover', 'case', 'charger', 'accessory', 'headphone',
    'earphone', 'buds', 'wireless', 'bluetooth', 'xiaomi', 'oneplus',
    'oppo', 'vivo', 'realme', 'motorola', 'nokia', 'lava', 'micromax',
    'tablet', 'ipad', 'smartwatch', 'watch'
  ];
  
  // Apparel-related keywords - comprehensive list for auto-detection
  const apparelKeywords = [
    'apparel', 'clothing', 'wear', 'tshirt', 't-shirt', 'shirt', 'dress', 
    'fashion', 'garment', 'collection', 'men', 'women', 'unisex',
    'jacket', 'pant', 'jean', 'sweater', 'hoodie', 'sock', 'shoe',
    'hat', 'cap', 'bag', 'backpack', 'saree', 'kurta', 'trouser',
    'shorts', 'top', 'bottom', 'outfit', 'attire'
  ];

  // Check if subcategory matches mobile keywords (check name first, then slug)
  const fullText = `${name} ${slug}`;
  if (mobileKeywords.some(keyword => name.includes(keyword) || slug.includes(keyword) || fullText.includes(keyword))) {
    return 'mobile';
  }

  // Check if subcategory matches apparel keywords
  if (apparelKeywords.some(keyword => name.includes(keyword) || slug.includes(keyword) || fullText.includes(keyword))) {
    return 'apparel';
  }

  return 'none';
}

/**
 * Gets the detail table name based on detail type
 * @param detailType - The product detail type
 * @returns The table name or null
 */
export function getDetailTableName(detailType: ProductDetailType): string | null {
  switch (detailType) {
    case 'mobile':
      return 'product_mobile_details';
    case 'apparel':
      return 'product_apparel_details';
    case 'accessories':
      return 'product_accessories_details';
    default:
      return null;
  }
}

/**
 * Cover detail fields structure (for phone covers)
 */
export interface MobileDetails {
  brand: string;
  compatible_model: string;
  type: string;
  color: string;
}

/**
 * Apparel detail fields structure
 */
export interface ApparelDetails {
  brand: string;
  gender: string;
  material: string;
  fit_type: string;
  pattern: string;
  color: string;
  size: string;
  sku: string;
}

/**
 * Accessories detail fields structure
 */
export interface AccessoriesDetails {
  accessory_type: string;
  compatible_with: string;
  material: string;
  color: string;
}

