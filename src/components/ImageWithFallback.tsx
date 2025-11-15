'use client';

import { useState, useCallback } from 'react';
import { PLACEHOLDER_CATEGORY, PLACEHOLDER_PRODUCT } from '@/utils/imageUtils';

interface ImageWithFallbackProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  fallback?: string;
  fallbackType?: 'category' | 'product' | 'custom';
  onError?: (e: React.SyntheticEvent<HTMLImageElement>) => void;
}

export default function ImageWithFallback({
  src,
  alt,
  fallback,
  fallbackType = 'product',
  onError,
  ...props
}: ImageWithFallbackProps) {
  const [imgSrc, setImgSrc] = useState<string>(src);
  const [hasError, setHasError] = useState(false);

  const getDefaultFallback = () => {
    if (fallback) return fallback;
    return fallbackType === 'category' ? PLACEHOLDER_CATEGORY : PLACEHOLDER_PRODUCT;
  };

  const handleError = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    if (!hasError) {
      setHasError(true);
      const fallbackSrc = getDefaultFallback();
      if (e.currentTarget.src !== fallbackSrc) {
        e.currentTarget.src = fallbackSrc;
        setImgSrc(fallbackSrc);
      }
    }
    
    // Call custom error handler if provided
    if (onError) {
      onError(e);
    }
  }, [hasError, fallback, fallbackType, onError]);

  // Reset error state when src changes
  if (src !== imgSrc && hasError) {
    setHasError(false);
    setImgSrc(src);
  }

  return (
    <img
      {...props}
      src={imgSrc || getDefaultFallback()}
      alt={alt}
      onError={handleError}
    />
  );
}

