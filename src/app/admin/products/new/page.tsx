'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AdminLayout from '@/components/admin/AdminLayout';
import AdminGuard from '@/components/admin/AdminGuard';
import ImageUpload from '@/components/ImageUpload';
import { createClient } from '@/lib/supabase/client';
import { uploadImageToSupabase } from '@/utils/imageUpload';

interface ProductFormData {
  name: string;
  description: string;
  price: string;
  category: string;
  subcategory: string;
  image_url: string;
  stock_quantity: string;
  is_active: boolean;
}

const categories = [
  { name: 'Men\'s Clothing', subcategories: ['Tops & T-Shirts', 'Pants & Shorts', 'Jackets & Coats', 'Activewear'] },
  { name: 'Women\'s Clothing', subcategories: ['Tops & Blouses', 'Dresses', 'Pants & Skirts', 'Jackets & Coats'] },
  { name: 'Accessories', subcategories: ['Bags & Purses', 'Jewelry', 'Shoes', 'Watches'] },
  { name: 'Kids\' Clothing', subcategories: ['Tops', 'Bottoms', 'Dresses', 'Shoes'] },
];

export default function NewProductPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const supabase = createClient();

  const [formData, setFormData] = useState<ProductFormData>({
    name: '',
    description: '',
    price: '',
    category: '',
    subcategory: '',
    image_url: '',
    stock_quantity: '',
    is_active: true,
  });

  const [validationErrors, setValidationErrors] = useState<{[key: string]: string}>({});

  // Function to generate slug from product name
  const generateSlug = (name: string): string => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  // Handle image upload
  const handleImageUpload = async (file: File) => {
    setUploadingImage(true);
    setError(null);
    
    try {
      const result = await uploadImageToSupabase(file, 'product-images', 'products');
      
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));

    // Clear validation error when user starts typing
    if (validationErrors[name]) {
      setValidationErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = (): boolean => {
    const errors: {[key: string]: string} = {};

    if (!formData.name.trim()) {
      errors.name = 'Product name is required';
    }

    if (!formData.description.trim()) {
      errors.description = 'Product description is required';
    }

    if (!formData.price || parseFloat(formData.price) <= 0) {
      errors.price = 'Valid price is required';
    }

    if (!formData.category) {
      errors.category = 'Category is required';
    }

    if (!formData.subcategory) {
      errors.subcategory = 'Subcategory is required';
    }

    if (!formData.stock_quantity || parseInt(formData.stock_quantity) < 0) {
      errors.stock_quantity = 'Valid stock quantity is required';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase
        .from('products')
        .insert([{
          name: formData.name.trim(),
          slug: generateSlug(formData.name.trim()),
          description: formData.description.trim(),
          price: parseFloat(formData.price),
          category: formData.category,
          subcategory: formData.subcategory,
          image_url: formData.image_url.trim() || null,
          stock_quantity: parseInt(formData.stock_quantity),
          is_active: formData.is_active,
        }]);

      if (error) throw error;

      setSuccess(true);
      setTimeout(() => {
        router.push('/admin/products');
      }, 2000);

    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const selectedCategory = categories.find(cat => cat.name === formData.category);

  return (
    <AdminGuard>
      <AdminLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Add New Product</h1>
          <p className="mt-1 text-sm text-gray-500">
            Create a new product listing for your store.
          </p>
        </div>

        {/* Success Message */}
        {success && (
          <div className="bg-green-50 border border-green-200 rounded-md p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <span className="text-green-400">✅</span>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-green-800">Product Created Successfully!</h3>
                <div className="mt-2 text-sm text-green-700">
                  <p>Your product has been added to the store. Redirecting to products list...</p>
                </div>
              </div>
            </div>
          </div>
        )}

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

        {/* Product Form */}
        <div className="bg-white shadow rounded-lg">
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              {/* Product Name */}
              <div className="sm:col-span-2">
                <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                  Product Name *
                </label>
                <input
                  type="text"
                  name="name"
                  id="name"
                  value={formData.name}
                  onChange={handleChange}
                  className={`mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${
                    validationErrors.name ? 'border-red-300' : ''
                  }`}
                  placeholder="Enter product name"
                />
                {validationErrors.name && (
                  <p className="mt-1 text-sm text-red-600">{validationErrors.name}</p>
                )}
              </div>

              {/* Description */}
              <div className="sm:col-span-2">
                <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                  Description *
                </label>
                <textarea
                  name="description"
                  id="description"
                  rows={4}
                  value={formData.description}
                  onChange={handleChange}
                  className={`mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${
                    validationErrors.description ? 'border-red-300' : ''
                  }`}
                  placeholder="Enter product description"
                />
                {validationErrors.description && (
                  <p className="mt-1 text-sm text-red-600">{validationErrors.description}</p>
                )}
              </div>

              {/* Price */}
              <div>
                <label htmlFor="price" className="block text-sm font-medium text-gray-700">
                  Price ($) *
                </label>
                <input
                  type="number"
                  name="price"
                  id="price"
                  step="0.01"
                  min="0"
                  value={formData.price}
                  onChange={handleChange}
                  className={`mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${
                    validationErrors.price ? 'border-red-300' : ''
                  }`}
                  placeholder="0.00"
                />
                {validationErrors.price && (
                  <p className="mt-1 text-sm text-red-600">{validationErrors.price}</p>
                )}
              </div>

              {/* Stock Quantity */}
              <div>
                <label htmlFor="stock_quantity" className="block text-sm font-medium text-gray-700">
                  Stock Quantity *
                </label>
                <input
                  type="number"
                  name="stock_quantity"
                  id="stock_quantity"
                  min="0"
                  value={formData.stock_quantity}
                  onChange={handleChange}
                  className={`mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${
                    validationErrors.stock_quantity ? 'border-red-300' : ''
                  }`}
                  placeholder="0"
                />
                {validationErrors.stock_quantity && (
                  <p className="mt-1 text-sm text-red-600">{validationErrors.stock_quantity}</p>
                )}
              </div>

              {/* Category */}
              <div>
                <label htmlFor="category" className="block text-sm font-medium text-gray-700">
                  Category *
                </label>
                <select
                  name="category"
                  id="category"
                  value={formData.category}
                  onChange={handleChange}
                  className={`mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${
                    validationErrors.category ? 'border-red-300' : ''
                  }`}
                >
                  <option value="">Select a category</option>
                  {categories.map(category => (
                    <option key={category.name} value={category.name}>
                      {category.name}
                    </option>
                  ))}
                </select>
                {validationErrors.category && (
                  <p className="mt-1 text-sm text-red-600">{validationErrors.category}</p>
                )}
              </div>

              {/* Subcategory */}
              <div>
                <label htmlFor="subcategory" className="block text-sm font-medium text-gray-700">
                  Subcategory *
                </label>
                <select
                  name="subcategory"
                  id="subcategory"
                  value={formData.subcategory}
                  onChange={handleChange}
                  disabled={!selectedCategory}
                  className={`mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${
                    validationErrors.subcategory ? 'border-red-300' : ''
                  } ${!selectedCategory ? 'bg-gray-50' : ''}`}
                >
                  <option value="">Select a subcategory</option>
                  {selectedCategory?.subcategories.map(subcategory => (
                    <option key={subcategory} value={subcategory}>
                      {subcategory}
                    </option>
                  ))}
                </select>
                {validationErrors.subcategory && (
                  <p className="mt-1 text-sm text-red-600">{validationErrors.subcategory}</p>
                )}
              </div>

              {/* Image Upload */}
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Product Image
                </label>
                <ImageUpload
                  onImageUpload={handleImageUpload}
                  currentImageUrl={formData.image_url}
                  placeholder="Upload product image"
                  className="w-full"
                />
                {uploadingImage && (
                  <p className="mt-2 text-sm text-blue-600">Uploading image...</p>
                )}
                <p className="mt-2 text-sm text-gray-500">
                  Upload an image from your computer or drag and drop it here.
                </p>
              </div>

              {/* Active Status */}
              <div className="sm:col-span-2">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    name="is_active"
                    id="is_active"
                    checked={formData.is_active}
                    onChange={handleChange}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="is_active" className="ml-2 block text-sm text-gray-900">
                    Product is active and visible to customers
                  </label>
                </div>
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => router.back()}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className={`px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                  loading
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {loading ? 'Creating Product...' : 'Create Product'}
              </button>
            </div>
          </form>
        </div>
      </div>
      </AdminLayout>
    </AdminGuard>
  );
}
