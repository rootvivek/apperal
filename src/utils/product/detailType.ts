import type { Category } from '@/types/admin';

/**
 * Determines the detail type from a category
 * @param category - Category object with detail_type property
 * @returns 'mobile' | 'apparel' | 'accessories' | 'none'
 */
export function getDetailType(category: Category | undefined): 'mobile' | 'apparel' | 'accessories' | 'none' {
  if (!category) return 'none';
  
  if (category.detail_type === 'mobile') return 'mobile';
  if (category.detail_type === 'apparel') return 'apparel';
  if (category.detail_type === 'accessories') return 'accessories';
  
  return 'none';
}

