'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import AdminLayout from '@/components/admin/AdminLayout';
import AdminGuard from '@/components/admin/AdminGuard';
import MultiImageUpload from '@/components/MultiImageUpload';
import { createClient } from '@/lib/supabase/client';
import { toNullIfEmpty, toEmptyIfEmpty } from '@/utils/formUtils';
import { useAuth } from '@/contexts/AuthContext';
import { Spinner } from '@/components/ui/spinner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Category } from '@/types/admin';
import { PRODUCT_SIZES, PRODUCT_FIT_TYPES } from '@/types/admin';
import { validateProductForm } from '@/utils/validation/product';
import { useProductSubcategories } from '@/hooks/admin/useProductSubcategories';
import { useProductFormHandlers } from '@/hooks/admin/useProductFormHandlers';
import type { ExtendedProductFormData } from '@/hooks/admin/useProductForm';
import { UI_TIMING } from '@/constants';
import { safeParseInt, safeParseFloat } from '@/utils/formatters';
import { getDetailType } from '@/utils/product/detailType';
import { prepareProductData } from '@/utils/product/prepareProductData';
import { saveProductDetails } from '@/utils/product/saveProductDetails';
import { createAdminHeaders } from '@/utils/api/adminHeaders';
import { handleApiResponse } from '@/utils/api/responseHandler';
import { resolveCategoryIds, getCategoryByName } from '@/utils/product/resolveCategoryIds';
import { mapProductImagesForApi } from '@/utils/product/mapProductImages';


