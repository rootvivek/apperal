'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import AdminLayout from '@/components/admin/AdminLayout';
import AdminGuard from '@/components/admin/AdminGuard';
import MultiImageUpload from '@/components/MultiImageUpload';
import { createClient } from '@/lib/supabase/client';
import { deleteImageFromSupabase, deleteFolderContents } from '@/utils/imageUpload';
import { MobileDetails, ApparelDetails, AccessoriesDetails } from '@/utils/productDetailsMapping';

interface ProductImage {
  id?: string;
  image_url: string;
  alt_text?: string;
  display_order: number;
}

interface ProductFormData {
  id: string;
  name: string;
  description: string;
  price: string;
  original_price: string;
  badge: string;
  category: string;
  subcategories: string[];
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

interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  parent_category_id: string | null;
  detail_type?: string | null;
}

export default function EditProductPage() {
  const router = useRouter();
  const params = useParams();
  const productId = params.id as string;
  
  // Create supabase client once at component level
  const supabase = createClient();
  
  // Track whether we've already fetched the product to prevent duplicate fetches
  const hasInitialFetched = useRef(false);
  const isMountedRef = useRef(true);
  
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [subcategories, setSubcategories] = useState<Category[]>([]);
  const [subcategoriesLoading, setSubcategoriesLoading] = useState(false);
  const [customSubcategory, setCustomSubcategory] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false); // Flag to prevent double submissions

  const [formData, setFormData] = useState<ProductFormData>({
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

  const [validationErrors, setValidationErrors] = useState<{[key: string]: string}>({});

  // Determine detail type from PARENT CATEGORY (detail_type column set in category admin)
  // All subcategories inherit the detail_type from their parent category
  const selectedCategory = categories.find(c => c.name === formData.category);
  
  // Use parent category's detail_type (subcategories inherit from parent)
  const detailType = selectedCategory?.detail_type === 'mobile' ? 'mobile' 
    : selectedCategory?.detail_type === 'apparel' ? 'apparel' 
    : selectedCategory?.detail_type === 'accessories' ? 'accessories'
    : 'none';

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

        setFormData({
          id: product.id,
          name: product.name,
          description: product.description,
          price: product.price.toString(),
          original_price: product.original_price?.toString() || '',
          badge: product.badge || '',
          category: categoryName,
          subcategories: subcategoryName ? [subcategoryName] : [],
          image_url: '', // Will be set from product images below
          stock_quantity: product.stock_quantity.toString(),
          is_active: product.is_active,
          show_in_hero: product.show_in_hero || false,
          images: [],
          // Common product fields (from products table)
          brand: brand,
          is_new: is_new,
          rating: rating,
          review_count: review_count,
          in_stock: in_stock,
          mobileDetails: mobileDetails || {},
          apparelDetails: apparelDetails || {},
          accessoriesDetails: accessoriesDetails || {},
        });

        const { data: productImages, error: imagesError } = await supabaseInstance
          .from('product_images')
          .select('*')
          .eq('product_id', productId)
          .order('display_order', { ascending: true });

        if (!isMountedRef.current) return;

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

        // Fetch subcategories for the category
        if (categoryName) {
          // Always try to fetch by category_id first (most reliable)
          const categoryIdToUse = product.category_id || null;
          
          if (categoryIdToUse) {
            // Direct fetch by category ID - most reliable
            const { data: subcatsData } = await supabaseInstance
              .from('subcategories')
              .select('*')
              .eq('parent_category_id', categoryIdToUse)
              .order('name', { ascending: true });
            if (subcatsData) {
              setSubcategories(subcatsData);
            }
          } else {
            // Fallback: fetch category by name directly from database
            const { data: categoryData } = await supabaseInstance
              .from('categories')
              .select('id')
              .eq('name', categoryName)
              .is('parent_category_id', null)
              .single();
            
            if (categoryData?.id) {
              const { data: subcatsData } = await supabaseInstance
                .from('subcategories')
                .select('*')
                .eq('parent_category_id', categoryData.id)
                .order('name', { ascending: true });
              if (subcatsData) {
                setSubcategories(subcatsData);
              }
            }
          }
        }

        hasInitialFetched.current = true;
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

  // Handle success redirect
  useEffect(() => {
    if (!success) return;

    const redirectTimer = setTimeout(() => {
      router.push('/admin/products');
    }, 2000);

    return () => {
      clearTimeout(redirectTimer);
    };
  }, [success, router]);

  const fetchSubcategories = async (categoryName: string) => {
    if (!categoryName) {
      setSubcategories([]);
      return;
    }

    try {
      setSubcategoriesLoading(true);
      
      const selectedCategory = categories.find(cat => cat.name === categoryName);
      let subcategoriesData = [];

      if (selectedCategory) {
        const { data: categorySubcategories, error: categoryError } = await supabase
          .from('subcategories')
          .select('*')
          .eq('parent_category_id', selectedCategory.id)
          .order('name', { ascending: true });

        if (!categoryError && categorySubcategories) {
          subcategoriesData = categorySubcategories;
        }
      }

      setSubcategories(subcategoriesData);
    } catch (err: any) {
      setSubcategories([]);
    } finally {
      setSubcategoriesLoading(false);
    }
  };

  const addCustomSubcategory = () => {
    if (customSubcategory.trim() && !formData.subcategories.includes(customSubcategory.trim())) {
      setFormData(prev => ({
        ...prev,
        subcategories: [...prev.subcategories, customSubcategory.trim()]
      }));
      setCustomSubcategory('');
    }
  };

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newCategory = e.target.value;
    setFormData(prev => ({
      ...prev,
      category: newCategory,
      subcategories: []
    }));
    
    fetchSubcategories(newCategory);
    
    if (validationErrors.subcategories) {
      setValidationErrors(prev => ({
        ...prev,
        subcategories: ''
      }));
    }
  };

  const handleImagesChange = useCallback((images: ProductImage[]) => {
    setFormData(prev => ({
      ...prev,
      images: images,
      image_url: images.length > 0 ? images[0].image_url : ''
    }));
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));

    if (validationErrors[name]) {
      setValidationErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = (): { isValid: boolean; errors: {[key: string]: string} } => {
    const errors: {[key: string]: string} = {};

    if (!formData.name || !formData.name.trim()) {
      errors.name = 'Product name is required';
    }

    if (!formData.description || !formData.description.trim()) {
      errors.description = 'Product description is required';
    }

    if (!formData.price || isNaN(parseFloat(formData.price)) || parseFloat(formData.price) <= 0) {
      errors.price = 'Valid price is required';
    }

    if (!formData.category) {
      errors.category = 'Category is required';
    }

    if (!formData.subcategories || formData.subcategories.length === 0) {
      errors.subcategories = 'At least one subcategory is required';
    }

    if (!formData.stock_quantity || isNaN(parseInt(formData.stock_quantity)) || parseInt(formData.stock_quantity) < 0) {
      errors.stock_quantity = 'Valid stock quantity is required';
    }

    setValidationErrors(errors);
    return { isValid: Object.keys(errors).length === 0, errors };
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
        }, 100);
      }
      return;
    }

    setIsSubmitting(true);
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const { error: deleteError } = await supabase
        .from('product_images')
        .delete()
        .eq('product_id', productId);

      if (deleteError) {
        throw new Error(`Failed to delete old images: ${deleteError.message}`);
      }

      const newImageUrl = formData.images.length > 0 ? formData.images[0].image_url : null;
      
      // Get category and subcategory IDs
      const categoryId = categories.find(c => c.name === formData.category)?.id || null;
      const selectedFirstName = formData.subcategories.length > 0 ? formData.subcategories[0] : null;
      const subcategoryId = selectedFirstName 
        ? (subcategories.find(s => s.name === selectedFirstName)?.id || null)
        : null;
      
      // Update product with COMMON fields in products table
      // Category-specific fields go to detail tables
      const fullUpdate: any = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        price: parseFloat(formData.price),
        original_price: formData.original_price ? parseFloat(formData.original_price) : null,
        badge: formData.badge.trim() || null,
        image_url: newImageUrl,
        stock_quantity: parseInt(formData.stock_quantity),
        is_active: formData.is_active,
        show_in_hero: formData.show_in_hero,
        // UUID foreign keys - all in same update
        category_id: categoryId,
        subcategory_id: subcategoryId,
        // Common product fields (saved to products table)
        brand: formData.brand?.trim() || null,
        is_new: formData.is_new || false,
        rating: formData.rating || 0,
        review_count: formData.review_count || 0,
        in_stock: formData.in_stock !== undefined ? formData.in_stock : (parseInt(formData.stock_quantity) > 0),
      };
      
      // Best-effort: Add legacy string fields only if columns exist
      // These will be stripped by the adaptive retry logic if they don't exist

      const stripLegacy = (obj: any) => { const { category, subcategory, ...rest } = obj; return rest; };
      const stripFK = (obj: any) => { const { category_id, subcategory_id, ...rest } = obj; return rest; };

      // Try 1: full update
      let upd = await supabase.from('products').update(fullUpdate).eq('id', productId);
      let updateError = upd.error as any;

      if (updateError) {
        const msg = updateError.message || '';
        let attemptObj: any = fullUpdate;
        if (
          msg.includes("category' column") ||
          msg.includes("subcategory' column") ||
          msg.includes('products.category') ||
          msg.includes('products.subcategory') ||
          (msg.includes('category') && msg.includes('does not exist')) ||
          (msg.includes('subcategory') && msg.includes('does not exist'))
        ) {
          attemptObj = stripLegacy(attemptObj);
        }
        if (
          msg.includes('category_id') ||
          msg.includes('subcategory_id') ||
          msg.includes('schema cache') ||
          (msg.includes('column') && msg.includes('does not exist'))
        ) {
          attemptObj = stripFK(attemptObj);
        }
        if (attemptObj !== fullUpdate) {
          const retry1 = await supabase.from('products').update(attemptObj).eq('id', productId);
          updateError = retry1.error as any;
        }
      }

      if (updateError) {
        throw new Error(`Failed to update product: ${updateError.message}`);
      }

      if (formData.images.length > 0) {
        const newImagesToInsert = formData.images.map((image, index) => ({
          product_id: productId,
          image_url: image.image_url,
          alt_text: image.alt_text || '',
          display_order: index
        }));
        
        const { error: imagesError } = await supabase
          .from('product_images')
          .insert(newImagesToInsert)
          .select();

        if (imagesError) {
          throw new Error(`Failed to insert images: ${imagesError.message}`);
        }
      }

      // AUTO-SAVE: Use detail_type from PARENT CATEGORY (set in category admin page)
      // Get category to determine detail_type
      const selectedCategory = categories.find(c => c.name === formData.category);
      const detailTypeFromDB = selectedCategory?.detail_type;

      if (subcategoryId) {
        // AUTO-SAVE to mobile table if parent category detail_type is 'mobile'
        if (detailTypeFromDB === 'mobile') {
          // Save ONLY cover-specific details to product_cover_details table
          // Common fields are already in products table
          const mobileInsert: any = {
            product_id: productId,
            // Cover-specific details only (common fields are in products table)
            brand: formData.mobileDetails?.brand || 'Not Specified',
            compatible_model: formData.mobileDetails?.compatible_model || 'Not Specified',
            type: formData.mobileDetails?.type || 'Not Specified',
            color: formData.mobileDetails?.color || 'Not Specified',
          };
          
          const { data: existing } = await supabase
            .from('product_cover_details')
            .select('id')
            .eq('product_id', productId)
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
            product_id: productId,
            // Apparel-specific details only (common fields are in products table)
            brand: formData.apparelDetails?.brand || 'Not Specified',
            gender: formData.apparelDetails?.gender || 'Not Specified',
            material: formData.apparelDetails?.material || 'Not Specified',
            fit_type: formData.apparelDetails?.fit_type || 'Not Specified',
            pattern: formData.apparelDetails?.pattern || 'Not Specified',
            color: formData.apparelDetails?.color || 'Not Specified',
            size: formData.apparelDetails?.size || 'Not Specified',
            sku: formData.apparelDetails?.sku || 'Not Specified',
          };
          
          const { data: existing } = await supabase
            .from('product_apparel_details')
            .select('id')
            .eq('product_id', productId)
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
            product_id: productId,
            // Accessories-specific details only (common fields are in products table)
            accessory_type: formData.accessoriesDetails?.accessory_type || 'Not Specified',
            compatible_with: formData.accessoriesDetails?.compatible_with || 'Not Specified',
            material: formData.accessoriesDetails?.material || 'Not Specified',
            color: formData.accessoriesDetails?.color || 'Not Specified',
          };
          
          const { data: existing } = await supabase
            .from('product_accessories_details')
            .select('id')
            .eq('product_id', productId)
            .single();
          
          if (existing) {
            await supabase.from('product_accessories_details').update(accessoriesInsert).eq('id', existing.id);
          } else {
            await supabase.from('product_accessories_details').insert(accessoriesInsert).select();
          }
        }
      }

      setSuccess(true);
      setError(null);

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
      if (productId) {
        try {
          await deleteFolderContents('product-images', productId);
        } catch (storageErr) {
          // Continue with product deletion even if storage deletion fails
        }
      }

      const { error: imagesError } = await supabase
        .from('product_images')
        .delete()
        .eq('product_id', productId);

      if (imagesError) {
        // Log but continue deletion
      }

      const { error: productError } = await supabase
        .from('products')
        .delete()
        .eq('id', productId);

      if (productError) throw productError;

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
                      Add custom subcategories that aren&apos;t in the list above
                    </p>
                  </div>
                )}
              </div>

              {/* Multiple Images Upload */}
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Product Images
                </label>
                
                {/* Current Main Image Preview */}
                <div className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <p className="text-xs font-medium text-gray-600 mb-3">Main Product Image (First Image):</p>
                  <div className="relative w-32 h-32 bg-white rounded-lg border-2 border-dashed border-gray-300 overflow-hidden">
                    <img
                      src={formData.images.length > 0 && formData.images[0].image_url ? formData.images[0].image_url : '/placeholder-product.jpg'}
                      alt="Main product image"
                      className="w-full h-full object-cover"
                    />
                    {formData.images.length === 0 && (
                      <div className="absolute inset-0 flex items-center justify-center bg-gray-100 bg-opacity-50">
                        <span className="text-xs text-gray-500 text-center px-2">No image selected</span>
                      </div>
                    )}
                  </div>
                  {formData.images.length > 0 && (
                    <p className="text-xs text-gray-500 mt-2">✓ First image will be displayed as main</p>
                  )}
                </div>

                <MultiImageUpload
                  onImagesChange={handleImagesChange}
                  currentImages={formData.images}
                  maxImages={5}
                  className="w-full"
                  productId={productId}
                  userId={null}
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
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Brand *</label>
                      <input
                        type="text"
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
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
                      <label className="block text-sm font-medium text-gray-700">Gender *</label>
                      <input
                        type="text"
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        placeholder="e.g., Men, Women, Unisex"
                        value={formData.apparelDetails.gender || ''}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            apparelDetails: { ...prev.apparelDetails, gender: e.target.value },
                          }))
                        }
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Material *</label>
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
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Fit Type *</label>
                      <input
                        type="text"
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        placeholder="e.g., Regular, Slim, Loose"
                        value={formData.apparelDetails.fit_type || ''}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            apparelDetails: { ...prev.apparelDetails, fit_type: e.target.value },
                          }))
                        }
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Pattern *</label>
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
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Color *</label>
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
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Size *</label>
                      <input
                        type="text"
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        placeholder="e.g., S, M, L, XL"
                        value={formData.apparelDetails.size || ''}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            apparelDetails: { ...prev.apparelDetails, size: e.target.value },
                          }))
                        }
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">SKU *</label>
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
                        required
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
                      <label className="block text-sm font-medium text-gray-700">Accessory Type *</label>
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
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Compatible With *</label>
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
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Material *</label>
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
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Color *</label>
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
                        required
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
                  type="button"
                  onClick={() => router.back()}
                  className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Cancel
                </button>
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
