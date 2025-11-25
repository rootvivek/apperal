/**
 * Utility functions for optimizing Supabase-hosted images
 */

/**
 * Checks if a URL is a Supabase storage URL
 */
export function isSupabaseImageUrl(url: string): boolean {
  return url.includes('supabase.co/storage');
}

/**
 * Transforms a Supabase image URL to include resize parameters
 * Note: Supabase Storage doesn't support query parameters for transformation by default.
 * This function is kept for future use if image transformation service is added.
 * For now, we rely on proper width/height attributes and srcset for responsive images.
 * 
 * @param url - Original Supabase image URL
 * @param width - Desired width in pixels (for width attribute)
 * @param height - Desired height in pixels (for height attribute)
 * @param quality - Image quality 1-100 (not used currently, kept for future)
 * @returns Original URL (transformation not supported yet)
 */
export function transformSupabaseImageUrl(
  url: string,
  width: number,
  height?: number,
  quality: number = 85
): string {
  if (!isSupabaseImageUrl(url)) {
    return url;
  }

  // Supabase Storage doesn't support query parameters for image transformation
  // We rely on proper width/height attributes and browser scaling
  // Future: If Supabase adds image transformation or we use a CDN, implement here
  return url;
}

/**
 * Generates srcset for responsive images from Supabase
 * Note: Since Supabase doesn't support image transformation, we use the same URL
 * with different size descriptors. The browser will select based on the sizes attribute.
 * 
 * @param baseUrl - Base Supabase image URL
 * @param sizes - Array of width sizes in pixels (for descriptor only)
 * @param quality - Image quality 1-100 (not used currently)
 * @returns srcset string (same URL with different descriptors)
 */
export function generateSrcSet(
  baseUrl: string,
  sizes: number[],
  quality: number = 85
): string {
  if (!isSupabaseImageUrl(baseUrl)) {
    return '';
  }

  // Since Supabase doesn't support transformation, we use the same URL
  // with different descriptors. The browser will use the sizes attribute
  // to determine which descriptor to use, but will fetch the same image.
  // This is still useful for proper responsive image behavior.
  return sizes
    .map(size => `${baseUrl} ${size}w`)
    .join(', ');
}

/**
 * Gets appropriate image dimensions for different contexts
 */
export const IMAGE_SIZES = {
  // Product card in grid (mobile: 50vw, tablet: 33vw, desktop: 25vw)
  productCard: {
    mobile: 300,    // ~50vw on 600px screen
    tablet: 400,    // ~33vw on 1200px screen
    desktop: 500,  // ~25vw on 2000px screen
  },
  // Hero carousel image (full width)
  hero: {
    mobile: 640,
    tablet: 1024,
    desktop: 1920,
  },
  // Product detail main image
  productDetail: {
    mobile: 640,
    tablet: 800,
    desktop: 1200,
  },
  // Thumbnail images
  thumbnail: {
    small: 128,
    medium: 256,
    large: 512,
  },
  // Cart/Order item images
  cartItem: {
    mobile: 128,
    desktop: 256,
  },
} as const;

