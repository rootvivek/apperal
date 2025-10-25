'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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
  discount_percentage: string;
  badge: string;
  category: string;
  subcategories: string[]; // Changed from single subcategory to array
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


export default function NewProductPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [subcategories, setSubcategories] = useState<Category[]>([]);
  const [subcategoriesLoading, setSubcategoriesLoading] = useState(false);
  const [customSubcategory, setCustomSubcategory] = useState('');
  const supabase = createClient();

  const [formData, setFormData] = useState<ProductFormData>({
    name: '',
    description: '',
    price: '',
    original_price: '',
    discount_percentage: '0',
    badge: '',
    category: '',
    subcategories: [], // Changed from single subcategory to array
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

  // Add custom subcategory
  const addCustomSubcategory = () => {
    if (customSubcategory.trim() && !formData.subcategories.includes(customSubcategory.trim())) {
      setFormData(prev => ({
        ...prev,
        subcategories: [...prev.subcategories, customSubcategory.trim()]
      }));
      setCustomSubcategory('');
    }
  };

  // Fetch subcategories when category changes
  const fetchSubcategories = async (categoryName: string) => {
    if (!categoryName) {
      setSubcategories([]);
      return;
    }

    try {
      setSubcategoriesLoading(true);
      
      // First, try to get subcategories from the categories table (parent-child relationship)
      const selectedCategory = categories.find(cat => cat.name === categoryName);
      let subcategoriesData = [];

      if (selectedCategory) {
        // Fetch subcategories that have this category as parent
        const { data: categorySubcategories, error: categoryError } = await supabase
          .from('categories')
          .select('*')
          .eq('parent_category_id', selectedCategory.id)
          .order('name', { ascending: true });

        if (!categoryError && categorySubcategories) {
          subcategoriesData = categorySubcategories;
        }
      }

      // If no subcategories found in categories table, try to get from existing products
      if (subcategoriesData.length === 0) {
        const { data: productSubcategories, error: productError } = await supabase
          .from('products')
          .select('subcategory')
          .eq('category', categoryName)
          .not('subcategory', 'is', null)
          .not('subcategory', 'eq', '');

        if (!productError && productSubcategories) {
          // Get unique subcategories from existing products
          const uniqueSubcategories = [...new Set(productSubcategories.map(p => p.subcategory))];
          subcategoriesData = uniqueSubcategories.map((name, index) => ({
            id: `temp-${index}`,
            name: name,
            slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
            description: '',
            parent_category_id: selectedCategory?.id || null
          }));
        }
      }

      // If still no subcategories, provide some common ones based on category
      if (subcategoriesData.length === 0) {
        const commonSubcategories = getCommonSubcategories(categoryName);
        subcategoriesData = commonSubcategories.map((name, index) => ({
          id: `common-${index}`,
          name: name,
          slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
          description: '',
          parent_category_id: selectedCategory?.id || null
        }));
      }

      setSubcategories(subcategoriesData);
    } catch (err: any) {
      console.error('Error fetching subcategories:', err);
      setSubcategories([]);
    } finally {
      setSubcategoriesLoading(false);
    }
  };

  // Helper function to provide common subcategories based on category
  const getCommonSubcategories = (categoryName: string) => {
    const subcategoryMap: { [key: string]: string[] } = {
      "Men's Clothing": ["T-Shirts", "Shirts", "Pants", "Jeans", "Shorts", "Jackets", "Hoodies", "Sweaters"],
      "Women's Clothing": ["Dresses", "Tops", "Blouses", "Pants", "Jeans", "Skirts", "Jackets", "Sweaters"],
      "Kids' Clothing": ["T-Shirts", "Dresses", "Pants", "Shorts", "Jackets", "Sleepwear", "School Uniforms"],
      "Accessories": ["Bags", "Wallets", "Belts", "Hats", "Scarves", "Jewelry", "Watches", "Sunglasses"],
      "Electronics": ["Phones", "Laptops", "Tablets", "Headphones", "Chargers", "Cases", "Cables"],
      "Mobile Covers": ["iPhone Cases", "Samsung Cases", "Google Cases", "OnePlus Cases", "Generic Cases"],
      "Footwear": ["Sneakers", "Boots", "Sandals", "Heels", "Flats", "Athletic Shoes", "Dress Shoes"]
    };

    return subcategoryMap[categoryName] || ["General", "Popular", "New Arrivals", "Best Sellers"];
  };

  // Reset subcategory when category changes
  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newCategory = e.target.value;
    setFormData(prev => ({
      ...prev,
      category: newCategory,
      subcategories: [] // Reset subcategories when category changes
    }));
    
    // Fetch subcategories for the new category
    fetchSubcategories(newCategory);
    
    // Clear subcategories validation error
    if (validationErrors.subcategories) {
      setValidationErrors(prev => ({
        ...prev,
        subcategories: ''
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

  // Function to generate slug from product name
  const generateSlug = (name: string): string => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  // Handle multiple images change
  const handleImagesChange = (images: ProductImage[]) => {
    setFormData(prev => ({
      ...prev,
      images: images,
      image_url: images.length > 0 ? images[0].image_url : '' // Set first image as main image
    }));
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

    if (formData.subcategories.length === 0) {
      errors.subcategories = 'At least one subcategory is required';
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
      // First, create the product
      const { data: productData, error: productError } = await supabase
        .from('products')
        .insert([{
          name: formData.name.trim(),
          slug: generateSlug(formData.name.trim()),
          description: formData.description.trim(),
          price: parseFloat(formData.price),
          original_price: formData.original_price ? parseFloat(formData.original_price) : null,
          discount_percentage: parseInt(formData.discount_percentage) || 0,
          badge: formData.badge.trim() || null,
          category: formData.category,
          image_url: formData.image_url.trim() || null,
          stock_quantity: parseInt(formData.stock_quantity),
          is_active: formData.is_active,
          show_in_hero: formData.show_in_hero,
        }])
        .select()
        .single();

      if (productError) throw productError;

      // Insert subcategories
      if (formData.subcategories.length > 0) {
        const subcategoryInserts = formData.subcategories.map(subcategory => ({
          product_id: productData.id,
          subcategory_name: subcategory.trim()
        }));

        const { error: subcategoriesError } = await supabase
          .from('product_subcategories')
          .insert(subcategoryInserts);

        if (subcategoriesError) throw subcategoriesError;
      }

      // Then, insert product images if any
      if (formData.images.length > 0) {
        const imageInserts = formData.images.map(image => ({
          product_id: productData.id,
          image_url: image.image_url,
          alt_text: image.alt_text || '',
          display_order: image.display_order
        }));

        const { error: imagesError } = await supabase
          .from('product_images')
          .insert(imageInserts);

        if (imagesError) {
          console.error('Error inserting product images:', imagesError);
          // Don't throw here, product was created successfully
        }
      }

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
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
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
                  Current Price (₹) *
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

              {/* Original Price */}
              <div>
                <label htmlFor="original_price" className="block text-sm font-medium text-gray-700">
                  Original Price (₹)
                </label>
                <input
                  type="number"
                  name="original_price"
                  id="original_price"
                  step="0.01"
                  min="0"
                  value={formData.original_price}
                  onChange={handleChange}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="0.00"
                />
                <p className="mt-1 text-xs text-gray-500">Leave empty if no discount</p>
              </div>

              {/* Discount Percentage */}
              <div>
                <label htmlFor="discount_percentage" className="block text-sm font-medium text-gray-700">
                  Discount Percentage (%)
                </label>
                <input
                  type="number"
                  name="discount_percentage"
                  id="discount_percentage"
                  min="0"
                  max="100"
                  value={formData.discount_percentage}
                  onChange={handleChange}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="0"
                />
                <p className="mt-1 text-xs text-gray-500">0-100%</p>
              </div>

              {/* Product Badge */}
              <div>
                <label htmlFor="badge" className="block text-sm font-medium text-gray-700">
                  Product Badge
                </label>
                <select
                  name="badge"
                  id="badge"
                  value={formData.badge}
                  onChange={handleChange}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
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
                    onChange={handleCategoryChange}
                    className={`mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${
                      validationErrors.category ? 'border-red-300' : ''
                    }`}
                    disabled={categoriesLoading}
                  >
                    <option value="">
                      {categoriesLoading ? 'Loading categories...' : 'Select a category'}
                    </option>
                    {categories.map(category => (
                      <option key={category.id} value={category.name}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                {validationErrors.category && (
                  <p className="mt-1 text-sm text-red-600">{validationErrors.category}</p>
                )}
              </div>

              {/* Subcategories */}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Subcategories *
                </label>
                <div className="mt-1 space-y-2">
                  {!formData.category ? (
                    <p className="text-sm text-gray-500">Select a category first</p>
                  ) : subcategoriesLoading ? (
                    <p className="text-sm text-gray-500">Loading subcategories...</p>
                  ) : subcategories.length === 0 ? (
                    <p className="text-sm text-gray-500">No subcategories available</p>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      {getAvailableSubcategories().map(subcategory => (
                        <label key={subcategory.id} className="flex items-center">
                          <input
                            type="checkbox"
                            value={subcategory.name}
                            checked={formData.subcategories.includes(subcategory.name)}
                            onChange={(e) => {
                              const value = e.target.value;
                              if (e.target.checked) {
                                setFormData(prev => ({
                                  ...prev,
                                  subcategories: [...prev.subcategories, value]
                                }));
                              } else {
                                setFormData(prev => ({
                                  ...prev,
                                  subcategories: prev.subcategories.filter(s => s !== value)
                                }));
                              }
                            }}
                            className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                          />
                          <span className="ml-2 text-sm text-gray-700">{subcategory.name}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
                {validationErrors.subcategories && (
                  <p className="mt-1 text-sm text-red-600">{validationErrors.subcategories}</p>
                )}
                {formData.subcategories.length > 0 && (
                  <div className="mt-2">
                    <p className="text-xs text-gray-500">Selected: {formData.subcategories.join(', ')}</p>
                  </div>
                )}
                
                {/* Custom Subcategory Input */}
                {formData.category && (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Add Custom Subcategory
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={customSubcategory}
                        onChange={(e) => setCustomSubcategory(e.target.value)}
                        placeholder="Enter custom subcategory name"
                        className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            addCustomSubcategory();
                          }
                        }}
                      />
                      <button
                        type="button"
                        onClick={addCustomSubcategory}
                        disabled={!customSubcategory.trim() || formData.subcategories.includes(customSubcategory.trim())}
                        className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-300 disabled:cursor-not-allowed"
                      >
                        Add
                      </button>
                    </div>
                    <p className="mt-1 text-xs text-gray-500">
                      Add custom subcategories that aren't in the list above
                    </p>
                  </div>
                )}
              </div>

              {/* Multiple Images Upload */}
              <div className="sm:col-span-2">
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

              {/* Hero Showcase */}
              <div className="sm:col-span-2">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    name="show_in_hero"
                    id="show_in_hero"
                    checked={formData.show_in_hero}
                    onChange={handleChange}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="show_in_hero" className="ml-2 block text-sm text-gray-900">
                    Show this product in hero section carousel
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
