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
  const supabase = createClient();

  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    image_url: ''
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
      
      setCategories(data || []);
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
      };
      
      if (isCreatingSubcategory && parentCategoryId) {
        categoryData.parent_category_id = parentCategoryId;
      } else if (editingCategory && editingCategory.parent_category_id) {
        categoryData.parent_category_id = editingCategory.parent_category_id;
      }

      if (editingCategory) {
        if (editingCategory.parent_category_id) {
          // Update subcategory in subcategories table
          const { error: updateError } = await supabase
            .from('subcategories')
            .update(categoryData)
            .eq('id', editingCategory.id);

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
          const { error: updateError } = await supabase
            .from('categories')
            .update(categoryData)
            .eq('id', editingCategory.id);

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
          const { data, error: insertError } = await supabase
            .from('subcategories')
            .insert([categoryData])
            .select();

          if (insertError) throw insertError;

          const newSubcategory: Category = {
            ...data[0],
            parent_category_id: parentCategoryId
          };
          setSubcategoriesList(prev => ({
            ...prev,
            [parentCategoryId]: [...(prev[parentCategoryId] || []), newSubcategory]
          }));
        } else {
          const { data, error: insertError } = await supabase
            .from('categories')
            .insert([categoryData])
            .select();

          if (insertError) throw insertError;

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
      image_url: category.image_url ? addCacheBusting(category.image_url, category.updated_at) : ''
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
            .select('*')
            .eq('parent_category_id', categoryId)
            .order('name', { ascending: true });

          if (!error && data) {
            setSubcategoriesList(prev => ({
              ...prev,
              [categoryId]: data
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

  const resetForm = () => {
    setFormData({
      name: '',
      slug: '',
      description: '',
      image_url: '',
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
                      <div className="flex items-center space-x-2 ml-4">
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
                                <div className="flex items-center space-x-2 ml-4">
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
