import type { ProductImage } from '@/types/admin';

/**
 * Maps product images for API submission
 * @param images - Array of product images
 * @param includeId - Whether to include image IDs (for updates)
 * @returns Array of image objects formatted for API
 */
export function mapProductImagesForApi(
  images: ProductImage[],
  includeId: boolean = false
): Array<{
  id?: string;
  image_url: string;
  alt_text: string;
  display_order: number;
}> {
  return images.map((image, index) => ({
    ...(includeId && image.id ? { id: image.id } : {}),
    image_url: image.image_url,
    alt_text: image.alt_text || '',
    display_order: includeId ? index : (image.display_order ?? index),
  }));
}

