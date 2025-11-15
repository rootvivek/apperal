'use client';

import { memo, useMemo } from 'react';
import Card from './Card';
import { PLACEHOLDER_CATEGORY } from '@/utils/imageUtils';

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
    () => subcategory.image_url || PLACEHOLDER_CATEGORY,
    [subcategory.image_url]
  );

  // Memoize href to prevent Link re-renders
  const href = useMemo(
    () => `/products/${categorySlug}/${subcategory.slug}`,
    [categorySlug, subcategory.slug]
  );
  
  // Mobile card width - constant since width is always the same
  const mobileWidth = 'calc((100vw - 2rem) / 3 - 0.33rem)';

  // Mobile variant
  if (variant === 'mobile') {
    return (
      <Card
        href={href}
        imageUrl={imageUrl}
        title={subcategory.name}
        variant="subcategory"
        aspectRatio="5/6"
        showOverlay={true}
        overlayStyle="gradient"
        titlePosition="overlay"
        className="flex-shrink-0 rounded-[4px]"
        mobileWidth={mobileWidth}
      />
    );
  }

  // Desktop variant
  return (
    <Card
      href={href}
      imageUrl={imageUrl}
      title={subcategory.name}
      variant="subcategory"
      aspectRatio="3/3.2"
      showOverlay={true}
      overlayStyle="glass"
      titlePosition="overlay"
      className="rounded-[4px]"
    />
  );
}, (prevProps, nextProps) => {
  // Custom comparison function for better memoization
  return (
    prevProps.subcategory.id === nextProps.subcategory.id &&
    prevProps.subcategory.name === nextProps.subcategory.name &&
    prevProps.subcategory.slug === nextProps.subcategory.slug &&
    prevProps.subcategory.image_url === nextProps.subcategory.image_url &&
    prevProps.categorySlug === nextProps.categorySlug &&
    prevProps.variant === nextProps.variant
  );
});

SubcategoryCard.displayName = 'SubcategoryCard';

export default SubcategoryCard;

