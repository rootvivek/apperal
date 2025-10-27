'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import AdminLayout from '@/components/admin/AdminLayout';
import AdminGuard from '@/components/admin/AdminGuard';
import MultiImageUpload from '@/components/MultiImageUpload';
import { createClient } from '@/lib/supabase/client';

interface ProductImage {
  id?: string;
  image_url: string;
  alt_text?: string;
  display_order: number;
}

interface ProductFormData {
  name: string;
  description: string;
  price: string;
  original_price: string;
  badge: string;
  category: string;
  subcategory: string;
  image_url: string;
  stock_quantity: string;
  is_active: boolean;
  show_in_hero: boolean;
  images: ProductImage[];
}

// Categories will be fetched from database
interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  parent_category_id: string | null;
}


export default function EditProductPage() {
  const router = useRouter();
  const params = useParams();
  const productId = params.id as string;
  
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [subcategories, setSubcategories] = useState<Category[]>([]);
  const [subcategoriesLoading, setSubcategoriesLoading] = useState(false);
  const supabase = createClient();

  const [formData, setFormData] = useState<ProductFormData>({
    name: '',
    description: '',
    price: '',
    original_price: '',
    badge: '',
    category: '',
    subcategory: '',
    image_url: '',
    stock_quantity: '',
    is_active: true,
    show_in_hero: false,
    images: [],
  });

  const [validationErrors, setValidationErrors] = useState<{[key: string]: string}>({});

  // Get available subcategories based on selected category
  const getAvailableSubcategories = () => {
    return subcategories;
  };

  // Fetch subcategories when category changes
  const fetchSubcategories = async (categoryName: string) => {
    if (!categoryName) {
      setSubcategories([]);
      return;
    }

    try {
      setSubcategoriesLoading(true);
      // Find the selected category to get its ID
      const selectedCategory = categories.find(cat => cat.name === categoryName);
      if (!selectedCategory) {
        setSubcategories([]);
        return;
      }

      // Fetch subcategories that have this category as parent from subcategories table
      const { data, error } = await supabase
        .from('subcategories')
        .select('*')
        .eq('parent_category_id', selectedCategory.id)
        .order('name', { ascending: true });

      if (error) throw error;
      setSubcategories(data || []);
    } catch (err: any) {
      console.error('Error fetching subcategories:', err);
      setSubcategories([]);
    } finally {
      setSubcategoriesLoading(false);
    }
  };

  // Reset subcategory when category changes
  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newCategory = e.target.value;
    setFormData(prev => ({
      ...prev,
      category: newCategory,
      subcategory: '' // Reset subcategory when category changes
    }));
    
    // Fetch subcategories for the new category
    fetchSubcategories(newCategory);
    
    // Clear subcategory validation error
    if (validationErrors.subcategory) {
      setValidationErrors(prev => ({
        ...prev,
        subcategory: ''
      }));
    }
  };

  // Fetch categories from database
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setCategoriesLoading(true);
        const { data, error } = await supabase
          .from('categories')
          .select('*')
          .is('parent_category_id', null) // Only main categories
          .order('name', { ascending: true });

        if (error) throw error;
        setCategories(data || []);
      } catch (err: any) {
        console.error('Error fetching categories:', err);
        setError('Failed to load categories');
      } finally {
        setCategoriesLoading(false);
      }
    };

    fetchCategories();
  }, [supabase]);

  // Fetch subcategories when form data is loaded and category is set
  useEffect(() => {
    if (formData.category && categories.length > 0) {
      fetchSubcategories(formData.category);
    }
  }, [formData.category, categories]);

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
        
        // Load product data
        const { data: product, error: productError } = await supabase
          .from('products')
          .select('*')
          .eq('id', productId)
          .single();

        if (productError) {
          console.error('Error loading product:', productError);
          setError('Failed to load product data');
          return;
        }

        // Load product images
        const { data: images, error: imagesError } = await supabase
          .from('product_images')
          .select('*')
          .eq('product_id', productId)
          .order('display_order', { ascending: true });

        if (imagesError) {
          console.error('Error loading product images:', imagesError);
        }

        if (product) {
          setFormData({
            name: product.name || '',
            description: product.description || '',
            price: product.price?.toString() || '',
            original_price: product.original_price?.toString() || '',
            badge: product.badge || '',
            category: product.category || '',
            subcategory: product.subcategory || '',
            image_url: product.image_url || '',
            stock_quantity: product.stock_quantity?.toString() || '',
            is_active: product.is_active ?? true,
            show_in_hero: product.show_in_hero ?? false,
            images: images || [],
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

  // Handle multiple images change
  const handleImagesChange = (images: ProductImage[]) => {
    setFormData(prev => ({
      ...prev,
      images: images,
      image_url: images.length > 0 ? images[0].image_url : '' // Set first image as main image
    }));
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

      // Update product
      const { error: productError } = await supabase
        .from('products')
        .update({
          name: formData.name.trim(),
          description: formData.description.trim(),
          price: parseFloat(formData.price),
          original_price: formData.original_price ? parseFloat(formData.original_price) : null,
          badge: formData.badge.trim() || null,
          category: formData.category,
          subcategory: formData.subcategory,
          image_url: formData.image_url,
          stock_quantity: parseInt(formData.stock_quantity),
          is_active: formData.is_active,
          show_in_hero: formData.show_in_hero,
          slug: slug,
          updated_at: new Date().toISOString(),
        })
        .eq('id', productId);

      if (productError) {
        console.error('Error updating product:', productError);
        setError('Failed to update product. Please try again.');
        return;
      }

      // Update product images
      // First, delete existing images
      const { error: deleteError } = await supabase
        .from('product_images')
        .delete()
        .eq('product_id', productId);

      if (deleteError) {
        console.error('Error deleting existing images:', deleteError);
      }

      // Then, insert new images
      if (formData.images.length > 0) {
        const imageInserts = formData.images.map(image => ({
          product_id: productId,
          image_url: image.image_url,
          alt_text: image.alt_text || '',
          display_order: image.display_order
        }));

        const { error: imagesError } = await supabase
          .from('product_images')
          .insert(imageInserts)
          .select();

        if (imagesError) {
          console.error('Error inserting product images:', imagesError);
          // Don't throw here, product was updated successfully
        }
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
        <div className="w-full py-6" style={{ paddingLeft: '20px', paddingRight: '20px' }}>
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
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
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
                    Current Price (₹) *
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

                {/* Original Price */}
                <div>
                  <label htmlFor="original_price" className="block text-sm font-medium text-gray-700 mb-2">
                    Original Price (₹)
                  </label>
                  <input
                    type="number"
                    id="original_price"
                    name="original_price"
                    value={formData.original_price}
                    onChange={handleInputChange}
                    step="0.01"
                    min="0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="0.00"
                  />
                  <p className="mt-1 text-xs text-gray-500">Leave empty if no discount</p>
                </div>


                {/* Product Badge */}
                <div>
                  <label htmlFor="badge" className="block text-sm font-medium text-gray-700 mb-2">
                    Product Badge
                  </label>
                  <select
                    id="badge"
                    name="badge"
                    value={formData.badge}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">No Badge</option>
                    <option value="NEW">NEW</option>
                    <option value="SALE">SALE</option>
                    <option value="HOT">HOT</option>
                    <option value="FEATURED">FEATURED</option>
                    <option value="LIMITED">LIMITED</option>
                  </select>
                  <p className="mt-1 text-xs text-gray-500">Optional product badge</p>
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
                    onChange={handleCategoryChange}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      validationErrors.category ? 'border-red-500' : 'border-gray-300'
                    }`}
                    disabled={categoriesLoading}
                  >
                    <option value="">
                      {categoriesLoading ? 'Loading categories...' : 'Select a category'}
                    </option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.name}>
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
                    disabled={!formData.category || subcategoriesLoading}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      validationErrors.subcategory ? 'border-red-500' : 'border-gray-300'
                    } ${!formData.category || subcategoriesLoading ? 'bg-gray-50' : ''}`}
                  >
                    <option value="">
                      {!formData.category 
                        ? 'Select a category first' 
                        : subcategoriesLoading 
                          ? 'Loading subcategories...' 
                          : subcategories.length === 0
                            ? 'No subcategories available'
                            : 'Select a subcategory'
                      }
                    </option>
                    {getAvailableSubcategories().map(subcategory => (
                      <option key={subcategory.id} value={subcategory.name}>
                        {subcategory.name}
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

                {/* Hero Showcase */}
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="show_in_hero"
                    name="show_in_hero"
                    checked={formData.show_in_hero}
                    onChange={handleInputChange}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="show_in_hero" className="ml-2 block text-sm text-gray-700">
                    Show in hero section carousel
                  </label>
                </div>
              </div>

              {/* Right Column */}
              <div className="space-y-6">
                {/* Product Images */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Product Images
                  </label>
                  <MultiImageUpload
                    onImagesChange={handleImagesChange}
                    currentImages={formData.images}
                    maxImages={5}
                    className="w-full"
                  />
                  <p className="mt-2 text-sm text-gray-500">
                    Upload multiple images for your product. The first image will be used as the main product image.
                  </p>
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
