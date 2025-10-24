'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
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

export default function EditProductPage() {
  const router = useRouter();
  const params = useParams();
  const productId = params.id as string;
  
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
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
      .replace(/[^a-z0-9 -]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  };

  // Load existing product data
  useEffect(() => {
    const loadProduct = async () => {
      try {
        setInitialLoading(true);
        const { data: product, error } = await supabase
          .from('products')
          .select('*')
          .eq('id', productId)
          .single();

        if (error) {
          console.error('Error loading product:', error);
          setError('Failed to load product data');
          return;
        }

        if (product) {
          setFormData({
            name: product.name || '',
            description: product.description || '',
            price: product.price?.toString() || '',
            category: product.category || '',
            subcategory: product.subcategory || '',
            image_url: product.image_url || '',
            stock_quantity: product.stock_quantity?.toString() || '',
            is_active: product.is_active ?? true,
          });
        }
      } catch (error) {
        console.error('Error loading product:', error);
        setError('Failed to load product data');
      } finally {
        setInitialLoading(false);
      }
    };

    if (productId) {
      loadProduct();
    }
  }, [productId, supabase]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
    
    // Clear validation error for this field
    if (validationErrors[name]) {
      setValidationErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleImageUpload = async (file: File) => {
    try {
      setUploadingImage(true);
      setError(null);
      
      const result = await uploadImageToSupabase(file, 'product-images', 'products');
      
      if (result.success && result.url) {
        setFormData(prev => ({ ...prev, image_url: result.url! }));
      } else {
        setError(result.error || 'Failed to upload image');
      }
    } catch (error) {
      console.error('Image upload error:', error);
      setError('Failed to upload image');
    } finally {
      setUploadingImage(false);
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

    if (!formData.price || isNaN(Number(formData.price)) || Number(formData.price) <= 0) {
      errors.price = 'Valid price is required';
    }

    if (!formData.category) {
      errors.category = 'Category is required';
    }

    if (!formData.subcategory) {
      errors.subcategory = 'Subcategory is required';
    }

    if (!formData.stock_quantity || isNaN(Number(formData.stock_quantity)) || Number(formData.stock_quantity) < 0) {
      errors.stock_quantity = 'Valid stock quantity is required';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const slug = generateSlug(formData.name);

      const { error } = await supabase
        .from('products')
        .update({
          name: formData.name.trim(),
          description: formData.description.trim(),
          price: parseFloat(formData.price),
          category: formData.category,
          subcategory: formData.subcategory,
          image_url: formData.image_url,
          stock_quantity: parseInt(formData.stock_quantity),
          is_active: formData.is_active,
          slug: slug,
          updated_at: new Date().toISOString(),
        })
        .eq('id', productId);

      if (error) {
        console.error('Error updating product:', error);
        setError('Failed to update product. Please try again.');
        return;
      }

      setSuccess(true);
      setTimeout(() => {
        router.push('/admin/products');
      }, 2000);

    } catch (error) {
      console.error('Error updating product:', error);
      setError('Failed to update product. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <AdminGuard>
        <AdminLayout>
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading product...</p>
            </div>
          </div>
        </AdminLayout>
      </AdminGuard>
    );
  }

  return (
    <AdminGuard>
      <AdminLayout>
        <div className="max-w-4xl mx-auto p-6">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Edit Product</h1>
            <p className="mt-2 text-gray-600">Update product information and settings</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800">{error}</p>
            </div>
          )}

          {success && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-green-800">Product updated successfully! Redirecting...</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Column */}
              <div className="space-y-6">
                {/* Product Name */}
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                    Product Name *
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      validationErrors.name ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Enter product name"
                  />
                  {validationErrors.name && (
                    <p className="mt-1 text-sm text-red-600">{validationErrors.name}</p>
                  )}
                </div>

                {/* Price */}
                <div>
                  <label htmlFor="price" className="block text-sm font-medium text-gray-700 mb-2">
                    Price ($) *
                  </label>
                  <input
                    type="number"
                    id="price"
                    name="price"
                    value={formData.price}
                    onChange={handleInputChange}
                    step="0.01"
                    min="0"
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      validationErrors.price ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="0.00"
                  />
                  {validationErrors.price && (
                    <p className="mt-1 text-sm text-red-600">{validationErrors.price}</p>
                  )}
                </div>

                {/* Category */}
                <div>
                  <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-2">
                    Category *
                  </label>
                  <select
                    id="category"
                    name="category"
                    value={formData.category}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      validationErrors.category ? 'border-red-500' : 'border-gray-300'
                    }`}
                  >
                    <option value="">Select a category</option>
                    {categories.map((category) => (
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
                  <label htmlFor="subcategory" className="block text-sm font-medium text-gray-700 mb-2">
                    Subcategory *
                  </label>
                  <select
                    id="subcategory"
                    name="subcategory"
                    value={formData.subcategory}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      validationErrors.subcategory ? 'border-red-500' : 'border-gray-300'
                    }`}
                    disabled={!formData.category}
                  >
                    <option value="">Select a subcategory</option>
                    {formData.category && categories
                      .find(cat => cat.name === formData.category)
                      ?.subcategories.map((subcategory) => (
                        <option key={subcategory} value={subcategory}>
                          {subcategory}
                        </option>
                      ))}
                  </select>
                  {validationErrors.subcategory && (
                    <p className="mt-1 text-sm text-red-600">{validationErrors.subcategory}</p>
                  )}
                </div>

                {/* Stock Quantity */}
                <div>
                  <label htmlFor="stock_quantity" className="block text-sm font-medium text-gray-700 mb-2">
                    Stock Quantity *
                  </label>
                  <input
                    type="number"
                    id="stock_quantity"
                    name="stock_quantity"
                    value={formData.stock_quantity}
                    onChange={handleInputChange}
                    min="0"
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      validationErrors.stock_quantity ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="0"
                  />
                  {validationErrors.stock_quantity && (
                    <p className="mt-1 text-sm text-red-600">{validationErrors.stock_quantity}</p>
                  )}
                </div>

                {/* Active Status */}
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="is_active"
                    name="is_active"
                    checked={formData.is_active}
                    onChange={handleInputChange}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="is_active" className="ml-2 block text-sm text-gray-700">
                    Product is active
                  </label>
                </div>
              </div>

              {/* Right Column */}
              <div className="space-y-6">
                {/* Product Image */}
                <div>
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
                </div>

                {/* Description */}
                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                    Description *
                  </label>
                  <textarea
                    id="description"
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    rows={6}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      validationErrors.description ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Enter product description"
                  />
                  {validationErrors.description && (
                    <p className="mt-1 text-sm text-red-600">{validationErrors.description}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Submit Buttons */}
            <div className="flex justify-end space-x-4 pt-6 border-t">
              <button
                type="button"
                onClick={() => router.push('/admin/products')}
                className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Updating...' : 'Update Product'}
              </button>
            </div>
          </form>
        </div>
      </AdminLayout>
    </AdminGuard>
  );
}
