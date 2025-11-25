import { useState, useRef, useCallback, useEffect } from 'react';
import { AUTO_SLIDE_INTERVAL, AUTO_RESUME_DELAY, MIN_SWIPE_DISTANCE } from '@/constants/productCard';

interface UseImageSwiperReturn {
  currentIndex: number;
  startSliding: () => void;
  stopSliding: () => void;
  handleTouchStart: (e: React.TouchEvent) => void;
  handleTouchMove: (e: React.TouchEvent) => void;
  handleTouchEnd: () => void;
  handleDotClick: (index: number) => void;
}

/**
 * Hook for managing image carousel/swiper functionality
 */
export function useImageSwiper(imageCount: number, isTouchDevice: boolean): UseImageSwiperReturn {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const resumeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const touchStartRef = useRef<number | null>(null);
  const touchEndRef = useRef<number | null>(null);
  const lastIndexRef = useRef(0);

  const clearSlideInterval = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const clearResumeTimeout = useCallback(() => {
    if (resumeTimeoutRef.current) {
      clearTimeout(resumeTimeoutRef.current);
      resumeTimeoutRef.current = null;
    }
  }, []);

  const goToNext = useCallback(() => {
    setCurrentIndex(prev => {
      const next = (prev + 1) % imageCount;
      lastIndexRef.current = next;
      return next;
    });
  }, [imageCount]);

  const goToPrev = useCallback(() => {
    setCurrentIndex(prev => {
      const next = (prev - 1 + imageCount) % imageCount;
      lastIndexRef.current = next;
      return next;
    });
  }, [imageCount]);

  const goToIndex = useCallback((index: number) => {
    if (index >= 0 && index < imageCount) {
      setCurrentIndex(index);
      lastIndexRef.current = index;
    }
  }, [imageCount]);

  const startSliding = useCallback(() => {
    if (imageCount <= 1 || isTouchDevice) return;
    
    clearSlideInterval();
    clearResumeTimeout();
    setIsHovered(true);
    
    intervalRef.current = setInterval(() => {
      goToNext();
    }, AUTO_SLIDE_INTERVAL);
  }, [imageCount, isTouchDevice, clearSlideInterval, clearResumeTimeout, goToNext]);

  const stopSliding = useCallback(() => {
    clearSlideInterval();
    setIsHovered(false);
    
    resumeTimeoutRef.current = setTimeout(() => {
      if (!isHovered) {
        setCurrentIndex(lastIndexRef.current);
      }
    }, AUTO_RESUME_DELAY);
  }, [clearSlideInterval, isHovered]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (!isTouchDevice || imageCount <= 1) return;
    touchStartRef.current = e.touches[0].clientX;
  }, [isTouchDevice, imageCount]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isTouchDevice || imageCount <= 1 || touchStartRef.current === null) return;
    touchEndRef.current = e.touches[0].clientX;
  }, [isTouchDevice, imageCount]);

  const handleTouchEnd = useCallback(() => {
    if (!isTouchDevice || imageCount <= 1 || touchStartRef.current === null || touchEndRef.current === null) {
      touchStartRef.current = null;
      touchEndRef.current = null;
      return;
    }

    const distance = touchStartRef.current - touchEndRef.current;
    
    if (Math.abs(distance) > MIN_SWIPE_DISTANCE) {
      if (distance > 0) {
        goToNext();
      } else {
        goToPrev();
      }
    }
    
    touchStartRef.current = null;
    touchEndRef.current = null;
  }, [isTouchDevice, imageCount, goToNext, goToPrev]);

  const handleDotClick = useCallback((index: number) => {
    goToIndex(index);
  }, [goToIndex]);

  useEffect(() => {
    return () => {
      clearSlideInterval();
      clearResumeTimeout();
    };
  }, [clearSlideInterval, clearResumeTimeout]);

  return {
    currentIndex,
    startSliding,
    stopSliding,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    handleDotClick,
  };
}