export default function EditProductPage() {
  const router = useRouter();
  const params = useParams();
  const productId = params.id as string;
  const { user } = useAuth();
  
  // Create supabase client once at component level
  const supabase = createClient();
  
  // Track whether we've already fetched the product to prevent duplicate fetches
  const hasInitialFetched = useRef(false);
  const isMountedRef = useRef(true);
  // Store the actual product ID from database to ensure consistency
  // Start with null, will be set from database fetch (source of truth)
  const actualProductIdRef = useRef<string | null>(null);
  
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [customSubcategory, setCustomSubcategory] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { subcategories, subcategoriesLoading, fetchSubcategories } = useProductSubcategories();
  
  // Available sizes for apparel products
  const availableSizes = [...PRODUCT_SIZES];
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
  
  // Available fit types for apparel products
  const availableFitTypes = [...PRODUCT_FIT_TYPES];
  const [selectedFitTypes, setSelectedFitTypes] = useState<string[]>([]);

  const [formData, setFormData] = useState<ExtendedProductFormData & { id: string }>({
    id: productId,
    name: '',
    description: '',
    price: '',
    original_price: '',
    badge: '',
    category: '',
    subcategories: [],
    image_url: '',
    stock_quantity: '',
    is_active: true,
    show_in_hero: false,
    images: [],
    brand: '',
    is_new: false,
    rating: 0,
    review_count: 0,
    in_stock: true,
    mobileDetails: {},
    apparelDetails: {},
    accessoriesDetails: {},
  });

  const [validationErrors, setValidationErrors] = useState<{[key: string]: string | undefined}>({});

  // Determine detail type from PARENT CATEGORY (detail_type column set in category admin)
  // All subcategories inherit the detail_type from their parent category
  const selectedCategory = getCategoryByName(formData.category, categories);
  const detailType = getDetailType(selectedCategory);

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
      // Reset submitting state on unmount to prevent stuck state
      setIsSubmitting(false);
      setLoading(false);
    };
  }, []);

  // Safety: Reset submitting state if it gets stuck
  useEffect(() => {
    if (isSubmitting && !loading) {
      const timer = setTimeout(() => {
        setIsSubmitting(false);
      }, 5000); // Reset after 5 seconds if stuck
      return () => clearTimeout(timer);
    }
  }, [isSubmitting, loading]);

  // Fetch product data - only on initial load
  useEffect(() => {
    // Prevent duplicate fetches
    if (hasInitialFetched.current) {
      return;
    }
    hasInitialFetched.current = true;

    const supabaseInstance = supabase;

    const fetchProduct = async () => {
      try {
        setPageLoading(true);
        
        const { data: product, error: productError } = await supabaseInstance
          .from('products')
          .select(`
            *,
            product_cover_details (*),
            product_apparel_details (*),
            product_accessories_details (*)
          `)
          .eq('id', productId)
          .single();

        if (productError) throw productError;
        if (!product) throw new Error('Product not found');

        if (!isMountedRef.current) return;

        // Determine category name - prefer UUID relationship, fallback to legacy string
        let categoryName = product.category || '';
        if (!categoryName && product.category_id) {
          const { data: categoryData } = await supabaseInstance
            .from('categories')
            .select('name')
            .eq('id', product.category_id)
            .single();
          if (categoryData) {
            categoryName = categoryData.name;
          }
        }

        // Determine subcategory name - prefer UUID relationship, fallback to legacy string
        let subcategoryName = product.subcategory || '';
        let subcategoryId = product.subcategory_id || null;
        if (!subcategoryName && product.subcategory_id) {
          const { data: subcategoryData } = await supabaseInstance
            .from('subcategories')
            .select('name')
            .eq('id', product.subcategory_id)
            .single();
          if (subcategoryData) {
            subcategoryName = subcategoryData.name;
          }
        }

        // Extract detail data (Supabase returns as arrays)
        const mobileDetails = Array.isArray(product.product_cover_details) && product.product_cover_details.length > 0
          ? product.product_cover_details[0]
          : (product.product_cover_details || {});
        
        const apparelDetails = Array.isArray(product.product_apparel_details) && product.product_apparel_details.length > 0
          ? product.product_apparel_details[0]
          : (product.product_apparel_details || {});
        
        // Parse sizes from comma-separated string if exists
        if (apparelDetails.size) {
          const sizesArray = apparelDetails.size.split(',').map((s: string) => s.trim()).filter(Boolean);
          setSelectedSizes(sizesArray);
        }
        
        // Parse fit types from comma-separated string if exists
        if (apparelDetails.fit_type) {
          const fitTypesArray = apparelDetails.fit_type.split(',').map((f: string) => f.trim()).filter(Boolean);
          setSelectedFitTypes(fitTypesArray);
        }
        
        const accessoriesDetails = Array.isArray(product.product_accessories_details) && product.product_accessories_details.length > 0
          ? product.product_accessories_details[0]
          : (product.product_accessories_details || {});
        
        // Get additional product fields from detail tables (they're saved there, not in products table)
        // Priority: mobile > apparel > accessories > products table (fallback)
        const detailRecord = mobileDetails || apparelDetails || accessoriesDetails;
        const brand = detailRecord?.brand || (product as any).brand || '';
        const is_new = detailRecord?.is_new !== undefined ? detailRecord.is_new : ((product as any).is_new || false);
        const rating = detailRecord?.rating !== undefined ? detailRecord.rating : ((product as any).rating || 0);
        const review_count = detailRecord?.review_count !== undefined ? detailRecord.review_count : ((product as any).review_count || 0);
        const in_stock = detailRecord?.in_stock !== undefined ? detailRecord.in_stock : ((product as any).in_stock !== undefined ? (product as any).in_stock : (product.stock_quantity > 0));

        // Fetch images FIRST to extract product ID from existing image URLs (priority)
        // This ensures new uploads use the same folder as existing images
        const { data: productImages, error: imagesError } = await supabaseInstance
          .from('product_images')
          .select('*')
          .eq('product_id', productId)
          .order('display_order', { ascending: true });

        // Extract product ID from existing image URLs to maintain folder consistency
        // URL format: .../product-images/{productId}/filename.webp
        if (!imagesError && productImages?.length > 0) {
          const firstImageUrl = productImages[0]?.image_url;
          if (firstImageUrl) {
            const urlMatch = firstImageUrl.match(/\/product-images\/([a-f0-9-]{36})\//i);
            if (urlMatch?.[1]) {
              actualProductIdRef.current = urlMatch[1];
            }
          }
        }

        // Fallback to database product ID if no existing images found
        // This ensures consistent folder usage for all uploads
        if (!actualProductIdRef.current) {
          actualProductIdRef.current = product.id;
        }
        
        // Ensure empty strings from database are converted to empty strings for form (not null)
        // This way when user clears a field, it stays empty
        setFormData({
          id: product.id,
          name: product.name || '',
          description: product.description || '',
          price: product.price.toString(),
          original_price: product.original_price?.toString() || '',
          badge: product.badge || '',
          category: categoryName,
          subcategories: subcategoryName ? [subcategoryName] : [],
          image_url: '', // Will be set from product images below
          stock_quantity: product.stock_quantity?.toString() || '',
          is_active: product.is_active,
          show_in_hero: product.show_in_hero || false,
          images: [],
          // Common product fields (from products table)
          brand: brand || '',
          is_new: is_new,
          rating: rating || 0,
          review_count: review_count || 0,
          in_stock: in_stock,
          // Detail fields - convert null/undefined to empty strings for form inputs
          mobileDetails: {
            brand: mobileDetails?.brand || '',
            compatible_model: mobileDetails?.compatible_model || '',
            type: mobileDetails?.type || '',
            color: mobileDetails?.color || '',
          },
          apparelDetails: {
            brand: apparelDetails?.brand || '',
            material: apparelDetails?.material || '',
            fit_type: apparelDetails?.fit_type || '',
            pattern: apparelDetails?.pattern || '',
            color: apparelDetails?.color || '',
            size: '', // Size is now handled by selectedSizes state
            sku: apparelDetails?.sku || '',
          },
          accessoriesDetails: {
            accessory_type: accessoriesDetails?.accessory_type || '',
            compatible_with: accessoriesDetails?.compatible_with || '',
            material: accessoriesDetails?.material || '',
            color: accessoriesDetails?.color || '',
          },
        });

        if (!isMountedRef.current) return;

        // Process images (already fetched above)
        if (!imagesError && productImages && productImages.length > 0) {
          const loadedImages = productImages.map((img: any) => ({
            id: img.id,
            image_url: img.image_url,
            alt_text: img.alt_text,
            display_order: img.display_order
          }));
          
          setFormData(prev => ({
            ...prev,
            images: loadedImages,
            image_url: loadedImages[0].image_url // Set first image as main
          }));
        } else {
          // No images found, set to placeholder fallback
          setFormData(prev => ({
            ...prev,
            images: [],
            image_url: '' // Empty means use placeholder
          }));
        }

        // Fetch subcategories for the category (will be handled after categories are loaded)
      } catch (err: any) {
        setError(err.message);
      } finally {
        if (isMountedRef.current) {
          setPageLoading(false);
        }
      }
    };

    // Only fetch on initial mount, not on every render
    fetchProduct();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty dependency array - only run once on mount

  // Fetch categories
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setCategoriesLoading(true);
        const { data, error } = await supabase
          .from('categories')
          .select('*')
          .is('parent_category_id', null)
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
  }, []);

  // Handle success redirect - but don't redirect immediately, let user see success message
  // User can manually navigate or we redirect after delay
  useEffect(() => {
    if (!success) return;

    // Optional: Redirect after delay, but user can also stay and continue editing
    // Removed auto-redirect to prevent form reset - user can manually navigate
    // const redirectTimer = setTimeout(() => {
    //   router.push('/admin/products');
    // }, 3000);
    
    // return () => {
    //   clearTimeout(redirectTimer);
    // };
  }, [success]);

  // Fetch subcategories when categories are loaded and category is set
  useEffect(() => {
    if (categories.length > 0 && formData.category) {
      fetchSubcategories(formData.category, categories);
    }
  }, [categories, formData.category, fetchSubcategories]);

  const {
    handleImagesChange,
    handleChange,
    addCustomSubcategory,
    handleCategoryChange,
  } = useProductFormHandlers({
    formData: formData as ExtendedProductFormData,
    setFormData: setFormData as React.Dispatch<React.SetStateAction<ExtendedProductFormData>>,
    validationErrors,
    setValidationErrors,
    categories,
    fetchSubcategories,
    customSubcategory,
    setCustomSubcategory,
  });

  const validateForm = (): { isValid: boolean; errors: {[key: string]: string | undefined} } => {
    const validation = validateProductForm(formData);
    setValidationErrors(validation.errors);
    return validation;
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isSubmitting || loading) {
      return;
    }
    
    const validation = validateForm();
    if (!validation.isValid) {
      const errorFields = Object.keys(validation.errors);
      const errorMessages = errorFields.map(field => {
        const fieldName = field === 'subcategories' ? 'subcategory' : field;
        return `${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)}: ${validation.errors[field]}`;
      }).join(', ');
      
      setError(`Please fix validation errors: ${errorMessages}`);
      
      // Scroll to first error field
      const firstErrorField = errorFields[0];
      if (firstErrorField) {
        setTimeout(() => {
          const element = document.querySelector(`[name="${firstErrorField}"]`);
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            (element as HTMLElement).focus();
          }
        }, UI_TIMING.SCROLL_DELAY);
      }
      return;
    }

    setIsSubmitting(true);
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      // Images are now handled by the update-product API route (preserves UUIDs)
      const newImageUrl = formData.images.length > 0 ? formData.images[0].image_url : null;
      
      // Get category and subcategory IDs
      const { categoryId, subcategoryId } = resolveCategoryIds(
        formData.category,
        formData.subcategories,
        categories,
        subcategories
      );
      
      // Update product with COMMON fields in products table
      // Category-specific fields go to detail tables
      const fullUpdate: any = {
        ...prepareProductData({
          formData,
          categoryId,
          subcategoryId,
          isEdit: true,
        }),
        image_url: newImageUrl,
      };
      
      // Best-effort: Add legacy string fields only if columns exist
      // These will be stripped by the adaptive retry logic if they don't exist

      const stripLegacy = (obj: any) => { const { category, subcategory, ...rest } = obj; return rest; };
      const stripFK = (obj: any) => { const { category_id, subcategory_id, ...rest } = obj; return rest; };

      // Use API route to update product (bypasses RLS)
      const updateResponse = await fetch('/api/admin/update-product', {
        method: 'POST',
        headers: createAdminHeaders(user?.id),
        body: JSON.stringify({
          productId,
          product: fullUpdate,
          images: mapProductImagesForApi(formData.images, true)
        })
      });

      await handleApiResponse(updateResponse, 'Failed to update product');

      // AUTO-SAVE: Use detail_type from PARENT CATEGORY (set in category admin page)
      // Get category to determine detail_type
      const selectedCategory = getCategoryByName(formData.category, categories);
      const detailTypeFromDB = selectedCategory?.detail_type;

      if (subcategoryId && (detailTypeFromDB === 'mobile' || detailTypeFromDB === 'apparel' || detailTypeFromDB === 'accessories')) {
        await saveProductDetails({
          productId,
          detailType: detailTypeFromDB,
          formData,
          selectedSizes,
          selectedFitTypes,
          isEdit: true,
        });
      }

      setSuccess(true);
      setError(null);
      
      // Reload images from database to get IDs for newly inserted images
      // This ensures that images uploaded during this session get their UUIDs
      const { data: updatedImages, error: imagesError } = await supabase
        .from('product_images')
        .select('*')
        .eq('product_id', productId)
        .order('display_order', { ascending: true });

      if (!imagesError && updatedImages && updatedImages.length > 0) {
        const loadedImages = updatedImages.map((img: any) => ({
          id: img.id,
          image_url: img.image_url,
          alt_text: img.alt_text,
          display_order: img.display_order
        }));
        
        // Update formData with images that now have IDs from database
        setFormData(prev => ({
          ...prev,
          images: loadedImages,
          image_url: loadedImages[0]?.image_url || prev.image_url
        }));
      } else if (imagesError) {
        // Don't fail the update if image reload fails - images were already saved
      }

    } catch (err: any) {
      setError(err.message || 'An error occurred while saving the product');
      setSuccess(false);
    } finally {
      setLoading(false);
      setIsSubmitting(false); // Reset submitting flag
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this product? This action cannot be undone.')) {
      return;
    }

    setDeleting(true);
    setError(null);

    try {
      // Use API route to delete product (bypasses RLS and handles storage deletion)
      const deleteResponse = await fetch('/api/admin/delete-product', {
        method: 'POST',
        headers: createAdminHeaders(user?.id),
        body: JSON.stringify({ productId })
      });

      await handleApiResponse(deleteResponse, 'Failed to delete product');
      
      // Only redirect if API confirms successful deletion
      router.push('/admin/products');
    } catch (err: any) {
      setError(err.message);
      setDeleting(false);
    }
  };

  if (pageLoading) {
    return (
      <AdminGuard>
        <AdminLayout>
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <Spinner className="size-12 text-blue-600 mx-auto" />
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
      <div className="space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Edit Product</h1>
          <p className="mt-1 text-sm text-gray-500 flex items-center gap-2">
            Update product details, images, and pricing.
            {productId && (
              <span className="inline-flex items-center gap-2">
                <span className="text-gray-400">•</span>
                <span className="text-gray-600">UUID:</span>
                <code className="px-1.5 py-0.5 bg-gray-100 rounded text-gray-700 text-xs">
                  {productId}
                </code>
                <button
                  type="button"
                  onClick={async () => {
                    try { await navigator.clipboard.writeText(productId); alert('Product ID copied'); } catch {}
                  }}
                  className="text-blue-600 hover:text-blue-800 text-xs"
                  title="Copy UUID"
                >
                  Copy
                </button>
              </span>
            )}
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
                <h3 className="text-sm font-medium text-green-800">Product Updated Successfully!</h3>
                <div className="mt-2 text-sm text-green-700">
                  <p>Your changes have been saved. Redirecting to products list...</p>
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
            {/* Active Status and Hero Showcase - Top */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 border-b pb-4">
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


              {/* Product Details - Phone Cover - Based on category detail_type relationship */}
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
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        value={formData.mobileDetails.brand || ''}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            mobileDetails: { ...prev.mobileDetails, brand: e.target.value },
                          }))
                        }
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Compatible Model *</label>
                      <input
                        type="text"
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        placeholder="e.g., iPhone 15, Samsung Galaxy S24"
                        value={formData.mobileDetails.compatible_model || ''}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            mobileDetails: { ...prev.mobileDetails, compatible_model: e.target.value },
                          }))
                        }
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Type *</label>
                      <input
                        type="text"
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        placeholder="e.g., Clear Case, Wallet Case, Silicone"
                        value={formData.mobileDetails.type || ''}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            mobileDetails: { ...prev.mobileDetails, type: e.target.value },
                          }))
                        }
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Color *</label>
                      <input
                        type="text"
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        placeholder="e.g., Black, Transparent, Blue"
                        value={formData.mobileDetails.color || ''}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            mobileDetails: { ...prev.mobileDetails, color: e.target.value },
                          }))
                        }
                        required
                      />
                    </div>
                  </div>
                  <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded">
                    <p className="text-xs text-blue-800 font-medium">
                      ✓ Phone Cover Details → Saved to <strong>product_cover_details</strong> table
                    </p>
                  </div>
                </div>
              )}

              {/* Product Details - Apparel - Based on category detail_type relationship */}
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
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        placeholder="e.g., Nike, Adidas, Zara"
                        value={formData.apparelDetails.brand || ''}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            apparelDetails: { ...prev.apparelDetails, brand: e.target.value },
                          }))
                        }
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Material</label>
                      <input
                        type="text"
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        placeholder="e.g., Cotton, Polyester, Silk"
                        value={formData.apparelDetails.material || ''}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            apparelDetails: { ...prev.apparelDetails, material: e.target.value },
                          }))
                        }
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Pattern</label>
                      <input
                        type="text"
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        placeholder="e.g., Solid, Striped, Printed"
                        value={formData.apparelDetails.pattern || ''}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            apparelDetails: { ...prev.apparelDetails, pattern: e.target.value },
                          }))
                        }
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Color</label>
                      <input
                        type="text"
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        placeholder="e.g., Red, Blue, Black"
                        value={formData.apparelDetails.color || ''}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            apparelDetails: { ...prev.apparelDetails, color: e.target.value },
                          }))
                        }
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
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        placeholder="e.g., APL-001-RED-M"
                        value={formData.apparelDetails.sku || ''}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            apparelDetails: { ...prev.apparelDetails, sku: e.target.value },
                          }))
                        }
                      />
                    </div>
                  </div>
                  <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded">
                    <p className="text-xs text-green-800 font-medium">
                      ✓ Apparel Details → Saved to <strong>product_apparel_details</strong> table
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
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        value={formData.accessoriesDetails.accessory_type || ''}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            accessoriesDetails: { ...prev.accessoriesDetails, accessory_type: e.target.value },
                          }))
                        }
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Compatible With</label>
                      <input
                        type="text"
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        placeholder="e.g., iPhone, Samsung, Universal"
                        value={formData.accessoriesDetails.compatible_with || ''}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            accessoriesDetails: { ...prev.accessoriesDetails, compatible_with: e.target.value },
                          }))
                        }
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Material</label>
                      <input
                        type="text"
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        placeholder="e.g., Plastic, Metal, Silicone"
                        value={formData.accessoriesDetails.material || ''}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            accessoriesDetails: { ...prev.accessoriesDetails, material: e.target.value },
                          }))
                        }
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Color</label>
                      <input
                        type="text"
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        placeholder="e.g., Black, White, Silver"
                        value={formData.accessoriesDetails.color || ''}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            accessoriesDetails: { ...prev.accessoriesDetails, color: e.target.value },
                          }))
                        }
                      />
                    </div>
                  </div>
                  <div className="mt-2 p-2 bg-purple-50 border border-purple-200 rounded">
                    <p className="text-xs text-purple-800 font-medium">
                      ✓ Accessories Details → Saved to <strong>product_accessories_details</strong> table
                    </p>
                  </div>
                </div>
              )}

              {/* Multiple Images Upload - At the End */}
              <div className="sm:col-span-2 border-t pt-6">
                <label className="block text-sm font-medium text-gray-700 mb-4">
                  Product Images
                </label>
                
                {/* Render MultiImageUpload - use productId from params if actualProductIdRef not set yet */}
                {productId && (
                  <MultiImageUpload
                    onImagesChange={handleImagesChange}
                    currentImages={formData.images}
                    maxImages={5}
                    className="w-full"
                    productId={actualProductIdRef.current || productId}
                    userId={user?.id || null}
                  />
                )}
                {!productId && (
                  <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 text-center">
                    <p className="text-sm text-gray-500">Loading product information...</p>
                  </div>
                )}
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex justify-between items-center">
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className={`px-4 py-2 border border-red-300 rounded-md text-sm font-medium text-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 ${
                  deleting
                    ? 'bg-red-50 cursor-not-allowed opacity-50'
                    : 'bg-red-50 hover:bg-red-100'
                }`}
              >
                {deleting ? 'Deleting...' : '🗑️ Delete Product'}
              </button>
              <div className="flex space-x-3">
                <button
                  type="submit"
                  disabled={loading || isSubmitting}
                  className={`px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                    loading || isSubmitting
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                >
                  {loading || isSubmitting ? 'Updating Product...' : 'Update Product'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
      </AdminLayout>
    </AdminGuard>
  );
}
