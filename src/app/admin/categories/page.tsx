'use client';

import { useState, useEffect } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import AdminGuard from '@/components/admin/AdminGuard';
import ImageUpload from '@/components/ImageUpload';
import DataTable from '@/components/DataTable';
import { createClient } from '@/lib/supabase/client';
import { uploadImageToSupabase, deleteImageFromSupabase, deleteFolderContents } from '@/utils/imageUpload';

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
      
      if (editingCategory && editingCategory.id) {
        const isSubcategory = !!editingCategory.parent_category_id;
        imageBucket = isSubcategory ? 'subcategory-images' : 'category-images';
        imageFolder = editingCategory.id;
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
      
      const result = await uploadImageToSupabase(file, imageBucket, imageFolder, true);
      
      if (result.success && result.url) {
        setFormData(prev => ({
          ...prev,
          image_url: result.url!
        }));
        
        if (editingCategory) {
          try {
            const cleanUrl = cleanImageUrl(result.url!);
            
            const isSubcategory = !!editingCategory.parent_category_id;
            const tableName = isSubcategory ? 'subcategories' : 'categories';
            
            const { error: imgUpdateError } = await supabase
              .from(tableName)
              .update({ image_url: cleanUrl, updated_at: new Date().toISOString() })
              .eq('id', editingCategory.id);
            
            if (imgUpdateError) {
              setError(`Image uploaded but failed to save to database: ${imgUpdateError.message}`);
            } else {
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

      if (editingCategory) {
        if (editingCategory.parent_category_id) {
          // Update subcategory in subcategories table
          // Try with detail_type first, fallback without it if column doesn't exist
          let updateData = { ...categoryData };
          let { error: updateError } = await supabase
            .from('subcategories')
            .update(updateData)
          .eq('id', editingCategory.id);

          // If error about detail_type column, retry without it
          if (updateError && updateError.message?.includes('detail_type')) {
            const { detail_type, ...dataWithoutDetailType } = updateData;
            const { error: retryError } = await supabase
              .from('subcategories')
              .update(dataWithoutDetailType)
              .eq('id', editingCategory.id);
            updateError = retryError;
          }

        if (updateError) throw updateError;
        
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
          // Update parent category in categories table
          // Try with detail_type first, fallback without it if column doesn't exist
          let updateData = { ...categoryData };
          let { error: updateError } = await supabase
            .from('categories')
            .update(updateData)
            .eq('id', editingCategory.id);

          // If error about detail_type column, retry without it
          if (updateError && updateError.message?.includes('detail_type')) {
            const { detail_type, ...dataWithoutDetailType } = updateData;
            const { error: retryError } = await supabase
              .from('categories')
              .update(dataWithoutDetailType)
              .eq('id', editingCategory.id);
            updateError = retryError;
          }

          if (updateError) throw updateError;

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
          // Try insert with detail_type first
          let insertData = { ...categoryData };
          let { data, error: insertError } = await supabase
            .from('subcategories')
            .insert([insertData])
          .select();

          // If error about detail_type column, retry without it
          if (insertError && insertError.message?.includes('detail_type')) {
            const { detail_type, ...dataWithoutDetailType } = insertData;
            const result = await supabase
              .from('subcategories')
              .insert([dataWithoutDetailType])
              .select();
            data = result.data;
            insertError = result.error;
          }

        if (insertError) throw insertError;
          if (!data || !data[0]) throw new Error('Failed to create subcategory');

          const newSubcategory: Category = {
            ...data[0],
            parent_category_id: parentCategoryId
          };
          setSubcategoriesList(prev => ({
            ...prev,
            [parentCategoryId]: [...(prev[parentCategoryId] || []), newSubcategory]
          }));
        } else {
          // Insert parent category (with detail_type)
          // Try with detail_type first, fallback without it if column doesn't exist
          let insertData = { ...categoryData };
          let { data, error: insertError } = await supabase
            .from('categories')
            .insert([insertData])
            .select();

          // If error about detail_type column, retry without it
          if (insertError && insertError.message?.includes('detail_type')) {
            const { detail_type, ...dataWithoutDetailType } = insertData;
            const result = await supabase
              .from('categories')
              .insert([dataWithoutDetailType])
              .select();
            data = result.data;
            insertError = result.error;
          }

          if (insertError) throw insertError;
          if (!data || !data[0]) throw new Error('Failed to create category');

          setCategories([...categories, data[0]]);
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

    try {
      let categoryToDelete = categories.find(cat => cat.id === categoryId);
      let isSubcategoryToDelete = false;
      
      if (!categoryToDelete) {
        const { data: subcat, error: subcatFetchError } = await supabase
          .from('subcategories')
          .select('*')
          .eq('id', categoryId)
          .single();
        if (subcatFetchError) throw new Error('Category not found: ' + subcatFetchError.message);
        categoryToDelete = subcat as any as Category;
        isSubcategoryToDelete = true;
      }
      
      if (!categoryToDelete?.parent_category_id) {
        const { data: subcats, error: subcatError } = await supabase
          .from('subcategories')
          .select('*')
          .eq('parent_category_id', categoryId);

        if (!subcatError && subcats && subcats.length > 0) {
          for (const subcat of subcats) {
            try {
              let prodIdsRes = await supabase
                .from('products')
                .select('id')
                .eq('subcategory_id', subcat.id);
              let prodIdsError = prodIdsRes.error as any;
              let prodIds = prodIdsRes.data as any[] | null;
              if (prodIdsError && (prodIdsError.message?.includes('column') || prodIdsError.message?.includes('does not exist'))) {
                const legacy = await supabase
                  .from('products')
                  .select('id')
                  .eq('subcategory', subcat.name);
                prodIds = legacy.data as any[] | null;
              }
              if (prodIds && prodIds.length > 0) {
                for (const p of prodIds) {
                  try { await deleteFolderContents('product-images', p.id); } catch {}
                }
              }
            } catch {}
            
            let del = await supabase
              .from('products')
              .delete()
              .eq('subcategory_id', subcat.id);
            let prodDeleteError = del.error as any;
            if (prodDeleteError && (prodDeleteError.message?.includes('column') || prodDeleteError.message?.includes('does not exist'))) {
              await supabase
              .from('products')
              .delete()
              .eq('subcategory', subcat.name);
            }
            
            try {
              await deleteFolderContents('subcategory-images', subcat.id);
            } catch {}
              try {
              await deleteFolderContents('category-images', subcat.id);
            } catch {}
            }

          const { error: subcatDeleteError } = await supabase
            .from('subcategories')
            .delete()
            .eq('parent_category_id', categoryId);

          if (subcatDeleteError) throw subcatDeleteError;
        }

        try {
          let catProdRes = await supabase
            .from('products')
            .select('id')
            .eq('category_id', categoryId);
          let catProdErr = catProdRes.error as any;
          let catProds = catProdRes.data as any[] | null;
          if (catProdErr && (catProdErr.message?.includes('column') || catProdErr.message?.includes('does not exist'))) {
            const legacy = await supabase
              .from('products')
              .select('id')
              .eq('category', categoryToDelete?.name as string);
            catProds = legacy.data as any[] | null;
          }
          if (catProds && catProds.length > 0) {
            for (const p of catProds) { try { await deleteFolderContents('product-images', p.id); } catch {} }
            let del = await supabase.from('products').delete().eq('category_id', categoryId);
            let delErr = del.error as any;
            if (delErr && (delErr.message?.includes('column') || delErr.message?.includes('does not exist'))) {
              await supabase.from('products').delete().eq('category', categoryToDelete?.name as string);
            }
          }
        } catch {}
      } else {
        try {
          let prodIdsRes = await supabase
          .from('products')
            .select('id')
            .eq('subcategory_id', categoryToDelete.id);
          let prodIdsErr = prodIdsRes.error as any;
          let prodIds = prodIdsRes.data as any[] | null;
          if (prodIdsErr && (prodIdsErr.message?.includes('column') || prodIdsErr.message?.includes('does not exist'))) {
            const legacy = await supabase
              .from('products')
              .select('id')
          .eq('subcategory', categoryToDelete.name);
            prodIds = legacy.data as any[] | null;
          }
          if (prodIds && prodIds.length > 0) {
            for (const p of prodIds) { try { await deleteFolderContents('product-images', p.id); } catch {} }
          }
          try { await deleteFolderContents('subcategory-images', categoryToDelete.id); } catch {}
          try { await deleteFolderContents('category-images', categoryToDelete.id); } catch {}
        } catch {}
        
        let del = await supabase
          .from('products')
          .delete()
          .eq('subcategory_id', categoryToDelete.id);
        let prodError = del.error as any;
        if (prodError && (prodError.message?.includes('column') || prodError.message?.includes('does not exist'))) {
          await supabase
            .from('products')
            .delete()
            .eq('subcategory', categoryToDelete.name);
      }
      }

      if (isSubcategoryToDelete || categoryToDelete?.parent_category_id) {
        const { error: deleteError } = await supabase
          .from('subcategories')
          .delete()
          .eq('id', categoryId);
        if (deleteError) throw deleteError;
      } else {
      const { error: deleteError } = await supabase
        .from('categories')
        .delete()
        .eq('id', categoryId);
      if (deleteError) throw deleteError;
      }
      
      if (!categoryToDelete?.parent_category_id) {
        try {
          await deleteFolderContents('category-images', categoryId);
        } catch {}
      }
      if (isSubcategoryToDelete || categoryToDelete?.parent_category_id) {
        if (categoryToDelete?.parent_category_id && subcategoriesList[categoryToDelete.parent_category_id]) {
          setSubcategoriesList(prev => ({
            ...prev,
            [categoryToDelete.parent_category_id!]: prev[categoryToDelete.parent_category_id!].filter(cat => cat.id !== categoryId)
          }));
        }
      } else {
      setCategories(categories.filter(cat => cat.id !== categoryId));
      if (subcategoriesList[categoryId]) {
          const newSubcats = { ...subcategoriesList } as any;
        delete newSubcats[categoryId];
        setSubcategoriesList(newSubcats);
      }
      }
    } catch (err: any) {
      setError(err.message);
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

  const toggleCategoryStatus = async (categoryId: string, currentStatus: boolean, isSubcategory: boolean = false) => {
    try {
      const newStatus = !currentStatus;
      const tableName = isSubcategory ? 'subcategories' : 'categories';
      
      const { error } = await supabase
        .from(tableName)
        .update({ is_active: newStatus })
        .eq('id', categoryId);

      if (error) {
        throw error;
      }

      // Update state using functional updates - create new arrays/objects to force re-render
      if (isSubcategory) {
        setSubcategoriesList(prev => {
          const updated = { ...prev };
          let found = false;
          for (const parentId in updated) {
            const subcatIndex = updated[parentId].findIndex(sub => sub.id === categoryId);
            if (subcatIndex !== -1) {
              // Create completely new array and new object to force React re-render
              updated[parentId] = updated[parentId].map((sub, idx) => 
                idx === subcatIndex 
                  ? { ...sub, is_active: newStatus }
                  : sub
              );
              found = true;
              break;
            }
          }
          return found ? updated : prev;
        });
      } else {
        // Create new array with updated category to force React re-render
        setCategories(prev => {
          const index = prev.findIndex(cat => cat.id === categoryId);
          if (index === -1) return prev;
          
          // Create new array with new category object
          const updated = [...prev];
          updated[index] = { ...updated[index], is_active: newStatus };
          return updated;
        });
      }
      
      // If it's a subcategory, we need to refresh the subcategories list
      if (isSubcategory) {
        // Find and refresh the parent category's subcategories
        const parentId = Object.keys(subcategoriesList).find(key => 
          subcategoriesList[key].some(sub => sub.id === categoryId)
        );
        if (parentId) {
          const { data: refreshedSubcats } = await supabase
            .from('subcategories')
            .select('*')
            .eq('parent_category_id', parentId)
            .order('name', { ascending: true });
          
          if (refreshedSubcats) {
            const subcategoriesWithActive = refreshedSubcats.map((subcat: any) => ({
              ...subcat,
              is_active: subcat.is_active !== undefined ? subcat.is_active : true
            }));
            setSubcategoriesList(prev => ({
              ...prev,
              [parentId]: subcategoriesWithActive
            }));
          }
        }
      } else {
        // Refresh the specific category from database to ensure sync
        const { data: refreshedCat } = await supabase
          .from('categories')
          .select('*')
          .eq('id', categoryId)
          .single();
        
        if (refreshedCat) {
          const categoryWithActive = {
            ...refreshedCat,
            is_active: refreshedCat.is_active !== undefined ? refreshedCat.is_active : true
          };
          setCategories(prev => 
            prev.map(cat => cat.id === categoryId ? categoryWithActive : cat)
          );
        }
      }
      
      // Force re-render by updating refresh key
      setRefreshKey(prev => prev + 1);
    } catch (err: any) {
      setError(err?.message || 'Failed to update status');
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
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <div className="p-6 border-b border-gray-200 flex justify-between items-center sticky top-0 bg-white">
                  <h2 className="text-xl font-bold">
                    {editingCategory ? 'Edit Category' : isCreatingSubcategory ? 'Add New Subcategory' : 'Add New Category'}
                  </h2>
                  <button onClick={() => { setShowEditModal(false); resetForm(); setIsCreatingSubcategory(false); setParentCategoryId(null); }} className="text-2xl">✕</button>
                </div>
                
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
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
              </div>
            </div>
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
                <div className="text-center py-8 text-gray-500">No categories found</div>
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
                            {subcategoriesList[category.id].map((subcat) => (
                              <div key={subcat.id} className="p-4 flex items-center justify-between ml-12 bg-gray-50 hover:bg-gray-100">
                                <div className="flex-1">
                                  <h4 className="font-medium text-gray-800">{subcat.name}</h4>
                                  <p className="text-sm text-gray-600">{subcat.description || 'No description'}</p>
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
                                    onClick={() => handleDelete(subcat.id)}
                                    className="px-2 py-1 text-xs text-red-600 hover:text-red-900"
                                  >
                                    Delete
                                  </button>
                                </div>
                              </div>
                            ))}
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
