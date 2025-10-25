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

const predefinedCategories = [
  {
    name: "Men's Clothing",
    slug: "mens-clothing",
    description: "Clothing and apparel for men",
    subcategories: [
      { name: "Tops & T-Shirts", slug: "mens-tops" },
      { name: "Pants & Shorts", slug: "mens-bottoms" },
      { name: "Jackets & Coats", slug: "mens-outerwear" },
      { name: "Activewear", slug: "mens-activewear" }
    ]
  },
  {
    name: "Women's Clothing",
    slug: "womens-clothing",
    description: "Clothing and apparel for women",
    subcategories: [
      { name: "Tops & Blouses", slug: "womens-tops" },
      { name: "Dresses", slug: "womens-dresses" },
      { name: "Pants & Skirts", slug: "womens-bottoms" },
      { name: "Jackets & Coats", slug: "womens-outerwear" }
    ]
  },
  {
    name: "Accessories",
    slug: "accessories",
    description: "Fashion accessories and add-ons",
    subcategories: [
      { name: "Bags & Purses", slug: "bags" },
      { name: "Jewelry", slug: "jewelry" },
      { name: "Shoes", slug: "shoes" },
      { name: "Watches", slug: "watches" }
    ]
  },
  {
    name: "Kids' Clothing",
    slug: "kids-clothing",
    description: "Clothing and apparel for children",
    subcategories: [
      { name: "Tops", slug: "kids-tops" },
      { name: "Bottoms", slug: "kids-bottoms" },
      { name: "Dresses", slug: "kids-dresses" },
      { name: "Shoes", slug: "kids-shoes" }
    ]
  }
];

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [showSubcategoryForm, setShowSubcategoryForm] = useState(false);
  const [selectedParentCategory, setSelectedParentCategory] = useState<Category | null>(null);
  const [subcategoryFormData, setSubcategoryFormData] = useState({
    name: '',
    slug: '',
    description: '',
    image_url: '',
    parent_category_id: ''
  });
  const supabase = createClient();

  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    image_url: '',
    parent_category_id: ''
  });

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      setCategories(data || []);
    } catch (err: any) {
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

  // Get subcategories for a specific category
  const getSubcategories = (categoryId: string) => {
    return categories.filter(cat => cat.parent_category_id === categoryId);
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

  const resetSubcategoryForm = () => {
    setSubcategoryFormData({
      name: '',
      slug: '',
      description: '',
      image_url: '',
      parent_category_id: ''
    });
    setShowSubcategoryForm(false);
    setSelectedParentCategory(null);
  };

  const handleAddSubcategory = (parentCategory: Category) => {
    setSelectedParentCategory(parentCategory);
    setSubcategoryFormData({
      name: '',
      slug: '',
      description: '',
      image_url: '',
      parent_category_id: parentCategory.id
    });
    setShowSubcategoryForm(true);
  };

  const handleSubcategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const subcategoryData = {
        name: subcategoryFormData.name.trim(),
        slug: subcategoryFormData.slug.trim() || generateSlug(subcategoryFormData.name),
        description: subcategoryFormData.description.trim(),
        image_url: subcategoryFormData.image_url.trim() || null,
        parent_category_id: subcategoryFormData.parent_category_id,
      };

      const { data, error } = await supabase
        .from('categories')
        .insert([subcategoryData])
        .select();

      if (error) throw error;
      
      setCategories([...categories, data[0]]);
      resetSubcategoryForm();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const addPredefinedCategories = async () => {
    try {
      setLoading(true);
      
      for (const category of predefinedCategories) {
        // Insert main category
        const { data: mainCategory, error: mainError } = await supabase
          .from('categories')
          .insert([{
            name: category.name,
            slug: category.slug,
            description: category.description,
            image_url: null,
            parent_category_id: null
          }])
          .select();

        if (mainError) throw mainError;

        // Insert subcategories
        for (const subcategory of category.subcategories) {
          const { error: subError } = await supabase
            .from('categories')
            .insert([{
              name: subcategory.name,
              slug: subcategory.slug,
              description: `${subcategory.name} in ${category.name}`,
              image_url: null,
              parent_category_id: mainCategory[0].id
            }]);

          if (subError) throw subError;
        }
      }

      await fetchCategories(); // Refresh the list
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
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
                onClick={addPredefinedCategories}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                📂 Add Predefined Categories
              </button>
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
            <div className="bg-white shadow rounded-sm border border-gray-200 p-6">
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
          <div className="bg-white shadow rounded-sm border border-gray-200 overflow-hidden">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                All Categories
              </h3>
              
              {categories.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-gray-400 text-6xl mb-4">📂</div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No categories found</h3>
                  <p className="text-gray-500 mb-4">
                    Get started by adding predefined categories or creating your own.
                  </p>
                  <div className="flex justify-center space-x-3">
                    <button
                      onClick={addPredefinedCategories}
                      className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                    >
                      📂 Add Predefined Categories
                    </button>
                    <button
                      onClick={() => setShowAddForm(true)}
                      className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                    >
                      ➕ Add Category
                    </button>
                  </div>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Category
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Slug
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Type
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Description
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Subcategories
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {categories.filter(cat => !cat.parent_category_id).map((category) => (
                        <>
                          <tr key={category.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="flex-shrink-0 h-10 w-10">
                                <div className="h-10 w-10 rounded-md bg-gray-200 flex items-center justify-center">
                                  <span className="text-gray-600 text-sm">📂</span>
                                </div>
                              </div>
                              <div className="ml-4">
                                <div className="text-sm font-medium text-gray-900">
                                  {category.name}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {category.slug}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              category.parent_category_id 
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-green-100 text-green-800'
                            }`}>
                              {category.parent_category_id ? 'Subcategory' : 'Main Category'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                            {category.description || 'No description'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {category.parent_category_id ? (
                              <span className="text-gray-400">Subcategory</span>
                            ) : (
                              <div className="space-y-1">
                                <div className="text-sm">
                                  {getSubcategories(category.id).length} subcategories
                                </div>
                                <button
                                  onClick={() => handleAddSubcategory(category)}
                                  className="text-xs text-blue-600 hover:text-blue-800"
                                >
                                  + Add Subcategory
                                </button>
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex space-x-2">
                              <button
                                onClick={() => handleEdit(category)}
                                className="text-blue-600 hover:text-blue-900"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDelete(category.id)}
                                className="text-red-600 hover:text-red-900"
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                        
                        {/* Subcategories */}
                        {getSubcategories(category.id).map((subcategory) => (
                          <tr key={subcategory.id} className="hover:bg-gray-50 bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap pl-12">
                              <div className="flex items-center">
                                <div className="flex-shrink-0 h-8 w-8">
                                  <div className="h-8 w-8 rounded-md bg-gray-100 flex items-center justify-center">
                                    <span className="text-gray-500 text-xs">📁</span>
                                  </div>
                                </div>
                                <div className="ml-4">
                                  <div className="text-sm font-medium text-gray-900">
                                    {subcategory.name}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {subcategory.slug}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                                Subcategory
                              </span>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                              {subcategory.description || 'No description'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              <span className="text-gray-400">Subcategory</span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              <div className="flex space-x-2">
                                <button
                                  onClick={() => handleEdit(subcategory)}
                                  className="text-blue-600 hover:text-blue-900"
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() => handleDelete(subcategory.id)}
                                  className="text-red-600 hover:text-red-900"
                                >
                                  Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Subcategory Form Modal */}
        {showSubcategoryForm && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border border-gray-200 w-96 shadow-xs rounded-sm bg-white">
              <div className="mt-3">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">
                    Add Subcategory to {selectedParentCategory?.name}
                  </h3>
                  <button
                    onClick={resetSubcategoryForm}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <form onSubmit={handleSubcategorySubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Subcategory Name *
                    </label>
                    <input
                      type="text"
                      value={subcategoryFormData.name}
                      onChange={(e) => {
                        setSubcategoryFormData(prev => ({
                          ...prev,
                          name: e.target.value,
                          slug: prev.slug || generateSlug(e.target.value)
                        }));
                      }}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      placeholder="Enter subcategory name"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Slug
                    </label>
                    <input
                      type="text"
                      value={subcategoryFormData.slug}
                      onChange={(e) => setSubcategoryFormData(prev => ({ ...prev, slug: e.target.value }))}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      placeholder="Auto-generated from name"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Description
                    </label>
                    <textarea
                      value={subcategoryFormData.description}
                      onChange={(e) => setSubcategoryFormData(prev => ({ ...prev, description: e.target.value }))}
                      rows={3}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      placeholder="Enter subcategory description"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Subcategory Image
                    </label>
                    <ImageUpload
                      onImageUpload={handleImageUpload}
                      currentImageUrl={subcategoryFormData.image_url}
                      placeholder="Upload subcategory image"
                      className="w-full"
                    />
                    {uploadingImage && (
                      <p className="mt-2 text-sm text-blue-600">Uploading image...</p>
                    )}
                  </div>

                  <div className="flex justify-end space-x-3 pt-4">
                    <button
                      type="button"
                      onClick={resetSubcategoryForm}
                      className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                    >
                      Add Subcategory
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </AdminLayout>
    </AdminGuard>
  );
}
