'use client';

import { useState, useEffect } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import AdminGuard from '@/components/admin/AdminGuard';
import ImageUpload from '@/components/ImageUpload';
import DataTable from '@/components/DataTable';
import { createClient } from '@/lib/supabase/client';
import { uploadImageToSupabase, deleteImageFromSupabase } from '@/utils/imageUpload';

interface Subcategory {
  id: string;
  name: string;
  slug: string;
  description: string;
  image_url: string | null;
  parent_category_id: string;
  created_at: string;
  updated_at: string;
}

interface Category {
  id: string;
  name: string;
}

export default function SubcategoriesPage() {
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedParentId, setSelectedParentId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingSubcategory, setEditingSubcategory] = useState<Subcategory | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [subcategorySearch, setSubcategorySearch] = useState('');
  const [editLoading, setEditLoading] = useState(false);
  const [tempSubcategoryId, setTempSubcategoryId] = useState<string | null>(null);
  const supabase = createClient();

  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    image_url: '',
    parent_category_id: ''
  });

  // Get parent category from URL params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const parentId = params.get('parent');
    if (parentId) {
      setSelectedParentId(parentId);
      // Pre-fill the form with the parent category
      setFormData(prev => ({
        ...prev,
        parent_category_id: parentId
      }));
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    if (categories.length > 0) {
      fetchSubcategories();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedParentId, categories]);

  const fetchSubcategories = async () => {
    try {
      setLoading(true);
      
      let query = supabase
        .from('subcategories')
        .select('*')
        .order('name', { ascending: true });

      // Filter by parent category if one is selected
      if (selectedParentId) {
        query = query.eq('parent_category_id', selectedParentId);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;
      
      setSubcategories(data || []);
    } catch (err: any) {
      console.error('Error fetching:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from('categories')
        .select('id, name')
        .is('parent_category_id', null)
        .order('name', { ascending: true });

      if (fetchError) throw fetchError;
      
      setCategories(data || []);
    } catch (err: any) {
      console.error('Error fetching categories:', err);
    }
  };

  const generateSlug = (name: string) => {
    return name.toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  const handleImageUpload = async (file: File) => {
    setUploadingImage(true);
    setError(null);
    
    try {
      // Use existing subcategory ID if editing, otherwise use temp ID or generate new one
      let subcategoryUuid: string;
      
      if (editingSubcategory) {
        // Editing existing subcategory - use its ID
        subcategoryUuid = editingSubcategory.id;
        
        // Step 1: Fetch existing subcategory data from database
        const { data: existingData, error: fetchError } = await supabase
          .from('subcategories')
          .select('image_url')
          .eq('id', editingSubcategory.id)
          .single();
        
        if (!fetchError && existingData?.image_url) {
          // Step 2: Delete existing image from storage
          await deleteImageFromSupabase(existingData.image_url, 'subcategory-images');
          console.log('Deleted existing image from database:', existingData.image_url);
        }
      } else if (tempSubcategoryId) {
        subcategoryUuid = tempSubcategoryId;
      } else {
        // Generate a new temp ID for this session
        subcategoryUuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
          const r = Math.random() * 16 | 0;
          const v = c === 'x' ? r : (r & 0x3 | 0x8);
          return v.toString(16);
        });
        setTempSubcategoryId(subcategoryUuid);
      }
      
      // Step 3: Upload new image with fixed filename
      const result = await uploadImageToSupabase(file, 'subcategory-images', subcategoryUuid, true);
      
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
  };

  const handleSubmit = async (e: React.FormEvent) => {
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
      const subcategoryData = {
        name: formData.name.trim(),
        slug: generateSlug(formData.name),
        description: formData.description.trim(),
        image_url: formData.image_url.trim() || null,
        parent_category_id: formData.parent_category_id,
      };

      if (editingSubcategory) {
        const { error: updateError } = await supabase
          .from('subcategories')
          .update(subcategoryData)
          .eq('id', editingSubcategory.id);

        if (updateError) throw updateError;
        
        setSubcategories(subcategories.map(sub => 
          sub.id === editingSubcategory.id ? { ...sub, ...subcategoryData } : sub
        ));
        setEditingSubcategory(null);
      } else {
        const { data, error: insertError } = await supabase
          .from('subcategories')
          .insert([subcategoryData])
          .select();

        if (insertError) throw insertError;
        
        setSubcategories([...subcategories, data[0]]);
      }

      resetForm();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleEdit = (subcategory: Subcategory) => {
    setEditingSubcategory(subcategory);
    setFormData({
      name: subcategory.name,
      slug: subcategory.slug,
      description: subcategory.description || '',
      image_url: subcategory.image_url || '',
      parent_category_id: subcategory.parent_category_id
    });
    setShowEditModal(true);
  };

  const handleDelete = async (subcategoryId: string) => {
    if (!confirm('Are you sure you want to delete this subcategory?')) return;

    try {
      const subcategoryToDelete = subcategories.find(sub => sub.id === subcategoryId);
      
      const { error: deleteError } = await supabase
        .from('subcategories')
        .delete()
        .eq('id', subcategoryId);

      if (deleteError) throw deleteError;
      
      if (subcategoryToDelete?.image_url) {
        try {
          await deleteImageFromSupabase(subcategoryToDelete.image_url, 'subcategory-images');
        } catch (imgErr) {
          console.warn('Could not delete subcategory image:', imgErr);
        }
      }
      
      setSubcategories(subcategories.filter(sub => sub.id !== subcategoryId));
    } catch (err: any) {
      setError(err.message);
    }
  };

  const filteredSubcategories = subcategories.filter(sub =>
    sub.name?.toLowerCase().includes(subcategorySearch.toLowerCase()) ||
    sub.slug?.toLowerCase().includes(subcategorySearch.toLowerCase())
  );

  const formatDate = (date: string) => new Date(date).toLocaleDateString();

  const resetForm = () => {
    setFormData({
      name: '',
      slug: '',
      description: '',
      image_url: '',
      parent_category_id: selectedParentId || ''
    });
    setShowEditModal(false);
    setEditingSubcategory(null);
    setTempSubcategoryId(null);
  };

  return (
    <AdminGuard>
      <AdminLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Subcategories</h1>
            <p className="text-gray-600">
              {selectedParentId 
                ? `Managing subcategories for "${categories.find(c => c.id === selectedParentId)?.name || 'Selected Category'}"`
                : 'Manage subcategories for your products'}
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {/* Add/Edit Modal */}
          {showEditModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <div className="p-6 border-b border-gray-200 flex justify-between items-center sticky top-0 bg-white">
                  <h2 className="text-xl font-bold">
                    {editingSubcategory ? 'Edit Subcategory' : 'Add New Subcategory'}
                  </h2>
                  <button onClick={() => { setShowEditModal(false); resetForm(); }} className="text-2xl">✕</button>
                </div>
                
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Subcategory Name *
                      </label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Slug
                      </label>
                      <input
                        type="text"
                        value={generateSlug(formData.name)}
                        disabled
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Subcategory Image
                    </label>
                    <ImageUpload
                      onImageUpload={handleImageUpload}
                      currentImageUrl={formData.image_url}
                      placeholder="Upload subcategory image"
                    />
                    {uploadingImage && (
                      <p className="mt-2 text-sm text-blue-600">Uploading image...</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Parent Category *
                    </label>
                    <select
                      value={formData.parent_category_id}
                      onChange={(e) => setFormData(prev => ({ ...prev, parent_category_id: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      required
                    >
                      <option value="">Select a parent category</option>
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.name}
                        </option>
                      ))}
                    </select>
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
                      {editLoading ? 'Saving...' : editingSubcategory ? 'Update Subcategory' : 'Create Subcategory'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Subcategories Table */}
          <div className="bg-white rounded-lg shadow p-6 space-y-4">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowEditModal(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                ➕ Add Subcategory
              </button>
              <select
                value={selectedParentId || ''}
                onChange={(e) => {
                  const newParentId = e.target.value || null;
                  setSelectedParentId(newParentId);
                  // Update URL
                  const url = new URL(window.location.href);
                  if (newParentId) {
                    url.searchParams.set('parent', newParentId);
                  } else {
                    url.searchParams.delete('parent');
                  }
                  window.history.pushState({}, '', url.toString());
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg"
              >
                <option value="">All Categories</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
              <input
                type="text"
                placeholder="Search subcategories..."
                value={subcategorySearch}
                onChange={(e) => setSubcategorySearch(e.target.value)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg"
              />
            </div>

            <DataTable
              columns={[
                { key: 'name', label: 'Name', sortable: true },
                { key: 'slug', label: 'Slug', sortable: true },
                { key: 'parent_category_id', label: 'Parent', sortable: false, render: (value: string) => {
                  const category = categories.find(c => c.id === value);
                  return category?.name || value;
                }},
                { key: 'image_url', label: 'Image', sortable: false, render: (value: string) => (
                  value ? <img src={value} alt="Subcategory" className="w-12 h-12 object-cover rounded" /> : '-'
                )},
                { key: 'created_at', label: 'Created', sortable: true, render: (value: string) => formatDate(value) },
                { key: 'id', label: 'Actions', sortable: false, render: (value: string, row: Subcategory) => (
                  <div className="flex space-x-2">
                    <button onClick={() => handleEdit(row)} className="text-blue-600 hover:text-blue-900 text-sm font-medium">
                      Edit
                    </button>
                    <button onClick={() => handleDelete(value)} className="text-red-600 hover:text-red-900 text-sm font-medium">
                      Delete
                    </button>
                  </div>
                ), },
              ]}
              data={filteredSubcategories}
              rowKey="id"
              isLoading={loading}
              itemsPerPage={10}
            />
          </div>
        </div>
      </AdminLayout>
    </AdminGuard>
  );
}

