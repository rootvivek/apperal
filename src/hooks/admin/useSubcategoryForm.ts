import { useState, useCallback } from 'react';
import { generateSlug } from '@/utils/product/slug';
import { uploadImageToSupabase, deleteImageFromSupabase } from '@/utils/imageUpload';
import { generateUuid } from '@/utils/uuid';
import { createAdminHeaders } from '@/utils/api/adminHeaders';
import { handleApiResponse } from '@/utils/api/responseHandler';
import type { Subcategory } from './useSubcategoryData';
import { createClient } from '@/lib/supabase/client';

interface SubcategoryFormData {
  name: string;
  slug: string;
  description: string;
  image_url: string;
  parent_category_id: string;
}

interface UseSubcategoryFormProps {
  userId: string | undefined;
  subcategories: Subcategory[];
  setSubcategories: React.Dispatch<React.SetStateAction<Subcategory[]>>;
  onSuccess?: () => void;
}

interface UseSubcategoryFormReturn {
  formData: SubcategoryFormData;
  setFormData: React.Dispatch<React.SetStateAction<SubcategoryFormData>>;
  editingSubcategory: Subcategory | null;
  setEditingSubcategory: (subcategory: Subcategory | null) => void;
  uploadingImage: boolean;
  editLoading: boolean;
  error: string | null;
  setError: (error: string | null) => void;
  tempSubcategoryId: string | null;
  setTempSubcategoryId: (id: string | null) => void;
  handleImageUpload: (file: File) => Promise<void>;
  handleSubmit: (e: React.FormEvent, fetchSubcategories: () => Promise<void>) => Promise<void>;
  resetForm: () => void;
  handleEdit: (subcategory: Subcategory) => void;
}

/**
 * Hook for managing subcategory form state and operations
 */
export function useSubcategoryForm({
  userId,
  subcategories,
  setSubcategories,
  onSuccess,
}: UseSubcategoryFormProps): UseSubcategoryFormReturn {
  const [formData, setFormData] = useState<SubcategoryFormData>({
    name: '',
    slug: '',
    description: '',
    image_url: '',
    parent_category_id: ''
  });
  const [editingSubcategory, setEditingSubcategory] = useState<Subcategory | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tempSubcategoryId, setTempSubcategoryId] = useState<string | null>(null);
  const supabase = createClient();

  const resetForm = useCallback(() => {
    setFormData({
      name: '',
      slug: '',
      description: '',
      image_url: '',
      parent_category_id: ''
    });
    setEditingSubcategory(null);
    setTempSubcategoryId(null);
    setError(null);
  }, []);

  const handleImageUpload = useCallback(async (file: File) => {
    setUploadingImage(true);
    setError(null);
    
    try {
      // Use existing subcategory ID if editing, otherwise use temp ID or generate new one
      let subcategoryUuid: string;
      
      if (editingSubcategory) {
        subcategoryUuid = editingSubcategory.id;
        
        // Fetch existing subcategory data from database
        const { data: existingData } = await supabase
          .from('subcategories')
          .select('image_url')
          .eq('id', editingSubcategory.id)
          .single();
        
        if (existingData?.image_url) {
          // Delete existing image from storage
          await deleteImageFromSupabase(existingData.image_url, 'subcategory-images');
        }
      } else if (tempSubcategoryId) {
        subcategoryUuid = tempSubcategoryId;
      } else {
        // Generate a new temp ID for this session
        subcategoryUuid = generateUuid();
        setTempSubcategoryId(subcategoryUuid);
      }
      
      // Get user ID
      let actualUserId: string | null = userId || null;
      
      if (!actualUserId && typeof window !== 'undefined') {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
          try {
            const user = JSON.parse(storedUser);
            actualUserId = user.id;
          } catch {
            // Invalid stored user
          }
        }
      }
    
      if (!actualUserId) {
        throw new Error('User not authenticated. Please sign in again.');
      }
      
      const result = await uploadImageToSupabase(file, 'subcategory-images', subcategoryUuid, true, actualUserId);
      
      if (result.success && result.url) {
        setFormData(prev => ({
          ...prev,
          image_url: result.url!
        }));
      } else {
        setError(result.error || 'Failed to upload image');
      }
    } catch (err: any) {
      setError('Failed to upload image: ' + err.message);
    } finally {
      setUploadingImage(false);
    }
  }, [editingSubcategory, tempSubcategoryId, userId, supabase]);

  const handleSubmit = useCallback(async (e: React.FormEvent, fetchSubcategories: () => Promise<void>) => {
    e.preventDefault();
    
    // Validation
    if (!formData.name.trim()) {
      setError('Subcategory name is required');
      return;
    }

    if (!formData.parent_category_id) {
      setError('Parent category is required');
      return;
    }
    
    try {
      setEditLoading(true);
      setError(null);
      
      if (!userId) {
        setError('User not authenticated');
        setEditLoading(false);
        return;
      }

      // Clean image_url - only include if it's a valid URL
      const imageUrl = formData.image_url.trim();
      const cleanImageUrl = imageUrl && imageUrl.startsWith('http') ? imageUrl : null;
      
      const subcategoryData = {
        name: formData.name.trim(),
        slug: generateSlug(formData.name),
        description: formData.description.trim() || undefined,
        image_url: cleanImageUrl,
        parent_category_id: formData.parent_category_id,
        is_active: true,
      };

      if (editingSubcategory) {
        // Update subcategory
        const response = await fetch('/api/admin/update-subcategory', {
          method: 'POST',
          headers: createAdminHeaders(userId),
          body: JSON.stringify({
            subcategoryId: editingSubcategory.id,
            ...subcategoryData
          }),
        });

        const data = await handleApiResponse<{ subcategory: Subcategory }>(response, 'Failed to update subcategory');
        
        setSubcategories(subcategories.map(sub => 
          sub.id === editingSubcategory.id ? { ...sub, ...data.subcategory } : sub
        ));
        setEditingSubcategory(null);
        alert('Subcategory updated successfully');
      } else {
        // Create subcategory
        const response = await fetch('/api/admin/create-subcategory', {
          method: 'POST',
          headers: createAdminHeaders(userId),
          body: JSON.stringify(subcategoryData),
        });

        const data = await handleApiResponse<{ success: boolean; subcategory: Subcategory }>(response, 'Failed to create subcategory');
        
        if (data.success && data.subcategory) {
          setSubcategories([...subcategories, data.subcategory]);
          alert('Subcategory created successfully');
        } else {
          throw new Error('Invalid response from server');
        }
      }

      resetForm();
      await fetchSubcategories(); // Refresh the list
      onSuccess?.();
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to save subcategory';
      setError(errorMessage);
      alert(errorMessage);
    } finally {
      setEditLoading(false);
    }
  }, [formData, editingSubcategory, userId, subcategories, setSubcategories, resetForm, onSuccess]);

  const handleEdit = useCallback((subcategory: Subcategory) => {
    setEditingSubcategory(subcategory);
    setFormData({
      name: subcategory.name,
      slug: subcategory.slug,
      description: subcategory.description || '',
      image_url: subcategory.image_url || '',
      parent_category_id: subcategory.parent_category_id
    });
  }, []);

  return {
    formData,
    setFormData,
    editingSubcategory,
    setEditingSubcategory,
    uploadingImage,
    editLoading,
    error,
    setError,
    tempSubcategoryId,
    setTempSubcategoryId,
    handleImageUpload,
    handleSubmit,
    resetForm,
    handleEdit,
  };
}

