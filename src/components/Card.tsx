'use client';

import Link from 'next/link';
import { memo, useMemo } from 'react';
import { PLACEHOLDER_CATEGORY } from '@/utils/imageUtils';
import ImageWithFallback from './ImageWithFallback';

interface CardProps {
  href: string;
  imageUrl: string;
  title: string;
  alt?: string;
  variant?: 'category' | 'subcategory' | 'product' | 'custom';
  aspectRatio?: 'square' | '5/6' | '3/3.2' | 'custom';
  showOverlay?: boolean;
  overlayPosition?: 'bottom';
  overlayStyle?: 'gradient' | 'glass';
  titlePosition?: 'overlay' | 'below';
  className?: string;
  imageClassName?: string;
  titleClassName?: string;
  mobileWidth?: string; // For mobile-specific width (e.g., SubcategoryCard)
  onImageError?: (e: React.SyntheticEvent<HTMLImageElement>) => void;
}

const aspectRatioClasses = {
  square: 'aspect-square',
  '5/6': 'aspect-[5/6]',
  '3/3.2': 'aspect-[3/3.2]',
  custom: '',
};

const baseCardClasses = 'group bg-white shadow-sm border border-gray-200 hover:shadow-md transition-shadow duration-300 overflow-hidden block';
const baseImageClasses = 'w-full h-full object-cover group-hover:scale-105 transition-transform duration-300';

const Card = memo(function Card({
  href,
  imageUrl,
  title,
  alt,
  variant = 'category',
  aspectRatio = 'square',
  showOverlay = false,
  overlayPosition = 'bottom',
  overlayStyle = 'gradient',
  titlePosition = 'below',
  className = '',
  imageClassName = '',
  titleClassName = '',
  mobileWidth,
  onImageError,
}: CardProps) {
  const finalImageUrl = useMemo(() => imageUrl || PLACEHOLDER_CATEGORY, [imageUrl]);
  const finalAlt = alt || title;

  // Determine aspect ratio class
  const aspectClass = aspectRatioClasses[aspectRatio];

  // Card classes - add default rounded-lg if no rounded class in className
  const hasRoundedClass = className.includes('rounded');
  const defaultRounded = hasRoundedClass ? '' : 'rounded-lg';
  const cardClasses = `${baseCardClasses} ${defaultRounded} ${className}`;

  // Image container classes
  const imageContainerClasses = `${aspectClass} relative bg-gray-100 overflow-hidden ${aspectRatio === 'custom' ? '' : 'w-full'}`;

  // Image classes
  const finalImageClasses = `${baseImageClasses} ${imageClassName}`;

  // Title classes based on position
  const getTitleClasses = () => {
    if (titlePosition === 'overlay') {
      if (overlayStyle === 'gradient') {
        return 'font-medium text-white line-clamp-1 group-hover:text-brand-300 transition-colors text-xs text-center';
      } else {
        return 'font-normal text-gray-900 text-center group-hover:text-brand transition-colors text-base sm:text-lg block truncate whitespace-nowrap';
      }
    } else {
      return 'text-sm font-medium text-gray-900 line-clamp-2 group-hover:text-brand-500 transition-colors';
    }
  };

  // Overlay classes
  const getOverlayClasses = () => {
    if (overlayStyle === 'gradient') {
      return 'absolute bottom-0 left-0 right-0 bg-gradient-to-t from-gray-500/40 via-gray-500/35 to-gray-500/20 p-2';
    } else {
      return 'absolute bottom-0 left-0 right-0 bg-white/70 backdrop-blur-md border-t border-white/30 shadow-lg p-2 overflow-hidden';
    }
  };

  // Mobile-specific styles
  const cardStyle = mobileWidth ? { width: mobileWidth, scrollSnapAlign: 'start' as const } : undefined;

  return (
    <Link
      href={href}
      className={cardClasses}
      style={cardStyle}
    >
      <div className={imageContainerClasses}>
        <ImageWithFallback
          src={finalImageUrl}
          alt={finalAlt}
          className={finalImageClasses}
          loading="lazy"
          decoding="async"
          width={400}
          height={aspectRatio === 'square' ? 400 : aspectRatio === '5/6' ? 480 : 427}
          fallbackType="category"
          onError={onImageError}
          responsive={true}
          responsiveSizes={[200, 300, 400]}
          quality={85}
        />
        {showOverlay && titlePosition === 'overlay' && (
          <div className={getOverlayClasses()}>
            <h3 
              className={getTitleClasses()}
              style={overlayStyle === 'gradient' ? { textShadow: '0 1px 2px rgba(0,0,0,0.5)' } : undefined}
            >
              {title}
            </h3>
          </div>
        )}
      </div>
      {titlePosition === 'below' && (
        <div className="p-3">
          <h3 className={`${getTitleClasses()} ${titleClassName}`}>
            {title}
          </h3>
        </div>
      )}
    </Link>
  );
}, (prevProps, nextProps) => {
  // Custom comparison for memoization
  return (
    prevProps.href === nextProps.href &&
    prevProps.imageUrl === nextProps.imageUrl &&
    prevProps.title === nextProps.title &&
    prevProps.variant === nextProps.variant &&
    prevProps.aspectRatio === nextProps.aspectRatio &&
    prevProps.showOverlay === nextProps.showOverlay &&
    prevProps.overlayStyle === nextProps.overlayStyle &&
    prevProps.titlePosition === nextProps.titlePosition &&
    prevProps.mobileWidth === nextProps.mobileWidth
  );
});

Card.displayName = 'Card';

export default Card;

