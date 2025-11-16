'use client';

import { useState, useCallback, useMemo } from 'react';
import { PLACEHOLDER_CATEGORY, PLACEHOLDER_PRODUCT } from '@/utils/imageUtils';
import { isSupabaseImageUrl, transformSupabaseImageUrl, generateSrcSet } from '@/utils/imageOptimization';

interface ImageWithFallbackProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  fallback?: string;
  fallbackType?: 'category' | 'product' | 'custom';
  onError?: (e: React.SyntheticEvent<HTMLImageElement>) => void;
  fetchPriority?: 'high' | 'low' | 'auto';
  // Responsive image props
  responsive?: boolean;
  responsiveSizes?: number[];
  width?: number;
  height?: number;
  quality?: number;
}

export default function ImageWithFallback({
  src,
  alt,
  fallback,
  fallbackType = 'product',
  onError,
  fetchPriority,
  responsive = false,
  responsiveSizes,
  width,
  height,
  quality = 85,
  ...props
}: ImageWithFallbackProps) {
  const [imgSrc, setImgSrc] = useState<string>(src);
  const [hasError, setHasError] = useState(false);

  const getDefaultFallback = () => {
    if (fallback) return fallback;
    return fallbackType === 'category' ? PLACEHOLDER_CATEGORY : PLACEHOLDER_PRODUCT;
  };

  // Optimize Supabase image URLs
  const optimizedSrc = useMemo(() => {
    if (hasError || !isSupabaseImageUrl(imgSrc)) {
      return imgSrc;
    }
    
    // If width is provided, transform the URL
    if (width) {
      return transformSupabaseImageUrl(imgSrc, width, height, quality);
    }
    
    return imgSrc;
  }, [imgSrc, width, height, quality, hasError]);

  // Generate srcset for responsive images
  const srcSet = useMemo(() => {
    if (!responsive || !isSupabaseImageUrl(imgSrc) || hasError) {
      return undefined;
    }
    
    if (responsiveSizes && responsiveSizes.length > 0) {
      return generateSrcSet(imgSrc, responsiveSizes, quality);
    }
    
    // Default responsive sizes if not provided
    if (width) {
      const sizes = [
        Math.round(width * 0.5),
        Math.round(width * 0.75),
        width,
        Math.round(width * 1.5),
      ];
      return generateSrcSet(imgSrc, sizes, quality);
    }
    
    return undefined;
  }, [responsive, imgSrc, responsiveSizes, width, quality, hasError]);

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
      src={optimizedSrc || getDefaultFallback()}
      alt={alt}
      onError={handleError}
      fetchPriority={fetchPriority}
      srcSet={srcSet}
      width={width}
      height={height}
    />
  );
}

