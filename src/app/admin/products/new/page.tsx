'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AdminLayout from '@/components/admin/AdminLayout';
import AdminGuard from '@/components/admin/AdminGuard';
import MultiImageUpload from '@/components/MultiImageUpload';
import { createClient } from '@/lib/supabase/client';
import { MobileDetails, ApparelDetails, AccessoriesDetails } from '@/utils/productDetailsMapping';
import { toNullIfEmpty, toEmptyIfEmpty } from '@/utils/formUtils';
import { useAuth } from '@/contexts/AuthContext';

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
  subcategories: string[]; // Changed from single subcategory to array
  image_url: string;
  stock_quantity: string;
  is_active: boolean;
  show_in_hero: boolean;
  images: ProductImage[];
  // Additional product fields
  brand?: string;
  is_new?: boolean;
  rating?: number;
  review_count?: number;
  in_stock?: boolean;
  // Product detail fields
  mobileDetails: Partial<MobileDetails>;
  apparelDetails: Partial<ApparelDetails>;
  accessoriesDetails: Partial<AccessoriesDetails>;
}

// Categories will be fetched from database
interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  parent_category_id: string | null;
  detail_type?: string | null; // Added for subcategories to indicate which detail table to use
  is_active?: boolean;
}


export default function NewProductPage() {
  const router = useRouter();
  const { user } = useAuth();
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

  const [userId, setUserId] = useState<string | null>(null);
  const [productUuid, setProductUuid] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<ProductFormData>({
    name: '',
    description: '',
    price: '',
    original_price: '',
    badge: '',
    category: '',
    subcategories: [], // Changed from single subcategory to array
    image_url: '',
    stock_quantity: '',
    is_active: true,
    show_in_hero: false,
    images: [],
    mobileDetails: {},
    apparelDetails: {},
    accessoriesDetails: {},
  });

  // Available sizes for apparel products
  const availableSizes = ['Small', 'Medium', 'Large'];
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
  
  // Available fit types for apparel products
  const availableFitTypes = ['Regular', 'Slim', 'Loose', 'Oversized', 'Fitted'];
  const [selectedFitTypes, setSelectedFitTypes] = useState<string[]>([]);

  // Determine detail type from PARENT CATEGORY (detail_type column set in category admin)
  // All subcategories inherit the detail_type from their parent category
  const selectedCategory = categories.find(c => c.name === formData.category);
  const selectedSubcategory = subcategories.find(s => formData.subcategories.includes(s.name));
  
  // Use parent category's detail_type (subcategories inherit from parent)
  const detailType = selectedCategory?.detail_type === 'mobile' ? 'mobile' 
    : selectedCategory?.detail_type === 'apparel' ? 'apparel' 
    : selectedCategory?.detail_type === 'accessories' ? 'accessories'
    : 'none';

  const [validationErrors, setValidationErrors] = useState<{[key: string]: string}>({});

  // Get user ID and generate product UUID on mount
  useEffect(() => {
    const fetchUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUserId(session.user.id);
      }
    };
    
    const generateUuid = () => {
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
    };
    
    fetchUser();
    const uuid = generateUuid();
    setProductUuid(uuid);
  }, []);

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
      
      // Find the selected category
      const selectedCategory = categories.find(cat => cat.name === categoryName);
      
      if (!selectedCategory) {
        setSubcategories([]);
        setSubcategoriesLoading(false);
        return;
      }

      // Fetch subcategories from subcategories table
      // Try with is_active filter first, fallback without it if column doesn't exist
      let { data: categorySubcategories, error: categoryError } = await supabase
          .from('subcategories')
        .select('id, name, slug, description, parent_category_id, detail_type')
          .eq('parent_category_id', selectedCategory.id)
          .order('name', { ascending: true });

      // If error about is_active column, retry without the filter
      if (categoryError && categoryError.message?.includes('is_active')) {
        const { data, error } = await supabase
          .from('subcategories')
          .select('id, name, slug, description, parent_category_id, detail_type')
          .eq('parent_category_id', selectedCategory.id)
          .order('name', { ascending: true });
        categorySubcategories = data;
        categoryError = error;
      } else {
        // If no error, filter by is_active if the column exists
        if (categorySubcategories) {
          categorySubcategories = categorySubcategories.filter((sub: any) => 
            sub.is_active === undefined || sub.is_active === true
          );
        }
      }

      if (categoryError) {
        setError(`Failed to load subcategories: ${categoryError.message}`);
        setSubcategories([]);
      } else {
        setSubcategories(categorySubcategories || []);
      }
    } catch (err: any) {
      setError(`Failed to load subcategories: ${err.message}`);
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
        setError('Failed to load categories');
      } finally {
        setCategoriesLoading(false);
      }
    };

    fetchCategories();
  }, [supabase]);

  // Function to generate unique slug from product name
  const generateUniqueSlug = async (name: string): Promise<string> => {
    const baseSlug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .substring(0, 100); // Limit slug length to 100 characters
    
    let slug = baseSlug;
    let counter = 1;
    
    // Check if slug exists and append number if it does
    while (true) {
      const { data, error } = await supabase
        .from('products')
        .select('id')
        .eq('slug', slug)
        .maybeSingle();
      
      // If no product found with this slug, it's unique
      if (error || !data) {
        return slug;
      }
      
      // If slug exists, append a number
      slug = `${baseSlug}-${counter}`;
      counter++;
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

    if (formData.stock_quantity && parseInt(formData.stock_quantity) < 0) {
      errors.stock_quantity = 'Stock quantity must be a valid positive number';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Helper function to convert empty strings to null for database
  const toNullIfEmpty = (value: string | undefined | null): string | null => {
    if (!value || typeof value !== 'string') return null;
    const trimmed = value.trim();
    return trimmed === '' ? null : trimmed;
  };

  // Helper function to convert empty strings to empty string for database (for optional fields with NOT NULL constraints)
  const toEmptyIfEmpty = (value: string | undefined | null): string => {
    if (!value || typeof value !== 'string') return '';
    const trimmed = value.trim();
    return trimmed === '' ? '' : trimmed;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setLoading(true);
    setError(null);

    try {
      // Generate unique slug
      const uniqueSlug = await generateUniqueSlug(formData.name.trim());
      
      // Get category and subcategory IDs
      const categoryId = categories.find(c => c.name === formData.category)?.id || null;
      const selectedFirstName = formData.subcategories.length > 0 ? formData.subcategories[0] : null;
      const subcategoryId = selectedFirstName 
        ? (subcategories.find(s => s.name === selectedFirstName)?.id || null)
        : null;
      
      // Create product with COMMON fields in products table
      // Category-specific fields go to detail tables
      const productInsert: any = {
        ...(productUuid ? { id: productUuid } : {}),
        name: formData.name.trim(),
        slug: uniqueSlug,
        description: formData.description.trim(),
        price: parseFloat(formData.price),
        original_price: formData.original_price ? parseFloat(formData.original_price) : null,
        badge: formData.badge.trim() || null,
        image_url: formData.image_url.trim() || null,
        stock_quantity: parseInt(formData.stock_quantity),
        is_active: formData.is_active,
        show_in_hero: formData.show_in_hero,
        // UUID foreign keys
        category_id: categoryId,
        subcategory_id: subcategoryId,
        // Common product fields (saved to products table)
        brand: formData.brand?.trim() || null,
        is_new: formData.is_new || false,
        rating: formData.rating || 0,
        review_count: formData.review_count || 0,
        in_stock: formData.in_stock !== undefined ? formData.in_stock : (parseInt(formData.stock_quantity) > 0),
      };

      // Best-effort: Add legacy string fields if they exist in schema
      // These are optional and won't cause errors if columns don't exist

      // Use API route to create product (bypasses RLS)
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      
      // Add user ID header for admin authentication
      if (user?.id) {
        headers['X-User-Id'] = user.id;
      }

      const createResponse = await fetch('/api/admin/create-product', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          product: productInsert,
          images: formData.images.map(image => ({
            image_url: image.image_url,
            alt_text: image.alt_text || '',
            display_order: image.display_order
          }))
        })
      });

      const responseData = await createResponse.json();

      if (!createResponse.ok) {
        throw new Error(responseData.error || 'Failed to create product');
      }

      if (!responseData.success || !responseData.product) {
        throw new Error('Product creation failed');
      }

      const productDataSingle = responseData.product;

      // AUTO-SAVE: Use detail_type from PARENT CATEGORY (set in category admin page)
      // If category has detail_type='mobile' → product_cover_details
      // If category has detail_type='apparel' → product_apparel_details
      // Subcategories inherit detail_type from their parent category
      if (subcategoryId) {
        const selectedCategory = categories.find(c => c.name === formData.category);
        const detailTypeFromDB = selectedCategory?.detail_type;
        
        // AUTO-SAVE to mobile table if parent category detail_type is 'mobile'
        if (detailTypeFromDB === 'mobile') {
          // Save ONLY cover-specific details to product_cover_details table
          // Common fields are already in products table
          const mobileInsert: any = {
            product_id: productDataSingle.id,
            // Cover-specific details only (common fields are in products table)
            brand: formData.mobileDetails?.brand?.trim() || 'Not Specified',
            // Explicitly set to null if empty string - always include in update
            compatible_model: toNullIfEmpty(formData.mobileDetails?.compatible_model),
            type: toNullIfEmpty(formData.mobileDetails?.type),
            color: toNullIfEmpty(formData.mobileDetails?.color),
          };
          
          // Try to update first, if not found then insert
          const { data: existing } = await supabase
            .from('product_cover_details')
            .select('id')
            .eq('product_id', productDataSingle.id)
            .single();
          
          if (existing) {
            await supabase.from('product_cover_details').update(mobileInsert).eq('id', existing.id);
          } else {
            await supabase.from('product_cover_details').insert(mobileInsert).select();
          }
        } 
        // AUTO-SAVE to apparel table if parent category detail_type is 'apparel'
        else if (detailTypeFromDB === 'apparel') {
          // Save ONLY apparel-specific details to product_apparel_details table
          // Common fields are already in products table
          const apparelInsert: any = {
            product_id: productDataSingle.id,
            // Apparel-specific details only (common fields are in products table)
            brand: formData.apparelDetails?.brand || 'Not Specified',
            // Explicitly set to null if empty string - always include in update
            material: toNullIfEmpty(formData.apparelDetails?.material),
            fit_type: selectedFitTypes.length > 0 ? selectedFitTypes.join(',') : null,
            pattern: toNullIfEmpty(formData.apparelDetails?.pattern),
            color: toNullIfEmpty(formData.apparelDetails?.color),
            size: selectedSizes.length > 0 ? selectedSizes.join(',') : null,
            sku: toNullIfEmpty(formData.apparelDetails?.sku),
          };
          
          // Try to update first, if not found then insert
          const { data: existing } = await supabase
            .from('product_apparel_details')
            .select('id')
            .eq('product_id', productDataSingle.id)
            .single();
          
          if (existing) {
            await supabase.from('product_apparel_details').update(apparelInsert).eq('id', existing.id);
          } else {
            await supabase.from('product_apparel_details').insert(apparelInsert).select();
          }
        }
        // AUTO-SAVE to accessories table if parent category detail_type is 'accessories'
        else if (detailTypeFromDB === 'accessories') {
          // Save ONLY accessories-specific details to product_accessories_details table
          // Common fields are already in products table
          const accessoriesInsert: any = {
            product_id: productDataSingle.id,
            // Accessories-specific details only (common fields are in products table)
            // Use empty strings for optional fields instead of null
            accessory_type: toEmptyIfEmpty(formData.accessoriesDetails?.accessory_type),
            compatible_with: toEmptyIfEmpty(formData.accessoriesDetails?.compatible_with),
            material: toEmptyIfEmpty(formData.accessoriesDetails?.material),
            color: toEmptyIfEmpty(formData.accessoriesDetails?.color),
          };
          
          // Try to update first, if not found then insert
          const { data: existing } = await supabase
            .from('product_accessories_details')
            .select('id')
            .eq('product_id', productDataSingle.id)
            .single();
          
          if (existing) {
            await supabase.from('product_accessories_details').update(accessoriesInsert).eq('id', existing.id);
          } else {
            await supabase.from('product_accessories_details').insert(accessoriesInsert).select();
          }
        }
      }

      // Images are now handled by the create-product API route

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
                  Stock Quantity
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

              {/* Product Details - Mobile - Based on subcategory detail_type relationship */}
              {detailType === 'mobile' && (
                <div className="sm:col-span-2 border-t pt-6">
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-lg font-medium text-gray-900">Phone Cover Details</h3>
                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                      Will save to: product_cover_details
                    </span>
                  </div>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Brand *</label>
                      <input
                        type="text"
                        value={formData.mobileDetails.brand || ''}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          mobileDetails: { ...prev.mobileDetails, brand: e.target.value }
                        }))}
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        placeholder="e.g., Apple, Samsung"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Compatible Model *</label>
                      <input
                        type="text"
                        value={formData.mobileDetails.compatible_model || ''}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          mobileDetails: { ...prev.mobileDetails, compatible_model: e.target.value }
                        }))}
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        placeholder="e.g., iPhone 15, Samsung Galaxy S24"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Type *</label>
                      <input
                        type="text"
                        value={formData.mobileDetails.type || ''}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          mobileDetails: { ...prev.mobileDetails, type: e.target.value }
                        }))}
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        placeholder="e.g., Clear Case, Wallet Case, Silicone"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Color *</label>
                      <input
                        type="text"
                        value={formData.mobileDetails.color || ''}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          mobileDetails: { ...prev.mobileDetails, color: e.target.value }
                        }))}
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        placeholder="e.g., Black, Transparent, Blue"
                        required
                      />
                    </div>
                  </div>
                  <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded">
                    <p className="text-xs text-blue-800 font-medium">
                      ✓ Auto-detected: Mobile subcategory → Details will be saved to <strong>product_cover_details</strong> table
                    </p>
                  </div>
                </div>
              )}

              {/* Product Details - Apparel - Based on subcategory detail_type relationship */}
              {detailType === 'apparel' && (
                <div className="sm:col-span-2 border-t pt-6">
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-lg font-medium text-gray-900">Apparel Details</h3>
                    <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                      Will save to: product_apparel_details
                    </span>
                  </div>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Brand *</label>
                      <input
                        type="text"
                        value={formData.apparelDetails.brand || ''}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          apparelDetails: { ...prev.apparelDetails, brand: e.target.value }
                        }))}
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        placeholder="e.g., Nike, Adidas, Zara"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Material</label>
                      <input
                        type="text"
                        value={formData.apparelDetails.material || ''}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          apparelDetails: { ...prev.apparelDetails, material: e.target.value }
                        }))}
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        placeholder="e.g., Cotton, Polyester, Silk"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Pattern</label>
                      <input
                        type="text"
                        value={formData.apparelDetails.pattern || ''}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          apparelDetails: { ...prev.apparelDetails, pattern: e.target.value }
                        }))}
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        placeholder="e.g., Solid, Striped, Printed"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Color</label>
                      <input
                        type="text"
                        value={formData.apparelDetails.color || ''}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          apparelDetails: { ...prev.apparelDetails, color: e.target.value }
                        }))}
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        placeholder="e.g., Red, Blue, Black"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Available Fit Types</label>
                      <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                        {availableFitTypes.map((fitType) => (
                          <label key={fitType} className="flex items-center space-x-1 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={selectedFitTypes.includes(fitType)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedFitTypes([...selectedFitTypes, fitType]);
                                } else {
                                  setSelectedFitTypes(selectedFitTypes.filter(f => f !== fitType));
                                }
                              }}
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                            <span className="text-xs text-gray-700">{fitType}</span>
                          </label>
                        ))}
                      </div>
                      {selectedFitTypes.length === 0 && (
                        <p className="mt-1 text-xs text-gray-500">Select at least one fit type</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Available Sizes</label>
                      <div className="grid grid-cols-3 gap-2">
                        {availableSizes.map((size) => (
                          <label key={size} className="flex items-center space-x-1 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={selectedSizes.includes(size)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedSizes([...selectedSizes, size]);
                                } else {
                                  setSelectedSizes(selectedSizes.filter(s => s !== size));
                                }
                              }}
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                            <span className="text-xs text-gray-700">{size}</span>
                          </label>
                        ))}
                      </div>
                      {selectedSizes.length === 0 && (
                        <p className="mt-1 text-xs text-gray-500">Select at least one size</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">SKU</label>
                      <input
                        type="text"
                        value={formData.apparelDetails.sku || ''}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          apparelDetails: { ...prev.apparelDetails, sku: e.target.value }
                        }))}
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        placeholder="e.g., APL-001-RED-M"
                      />
                    </div>
                  </div>
                  <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded">
                    <p className="text-xs text-green-800 font-medium">
                      ✓ Auto-detected: Apparel subcategory → Details will be saved to <strong>product_apparel_details</strong> table
                    </p>
                  </div>
                </div>
              )}

              {/* Product Details - Accessories - Based on category detail_type relationship */}
              {detailType === 'accessories' && (
                <div className="sm:col-span-2 border-t pt-6">
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-lg font-medium text-gray-900">Accessories Details</h3>
                    <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded">
                      Will save to: product_accessories_details
                    </span>
                  </div>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Accessory Type</label>
                      <input
                        type="text"
                        value={formData.accessoriesDetails?.accessory_type || ''}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          accessoriesDetails: { ...prev.accessoriesDetails, accessory_type: e.target.value }
                        }))}
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        placeholder="e.g., Charger, Cable, Case, Stand"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Compatible With</label>
                      <input
                        type="text"
                        value={formData.accessoriesDetails?.compatible_with || ''}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          accessoriesDetails: { ...prev.accessoriesDetails, compatible_with: e.target.value }
                        }))}
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        placeholder="e.g., iPhone, Samsung, Universal"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Material</label>
                      <input
                        type="text"
                        value={formData.accessoriesDetails?.material || ''}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          accessoriesDetails: { ...prev.accessoriesDetails, material: e.target.value }
                        }))}
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        placeholder="e.g., Plastic, Metal, Silicone"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Color</label>
                      <input
                        type="text"
                        value={formData.accessoriesDetails?.color || ''}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          accessoriesDetails: { ...prev.accessoriesDetails, color: e.target.value }
                        }))}
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        placeholder="e.g., Black, White, Silver"
                      />
                    </div>
                  </div>
                  <div className="mt-2 p-2 bg-purple-50 border border-purple-200 rounded">
                    <p className="text-xs text-purple-800 font-medium">
                      ✓ Auto-detected: Accessories subcategory → Details will be saved to <strong>product_accessories_details</strong> table
                    </p>
                  </div>
                </div>
              )}

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
                      {subcategories.map(subcategory => (
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
                  productId={productUuid}
                  userId={userId}
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
