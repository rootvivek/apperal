'use client';

import { useState, useRef, useEffect } from 'react';
import { Spinner } from '@/components/ui/spinner';

interface AIEnhancedImageUploadProps {
  onImageUploaded: (url: string) => void;
  productId: string;
  currentImageUrl?: string;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

type ProcessingStage = 'idle' | 'enhancing' | 'compressing' | 'uploading' | 'success' | 'error';

export default function AIEnhancedImageUpload({
  onImageUploaded,
  productId,
  currentImageUrl,
  placeholder = "Click to upload image",
  className = "",
  disabled = false,
}: AIEnhancedImageUploadProps) {
  const [dragActive, setDragActive] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentImageUrl || null);
  const [processingStage, setProcessingStage] = useState<ProcessingStage>('idle');
  const [error, setError] = useState<string | null>(null);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Clean up blob URLs on unmount
  useEffect(() => {
    return () => {
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
      }
    };
  }, [blobUrl]);

  // Update preview when currentImageUrl changes
  useEffect(() => {
    if (currentImageUrl) {
      setPreviewUrl(currentImageUrl);
    }
  }, [currentImageUrl]);

  const handleFile = async (file: File) => {
    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    if (!allowedTypes.includes(file.type)) {
      setError('Invalid file type. Only JPG, JPEG, and PNG are allowed. HEIC is not supported.');
      setProcessingStage('error');
      return;
    }

    // Validate file size (10 MB max)
    if (file.size > 10 * 1024 * 1024) {
      setError('File size exceeds 10MB limit');
      setProcessingStage('error');
      return;
    }

    // Create preview URL
    if (blobUrl) {
      URL.revokeObjectURL(blobUrl);
    }
    const url = URL.createObjectURL(file);
    setBlobUrl(url);
    setPreviewUrl(url);
    setError(null);
    setProcessingStage('enhancing');

    try {
      // Create FormData
      const formData = new FormData();
      formData.append('file', file);
      formData.append('productId', productId);

      // Upload to enhancement API
      const response = await fetch('/api/products/enhance-upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Upload failed');
      }

      const result = await response.json();

      if (!result.success || !result.url) {
        throw new Error(result.error || 'Upload failed');
      }

      // Update preview with final URL
      setPreviewUrl(result.url);
      setProcessingStage('success');

      // Call callback with final URL
      onImageUploaded(result.url);

      // Reset to idle after a moment
      setTimeout(() => {
        setProcessingStage('idle');
      }, 2000);

    } catch (err: any) {
      setError(err.message || 'Failed to upload image');
      setProcessingStage('error');
    }
  };

  const handleFiles = (files: FileList | null) => {
    if (files && files[0] && !disabled) {
      handleFile(files[0]);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    if (disabled) return;
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    if (disabled) return;
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    handleFiles(e.target.files);
  };

  const onButtonClick = () => {
    if (!disabled) {
      fileInputRef.current?.click();
    }
  };

  const getStageMessage = () => {
    switch (processingStage) {
      case 'enhancing':
        return 'Enhancing image...';
      case 'compressing':
        return 'Compressing...';
      case 'uploading':
        return 'Uploading...';
      case 'success':
        return 'Upload successful!';
      case 'error':
        return error || 'Upload failed';
      default:
        return null;
    }
  };

  return (
    <div className={`relative ${className}`}>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png"
        onChange={handleChange}
        className="hidden"
        disabled={disabled || processingStage !== 'idle'}
      />
      
      <div
        className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
          disabled || processingStage !== 'idle'
            ? 'border-gray-200 bg-gray-50 cursor-not-allowed'
            : dragActive
            ? 'border-blue-500 bg-blue-50 cursor-pointer'
            : 'border-gray-300 hover:border-gray-400 cursor-pointer'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={onButtonClick}
      >
        {processingStage !== 'idle' && processingStage !== 'error' && processingStage !== 'success' ? (
          <div className="space-y-4">
            <div className="mx-auto h-32 w-32 bg-gray-100 rounded-lg flex items-center justify-center">
              <Spinner className="h-8 w-8 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700">{getStageMessage()}</p>
              {processingStage === 'enhancing' && (
                <p className="text-xs text-gray-500 mt-1">AI is enhancing your image...</p>
              )}
            </div>
          </div>
        ) : previewUrl ? (
          <div className="space-y-4">
            <img
              src={previewUrl}
              alt="Preview"
              className="mx-auto h-32 w-32 object-cover rounded-lg"
            />
            <div>
              <p className="text-sm text-gray-600">
                {processingStage === 'success' ? 'Image enhanced and uploaded!' : 'Click to change image'}
              </p>
              {processingStage !== 'success' && processingStage !== 'error' && (
                <p className="text-xs text-gray-500">or drag and drop a new one</p>
              )}
            </div>
            {error && (
              <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                {error}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="mx-auto h-32 w-32 bg-gray-100 rounded-lg flex items-center justify-center">
              <svg className="h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-gray-600">{placeholder}</p>
              <p className="text-xs text-gray-500">JPG, PNG up to 10MB • AI-enhanced automatically</p>
            </div>
            {error && (
              <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                {error}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

