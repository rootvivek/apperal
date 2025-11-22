'use client';

import { useState, useEffect, useRef } from 'react';
import ImageWithFallback from '@/components/ImageWithFallback';
import { PLACEHOLDER_PRODUCT } from '@/utils/imageUtils';

interface ProductMediaProps {
  product: {
    id: string;
    name: string;
    badge?: string | null;
    image_url: string;
    images?: {
      id: string;
      image_url: string;
      alt_text?: string;
      display_order: number;
    }[];
  };
  selectedImage: number;
  setSelectedImage: (index: number) => void;
  handleWishlistToggle: (e?: React.MouseEvent) => void;
  handleShare: (e?: React.MouseEvent) => void;
  isInWishlist: (productId: string) => boolean;
  wishlistLoading: boolean;
  isSharing: boolean;
}

export default function ProductMedia({
  product,
  selectedImage,
  setSelectedImage,
  handleWishlistToggle,
  handleShare,
  isInWishlist,
  wishlistLoading,
  isSharing,
}: ProductMediaProps) {
  const [showZoomPreview, setShowZoomPreview] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [imageContainerSize, setImageContainerSize] = useState({ width: 0, height: 0 });
  const [zoomPreviewPosition, setZoomPreviewPosition] = useState({ left: 0, top: 0 });
  const imageContainerRef = useRef<HTMLDivElement>(null);

  // Reset zoom preview when selected image changes
  useEffect(() => {
    if (showZoomPreview && product && product.images && product.images.length > 0) {
      if (imageContainerRef.current) {
        const rect = imageContainerRef.current.getBoundingClientRect();
        setImageContainerSize({ width: rect.width, height: rect.height });
        setZoomPreviewPosition({
          left: rect.right + 16,
          top: rect.top
        });
      }
    }
  }, [selectedImage, showZoomPreview, product]);

  return (
    <div className="w-full overflow-visible">
      {/* Desktop: Thumbnails on Left, Main Image on Right */}
      <div className="hidden md:flex gap-2 overflow-visible">
        {/* Thumbnail Gallery - Left (Desktop only) */}
        {product.images && product.images.length > 1 && (
          <div className="flex flex-col gap-2 flex-shrink-0 max-h-[600px] overflow-y-auto pr-1">
            {product.images.map((image, index) => (
              <button
                key={image.id}
                onClick={() => setSelectedImage(index)}
                className={`flex-shrink-0 w-20 h-20 rounded transition-all duration-200 shadow-sm flex items-center justify-center bg-white border ${
                  selectedImage === index 
                    ? 'scale-105 border-brand/50' 
                    : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
                }`}
                style={{ boxSizing: 'border-box' }}
              >
                <div className="w-full h-full overflow-hidden rounded">
                  <ImageWithFallback
                    src={image.image_url}
                    alt={image.alt_text || `${product.name} ${index + 1}`}
                    className="h-full w-full object-contain"
                    loading="lazy"
                    decoding="async"
                    width={80}
                    height={80}
                    fallbackType="product"
                  />
                </div>
              </button>
            ))}
          </div>
        )}
        
        {/* Main Image Container - Desktop */}
        <div className="flex-1 relative overflow-visible flex items-center justify-center">
          {/* Main Image */}
          <div 
            ref={imageContainerRef}
            className="aspect-square rounded bg-white cursor-default md:cursor-crosshair relative w-full max-w-[600px] max-h-[600px] overflow-hidden"
            onTouchStart={(e) => {
              setTouchStart(e.targetTouches[0].clientX);
            }}
            onTouchMove={(e) => {
              setTouchEnd(e.targetTouches[0].clientX);
            }}
            onTouchEnd={() => {
              if (!touchStart || !touchEnd) return;
              
              const distance = touchStart - touchEnd;
              const isLeftSwipe = distance > 50;
              const isRightSwipe = distance < -50;
              
              if (isLeftSwipe && product.images && selectedImage < product.images.length - 1) {
                setSelectedImage(selectedImage + 1);
              }
              if (isRightSwipe && selectedImage > 0) {
                setSelectedImage(selectedImage - 1);
              }
              
              setTouchStart(null);
              setTouchEnd(null);
            }}
            onMouseEnter={() => {
              setShowZoomPreview(true);
              if (imageContainerRef.current) {
                const rect = imageContainerRef.current.getBoundingClientRect();
                setImageContainerSize({ width: rect.width, height: rect.height });
                setZoomPreviewPosition({
                  left: rect.right + 16,
                  top: rect.top
                });
              }
            }}
            onMouseLeave={() => setShowZoomPreview(false)}
            onMouseMove={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const x = ((e.clientX - rect.left) / rect.width) * 100;
              const y = ((e.clientY - rect.top) / rect.height) * 100;
              setMousePosition({ x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) });
              
              // Update zoom preview position as mouse moves
              if (imageContainerRef.current) {
                const containerRect = imageContainerRef.current.getBoundingClientRect();
                setZoomPreviewPosition({
                  left: containerRect.right + 16,
                  top: containerRect.top
                });
              }
            }}
          >
            {/* Product Badge - Top Left Corner */}
            {product.badge && (() => {
              const badgeStyle = (() => {
                switch (product.badge?.toUpperCase()) {
                  case 'NEW':
                    return 'bg-green-500 text-white';
                  case 'SALE':
                    return 'bg-red-500 text-white';
                  case 'HOT':
                    return 'bg-brand-400 text-white';
                  case 'FEATURED':
                    return 'bg-brand-400 text-white';
                  case 'LIMITED':
                    return 'bg-purple-500 text-white';
                  default:
                    return 'bg-gray-500 text-white';
                }
              })();
              return (
                <div className="absolute top-0 left-0 z-30 pointer-events-none m-0">
                  <span className={`px-3 py-2 text-[10px] sm:text-xs font-medium ${badgeStyle}`}>
                    {product.badge}
                  </span>
                </div>
              );
            })()}
            
            {/* Wishlist and Share Icons */}
            <div className="absolute top-2 right-2 z-30 flex flex-col gap-3">
              <button
                onClick={handleWishlistToggle}
                disabled={wishlistLoading}
                className={`p-2.5 sm:p-3 bg-white bg-opacity-95 hover:bg-opacity-100 rounded-full shadow-lg transition-all duration-200 ${
                  wishlistLoading ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-xl hover:scale-110'
                }`}
                aria-label={product && isInWishlist(product.id) ? 'Remove from wishlist' : 'Add to wishlist'}
                type="button"
              >
                <svg 
                  className={`w-4 h-4 sm:w-5 sm:h-5 transition-colors ${
                    product && isInWishlist(product.id) 
                      ? 'text-red-500 fill-current' 
                      : 'text-gray-400 hover:text-red-500'
                  }`} 
                  fill={product && isInWishlist(product.id) ? 'currentColor' : 'none'} 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              </button>
              <button
                onClick={handleShare}
                disabled={isSharing}
                className={`p-2.5 sm:p-3 bg-white bg-opacity-95 hover:bg-opacity-100 rounded-full shadow-lg transition-all duration-200 ${
                  isSharing ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-xl hover:scale-110'
                }`}
                title="Share this product"
                aria-label="Share this product"
                type="button"
              >
                <svg 
                  className={`w-4 h-4 sm:w-5 sm:h-5 transition-colors ${
                    isSharing 
                      ? 'text-brand' 
                      : 'text-gray-400 hover:text-brand'
                  }`}
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
                </svg>
              </button>
            </div>

            <ImageWithFallback
              key={`main-image-${selectedImage}`}
              src={product.images && product.images.length > 0 
                ? product.images[selectedImage]?.image_url 
                : product.image_url || PLACEHOLDER_PRODUCT}
              alt={product.name}
              className="h-full w-full object-cover"
              loading="eager"
              decoding="async"
              width={1200}
              height={1200}
              fetchPriority="high"
              fallbackType="product"
              responsive={true}
              responsiveSizes={[640, 800, 1200]}
              quality={85}
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 800px"
            />
            
            {/* Magnifying Glass Overlay */}
            {showZoomPreview && (
              <div 
                className="hidden md:block absolute w-20 h-20 border-2 border-brand bg-white bg-opacity-50 rounded-full pointer-events-none z-10"
                style={{
                  left: `${mousePosition.x}%`,
                  top: `${mousePosition.y}%`,
                  transform: 'translate(-50%, -50%)'
                }}
              >
                <div className="w-full h-full rounded-full overflow-hidden">
                  <ImageWithFallback
                    key={`zoom-overlay-${selectedImage}`}
                    src={product.images && product.images.length > 0 
                      ? product.images[selectedImage]?.image_url 
                      : product.image_url || PLACEHOLDER_PRODUCT}
                    alt={product.name}
                    className="w-full h-full object-cover"
                    style={{
                      transform: `scale(3)`,
                      transformOrigin: `${mousePosition.x}% ${mousePosition.y}%`
                    }}
                    fallbackType="product"
                  />
                </div>
              </div>
            )}
            
          </div>
          
          {/* Zoomed Image Preview - Right Side */}
          {showZoomPreview && imageContainerSize.width > 0 && (
            <div 
              className="hidden md:block fixed bg-white rounded shadow-2xl z-50 overflow-hidden aspect-square"
              style={{
                width: `${imageContainerSize.width}px`,
                height: `${imageContainerSize.height}px`,
                left: `${zoomPreviewPosition.left}px`,
                top: `${zoomPreviewPosition.top}px`
              }}
            >
              <ImageWithFallback
                key={`zoom-preview-${selectedImage}`}
                src={product.images && product.images.length > 0 
                  ? product.images[selectedImage]?.image_url 
                  : product.image_url || PLACEHOLDER_PRODUCT}
                alt={product.name}
                className="w-full h-full object-contain"
                style={{
                  transform: `scale(3)`,
                  transformOrigin: `${mousePosition.x}% ${mousePosition.y}%`
                }}
                fallbackType="product"
              />
            </div>
          )}
        </div>
      </div>
      
      {/* Mobile: Main Image Container */}
      <div className="md:hidden w-full relative">
        {/* Main Image */}
        <div 
          ref={imageContainerRef}
          className="aspect-square rounded bg-white cursor-default w-full max-w-full overflow-hidden relative"
          onTouchStart={(e) => {
            setTouchStart(e.targetTouches[0].clientX);
          }}
          onTouchMove={(e) => {
            setTouchEnd(e.targetTouches[0].clientX);
          }}
          onTouchEnd={() => {
            if (!touchStart || !touchEnd) return;
            
            const distance = touchStart - touchEnd;
            const isLeftSwipe = distance > 50;
            const isRightSwipe = distance < -50;
            
            if (isLeftSwipe && product.images && selectedImage < product.images.length - 1) {
              setSelectedImage(selectedImage + 1);
            }
            if (isRightSwipe && selectedImage > 0) {
              setSelectedImage(selectedImage - 1);
            }
            
            setTouchStart(null);
            setTouchEnd(null);
          }}
        >
          {/* Product Badge - Top Left Corner */}
          {product.badge && (() => {
            const badgeStyle = (() => {
              switch (product.badge?.toUpperCase()) {
                case 'NEW':
                  return 'bg-green-500 text-white';
                case 'SALE':
                  return 'bg-red-500 text-white';
                case 'HOT':
                  return 'bg-brand-400 text-white';
                case 'FEATURED':
                  return 'bg-brand-400 text-white';
                case 'LIMITED':
                  return 'bg-purple-500 text-white';
                default:
                  return 'bg-gray-500 text-white';
              }
            })();
            return (
              <div className="absolute top-0 left-0 z-20 m-0">
                <span className={`px-3 py-2 text-[10px] sm:text-xs font-medium ${badgeStyle}`}>
                  {product.badge}
                </span>
              </div>
            );
          })()}
          
          {/* Wishlist and Share Icons */}
          <div className="absolute top-2 right-2 z-20 flex flex-col gap-3">
            <button
              onClick={handleWishlistToggle}
              disabled={wishlistLoading}
              className={`p-2.5 bg-white bg-opacity-95 hover:bg-opacity-100 rounded-full shadow-lg transition-all duration-200 ${
                wishlistLoading ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-xl hover:scale-110'
              }`}
              aria-label={product && isInWishlist(product.id) ? 'Remove from wishlist' : 'Add to wishlist'}
              type="button"
            >
              <svg 
                className={`w-4 h-4 transition-colors ${
                  product && isInWishlist(product.id) 
                    ? 'text-red-500 fill-current' 
                    : 'text-gray-400 hover:text-red-500'
                }`} 
                fill={product && isInWishlist(product.id) ? 'currentColor' : 'none'} 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </button>
            <button
              onClick={handleShare}
              disabled={isSharing}
              className={`p-2.5 bg-white bg-opacity-95 hover:bg-opacity-100 rounded-full shadow-lg transition-all duration-200 ${
                isSharing ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-xl hover:scale-110'
              }`}
              title="Share this product"
              aria-label="Share this product"
              type="button"
            >
              <svg 
                className={`w-4 h-4 transition-colors ${
                  isSharing 
                    ? 'text-brand' 
                    : 'text-gray-400 hover:text-brand'
                }`}
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
              </svg>
            </button>
          </div>

          <ImageWithFallback
            key={`mobile-main-image-${selectedImage}`}
            src={product.images && product.images.length > 0 
              ? product.images[selectedImage]?.image_url 
              : product.image_url || PLACEHOLDER_PRODUCT}
            alt={product.name}
            className="h-full w-full object-cover"
            loading="eager"
            decoding="async"
            width={800}
            height={800}
            fetchPriority="high"
            fallbackType="product"
            responsive={true}
            responsiveSizes={[640, 800]}
            quality={85}
            sizes="100vw"
          />
        </div>
      </div>
      
      {/* Thumbnail Gallery - Bottom (Mobile only) */}
      {product.images && product.images.length > 1 && (
        <div 
          className="md:hidden flex gap-1.5 sm:gap-2 overflow-x-auto pb-2 pt-2 mt-0.5 sm:mt-3 scrollbar-hide items-center px-1"
          style={{ touchAction: 'pan-x pan-y' }}
        >
          {product.images.map((image, index) => (
                  <button
                    key={image.id}
                    onClick={() => setSelectedImage(index)}
                    className={`flex-shrink-0 w-20 h-20 rounded transition-all duration-200 shadow-sm flex items-center justify-center bg-white border ${
                      selectedImage === index 
                        ? 'scale-105 border-brand/50' 
                        : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
                    }`}
                    style={{ boxSizing: 'border-box' }}
                  >
              <div className="w-full h-full overflow-hidden rounded">
                <ImageWithFallback
                  src={image.image_url}
                  alt={image.alt_text || `${product.name} ${index + 1}`}
                  className="h-full w-full object-cover"
                  loading="lazy"
                  decoding="async"
                  width={80}
                  height={80}
                  fallbackType="product"
                  responsive={true}
                  responsiveSizes={[80, 160]}
                  quality={85}
                />
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

