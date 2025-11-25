'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AdminLayout from '@/components/admin/AdminLayout';
import AdminGuard from '@/components/admin/AdminGuard';
import MultiImageUpload from '@/components/MultiImageUpload';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Category } from '@/types/admin';
import { PRODUCT_SIZES, PRODUCT_FIT_TYPES } from '@/types/admin';
import { generateUniqueSlug } from '@/utils/product/slug';
import { validateProductForm } from '@/utils/validation/product';
import { useProductSubcategories } from '@/hooks/admin/useProductSubcategories';
import { useProductFormHandlers } from '@/hooks/admin/useProductFormHandlers';
import type { ExtendedProductFormData } from '@/hooks/admin/useProductForm';
import { generateUuid } from '@/utils/uuid';
import { getDetailType } from '@/utils/product/detailType';
import { prepareProductData } from '@/utils/product/prepareProductData';
import { saveProductDetails } from '@/utils/product/saveProductDetails';
import { createAdminHeaders } from '@/utils/api/adminHeaders';
import { handleApiResponse } from '@/utils/api/responseHandler';
import { resolveCategoryIds, getCategoryByName } from '@/utils/product/resolveCategoryIds';
import { mapProductImagesForApi } from '@/utils/product/mapProductImages';
import { UI_TIMING } from '@/constants';



export default function NewProductPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [customSubcategory, setCustomSubcategory] = useState('');
  const supabase = createClient();
  const { subcategories, subcategoriesLoading, fetchSubcategories } = useProductSubcategories();

  const [userId, setUserId] = useState<string | null>(null);
  const [productUuid, setProductUuid] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<ExtendedProductFormData>({
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
  const availableSizes = [...PRODUCT_SIZES];
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
  
  // Available fit types for apparel products
  const availableFitTypes = [...PRODUCT_FIT_TYPES];
  const [selectedFitTypes, setSelectedFitTypes] = useState<string[]>([]);

  // Determine detail type from PARENT CATEGORY (detail_type column set in category admin)
  // All subcategories inherit the detail_type from their parent category
  const selectedCategory = getCategoryByName(formData.category, categories);
  const detailType = getDetailType(selectedCategory);

  const [validationErrors, setValidationErrors] = useState<{[key: string]: string | undefined}>({});

  // Get user ID and generate product UUID on mount
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setUserId(session.user.id);
        }
      } catch {
        // Silently handle auth errors
      }
    };
    
    fetchUser();
    const uuid = generateUuid();
    setProductUuid(uuid);
  }, []);

  const {
    handleImagesChange,
    handleChange,
    addCustomSubcategory,
    handleCategoryChange,
  } = useProductFormHandlers({
    formData,
    setFormData,
    validationErrors,
    setValidationErrors,
    categories,
    fetchSubcategories,
    customSubcategory,
    setCustomSubcategory,
  });

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



  const validateForm = (): boolean => {
    const validation = validateProductForm(formData);
    setValidationErrors(validation.errors);
    return validation.isValid;
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
      const { categoryId, subcategoryId } = resolveCategoryIds(
        formData.category,
        formData.subcategories,
        categories,
        subcategories
      );
      
      // Create product with COMMON fields in products table
      // Category-specific fields go to detail tables
      const productInsert: any = {
        ...prepareProductData({
          formData,
          categoryId,
          subcategoryId,
          productUuid,
          isEdit: false,
        }),
        slug: uniqueSlug,
        image_url: formData.image_url.trim() || null,
      };

      // Best-effort: Add legacy string fields if they exist in schema
      // These are optional and won't cause errors if columns don't exist

      // Use API route to create product (bypasses RLS)
      const createResponse = await fetch('/api/admin/create-product', {
        method: 'POST',
        headers: createAdminHeaders(user?.id),
        body: JSON.stringify({
          product: productInsert,
          images: mapProductImagesForApi(formData.images, false)
        })
      });

      const responseData = await handleApiResponse<{ success: boolean; product: any }>(
        createResponse,
        'Failed to create product'
      );

      if (!responseData.product) {
        throw new Error('Product creation failed: No product returned');
      }

      const productDataSingle = responseData.product;

      // AUTO-SAVE: Use detail_type from PARENT CATEGORY (set in category admin page)
      // If category has detail_type='mobile' → product_cover_details
      // If category has detail_type='apparel' → product_apparel_details
      // Subcategories inherit detail_type from their parent category
      if (subcategoryId) {
        const selectedCategory = getCategoryByName(formData.category, categories);
        const detailTypeFromDB = selectedCategory?.detail_type;
        
        if (detailTypeFromDB === 'mobile' || detailTypeFromDB === 'apparel' || detailTypeFromDB === 'accessories') {
          await saveProductDetails({
            productId: productDataSingle.id,
            detailType: detailTypeFromDB,
            formData,
            selectedSizes,
            selectedFitTypes,
            isEdit: false,
          });
        }
      }

      // Images are now handled by the create-product API route

      setSuccess(true);
      setTimeout(() => {
        router.push('/admin/products');
      }, UI_TIMING.SUCCESS_REDIRECT_DELAY);

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
                <Select
                  value={formData.badge || "none"}
                  onValueChange={(value) => handleChange({ target: { name: 'badge', value: value === "none" ? "" : value } } as any)}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="No Badge" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Badge</SelectItem>
                    <SelectItem value="NEW">NEW</SelectItem>
                    <SelectItem value="SALE">SALE</SelectItem>
                    <SelectItem value="HOT">HOT</SelectItem>
                    <SelectItem value="FEATURED">FEATURED</SelectItem>
                    <SelectItem value="LIMITED">LIMITED</SelectItem>
                  </SelectContent>
                </Select>
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
                  <Select
                    value={formData.category}
                    onValueChange={(value) => {
                      setFormData(prev => ({
                        ...prev,
                        category: value,
                        subcategories: []
                      }));
                      if (value) {
                        fetchSubcategories(value, categories);
                      }
                    }}
                    disabled={categoriesLoading}
                  >
                    <SelectTrigger className={`mt-1 ${validationErrors.category ? 'border-red-300' : ''}`}>
                      <SelectValue placeholder={categoriesLoading ? 'Loading categories...' : 'Select a category'} />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map(category => (
                        <SelectItem key={category.id} value={category.name}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
