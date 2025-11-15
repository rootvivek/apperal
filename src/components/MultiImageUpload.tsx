'use client';

import { useState, useRef, useEffect } from 'react';
import { uploadImageToSupabase, deleteImageFromSupabase } from '@/utils/imageUpload';
import { useAuth } from '@/contexts/AuthContext';
import LoadingLogo from './LoadingLogo';

interface ProductImage {
  id?: string;
  image_url: string;
  alt_text?: string;
  display_order: number;
}

interface MultiImageUploadProps {
  onImagesChange: (images: ProductImage[]) => void;
  currentImages?: ProductImage[];
  maxImages?: number;
  className?: string;
  productId?: string | null;
  userId?: string | null;
}

export default function MultiImageUpload({ 
  onImagesChange, 
  currentImages = [],
  maxImages = 5,
  className = "",
  productId = null,
  userId = null
}: MultiImageUploadProps) {
  const { user } = useAuth();
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);
  const [deletingImageId, setDeletingImageId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Keep a ref of current images to avoid stale closures
  const imagesRef = useRef<ProductImage[]>(currentImages);
  
  // Keep a ref of productId to ensure it doesn't change during upload
  // Once locked, never changes to prevent creating new folders on refresh
  const productIdRef = useRef<string | null>(productId);
  
  // Helper function to extract product ID from image URL
  const extractProductIdFromUrl = (url: string): string | null => {
    const match = url.match(/\/product-images\/([a-f0-9-]{36})\//i);
    return match?.[1] || null;
  };
  
  // Update refs when props change
  useEffect(() => {
    imagesRef.current = currentImages;
    
    // Lock productId on first mount - never change it afterwards
    if (productId && !productIdRef.current) {
      productIdRef.current = productId;
    }
    // If productId prop changes but ref is already set, keep the original
    // This prevents folder changes on component remounts
  }, [currentImages, productId]);
  
  // Get user ID from auth context or prop
  const currentUserId = user?.id || userId;

  const handleFiles = async (files: FileList | null) => {
    if (!files) return;

    const fileArray = Array.from(files);
    const validFiles = fileArray.filter(file => {
      if (!file.type.startsWith('image/')) {
        alert(`File ${file.name} is not an image`);
        return false;
      }
      if (file.size > 5 * 1024 * 1024) {
        alert(`File ${file.name} is too large (max 5MB)`);
        return false;
      }
      return true;
    });

    if (validFiles.length === 0) return;

    // Check if adding these files would exceed maxImages
    if (currentImages.length + validFiles.length > maxImages) {
      alert(`Maximum ${maxImages} images allowed`);
      return;
    }

    setUploading(true);

    try {
      const uploadPromises = validFiles.map(async (file, index) => {
        setUploadingIndex(index);
        // Determine folder: Use locked productId from ref, or extract from existing images
        // This ensures all images for the same product go into the same folder
        let stableProductId = productIdRef.current || productId;
        
        // Fallback: Extract product ID from existing images if not available
        if (!stableProductId && currentImages.length > 0) {
          const extractedId = extractProductIdFromUrl(currentImages[0]?.image_url || '');
          if (extractedId) {
            stableProductId = extractedId;
            productIdRef.current = extractedId;
          }
        }
        
        // Use product ID as folder name, or default to 'products'
        const folder = stableProductId || 'products';
        // Use unique filename for products (not fixed) to allow multiple images
        // Pass user ID for admin authentication
        const result = await uploadImageToSupabase(file, 'product-images', folder, false, currentUserId);
        
        if (result.success && result.url) {
          return {
            image_url: result.url,
            alt_text: file.name.split('.')[0],
            display_order: currentImages.length + index
          };
        } else {
          throw new Error(result.error || 'Upload failed');
        }
      });

      const newImages = await Promise.all(uploadPromises);
      const updatedImages = [...currentImages, ...newImages];
      onImagesChange(updatedImages);

    } catch (error: any) {
      alert(`Upload failed: ${error.message}`);
    } finally {
      setUploading(false);
      setUploadingIndex(null);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    handleFiles(e.dataTransfer.files);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    handleFiles(e.target.files);
  };

  const onButtonClick = () => {
    fileInputRef.current?.click();
  };

  const removeImage = async (index: number) => {
    // Use ref to get latest images to avoid stale closure
    const latestImages = imagesRef.current;
    const imageToRemove = latestImages[index];
    
    if (!imageToRemove) {
      return;
    }
    
    // Confirm deletion
    if (!confirm('Are you sure you want to remove this image?')) {
      return;
    }
    
    // Store image data BEFORE optimistic update to avoid closure issues
    const imageId = imageToRemove.id;
    const imageUrl = imageToRemove.image_url;
    const fullImageData = { ...imageToRemove }; // Deep copy to preserve all data
    
    // Optimistically remove from UI first for better UX
    const updatedImages = latestImages.filter((_, i) => i !== index);
    const reorderedImages = updatedImages.map((img, i) => ({
      ...img,
      display_order: i
    }));
    onImagesChange(reorderedImages);
    
    // Set loading state
    if (imageId) {
      setDeletingImageId(imageId);
    }
    
    // Delete from database/storage in background (non-blocking)
    // Use setTimeout to make it non-blocking
    setTimeout(async () => {
      try {
        // If image has an ID, delete it from database
        if (imageId) {
          const headers: HeadersInit = {
            'Content-Type': 'application/json',
          };
          
          // Use user ID from auth context or prop
          if (currentUserId) {
            headers['X-User-Id'] = currentUserId;
          }

          // Delete image from database
          const deleteResponse = await fetch('/api/admin/delete-product-image', {
            method: 'POST',
            headers,
            body: JSON.stringify({
              imageId: imageId,
              imageUrl: imageUrl
            })
          });

          const responseData = await deleteResponse.json();

          if (!deleteResponse.ok) {
            // Re-add image to UI if deletion failed
            const restoredImages = [...reorderedImages];
            restoredImages.splice(index, 0, {
              ...fullImageData,
              display_order: index
            });
            const fixedImages = restoredImages.map((img, i) => ({
              ...img,
              display_order: i
            }));
            onImagesChange(fixedImages);
            alert(`Failed to delete image: ${responseData.error || 'Unknown error'}`);
            setDeletingImageId(null);
            return;
          }

          setDeletingImageId(null);
        } else {
          // If no ID, delete from storage (for newly uploaded images not yet saved)
          if (imageUrl) {
            deleteImageFromSupabase(imageUrl, 'product-images')
              .catch(() => {})
              .finally(() => setDeletingImageId(null));
          } else {
            setDeletingImageId(null);
          }
        }
      } catch (err: any) {
        // Re-add image to UI if deletion failed
        const restoredImages = [...reorderedImages];
        restoredImages.splice(index, 0, {
          ...fullImageData,
          display_order: index
        });
        const fixedImages = restoredImages.map((img, i) => ({
          ...img,
          display_order: i
        }));
        onImagesChange(fixedImages);
        alert(`Failed to delete image: ${err.message || 'Unknown error'}`);
        setDeletingImageId(null);
      }
    }, 0); // Execute in next tick to not block click handler
  };

  const moveImage = (fromIndex: number, toIndex: number) => {
    const updatedImages = [...currentImages];
    const [movedImage] = updatedImages.splice(fromIndex, 1);
    updatedImages.splice(toIndex, 0, movedImage);
    
    // Update display_order
    const reorderedImages = updatedImages.map((img, i) => ({
      ...img,
      display_order: i
    }));
    onImagesChange(reorderedImages);
  };

  const canAddMore = currentImages.length < maxImages;

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Image Grid */}
      {currentImages.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {currentImages.map((image, index) => (
            <div key={image.id || index} className="relative group">
              <img
                src={image.image_url}
                alt={image.alt_text || `Product image ${index + 1}`}
                className="w-full aspect-square object-cover rounded-lg border border-gray-200"
              />
              
              {/* Overlay with controls */}
              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all duration-200 rounded-lg flex items-center justify-center z-10">
                <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex space-x-2 pointer-events-auto">
                  {/* Move up */}
                  {index > 0 && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        moveImage(index, index - 1);
                      }}
                      className="p-1 bg-white bg-opacity-80 rounded-full hover:bg-opacity-100"
                      title="Move up"
                    >
                      <svg className="w-4 h-4 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                      </svg>
                    </button>
                  )}
                  
                  {/* Move down */}
                  {index < currentImages.length - 1 && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        moveImage(index, index + 1);
                      }}
                      className="p-1 bg-white bg-opacity-80 rounded-full hover:bg-opacity-100"
                      title="Move down"
                    >
                      <svg className="w-4 h-4 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                  )}
                  
                  {/* Remove */}
                  <button
                    type="button"
                    onClick={async (e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      e.nativeEvent.stopImmediatePropagation();
                      await removeImage(index);
                    }}
                    disabled={deletingImageId === image.id}
                    className={`p-1.5 bg-red-500 bg-opacity-90 rounded-full hover:bg-opacity-100 transition-all z-20 ${
                      deletingImageId === image.id ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:scale-110'
                    }`}
                    title={deletingImageId === image.id ? "Deleting..." : "Remove image"}
                    style={{ pointerEvents: 'auto', zIndex: 20 }}
                  >
                    {deletingImageId === image.id ? (
                      <LoadingLogo size="sm" inline text="" />
                    ) : (
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
              
              {/* Order indicator */}
              <div className="absolute top-2 left-2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
                {index + 1}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload Area */}
      {canAddMore && (
        <div className="relative">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleChange}
            className="hidden"
          />
          
          <div
            className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
              dragActive 
                ? 'border-blue-500 bg-blue-50' 
                : 'border-gray-300 hover:border-gray-400'
            } ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={uploading ? undefined : onButtonClick}
          >
            {uploading ? (
              <div className="space-y-4">
                <LoadingLogo size="md" text="Loading images..." />
                <div>
                  <p className="text-sm text-gray-600">Uploading images...</p>
                  {uploadingIndex !== null && (
                    <p className="text-xs text-gray-500">Image {uploadingIndex + 1}</p>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="mx-auto aspect-square w-full max-w-48 bg-gray-100 rounded-lg flex items-center justify-center">
                  <svg className="h-8 w-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
