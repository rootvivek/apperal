'use client';

import { useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { uploadImageToSupabase, deleteImageFromSupabase } from '@/utils/imageUpload';
import { Category } from './useCategories';

interface UseCategoryMediaProps {
  editingCategory: Category | null;
  isCreatingSubcategory: boolean;
  tempCategoryId: string | null;
  formData: {
    name: string;
    slug: string;
    image_url: string;
  };
  categories: Category[];
  subcategoriesList: Record<string, Category[]>;
  onImageUrlChange: (url: string) => void;
  onCategoryUpdate: (category: Category) => void;
  onError: (error: string) => void;
}

interface UseCategoryMediaReturn {
  uploadingImage: boolean;
  handleImageUpload: (file: File) => Promise<void>;
  addCacheBusting: (url: string | null, updatedAt?: string) => string;
}

export function useCategoryMedia({
  editingCategory,
  isCreatingSubcategory,
  tempCategoryId,
  formData,
  categories,
  subcategoriesList,
  onImageUrlChange,
  onCategoryUpdate,
  onError,
}: UseCategoryMediaProps): UseCategoryMediaReturn {
  const supabase = createClient();
  const [uploadingImage, setUploadingImage] = useState(false);

  // Add cache busting to image URL
  const addCacheBusting = useCallback((url: string | null, updatedAt?: string): string => {
    if (!url) return '';
    const baseUrl = url.split('?')[0];
    const timestamp = updatedAt ? new Date(updatedAt).getTime() : Date.now();
    return `${baseUrl}?v=${timestamp}`;
  }, []);

  // Clean image URL (remove query params)
  const cleanImageUrl = useCallback((url: string): string => {
    return url.split('?')[0];
  }, []);

  // Determine image folder and bucket
  const getImageFolderAndBucket = useCallback((): { folder: string; bucket: string } => {
    let imageFolder: string = '';
    let imageBucket: string = 'category-images';
    let isSubcategory = false;
    
    // Case 1: Editing existing category
    if (editingCategory && editingCategory.id) {
      isSubcategory = !!editingCategory.parent_category_id;
      imageBucket = isSubcategory ? 'subcategory-images' : 'category-images';
      imageFolder = editingCategory.id;
      return { folder: imageFolder, bucket: imageBucket };
    }
    
    // Case 2: Creating new category/subcategory with temp ID
    if (isCreatingSubcategory) {
      if (!tempCategoryId) {
        const newId = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
          const r = Math.random() * 16 | 0;
          const v = c === 'x' ? r : (r & 0x3 | 0x8);
          return v.toString(16);
        });
        imageFolder = newId;
      } else {
        imageFolder = tempCategoryId;
      }
      imageBucket = 'subcategory-images';
      return { folder: imageFolder, bucket: imageBucket };
    }
    
    // Case 3: Creating new parent category
    if (tempCategoryId) {
      imageFolder = tempCategoryId;
      imageBucket = 'category-images';
      return { folder: imageFolder, bucket: imageBucket };
    }
    
    // Case 4: Try to find existing category by name/slug
    if (formData.name || formData.slug) {
      const foundCategory = categories.find(cat => 
        cat.name === formData.name || cat.slug === formData.slug
      ) || Object.values(subcategoriesList).flat().find(cat => 
        cat.name === formData.name || cat.slug === formData.slug
      );
      
      if (foundCategory && foundCategory.id) {
        isSubcategory = !!foundCategory.parent_category_id;
        imageBucket = isSubcategory ? 'subcategory-images' : 'category-images';
        imageFolder = foundCategory.id;
        return { folder: imageFolder, bucket: imageBucket };
      }
    }
    
    // Case 5: Extract from existing image URL
    if (formData.image_url) {
      try {
        const url = formData.image_url;
        const categoryMatch = url.match(/category-images\/([^/]+)\//) || url.match(/subcategory-images\/([^/]+)\//);
        if (categoryMatch && categoryMatch[1]) {
          imageFolder = categoryMatch[1];
          imageBucket = url.includes('subcategory-images') ? 'subcategory-images' : 'category-images';
          return { folder: imageFolder, bucket: imageBucket };
        }
      } catch (err) {
        // Continue to generate new ID
      }
    }
    
    // Case 6: Generate new temp ID
    const categoryTempId = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
    imageFolder = categoryTempId;
    imageBucket = 'category-images';
    
    return { folder: imageFolder, bucket: imageBucket };
  }, [editingCategory, isCreatingSubcategory, tempCategoryId, formData, categories, subcategoriesList]);

  // Handle image upload
  const handleImageUpload = useCallback(async (file: File) => {
    setUploadingImage(true);
    onError('');
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.id) {
        throw new Error('User not authenticated');
      }

      // Delete old image if editing
      if (editingCategory && editingCategory.image_url) {
        const isSubcategory = !!editingCategory.parent_category_id;
        const bucket = isSubcategory ? 'subcategory-images' : 'category-images';
        try {
          await deleteImageFromSupabase(editingCategory.image_url, bucket);
        } catch (deleteErr) {
          // Continue even if deletion fails - new upload will overwrite
        }
      }
      
      // Get folder and bucket
      const { folder, bucket } = getImageFolderAndBucket();
      
      if (!folder) {
        throw new Error('Failed to determine folder ID for image upload. Please try saving the category first, then upload the image.');
      }
      
      // Upload new image
      const result = await uploadImageToSupabase(file, bucket, folder, true, user.id);
      
      if (!result.success || !result.url) {
        throw new Error(result.error || 'Failed to upload image');
      }
      
      const cleanUrl = cleanImageUrl(result.url);
      onImageUrlChange(result.url);
      
      // If editing, update category in database immediately
      if (editingCategory) {
        const isSubcategory = !!editingCategory.parent_category_id;
        
        const updateResponse = await fetch('/api/admin/update-category-image', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-User-Id': user.id,
          },
          body: JSON.stringify({
            categoryId: editingCategory.id,
            imageUrl: cleanUrl,
            isSubcategory: isSubcategory
          })
        });

        const responseData = await updateResponse.json();
        
        if (!updateResponse.ok) {
          throw new Error(`Image uploaded but failed to save to database: ${responseData.error || 'Unknown error'}`);
        }
        
        if (responseData.success) {
          const newUpdatedAt = new Date().toISOString();
          const updatedCategory: Category = { 
            ...editingCategory, 
            image_url: cleanUrl,
            updated_at: newUpdatedAt
          };
          
          onCategoryUpdate(updatedCategory);
          onImageUrlChange(addCacheBusting(cleanUrl, newUpdatedAt));
        }
      }
    } catch (err: any) {
      onError('Failed to upload image: ' + (err.message || 'Unknown error'));
    } finally {
      setUploadingImage(false);
    }
  }, [
    editingCategory,
    supabase,
    getImageFolderAndBucket,
    cleanImageUrl,
    addCacheBusting,
    onImageUrlChange,
    onCategoryUpdate,
    onError,
  ]);

  return {
    uploadingImage,
    handleImageUpload,
    addCacheBusting,
  };
}

