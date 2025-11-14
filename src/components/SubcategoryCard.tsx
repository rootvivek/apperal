'use client';

import Link from 'next/link';
import { memo, useMemo } from 'react';

interface SubcategoryCardProps {
  subcategory: {
    id: string;
    name: string;
    slug: string;
    image_url?: string;
    image?: string;
  };
  categorySlug: string;
  variant?: 'mobile' | 'desktop';
}

const SubcategoryCard = memo(function SubcategoryCard({ 
  subcategory, 
  categorySlug, 
  variant = 'mobile'
}: SubcategoryCardProps) {
  // Memoize image URL to prevent recalculation
  const imageUrl = useMemo(
    () => subcategory.image_url || subcategory.image || '/images/categories/placeholder.svg',
    [subcategory.image_url, subcategory.image]
  );

  // Memoize href to prevent Link re-renders
  const href = useMemo(
    () => `/products/${categorySlug}/${subcategory.slug}`,
    [categorySlug, subcategory.slug]
  );
  
  // Mobile card style - constant since width is always the same
  const mobileCardStyle = {
    width: 'calc((100vw - 2rem) / 3 - 0.33rem)',
    scrollSnapAlign: 'start' as const
  };

  // Mobile variant
  if (variant === 'mobile') {
    return (
      <Link
        href={href}
        className="flex-shrink-0 group relative bg-white rounded-[4px] shadow-sm hover:shadow-md transition-shadow duration-300 overflow-hidden block border border-gray-200"
        style={mobileCardStyle}
      >
        <div className="w-full aspect-[5/6] overflow-hidden relative">
          <img
            src={imageUrl}
            alt={subcategory.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
            decoding="async"
            width={400}
            height={480}
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              if (target.src !== '/images/categories/placeholder.svg') {
                target.src = '/images/categories/placeholder.svg';
              }
            }}
          />
          {/* Mobile: Overlay with title - using gradient instead of backdrop-blur for better performance */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-gray-500/40 via-gray-500/35 to-gray-500/20 p-2">
            <h3 
              className="font-medium text-white line-clamp-1 group-hover:text-brand-300 transition-colors text-xs text-center" 
              style={{ textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}
            >
              {subcategory.name}
            </h3>
          </div>
        </div>
      </Link>
    );
  }

  // Desktop variant
  return (
    <Link
      href={href}
      className="group relative bg-white rounded-[4px] shadow-sm hover:shadow-md transition-shadow duration-300 overflow-hidden block border border-gray-200"
    >
      <div className="aspect-[3/3.2] overflow-hidden relative">
        <img
          src={imageUrl}
          alt={subcategory.name}
          className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
          loading="lazy"
          decoding="async"
          width={400}
          height={427}
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            if (target.src !== '/images/categories/placeholder.svg') {
              target.src = '/images/categories/placeholder.svg';
            }
          }}
        />
        {/* Desktop: Overlay with title - using glass effect with backdrop-blur */}
        <div className="absolute bottom-0 left-0 right-0 bg-white/70 backdrop-blur-md border-t border-white/30 shadow-lg p-2 overflow-hidden">
          <h3 className="font-normal text-gray-900 text-center group-hover:text-brand transition-colors text-base sm:text-lg block truncate whitespace-nowrap">
            {subcategory.name}
          </h3>
        </div>
      </div>
    </Link>
  );
}, (prevProps, nextProps) => {
  // Custom comparison function for better memoization
  return (
    prevProps.subcategory.id === nextProps.subcategory.id &&
    prevProps.subcategory.name === nextProps.subcategory.name &&
    prevProps.subcategory.slug === nextProps.subcategory.slug &&
    prevProps.subcategory.image_url === nextProps.subcategory.image_url &&
    prevProps.subcategory.image === nextProps.subcategory.image &&
    prevProps.categorySlug === nextProps.categorySlug &&
    prevProps.variant === nextProps.variant
  );
});

SubcategoryCard.displayName = 'SubcategoryCard';

export default SubcategoryCard;

