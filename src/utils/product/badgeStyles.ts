import { BADGE_STYLES } from '@/constants/productCard';

/**
 * Gets the badge style class for a given badge name
 */
export function getBadgeStyle(badge: string | undefined | null): string {
  return BADGE_STYLES[badge?.toUpperCase() || ''] || 'bg-gray-500 text-white';
}

