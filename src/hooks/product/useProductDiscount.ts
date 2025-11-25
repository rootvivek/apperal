import { useMemo } from 'react';

/**
 * Hook to calculate product discount percentage
 */
export function useProductDiscount(price: number, originalPrice?: number) {
  return useMemo(() => {
    if (!originalPrice || originalPrice <= price) {
      return { discountPercentage: 0, hasDiscount: false };
    }
    const discount = Math.round(((originalPrice - price) / originalPrice) * 100);
    return { discountPercentage: discount, hasDiscount: discount > 0 };
  }, [price, originalPrice]);
}

