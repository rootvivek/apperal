'use client';

import { useState, useEffect } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import AdminGuard from '@/components/admin/AdminGuard';
import ImageUpload from '@/components/ImageUpload';
import DataTable from '@/components/DataTable';
import Alert from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { useSubcategoryData, type Subcategory } from '@/hooks/admin/useSubcategoryData';
import { useSubcategoryForm } from '@/hooks/admin/useSubcategoryForm';
import { generateSlug } from '@/utils/product/slug';
import { createAdminHeaders } from '@/utils/api/adminHeaders';
import { handleApiResponse } from '@/utils/api/responseHandler';

export default function SubcategoriesPage() {
  const { user } = useAuth();
  const [selectedParentId, setSelectedParentId] = useState<string | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [subcategorySearch, setSubcategorySearch] = useState('');
  const [deleting, setDeleting] = useState<string | null>(null);

  // Data fetching hook
  const {
    subcategories,
    categories,
    loading,
    error: dataError,
    setSubcategories,
    setError: setDataError,
    fetchCategories,
    fetchSubcategories,
  } = useSubcategoryData();

  // Form management hook
  const {
    formData,
    setFormData,
    editingSubcategory,
    setEditingSubcategory,
    uploadingImage,
    editLoading,
    error: formError,
    setError: setFormError,
    tempSubcategoryId,
    setTempSubcategoryId,
    handleImageUpload,
    handleSubmit,
    resetForm: resetFormHook,
    handleEdit,
  } = useSubcategoryForm({
    userId: user?.id,
    subcategories,
    setSubcategories,
  });

  const error = dataError || formError;
  const setError = (err: string | null) => {
    setDataError(err);
    setFormError(err);
  };

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
  }, [setFormData]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  useEffect(() => {
    if (categories.length > 0) {
      fetchSubcategories(selectedParentId);
    }
  }, [selectedParentId, categories, fetchSubcategories]);

  const toggleSubcategoryStatus = async (subcategoryId: string, currentStatus: boolean | null | undefined) => {
    try {
      setError(null);
      const actualCurrentStatus = currentStatus ?? true;
      const newStatus = !actualCurrentStatus;
      
      if (!user?.id) {
        const errorMsg = 'You must be logged in to perform this action';
        setError(errorMsg);
        alert(errorMsg);
        return;
      }
      
      const response = await fetch('/api/admin/toggle-category-status', {
        method: 'POST',
        headers: createAdminHeaders(user.id),
        body: JSON.stringify({
          categoryId: subcategoryId,
          isActive: newStatus,
          isSubcategory: true,
        }),
      });

      const result = await handleApiResponse<{ subcategory: { is_active: boolean } }>(response, 'Failed to update status');

      if (result.subcategory && result.subcategory.is_active === newStatus) {
        setSubcategories(subcategories.map(sub => 
          sub.id === subcategoryId ? { ...sub, is_active: result.subcategory.is_active } : sub
        ));
      } else {
        throw new Error('Status update verification failed');
      }
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to update status';
      setError(errorMessage);
      alert(errorMessage);
    }
  };

  const handleDelete = async (subcategoryId: string) => {
    if (!confirm('Are you sure you want to delete this subcategory? This will also delete all products under it and their images.')) return;

    if (!user?.id) {
      setError('User not authenticated');
      return;
    }

    try {
      setDeleting(subcategoryId);
      setError(null);
      
      const response = await fetch('/api/admin/delete-subcategory', {
        method: 'POST',
        headers: createAdminHeaders(user.id),
        body: JSON.stringify({ subcategoryId }),
      });

      await handleApiResponse(response, 'Failed to delete subcategory');

      // Show success message
      alert('Subcategory deleted successfully');
      
      // Remove from local state only after successful deletion
      setSubcategories(subcategories.filter(sub => sub.id !== subcategoryId));
      
      // Force refresh immediately and again after a delay to ensure consistency
      await fetchSubcategories(selectedParentId);
      
      // Double-check after a delay to catch any async issues
      setTimeout(async () => {
        await fetchSubcategories(selectedParentId);
      }, 1000);
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to delete subcategory';
      setError(errorMessage);
      alert(`Error: ${errorMessage}`);
    } finally {
      setDeleting(null);
    }
  };

  const filteredSubcategories = subcategories.filter(sub =>
    sub.name?.toLowerCase().includes(subcategorySearch.toLowerCase()) ||
    sub.slug?.toLowerCase().includes(subcategorySearch.toLowerCase())
  );

  const formatDate = (date: string) => new Date(date).toLocaleDateString();

  const resetForm = () => {
    resetFormHook();
    setFormData(prev => ({
      ...prev,
      parent_category_id: selectedParentId || ''
    }));
    setShowEditModal(false);
  };

  const onSubmit = async (e: React.FormEvent) => {
    await handleSubmit(e, () => fetchSubcategories(selectedParentId));
    setShowEditModal(false);
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
            <Alert message={error} variant="error" className="mb-4" />
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
                
                <form onSubmit={onSubmit} className="p-6 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Subcategory Name *
                      </label>
                      <Input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Slug
                      </label>
                      <Input
                        type="text"
                        value={generateSlug(formData.name)}
                        disabled
                        className="bg-gray-50"
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
                    <Select 
                      value={formData.parent_category_id} 
                      onValueChange={(value) => setFormData(prev => ({ ...prev, parent_category_id: value }))}
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a parent category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id}>
                            {cat.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
              <Select
                value={selectedParentId || 'all'}
                onValueChange={(value) => {
                  const newParentId = value === 'all' ? null : value;
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
              >
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                type="text"
                placeholder="Search subcategories..."
                value={subcategorySearch}
                onChange={(e) => setSubcategorySearch(e.target.value)}
                className="flex-1"
              />
            </div>

            <DataTable
              columns={[
                { 
                  key: 'image_url', 
                  label: 'Image', 
                  sortable: false, 
                  render: (value: string | null) => (
                    value ? (
                      <div className="flex items-center justify-center">
                        <img 
                          src={value} 
                          alt="Subcategory" 
                          className="w-16 h-16 object-cover rounded-lg border border-gray-200 shadow-sm"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.src = '/images/categories/placeholder.svg';
                          }}
                        />
                      </div>
                    ) : (
                      <div className="flex items-center justify-center w-16 h-16 bg-gray-100 rounded-lg border border-gray-200">
                        <span className="text-xs text-gray-400">No image</span>
                      </div>
                    )
                  )
                },
                { key: 'name', label: 'Name', sortable: true },
                { key: 'slug', label: 'Slug', sortable: true },
                { key: 'parent_category_id', label: 'Parent', sortable: false, render: (value: string) => {
                  const category = categories.find(c => c.id === value);
                  return category?.name || value;
                }},
                { key: 'created_at', label: 'Created', sortable: true, render: (value: string) => formatDate(value) },
                { 
                  key: 'is_active', 
                  label: 'Status', 
                  sortable: true, 
                  render: (value: boolean | undefined, row: Subcategory) => (
                    <button
                      onClick={() => toggleSubcategoryStatus(row.id, value ?? true)}
                      className={`px-3 py-1 text-sm rounded font-medium transition-colors ${
                        value === false
                          ? 'bg-red-100 text-red-800 hover:bg-red-200'
                          : 'bg-green-100 text-green-800 hover:bg-green-200'
                      }`}
                      disabled={!!deleting}
                    >
                      {value === false ? 'Inactive' : 'Active'}
                    </button>
                  )
                },
                { key: 'id', label: 'Actions', sortable: false, render: (value: string, row: Subcategory) => (
                  <div className="flex space-x-2">
                    <button onClick={() => { handleEdit(row); setShowEditModal(true); }} className="text-blue-600 hover:text-blue-900 text-sm font-medium" disabled={!!deleting}>
                      Edit
                    </button>
                    <button 
                      onClick={() => handleDelete(value)} 
                      className="text-red-600 hover:text-red-900 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={!!deleting}
                    >
                      {deleting === value ? 'Deleting...' : 'Delete'}
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

