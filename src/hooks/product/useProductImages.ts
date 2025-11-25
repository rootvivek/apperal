import { useMemo } from 'react';
import { PLACEHOLDER_IMAGE } from '@/constants/productCard';

interface ProductCardProduct {
  image_url: string;
  images?: (string | { id: string; image_url: string; alt_text?: string; display_order: number })[];
}

/**
 * Hook to extract and normalize product images
 */
export function useProductImages(product: ProductCardProduct): string[] {
  return useMemo(() => {
    const images: string[] = [];
    const seenUrls = new Set<string>();
    
    if (product.image_url && typeof product.image_url === 'string') {
      const mainImageUrl = product.image_url.trim();
      if (mainImageUrl && (mainImageUrl.startsWith('http') || mainImageUrl.startsWith('https') || mainImageUrl.startsWith('/'))) {
        images.push(mainImageUrl);
        seenUrls.add(mainImageUrl);
      }
    }
    
    if (product.images && Array.isArray(product.images)) {
      product.images.forEach((image) => {
        let imageUrl: string | null = null;
        if (typeof image === 'string' && image.trim()) {
          imageUrl = image.trim();
        } else if (typeof image === 'object' && image !== null && 'image_url' in image && typeof image.image_url === 'string') {
          imageUrl = image.image_url.trim();
        }
        if (imageUrl && !seenUrls.has(imageUrl) && (imageUrl.startsWith('http') || imageUrl.startsWith('https') || imageUrl.startsWith('/'))) {
          images.push(imageUrl);
          seenUrls.add(imageUrl);
        }
      });
    }
    
    return images.length > 0 ? images : (product.image_url ? [product.image_url] : [PLACEHOLDER_IMAGE]);
  }, [product.image_url, product.images]);
}

