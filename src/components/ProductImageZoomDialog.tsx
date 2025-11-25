'use client';

import { ReactNode } from 'react';
import ImageWithFallback from '@/components/ImageWithFallback';
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from '@/components/ui/dialog';

interface ProductImageZoomDialogProps {
  src: string;
  alt: string;
  children: ReactNode;
}

/**
 * Reusable zoom dialog for product images.
 * - Mobile: tap image to open a full-screen zoomable view.
 * - Can be reused for any product/gallery image that needs tap-to-zoom.
 */
export function ProductImageZoomDialog({
  src,
  alt,
  children,
}: ProductImageZoomDialogProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="p-0 w-full max-w-[100vw] h-[100vh] max-h-[100vh] bg-black flex items-center justify-center sm:max-w-3xl sm:h-auto sm:max-h-[90vh]">
        <ImageWithFallback
          src={src}
          alt={alt}
          className="w-full h-full object-contain"
          fallbackType="product"
          loading="eager"
          decoding="async"
          width={1600}
          height={1600}
          responsive
          responsiveSizes={[640, 1024, 1440, 1600]}
          quality={90}
          sizes="100vw"
        />
      </DialogContent>
    </Dialog>
  );
}


