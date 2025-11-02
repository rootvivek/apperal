'use client';

import { useState, useRef } from 'react';
import { uploadImageToSupabase, deleteImageFromSupabase } from '@/utils/imageUpload';

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
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
        // Organize by product ID only
        // Structure: {productId}/
        let folder = 'products';
        if (productId) {
          folder = productId;
        }
        // Use unique filename for products (not fixed) to allow multiple images
        const result = await uploadImageToSupabase(file, 'product-images', folder, false);
        
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
    // Delete the image from storage
    const imageToRemove = currentImages[index];
    if (imageToRemove?.image_url) {
      try {
        // Extract the file path from the URL
        const url = new URL(imageToRemove.image_url);
        const pathParts = url.pathname.split('/');
        const fileName = pathParts[pathParts.length - 1];
        const folderPath = pathParts.slice(0, pathParts.length - 1).join('/');
        
        // Delete from product-images bucket
        await deleteImageFromSupabase(imageToRemove.image_url, 'product-images');
      } catch (err) {
        // Continue with removal from UI even if storage deletion fails
      }
    }
    
    const updatedImages = currentImages.filter((_, i) => i !== index);
    // Reorder display_order
    const reorderedImages = updatedImages.map((img, i) => ({
      ...img,
      display_order: i
    }));
    onImagesChange(reorderedImages);
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
            <div key={index} className="relative group">
              <img
                src={image.image_url}
                alt={image.alt_text || `Product image ${index + 1}`}
                className="w-full h-24 object-cover rounded-lg border border-gray-200"
              />
              
              {/* Overlay with controls */}
              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all duration-200 rounded-lg flex items-center justify-center">
                <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex space-x-2">
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
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      removeImage(index);
                    }}
                    className="p-1 bg-red-500 bg-opacity-80 rounded-full hover:bg-opacity-100"
                    title="Remove image"
                  >
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
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
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                <div>
                  <p className="text-sm text-gray-600">Uploading images...</p>
                  {uploadingIndex !== null && (
                    <p className="text-xs text-gray-500">Image {uploadingIndex + 1}</p>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="mx-auto h-16 w-16 bg-gray-100 rounded-lg flex items-center justify-center">
                  <svg className="h-8 w-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Add more images</p>
                  <p className="text-xs text-gray-500">
                    {currentImages.length}/{maxImages} images • PNG, JPG, GIF up to 5MB each
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Info */}
      <div className="text-sm text-gray-500">
        <p>• Drag and drop multiple images or click to select</p>
        <p>• First image will be the main product image</p>
        <p>• Use the arrows to reorder images</p>
        <p>• Maximum {maxImages} images per product</p>
      </div>
    </div>
  );
}
