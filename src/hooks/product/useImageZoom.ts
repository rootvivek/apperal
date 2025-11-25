import { useState, useRef, useEffect, useCallback } from 'react';

interface ImageContainerSize {
  width: number;
  height: number;
}

/**
 * Hook for managing image zoom preview functionality
 */
export function useImageZoom(selectedImage: number) {
  const [showZoomPreview, setShowZoomPreview] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [imageContainerSize, setImageContainerSize] = useState<ImageContainerSize>({ width: 0, height: 0 });
  const imageContainerRef = useRef<HTMLDivElement>(null);
  const mainImageRef = useRef<HTMLDivElement>(null);

  // Update image container size when it changes
  useEffect(() => {
    const updateSize = () => {
      if (mainImageRef.current) {
        const rect = mainImageRef.current.getBoundingClientRect();
        setImageContainerSize({ width: rect.width, height: rect.height });
      }
    };

    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, [selectedImage]);

  const handleMouseEnter = useCallback(() => {
    setShowZoomPreview(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setShowZoomPreview(false);
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setMousePosition({ 
      x: Math.max(0, Math.min(100, x)), 
      y: Math.max(0, Math.min(100, y)) 
    });
  }, []);

  return {
    showZoomPreview,
    mousePosition,
    imageContainerSize,
    imageContainerRef,
    mainImageRef,
    handleMouseEnter,
    handleMouseLeave,
    handleMouseMove,
  };
}

