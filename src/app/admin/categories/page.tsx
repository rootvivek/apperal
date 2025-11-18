'use client';

import { useState, useEffect } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import AdminGuard from '@/components/admin/AdminGuard';
import ImageUpload from '@/components/ImageUpload';
import EmptyState from '@/components/EmptyState';
import ImageWithFallback from '@/components/ImageWithFallback';
import Modal from '@/components/Modal';
import DataTable from '@/components/DataTable';
import { PLACEHOLDER_CATEGORY } from '@/utils/imageUtils';
import { createClient } from '@/lib/supabase/client';
import { uploadImageToSupabase, deleteImageFromSupabase, deleteFolderContents } from '@/utils/imageUpload';
import { useAuth } from '@/contexts/AuthContext';

interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  image_url: string | null;
  parent_category_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export default function CategoriesPage() {
  const { user } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [categorySearch, setCategorySearch] = useState('');
  const [editLoading, setEditLoading] = useState(false);
  const [tempCategoryId, setTempCategoryId] = useState<string | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);
  const [subcategoriesList, setSubcategoriesList] = useState<{ [key: string]: Category[] }>({});
  const [loadingSubcats, setLoadingSubcats] = useState<string[]>([]);
  const [isCreatingSubcategory, setIsCreatingSubcategory] = useState(false);
  const [parentCategoryId, setParentCategoryId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const supabase = createClient();

  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    image_url: '',
    is_active: true,
    detail_type: '' as string | null // For subcategories: 'mobile', 'apparel', or null
  });

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      
      // Fetch only top-level categories (no parent)
      const { data, error: fetchError } = await supabase
        .from('categories')
        .select('*')
        .is('parent_category_id', null)
        .order('name', { ascending: true });

      if (fetchError) throw fetchError;
      
      // Ensure is_active exists for all categories (default to true if missing)
      const categoriesWithActive = (data || []).map((cat: any) => ({
        ...cat,
        is_active: cat.is_active !== undefined ? cat.is_active : true
      }));
      
      setCategories(categoriesWithActive);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const generateSlug = (name: string, isSubcategory: boolean = false, parentCatId?: string) => {
    let slug = name.toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    
    if (isSubcategory && parentCatId) {
      const parentContext = parentCatId.substring(0, 8);
      slug = `${slug}-${parentContext}`;
    }
    
    return slug;
  };

  const cleanImageUrl = (url: string): string => {
    return url.split('?')[0];
  };

  const addCacheBusting = (url: string | null, updatedAt?: string): string => {
    if (!url) return '';
    const baseUrl = url.split('?')[0];
    const timestamp = updatedAt ? new Date(updatedAt).getTime() : Date.now();
    return `${baseUrl}?v=${timestamp}`;
  };

  const handleImageUpload = async (file: File) => {
    setUploadingImage(true);
    setError(null);
    
    try {
      let imageFolder: string = '';
      let imageBucket: string = 'category-images';
      let isSubcategory = false;
      
      // Delete old image from storage if editing existing category
      if (editingCategory && editingCategory.id) {
        isSubcategory = !!editingCategory.parent_category_id;
        imageBucket = isSubcategory ? 'subcategory-images' : 'category-images';
        imageFolder = editingCategory.id;
        
        // Delete existing image from storage before uploading new one
        if (editingCategory.image_url) {
          try {
            await deleteImageFromSupabase(editingCategory.image_url, imageBucket);
          } catch (deleteErr) {
            // Continue even if deletion fails - new upload will overwrite
          }
        }
      } else if (showEditModal && formData.name) {
        const foundCategory = categories.find(cat => 
          cat.name === formData.name || cat.slug === formData.slug
        ) || Object.values(subcategoriesList).flat().find(cat => 
          cat.name === formData.name || cat.slug === formData.slug
        );
        
        if (foundCategory && foundCategory.id) {
          const isSubcategory = !!foundCategory.parent_category_id;
          imageBucket = isSubcategory ? 'subcategory-images' : 'category-images';
          imageFolder = foundCategory.id;
        }
      } else if (formData.image_url) {
        try {
          const url = formData.image_url;
          const categoryMatch = url.match(/category-images\/([^/]+)\//) || url.match(/subcategory-images\/([^/]+)\//);
          if (categoryMatch && categoryMatch[1]) {
            imageFolder = categoryMatch[1];
            imageBucket = url.includes('subcategory-images') ? 'subcategory-images' : 'category-images';
            } else {
            throw new Error('Could not extract folder ID from URL');
            }
          } catch (err) {
          imageFolder = '';
          }
      }
      
      if (!imageFolder) {
        if (isCreatingSubcategory) {
          if (!tempCategoryId) {
            const newId = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
          const r = Math.random() * 16 | 0;
          const v = c === 'x' ? r : (r & 0x3 | 0x8);
          return v.toString(16);
        });
            setTempCategoryId(newId);
            imageFolder = newId;
          } else {
            imageFolder = tempCategoryId;
          }
          imageBucket = 'subcategory-images';
      } else if (tempCategoryId) {
        imageFolder = tempCategoryId;
          imageBucket = 'category-images';
      } else {
        const categoryTempId = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
          const r = Math.random() * 16 | 0;
          const v = c === 'x' ? r : (r & 0x3 | 0x8);
          return v.toString(16);
        });
        imageFolder = categoryTempId;
          imageBucket = 'category-images';
        setTempCategoryId(categoryTempId);
      }
      }
      
      if (!imageFolder) {
        throw new Error('Failed to determine folder ID for image upload. Please try saving the category first, then upload the image.');
      }
      
      const result = await uploadImageToSupabase(file, imageBucket, imageFolder, true, user?.id || null);
      
      if (result.success && result.url) {
        setFormData(prev => ({
          ...prev,
          image_url: result.url!
        }));
        
        if (editingCategory) {
          try {
            const cleanUrl = cleanImageUrl(result.url!);
            const isSubcategory = !!editingCategory.parent_category_id;
            
            // Use API route to update category image (bypasses RLS)
            const headers: HeadersInit = {
              'Content-Type': 'application/json',
            };
            
            // Add user ID header for admin authentication
            if (user?.id) {
              headers['X-User-Id'] = user.id;
            }
            
            const updateResponse = await fetch('/api/admin/update-category-image', {
              method: 'POST',
              headers,
              body: JSON.stringify({
                categoryId: editingCategory.id,
                imageUrl: cleanUrl,
                isSubcategory: isSubcategory
              })
            });

            const responseData = await updateResponse.json();
            
            if (!updateResponse.ok) {
              setError(`Image uploaded but failed to save to database: ${responseData.error || 'Unknown error'}`);
              return;
            }
            
            if (responseData.success) {
              const newUpdatedAt = new Date().toISOString();
              const updatedCategory = { 
                ...editingCategory, 
                image_url: cleanUrl,
                updated_at: newUpdatedAt
              };
              
              if (editingCategory.parent_category_id && subcategoriesList[editingCategory.parent_category_id]) {
                setSubcategoriesList(prev => ({
                  ...prev,
                  [editingCategory.parent_category_id!]: prev[editingCategory.parent_category_id!].map(cat =>
                    cat.id === editingCategory.id ? updatedCategory : cat
                  )
                }));
              } else {
                setCategories(prev => prev.map(cat => 
                  cat.id === editingCategory.id ? updatedCategory : cat
                ));
              }
              
              setEditingCategory(updatedCategory);
              setFormData(prev => ({
                ...prev,
                image_url: addCacheBusting(cleanUrl, newUpdatedAt)
              }));
            }
          } catch (persistErr: any) {
            setError(`Image uploaded but failed to save to database: ${persistErr.message}`);
          }
        }
      } else {
        setError(result.error || 'Failed to upload image');
      }
    } catch (err: any) {
      setError('Failed to upload image: ' + err.message);
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      setError('Category name is required');
      return;
    }
    
    try {
      setEditLoading(true);
      
      let categoryData: any = {
        name: formData.name.trim(),
        slug: generateSlug(formData.name, isCreatingSubcategory, parentCategoryId || undefined),
        description: formData.description.trim(),
        image_url: formData.image_url.trim() ? cleanImageUrl(formData.image_url.trim()) : null,
        is_active: formData.is_active,
      };
      
      // Add detail_type for CATEGORIES (parent categories)
      // All subcategories under this category will use this detail table
      if (!isCreatingSubcategory && !editingCategory?.parent_category_id) {
        // This is a parent category - set detail_type here
        if (formData.detail_type && formData.detail_type !== '') {
          categoryData.detail_type = formData.detail_type;
        }
      }

      if (isCreatingSubcategory && parentCategoryId) {
        categoryData.parent_category_id = parentCategoryId;
        // Subcategories inherit detail_type from parent category - don't set it here
      } else if (editingCategory && editingCategory.parent_category_id) {
        categoryData.parent_category_id = editingCategory.parent_category_id;
        // Subcategories inherit detail_type from parent category - don't set it here
      }

      if (!user?.id) {
        setError('User not authenticated');
        setEditLoading(false);
        return;
      }

      if (editingCategory) {
        if (editingCategory.parent_category_id) {
          // Update subcategory using API route (bypasses RLS)
          const response = await fetch('/api/admin/update-subcategory', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-User-Id': user.id,
            },
            body: JSON.stringify({
              subcategoryId: editingCategory.id,
              ...categoryData
            }),
          });

          const data = await response.json();

          if (!response.ok) {
            throw new Error(data.error || 'Failed to update subcategory');
          }
        
          // Update subcategories cache
          if (subcategoriesList[editingCategory.parent_category_id]) {
          setSubcategoriesList(prev => ({
            ...prev,
            [editingCategory.parent_category_id!]: prev[editingCategory.parent_category_id!].map(cat =>
              cat.id === editingCategory.id ? { ...cat, ...categoryData } : cat
            )
          }));
          }
        } else {
          // Update parent category using API route (bypasses RLS)
          const response = await fetch('/api/admin/update-category', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-User-Id': user.id,
            },
            body: JSON.stringify({
              categoryId: editingCategory.id,
              ...categoryData
            }),
          });

          const data = await response.json();

          if (!response.ok) {
            throw new Error(data.error || 'Failed to update category');
          }

          // Update main categories list
          setCategories(categories.map(cat => 
            cat.id === editingCategory.id ? { ...cat, ...categoryData } : cat
          ));
        }
        setEditingCategory(null);
      } else {
        if (tempCategoryId) {
          categoryData.id = tempCategoryId;
        }

        if (isCreatingSubcategory && parentCategoryId) {
          // Create subcategory using API route (bypasses RLS)
          const response = await fetch('/api/admin/create-subcategory', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-User-Id': user.id,
            },
            body: JSON.stringify({
              ...categoryData,
              parent_category_id: parentCategoryId
            }),
          });

          const data = await response.json();

          if (!response.ok) {
            throw new Error(data.error || 'Failed to create subcategory');
          }

          const newSubcategory: Category = {
            ...data.subcategory,
            parent_category_id: parentCategoryId
          };
          setSubcategoriesList(prev => ({
            ...prev,
            [parentCategoryId]: [...(prev[parentCategoryId] || []), newSubcategory]
          }));
        } else {
          // Create parent category using API route (bypasses RLS)
          const response = await fetch('/api/admin/create-category', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-User-Id': user.id,
            },
            body: JSON.stringify(categoryData),
          });

          const data = await response.json();

          if (!response.ok) {
            throw new Error(data.error || 'Failed to create category');
          }

          setCategories([...categories, data.category]);
        }
      }

      resetForm();
      setEditLoading(false);
      setIsCreatingSubcategory(false);
      setParentCategoryId(null);
    } catch (err: any) {
      setError(err.message);
      setEditLoading(false);
    }
  };

  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      slug: category.slug,
      description: category.description || '',
      image_url: category.image_url ? addCacheBusting(category.image_url, category.updated_at) : '',
      is_active: category.is_active !== undefined ? category.is_active : true,
      detail_type: (category as any).detail_type || ''
    });
    setShowEditModal(true);
  };

  const handleDelete = async (categoryId: string) => {
    if (!confirm('Are you sure you want to delete this category? This will also delete all subcategories and products under it.')) return;

    if (!user?.id) {
      setError('User not authenticated');
      return;
    }

    try {
      setError(null);
      
      // Use API route for deletion (bypasses RLS)
      const response = await fetch('/api/admin/delete-category', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.id,
        },
        body: JSON.stringify({ categoryId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete category');
      }

      // Show success message
      alert('Category deleted successfully');
      
      // Refresh categories list
      await fetchCategories();
      
      // Double-check after a delay
      setTimeout(async () => {
        await fetchCategories();
      }, 1000);
    } catch (err: any) {
      setError(err.message || 'Failed to delete category');
      alert(`Error: ${err.message || 'Failed to delete category'}`);
    }
  };

  const handleDeleteSubcategory = async (subcategoryId: string) => {
    if (!confirm('Are you sure you want to delete this subcategory? This will also delete all products under it and their images.')) return;

    if (!user?.id) {
      setError('User not authenticated');
      return;
    }

    try {
      setError(null);
      
      // Use API route for subcategory deletion (bypasses RLS)
      const response = await fetch('/api/admin/delete-subcategory', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.id,
        },
        body: JSON.stringify({ subcategoryId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete subcategory');
      }

      // Show success message
      alert('Subcategory deleted successfully');
      
      // Refresh categories list to update subcategories
      await fetchCategories();
      
      // Refresh subcategories for the parent category
      const parentCategory = categories.find(cat => 
        subcategoriesList[cat.id]?.some(sub => sub.id === subcategoryId)
      );
      if (parentCategory) {
        // Reload subcategories for the parent category
        setLoadingSubcats(prev => [...prev, parentCategory.id]);
        try {
          const { data, error } = await supabase
            .from('subcategories')
            .select('*')
            .eq('parent_category_id', parentCategory.id)
            .eq('is_active', true)
            .order('name', { ascending: true });

          if (error) throw error;

          setSubcategoriesList(prev => ({
            ...prev,
            [parentCategory.id]: data || []
          }));
        } catch (err: any) {
          setError(`Failed to refresh subcategories: ${err.message}`);
        } finally {
          setLoadingSubcats(prev => prev.filter(id => id !== parentCategory.id));
        }
      }
      
      // Also refresh the main categories list
      await fetchCategories();
    } catch (err: any) {
      setError(err.message || 'Failed to delete subcategory');
      alert(`Error: ${err.message || 'Failed to delete subcategory'}`);
    }
  };


  const handleAddSubcategory = (parentId: string) => {
    setIsCreatingSubcategory(true);
    setParentCategoryId(parentId);
    if (!tempCategoryId) {
      const newId = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
      setTempCategoryId(newId);
    }
    resetForm();
    setShowEditModal(true);
  };

  const filteredCategories = categories.filter(cat =>
    cat.name?.toLowerCase().includes(categorySearch.toLowerCase()) ||
    cat.slug?.toLowerCase().includes(categorySearch.toLowerCase())
  );

  const formatDate = (date: string) => new Date(date).toLocaleDateString();

  // Categories are now flat (no hierarchy in this table)
  // Simply use filteredCategories

  const toggleExpandCategory = async (categoryId: string) => {
    const isExpanded = expandedCategories.includes(categoryId);
    
    if (isExpanded) {
      // Collapse
      const newExpanded = expandedCategories.filter(id => id !== categoryId);
      setExpandedCategories(newExpanded);
    } else {
      // Expand - fetch subcategories if not already cached
      if (!subcategoriesList[categoryId]) {
        setLoadingSubcats(prev => [...prev, categoryId]);
        try {
          const { data, error } = await supabase
            .from('subcategories')
            .select('*, detail_type')
            .eq('parent_category_id', categoryId)
            .order('name', { ascending: true });

          if (!error && data) {
            // Ensure is_active exists for all subcategories (default to true if missing)
            const subcategoriesWithActive = data.map((subcat: any) => ({
              ...subcat,
              is_active: subcat.is_active !== undefined ? subcat.is_active : true
            }));
            setSubcategoriesList(prev => ({
              ...prev,
              [categoryId]: subcategoriesWithActive
            }));
          }
        } catch (err) {
          // Error handled silently
        } finally {
          setLoadingSubcats(prev => prev.filter(id => id !== categoryId));
        }
      }
      
      const newExpanded = [...expandedCategories, categoryId];
      setExpandedCategories(newExpanded);
    }
  };

  const toggleCategoryStatus = async (categoryId: string, currentStatus: boolean | null | undefined, isSubcategory: boolean = false) => {
    try {
      setError(null);
      const actualCurrentStatus = currentStatus ?? true;
      const newStatus = !actualCurrentStatus;
      
      if (!user) {
        const errorMsg = 'You must be logged in to perform this action';
        setError(errorMsg);
        alert(errorMsg);
        return;
      }
      
      const response = await fetch('/api/admin/toggle-category-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': user.id,
        },
        body: JSON.stringify({
          categoryId,
          isActive: newStatus,
          isSubcategory,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        const errorMessage = result.error || 'Failed to update status';
        setError(errorMessage);
        alert(errorMessage);
        return;
      }

      const updatedItem = isSubcategory ? result.subcategory : result.category;
      if (updatedItem && updatedItem.is_active === newStatus) {
        if (isSubcategory) {
          setSubcategoriesList(prev => {
            const updated = { ...prev };
            let found = false;
            for (const parentId in updated) {
              const subcatIndex = updated[parentId].findIndex(sub => sub.id === categoryId);
              if (subcatIndex !== -1) {
                updated[parentId] = updated[parentId].map((sub, idx) => 
                  idx === subcatIndex 
                    ? { ...sub, is_active: updatedItem.is_active }
                    : sub
                );
                found = true;
                break;
              }
            }
            return found ? updated : prev;
          });
        } else {
          setCategories(prev => {
            const index = prev.findIndex(cat => cat.id === categoryId);
            if (index === -1) return prev;
            const updated = [...prev];
            updated[index] = { ...updated[index], is_active: updatedItem.is_active };
            return updated;
          });
        }
        setRefreshKey(prev => prev + 1);
      } else {
        throw new Error('Status update verification failed');
      }
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to update status';
      setError(errorMessage);
      alert(errorMessage);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      slug: '',
      description: '',
      image_url: '',
      is_active: true,
      detail_type: ''
    });
    setShowEditModal(false);
    setEditingCategory(null);
    setTempCategoryId(null);
  };

  return (
    <AdminGuard>
      <AdminLayout>
        <div className="space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-700">{error}</p>
            </div>
          )}

          {showEditModal && (
            <Modal
              isOpen={showEditModal}
              onClose={() => {
                setShowEditModal(false);
                resetForm();
                setIsCreatingSubcategory(false);
                setParentCategoryId(null);
              }}
              title={editingCategory ? 'Edit Category' : isCreatingSubcategory ? 'Add New Subcategory' : 'Add New Category'}
              variant="simple"
              size="xl"
              className="max-h-[90vh] overflow-y-auto"
            >
              <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Category Name *
                      </label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => {
                          setFormData(prev => ({
                            ...prev,
                            name: e.target.value,
                          slug: generateSlug(e.target.value, isCreatingSubcategory, parentCategoryId || undefined)
                          }));
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder="Enter category name"
                        required
                      />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description
                    </label>
                    <textarea
                      rows={3}
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter category description"
                    />
                  </div>

                  {/* Detail Type - Only for PARENT CATEGORIES (not subcategories) */}
                  {/* This creates the RELATIONSHIP: Category → Detail Table Type */}
                  {/* All subcategories under this category will inherit this setting */}
                  {!isCreatingSubcategory && (!editingCategory || !editingCategory.parent_category_id) && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Product Detail Table Type
                      </label>
                      <select
                        value={formData.detail_type || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, detail_type: e.target.value || null }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">None (Generic Products)</option>
                        <option value="mobile">Mobile Details → All products use product_mobile_details table</option>
                        <option value="apparel">Apparel Details → All products use product_apparel_details table</option>
                        <option value="accessories">Accessories Details → All products use product_accessories_details table</option>
                      </select>
                      <p className="mt-1 text-xs text-gray-500">
                        <strong>This creates a direct relationship:</strong> When you set this on a category, ALL subcategories and products under this category will automatically save their details to the selected table. 
                        Set this once when creating/editing the parent category.
                      </p>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Category Image
                    </label>
                    <ImageUpload
                      onImageUpload={handleImageUpload}
                      currentImageUrl={formData.image_url}
                      placeholder="Upload category image"
                    />
                    {uploadingImage && (
                      <p className="mt-2 text-sm text-blue-600">Uploading image...</p>
                    )}
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      name="is_active"
                      id="is_active"
                      checked={formData.is_active}
                      onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="is_active" className="ml-2 block text-sm text-gray-900">
                      Active
                    </label>
                  </div>

                  <div className="p-6 border-t border-gray-200 flex space-x-3 sticky bottom-0 bg-white -m-6 mt-0">
                    <button
                      type="button"
                      onClick={() => { setShowEditModal(false); resetForm(); }}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={editLoading}
                      className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    >
                      {editLoading ? 'Saving...' : editingCategory ? 'Update Category' : 'Create Category'}
                    </button>
                  </div>
              </form>
            </Modal>
          )}

          {/* Accordion View */}
            <div className="bg-white rounded-lg shadow p-6 space-y-4">
              {/* Header with Add Button and Search */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowEditModal(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
                >
                  ➕ Add Category
                </button>
                <button
                  onClick={() => fetchCategories()}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition font-medium"
                  title="Refresh categories from database"
                >
                  🔄 Refresh
                </button>
                <input
                  type="text"
                  placeholder="Search categories..."
                  value={categorySearch}
                  onChange={(e) => setCategorySearch(e.target.value)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-600 whitespace-nowrap">
                  {filteredCategories.length} found
                </span>
              </div>

              {/* Categories Accordion */}
            <div className="space-y-2">
              {loading ? (
                <div className="text-center py-8 text-gray-500">Loading categories...</div>
              ) : filteredCategories.length === 0 ? (
                <EmptyState
                  title="No categories found"
                  variant="compact"
                />
              ) : (
                filteredCategories.map((category) => (
                  <div key={category.id} className="border border-gray-200 rounded-lg overflow-hidden">
                    {/* Category Row */}
                    <div className="flex items-center justify-between p-4 bg-white hover:bg-gray-50 transition">
                      <div className="flex items-center flex-1 gap-4">
                        {/* Expand Button */}
                        <button
                          onClick={() => toggleExpandCategory(category.id)}
                          className="text-gray-600 hover:text-gray-900 transition"
                          title={expandedCategories.includes(category.id) ? "Collapse" : "Expand"}
                        >
                          <svg 
                            className={`w-5 h-5 transition-transform ${expandedCategories.includes(category.id) ? 'rotate-90' : ''}`}
                            fill="none" 
                            stroke="currentColor" 
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </button>

                        {/* Category Image */}
                        {category.image_url ? (
                          <img
                            src={addCacheBusting(category.image_url, category.updated_at)}
                            alt={category.name}
                            className="h-10 w-10 object-cover rounded"
                            key={`img-${category.id}-${category.updated_at}`}
                          />
                        ) : (
                          <div className="h-10 w-10 bg-gray-200 rounded flex items-center justify-center">
                            <span className="text-xs text-gray-500">No</span>
                          </div>
                        )}

                        {/* Category Info */}
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900">{category.name}</h3>
                          <p className="text-sm text-gray-600">{category.description || 'No description'}</p>
                        </div>

                        {/* Date */}
                        <div className="text-sm text-gray-500 hidden md:block">
                          {formatDate(category.created_at)}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center space-x-2 ml-4" key={`actions-${category.id}-${refreshKey}`}>
                        <button
                          onClick={async (e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            await toggleCategoryStatus(category.id, category.is_active ?? true, false);
                          }}
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full transition-colors ${
                            (category.is_active ?? true)
                              ? 'bg-green-100 text-green-800 hover:bg-green-200'
                              : 'bg-red-100 text-red-800 hover:bg-red-200'
                          }`}
                          title="Toggle Status"
                        >
                          {(category.is_active ?? true) ? 'Active' : 'Inactive'}
                        </button>
                        <button
                          onClick={() => handleAddSubcategory(category.id)}
                          className="px-3 py-1 text-sm text-green-600 hover:text-green-900 font-medium"
                          title="Add Subcategory"
                        >
                          ➕ SubCat
                        </button>
                        <button
                          onClick={() => handleEdit(category)}
                          className="px-3 py-1 text-sm text-blue-600 hover:text-blue-900 font-medium"
                          title="Edit"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => handleDelete(category.id)}
                          className="px-3 py-1 text-sm text-red-600 hover:text-red-900 font-medium"
                          title="Delete"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>

                    {/* Subcategories (Expandable) */}
                    {expandedCategories.includes(category.id) && (
                      <div className="bg-gray-50 border-t border-gray-200">
                        {loadingSubcats.includes(category.id) ? (
                          <div className="p-4 text-center text-gray-500">Loading subcategories...</div>
                        ) : (subcategoriesList[category.id]?.length || 0) > 0 ? (
                          <div className="divide-y divide-gray-200">
                            {subcategoriesList[category.id].map((subcat) => {
                              const subcategoryImage = subcat.image_url || PLACEHOLDER_CATEGORY;
                              return (
                              <div key={subcat.id} className="p-4 flex items-center justify-between ml-12 bg-gray-50 hover:bg-gray-100">
                                <div className="flex items-center gap-3 flex-1">
                                  <ImageWithFallback
                                    src={subcategoryImage}
                                    alt={subcat.name}
                                    className="w-12 h-12 object-cover rounded flex-shrink-0"
                                    fallbackType="category"
                                  />
                                  <div className="flex-1">
                                    <h4 className="font-medium text-gray-800">{subcat.name}</h4>
                                    <p className="text-sm text-gray-600">{subcat.description || 'No description'}</p>
                                  </div>
                                </div>
                                <div className="flex items-center space-x-2 ml-4" key={`subcat-actions-${subcat.id}-${refreshKey}`}>
                                  <button
                                    onClick={async (e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      await toggleCategoryStatus(subcat.id, subcat.is_active ?? true, true);
                                    }}
                                    className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full transition-colors ${
                                      (subcat.is_active ?? true)
                                        ? 'bg-green-100 text-green-800 hover:bg-green-200'
                                        : 'bg-red-100 text-red-800 hover:bg-red-200'
                                    }`}
                                    title="Toggle Status"
                                  >
                                    {(subcat.is_active ?? true) ? 'Active' : 'Inactive'}
                                  </button>
                                  <button
                                    onClick={() => handleEdit(subcat)}
                                    className="px-2 py-1 text-xs text-blue-600 hover:text-blue-900"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    onClick={() => handleDeleteSubcategory(subcat.id)}
                                    className="px-2 py-1 text-xs text-red-600 hover:text-red-900"
                                  >
                                    Delete
                                  </button>
                                </div>
                              </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="p-4 text-center text-gray-500 ml-12">
                            No subcategories yet
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
            </div>
        </div>
      </AdminLayout>
    </AdminGuard>
  );
}
