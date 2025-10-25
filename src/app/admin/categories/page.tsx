'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import AdminLayout from '@/components/admin/AdminLayout';
import AdminGuard from '@/components/admin/AdminGuard';
import ImageUpload from '@/components/ImageUpload';
import { createClient } from '@/lib/supabase/client';
import { uploadImageToSupabase } from '@/utils/imageUpload';

interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  image_url: string;
  parent_category_id: string | null;
  created_at: string;
  updated_at: string;
}

// Removed predefined categories to ensure we only fetch from database

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const supabase = createClient();

  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    image_url: '',
    parent_category_id: ''
  });

  useEffect(() => {
    console.log('🚀 Categories page loaded, starting fetch...');
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      console.log('🔍 Starting to fetch categories from database...');
      
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name', { ascending: true });

      if (error) {
        console.error('❌ Database error:', error);
        throw error;
      }
      
      console.log('✅ Database query successful');
      console.log('📊 Raw data from database:', data);
      console.log('📈 Number of categories fetched:', data?.length || 0);
      
      if (data && data.length > 0) {
        console.log('📋 Category names:', data.map(cat => cat.name));
      } else {
        console.log('⚠️ No categories found in database');
      }
      
      setCategories(data || []);
    } catch (err: any) {
      console.error('💥 Error fetching categories:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const generateSlug = (name: string) => {
    return name.toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  // Handle image upload for categories
  const handleImageUpload = async (file: File) => {
    setUploadingImage(true);
    setError(null);
    
    try {
      const result = await uploadImageToSupabase(file, 'category-images', 'categories');
      
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
    
    try {
      const categoryData = {
        name: formData.name.trim(),
        slug: formData.slug.trim() || generateSlug(formData.name),
        description: formData.description.trim(),
        image_url: formData.image_url.trim() || null,
        parent_category_id: formData.parent_category_id || null,
      };

      if (editingCategory) {
        // Update existing category
        const { error } = await supabase
          .from('categories')
          .update(categoryData)
          .eq('id', editingCategory.id);

        if (error) throw error;
        
        setCategories(categories.map(cat => 
          cat.id === editingCategory.id ? { ...cat, ...categoryData } : cat
        ));
        setEditingCategory(null);
      } else {
        // Create new category
        const { data, error } = await supabase
          .from('categories')
          .insert([categoryData])
          .select();

        if (error) throw error;
        
        setCategories([...categories, data[0]]);
      }

      resetForm();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      slug: category.slug,
      description: category.description || '',
      image_url: category.image_url || '',
      parent_category_id: category.parent_category_id || ''
    });
    setShowAddForm(true);
  };

  const handleDelete = async (categoryId: string) => {
    if (!confirm('Are you sure you want to delete this category? This action cannot be undone.')) return;

    try {
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', categoryId);

      if (error) throw error;
      
      setCategories(categories.filter(cat => cat.id !== categoryId));
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Group categories by parent-child relationship
  const groupedCategories = () => {
    console.log('🔄 Grouping categories...');
    console.log('📦 All categories:', categories);
    
    const mainCategories = categories.filter(cat => !cat.parent_category_id);
    const subcategories = categories.filter(cat => cat.parent_category_id);
    
    console.log('📁 Main categories:', mainCategories);
    console.log('📄 Subcategories:', subcategories);
    
    const grouped = mainCategories.map(mainCat => ({
      ...mainCat,
      subcategories: subcategories.filter(sub => sub.parent_category_id === mainCat.id)
    }));
    
    console.log('🎯 Final grouped data:', grouped);
    return grouped;
  };

  const groupedData = groupedCategories();

  const resetForm = () => {
    setFormData({
      name: '',
      slug: '',
      description: '',
      image_url: '',
      parent_category_id: ''
    });
    setShowAddForm(false);
    setEditingCategory(null);
  };

  if (loading) {
    return (
      <AdminGuard>
        <AdminLayout>
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading categories...</p>
            </div>
          </div>
        </AdminLayout>
      </AdminGuard>
    );
  }

  return (
    <AdminGuard>
      <AdminLayout>
        <div className="space-y-6">
          {/* Page Header */}
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Categories</h1>
              <p className="mt-1 text-sm text-gray-500">
                Manage product categories and subcategories.
              </p>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => setShowAddForm(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                ➕ Add Category
              </button>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <span className="text-red-400">⚠️</span>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">Error</h3>
                  <div className="mt-2 text-sm text-red-700">
                    <p>{error}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Add/Edit Category Form */}
          {showAddForm && (
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {editingCategory ? 'Edit Category' : 'Add New Category'}
              </h3>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                      Category Name *
                    </label>
                    <input
                      type="text"
                      name="name"
                      id="name"
                      value={formData.name}
                      onChange={(e) => {
                        setFormData(prev => ({
                          ...prev,
                          name: e.target.value,
                          slug: prev.slug || generateSlug(e.target.value)
                        }));
                      }}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      placeholder="Enter category name"
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="slug" className="block text-sm font-medium text-gray-700">
                      Slug *
                    </label>
                    <input
                      type="text"
                      name="slug"
                      id="slug"
                      value={formData.slug}
                      onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      placeholder="category-slug"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                    Description
                  </label>
                  <textarea
                    name="description"
                    id="description"
                    rows={3}
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="Enter category description"
                  />
                </div>

                <div>
                  <label htmlFor="parent_category_id" className="block text-sm font-medium text-gray-700">
                    Parent Category
                  </label>
                  <select
                    name="parent_category_id"
                    id="parent_category_id"
                    value={formData.parent_category_id}
                    onChange={(e) => setFormData(prev => ({ ...prev, parent_category_id: e.target.value }))}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  >
                    <option value="">Main Category (No Parent)</option>
                    {categories.filter(cat => !cat.parent_category_id).map(category => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-xs text-gray-500">
                    Leave empty to create a main category, or select a parent to create a subcategory
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Category Image
                  </label>
                  <ImageUpload
                    onImageUpload={handleImageUpload}
                    currentImageUrl={formData.image_url}
                    placeholder="Upload category image"
                    className="w-full"
                  />
                  {uploadingImage && (
                    <p className="mt-2 text-sm text-blue-600">Uploading image...</p>
                  )}
                </div>

                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={resetForm}
                    className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    {editingCategory ? 'Update Category' : 'Create Category'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Categories List */}
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                All Categories
              </h3>
              
              {categories.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-gray-400 text-6xl mb-4">📂</div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No categories found</h3>
                  <p className="text-gray-500 mb-4">
                    It looks like there are no categories in your database yet.
                  </p>
                  <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 mb-4">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <span className="text-yellow-400">⚠️</span>
                      </div>
                      <div className="ml-3">
                        <h3 className="text-sm font-medium text-yellow-800">Database Issue</h3>
                        <div className="mt-2 text-sm text-yellow-700">
                          <p>If you expected to see categories, please check:</p>
                          <ul className="list-disc list-inside mt-2 space-y-1">
                            <li>Your Supabase connection is working</li>
                            <li>The 'categories' table exists in your database</li>
                            <li>You have data in the categories table</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-center space-x-3">
                    <button
                      onClick={() => setShowAddForm(true)}
                      className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                    >
                      ➕ Add Category
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  {groupedData.map((mainCategory) => (
                    <div key={mainCategory.id} className="border border-gray-200 rounded-lg overflow-hidden">
                      {/* Main Category Header */}
                      <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10">
                              <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                                <span className="text-blue-600 text-sm">📁</span>
                              </div>
                            </div>
                            <div className="ml-4">
                              <h3 className="text-lg font-medium text-gray-900">
                                {mainCategory.name}
                              </h3>
                              <p className="text-sm text-gray-500">
                                {mainCategory.slug} • {mainCategory.subcategories.length} subcategories
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                              Main Category
                            </span>
                            <div className="flex space-x-2">
                              <button
                                onClick={() => handleEdit(mainCategory)}
                                className="text-blue-600 hover:text-blue-900 text-sm font-medium"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDelete(mainCategory.id)}
                                className="text-red-600 hover:text-red-900 text-sm font-medium"
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        </div>
                        {mainCategory.description && (
                          <p className="mt-2 text-sm text-gray-600">
                            {mainCategory.description}
                          </p>
                        )}
                      </div>

                      {/* Subcategories */}
                      {mainCategory.subcategories.length > 0 ? (
                        <div className="bg-white">
                          <div className="px-6 py-3 bg-gray-25 border-b border-gray-100">
                            <h4 className="text-sm font-medium text-gray-700">Subcategories</h4>
                          </div>
                          <div className="divide-y divide-gray-100">
                            {mainCategory.subcategories.map((subcategory) => (
                              <div key={subcategory.id} className="px-6 py-4 hover:bg-gray-50">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center">
                                    <div className="flex-shrink-0 h-8 w-8">
                                      <div className="h-8 w-8 rounded-lg bg-gray-100 flex items-center justify-center">
                                        <span className="text-gray-600 text-xs">📄</span>
                                      </div>
                                    </div>
                                    <div className="ml-4">
                                      <div className="text-sm font-medium text-gray-900">
                                        {subcategory.name}
                                      </div>
                                      <div className="text-xs text-gray-500">
                                        {subcategory.slug}
                                      </div>
                                    </div>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                                      Subcategory
                                    </span>
                                    <div className="flex space-x-2">
                                      <button
                                        onClick={() => handleEdit(subcategory)}
                                        className="text-blue-600 hover:text-blue-900 text-sm font-medium"
                                      >
                                        Edit
                                      </button>
                                      <button
                                        onClick={() => handleDelete(subcategory.id)}
                                        className="text-red-600 hover:text-red-900 text-sm font-medium"
                                      >
                                        Delete
                                      </button>
                                    </div>
                                  </div>
                                </div>
                                {subcategory.description && (
                                  <p className="mt-2 ml-12 text-xs text-gray-600">
                                    {subcategory.description}
                                  </p>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="px-6 py-8 text-center bg-gray-25">
                          <div className="text-gray-400 text-4xl mb-2">📄</div>
                          <p className="text-sm text-gray-500">No subcategories yet</p>
                          <button
                            onClick={() => {
                              setFormData(prev => ({ ...prev, parent_category_id: mainCategory.id }));
                              setShowAddForm(true);
                            }}
                            className="mt-2 text-sm text-blue-600 hover:text-blue-900 font-medium"
                          >
                            Add subcategory
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </AdminLayout>
    </AdminGuard>
  );
}
