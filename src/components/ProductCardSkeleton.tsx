'use client';

import { memo } from 'react';

interface ProductCardSkeletonProps {
  variant?: 'default' | 'minimal' | 'image-only';
}

const ProductCardSkeleton = ({ variant = 'default' }: ProductCardSkeletonProps) => {
  const isImageOnly = variant === 'image-only';
  const isMinimal = variant === 'minimal';
  
  const cardClasses = isImageOnly || isMinimal
    ? "group relative bg-white rounded-none shadow-none hover:shadow-none transition-shadow duration-300 overflow-hidden block border border-gray-200 h-full"
    : "group relative bg-white rounded-[4px] shadow-sm hover:shadow-md transition-shadow duration-300 overflow-hidden block border border-gray-200";
  
  const contentClasses = isImageOnly ? "hidden" : isMinimal ? "px-1.5 py-0.5" : "p-1.5";
  const imageAspectRatio = isImageOnly ? "h-full w-full" : "aspect-[5/6] sm:aspect-[4/5]";

  return (
    <div className={cardClasses}>
      {/* Image Skeleton */}
      <div className={`${imageAspectRatio} overflow-hidden relative bg-gray-200`}>
        <div 
          className="absolute inset-0 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200"
          style={{
            backgroundSize: '200% 100%',
            animation: 'shimmer 2s ease-in-out infinite',
          }}
        />
      </div>

      {/* Content Skeleton */}
      {!isImageOnly && (
        <div className={contentClasses}>
          {/* Title and Wishlist Icon */}
          <div className="flex items-center justify-between gap-2 mb-0.5 sm:mb-1">
            <div className="flex-1 h-4 bg-gray-200 rounded overflow-hidden">
              <div 
                className="h-full w-3/4 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 rounded"
                style={{
                  backgroundSize: '200% 100%',
                  animation: 'shimmer 2s ease-in-out infinite',
                }}
              />
            </div>
            {!isImageOnly && (
              <div className="w-5 h-5 sm:w-6 sm:h-6 bg-gray-200 rounded-full flex-shrink-0 overflow-hidden">
                <div 
                  className="h-full w-full bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 rounded-full"
                  style={{
                    backgroundSize: '200% 100%',
                    animation: 'shimmer 2s ease-in-out infinite',
                  }}
                />
              </div>
            )}
          </div>
          
          {/* Price */}
          <div className="flex items-center space-x-1">
            <div className="h-4 w-16 bg-gray-200 rounded overflow-hidden">
              <div 
                className="h-full w-full bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 rounded"
                style={{
                  backgroundSize: '200% 100%',
                  animation: 'shimmer 2s ease-in-out infinite',
                }}
              />
            </div>
            <div className="h-4 w-12 bg-gray-200 rounded overflow-hidden">
              <div 
                className="h-full w-full bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 rounded"
                style={{
                  backgroundSize: '200% 100%',
                  animation: 'shimmer 2s ease-in-out infinite',
                }}
              />
            </div>
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{
        __html: `
          @keyframes shimmer {
            0% {
              background-position: -200% 0;
            }
            100% {
              background-position: 200% 0;
            }
          }
        `
      }} />
    </div>
  );
};

export default memo(ProductCardSkeleton);

