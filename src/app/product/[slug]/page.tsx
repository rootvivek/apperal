'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import EmptyState from '@/components/EmptyState';
import { PRODUCT_GRID_CLASSES_SMALL_GAP } from '@/utils/layoutUtils';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import { useWishlist } from '@/contexts/WishlistContext';
import { useLoginModal } from '@/contexts/LoginModalContext';
import { createClient } from '@/lib/supabase/client';
import ProductCard from '@/components/ProductCard';
import ProductReviews from '@/components/ProductReviews';
import { Spinner } from '@/components/ui/spinner';
import ProductMedia from './ProductMedia';
import ProductInfo from '@/components/ProductInfo';
import ProductDetails from './ProductDetails';
import ProductBottomActions from './ProductBottomActions';

interface ProductCardProduct {
  id: string;
  name: string;
  slug?: string;
  description: string;
  price: number;
  original_price?: number | null;
  badge?: string | null;
  category: string | { id: string; name: string; slug: string; description: string; image: string; subcategories: any[] };
  category_id?: string | null;
  subcategory: string;
  subcategory_id?: string | null;
  subcategories: string[];
  image_url: string;
  stock_quantity: number;
  is_active: boolean;
  show_in_hero?: boolean;
  created_at: string;
  updated_at: string;
  // Additional product fields
  brand?: string | null;
  is_new?: boolean | null;
  rating?: number | null;
  review_count?: number | null;
  in_stock?: boolean | null;
  images?: {
    id: string;
    image_url: string;
    alt_text?: string;
    display_order: number;
  }[];
  // Product detail fields (category-specific only, common fields are in products table)
  product_cover_details?: {
    brand: string; // Cover-specific brand field (different from common brand)
    compatible_model: string;
    type: string;
    color: string;
  };
  product_apparel_details?: {
    brand: string;
    material: string;
    fit_type: string;
    pattern: string;
    color: string;
    size: string;
    sku: string;
  };
  product_accessories_details?: {
    accessory_type: string;
    compatible_with: string;
    material: string;
    color: string;
  };
}

interface ProductDetailPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export default function ProductDetailPage({ params }: ProductDetailPageProps) {
  const [slug, setSlug] = useState<string>('');
  
  // Resolve params promise (Next.js 15+)
  useEffect(() => {
    const resolveParams = async () => {
      const resolved = await params;
      setSlug(resolved.slug);
    };
    resolveParams();
  }, [params]);
  
  const [product, setProduct] = useState<ProductCardProduct | null>(null);
  const [relatedProducts, setRelatedProducts] = useState<ProductCardProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [relatedLoading, setRelatedLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [categorySlug, setCategorySlug] = useState<string>('');
  const [subcategorySlug, setSubcategorySlug] = useState<string>('');
  const { addToCart } = useCart();
  const { user } = useAuth();
  const { wishlist, addToWishlist, removeFromWishlist, isInWishlist, loading: wishlistLoading } = useWishlist();
  const { openModal: openLoginModal } = useLoginModal();
  const supabase = createClient();

  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [selectedColor, setSelectedColor] = useState<string>('');
  const [isAddedToCart, setIsAddedToCart] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const previousSlugRef = useRef<string>('');
  const wishlistProductRef = useRef<any>(null);

  const fetchRelatedProducts = async (categoryName: string, categoryId: string | null, currentProductId: string, subcategoryId?: string | null) => {
    try {
      setRelatedLoading(true);
      
      let productsData: any[] = [];
      
      // Try to query by category_id first (UUID relationship) - this is the primary method
      if (categoryId) {
        const { data, error } = await supabase
          .from('products')
          .select('id, name, slug, description, price, original_price, image_url, stock_quantity, is_active, category_id, subcategory_id, created_at, updated_at, badge, product_images (id, image_url, alt_text, display_order)')
          .eq('category_id', categoryId)
          .neq('id', currentProductId)
          .eq('is_active', true)
          .limit(8)
          .order('created_at', { ascending: false });
        
        if (!error && data && data.length > 0) {
          productsData = data;
        }
      }
      
      // If no products found by category_id, try to fetch by subcategory_id as fallback
      if (productsData.length === 0 && subcategoryId) {
        const { data, error } = await supabase
          .from('products')
          .select('id, name, slug, description, price, original_price, image_url, stock_quantity, is_active, category_id, subcategory_id, created_at, updated_at, badge, product_images (id, image_url, alt_text, display_order)')
          .eq('subcategory_id', subcategoryId)
          .neq('id', currentProductId)
          .eq('is_active', true)
          .limit(8)
          .order('created_at', { ascending: false });
        
        if (!error && data && data.length > 0) {
          productsData = data;
        }
      }
      
      // If still no products, fetch any active products as a last resort
      if (productsData.length === 0) {
        const { data, error } = await supabase
          .from('products')
          .select('id, name, slug, description, price, original_price, image_url, stock_quantity, is_active, category_id, subcategory_id, created_at, updated_at, badge, product_images (id, image_url, alt_text, display_order)')
          .neq('id', currentProductId)
          .eq('is_active', true)
          .limit(8)
          .order('created_at', { ascending: false });
        
        if (!error && data && data.length > 0) {
          productsData = data;
        }
      }
      
      // Transform products to include images array and ensure image_url is present
      if (productsData.length > 0) {
        const transformedProducts = productsData.map((product: any) => {
          // Ensure image_url exists - use first product_image if main image_url is missing
          let mainImageUrl = product.image_url;
          if (!mainImageUrl && product.product_images && product.product_images.length > 0) {
            mainImageUrl = product.product_images[0].image_url;
          }
          
          // Transform product_images to images array format
          const imagesArray = product.product_images && product.product_images.length > 0
            ? product.product_images.map((img: any) => ({
                id: img.id || 'image-' + Math.random(),
                image_url: img.image_url,
                alt_text: img.alt_text || product.name,
                display_order: img.display_order || 0
              }))
            : (mainImageUrl ? [{
                id: 'main-image',
                image_url: mainImageUrl,
                alt_text: product.name,
                display_order: 0
              }] : []);
          
          return {
            ...product,
            image_url: mainImageUrl || '', // Ensure image_url is always present
            images: imagesArray,
            // Ensure category and subcategory are strings for ProductCard
            category: typeof product.category === 'object' ? product.category?.name || '' : (product.category || ''),
            subcategory: product.subcategory || '',
            subcategories: product.subcategory ? [product.subcategory] : []
          };
        });
        
        setRelatedProducts(transformedProducts as ProductCardProduct[]);
        } else {
          setRelatedProducts([]);
        }
    } catch (err) {
      setRelatedProducts([]);
    } finally {
      setRelatedLoading(false);
    }
  };

  useEffect(() => {
    // Restore selected size and color from localStorage on mount/refresh (only in browser)
    if (typeof window !== 'undefined') {
      const savedSize = localStorage.getItem(`selectedSize_${slug}`);
      const savedColor = localStorage.getItem(`selectedColor_${slug}`);
      if (savedSize) {
        setSelectedSize(savedSize);
      }
      if (savedColor) {
        setSelectedColor(savedColor);
      }
      
      // Only reset selections when product slug actually changes (not on refresh)
      if (previousSlugRef.current !== slug) {
        // Reset all selections to empty when navigating to a new product
        setSelectedSize('');
        setSelectedColor('');
        // Clear localStorage for the previous product
        if (previousSlugRef.current && typeof window !== 'undefined') {
          localStorage.removeItem(`selectedSize_${previousSlugRef.current}`);
          localStorage.removeItem(`selectedColor_${previousSlugRef.current}`);
        }
        previousSlugRef.current = slug;
        // Then restore saved values for the new product if they exist
        if (savedSize) {
          setSelectedSize(savedSize);
        }
        if (savedColor) {
          setSelectedColor(savedColor);
        }
      }
    }
    
    const fetchProduct = async () => {
      try {
        setLoading(true);
        
        // First try to find by exact slug match - include all detail tables and category relationship
        let { data: product, error: productError } = await supabase
          .from('products')
          .select(`
            *, 
            product_images (id, image_url, alt_text, display_order),
            product_cover_details (*),
            product_apparel_details (*),
            product_accessories_details (*),
            category:categories!products_category_id_fkey (id, name, slug)
          `)
          .eq('slug', slug)
          .eq('is_active', true)
          .maybeSingle();
        
        // If not found by exact slug, try partial match (removing trailing numbers like -1, -2, etc.)
        if (!product && !productError) {
          const slugWithoutSuffix = slug.replace(/-\d+$/, '');
          
          const { data: partialProduct, error: partialError } = await supabase
            .from('products')
            .select(`
              *, 
              product_images (id, image_url, alt_text, display_order),
              product_cover_details (*),
              product_apparel_details (*),
              product_accessories_details (*),
              category:categories!products_category_id_fkey (id, name, slug)
            `)
            .ilike('slug', `${slugWithoutSuffix}%`)
            .eq('is_active', true)
            .limit(1)
            .maybeSingle();
          
          if (!partialError && partialProduct) {
            product = partialProduct;
            productError = null;
          }
        }
        
        // If not found by slug, try by ID (for backward compatibility)
        if (!product && !productError && slug && slug.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
          const { data, error } = await supabase
            .from('products')
            .select(`
              *, 
              product_images (id, image_url, alt_text, display_order),
              product_cover_details (*),
              product_apparel_details (*),
              product_accessories_details (*),
              category:categories!products_category_id_fkey (id, name, slug)
            `)
            .eq('id', slug)
            .eq('is_active', true)
            .maybeSingle();
          
          if (!error && data) {
            product = data;
            productError = null;
          }
        }

        if (productError) {
          setError('Product not found');
          return;
        }

        if (!product) {
          setError('Product not found');
          return;
        }

        // Extract images from product_images relationship
        const images = product.product_images || [];

        if (product) {
          // Transform product to match ProductCardProduct interface
          const productWithImages = {
            id: product.id,
            name: product.name,
            slug: product.slug,
            description: product.description || '',
            price: product.price,
            original_price: product.original_price || null,
            badge: product.badge || null,
            category: product.category || '',
            category_id: product.category_id || null,
            subcategory: product.subcategory || '',
            subcategory_id: product.subcategory_id || null,
            subcategories: Array.isArray(product.subcategories)
              ? product.subcategories
              : (product.subcategory ? [product.subcategory] : []),
            image_url: product.image_url || '',
            stock_quantity: product.stock_quantity || 0,
            is_active: typeof product.is_active === 'boolean' ? product.is_active : true,
            show_in_hero: product.show_in_hero || false,
            created_at: product.created_at,
            updated_at: product.updated_at,
            // Common product fields (from products table)
            brand: product.brand || null,
            is_new: product.is_new || false,
            rating: product.rating || null,
            review_count: product.review_count || null,
            in_stock: product.in_stock !== undefined ? product.in_stock : (product.stock_quantity > 0),
            images: images && images.length > 0 ? images : (product.image_url ? [{
              id: 'main-image',
              image_url: product.image_url,
              alt_text: product.name,
              display_order: 0
            }] : []),
            // Include detail tables (only one will have data based on category)
            product_cover_details: (product.product_cover_details && Array.isArray(product.product_cover_details) && product.product_cover_details.length > 0) 
              ? product.product_cover_details[0] 
              : (product.product_cover_details || undefined),
            product_apparel_details: (product.product_apparel_details && Array.isArray(product.product_apparel_details) && product.product_apparel_details.length > 0) 
              ? product.product_apparel_details[0] 
              : (product.product_apparel_details || undefined),
            product_accessories_details: (product.product_accessories_details && Array.isArray(product.product_accessories_details) && product.product_accessories_details.length > 0) 
              ? product.product_accessories_details[0] 
              : (product.product_accessories_details || undefined),
          };
          
          const productWithRating = {
            ...productWithImages,
            rating: product.rating || null,
            review_count: product.review_count || 0
          };
          setProduct(productWithRating as ProductCardProduct);
          
          // Handle size selection: restore saved size only (no auto-selection)
          if (productWithImages.product_apparel_details?.size) {
            const availableSizes = productWithImages.product_apparel_details.size
              .split(',')
              .map((s: string) => s.trim())
              .filter(Boolean);
            
            if (availableSizes.length > 0) {
              const savedSize = typeof window !== 'undefined' ? localStorage.getItem(`selectedSize_${slug}`) : null;
              
              // Only restore if saved size exists and is still available
              if (savedSize && availableSizes.includes(savedSize)) {
                setSelectedSize(savedSize);
              } else {
                // Clear selection if saved size is no longer available
                setSelectedSize('');
                if (typeof window !== 'undefined' && savedSize) {
                  localStorage.removeItem(`selectedSize_${slug}`);
                }
              }
            }
          }
          
          // Handle color selection: restore saved color only (no auto-selection)
          if (productWithImages.product_apparel_details?.color) {
            const availableColors = productWithImages.product_apparel_details.color
              .split(',')
              .map((c: string) => c.trim())
              .filter(Boolean);
            
            if (availableColors.length > 0) {
              const savedColor = typeof window !== 'undefined' ? localStorage.getItem(`selectedColor_${slug}`) : null;
              
              // Only restore if saved color exists and is still available
              if (savedColor && availableColors.includes(savedColor)) {
                setSelectedColor(savedColor);
              } else {
                // Clear selection if saved color is no longer available
                setSelectedColor('');
                if (typeof window !== 'undefined' && savedColor) {
                  localStorage.removeItem(`selectedColor_${slug}`);
                }
              }
            }
          }
          
          // Fetch category and subcategory slugs
        // Handle category - could be from relationship (object) or string field
        let categoryName = '';
        let categoryId: string | null = null;
        
        // First, try to get category from relationship
        if (product.category && typeof product.category === 'object' && !Array.isArray(product.category)) {
          // Category from relationship (object)
          categoryName = product.category.name || '';
          categoryId = product.category.id || null;
        } else if (typeof product.category === 'string') {
          // Category from string field (legacy)
          categoryName = product.category;
        }
        
        // If we have category_id but no name, fetch the category
        if (product.category_id && !categoryName) {
          try {
            const { data: categoryData } = await supabase
              .from('categories')
              .select('id, name, slug')
              .eq('id', product.category_id)
              .single();
            
            if (categoryData) {
              categoryName = categoryData.name;
              categoryId = categoryData.id;
              setCategorySlug(categoryData.slug);
            }
          } catch (err) {
          }
        }
          
        // If we have category name but no ID, try to fetch it
        if (categoryName && !categoryId) {
          try {
            const { data: categoryData } = await supabase
              .from('categories')
              .select('id, name, slug')
              .eq('name', categoryName)
              .single();
            
            if (categoryData) {
              categoryId = categoryData.id;
              setCategorySlug(categoryData.slug);
            }
          } catch (err) {
          }
        }
          
          // Fetch related products
          if (categoryName || categoryId || product.subcategory_id) {
            fetchRelatedProducts(categoryName || '', categoryId, product.id, product.subcategory_id || null);
          }
          
          // Fetch subcategory by name if product has subcategory
          if (product.subcategory) {
            const { data: subcategoryData } = await supabase
              .from('subcategories')
              .select('slug')
              .eq('name', product.subcategory)
              .single();
            
            if (subcategoryData) {
              setSubcategorySlug(subcategoryData.slug);
            }
          }
        } else {
          setError('Product not found');
        }
      } catch (err) {
        setError('Failed to load product');
      } finally {
        setLoading(false);
      }
    };

    if (slug) {
      fetchProduct();
    }
  }, [slug, supabase]);

  // Store category/subcategory slugs in sessionStorage for back button navigation
  useEffect(() => {
    if (categorySlug || subcategorySlug) {
      if (typeof window !== 'undefined') {
        if (categorySlug) {
          sessionStorage.setItem('productCategorySlug', categorySlug);
        }
        if (subcategorySlug) {
          sessionStorage.setItem('productSubcategorySlug', subcategorySlug);
        }
      }
    }
  }, [categorySlug, subcategorySlug]);

  // Create wishlist product helper - matches ProductCard pattern
  const createWishlistProduct = useCallback(() => {
    if (!product) return null;
    
    const availableImages = product.images && product.images.length > 0
      ? product.images.map(img => typeof img === 'string' ? img : img.image_url)
      : (product.image_url ? [product.image_url] : []);
    
    const categoryId = typeof product.category === 'string' ? product.category.toLowerCase() : product.category?.id || '';
    const categoryName = typeof product.category === 'string' ? product.category : product.category?.name || '';
    const categorySlug = typeof product.category === 'string' ? product.category.toLowerCase() : product.category?.slug || '';
    
    return {
      id: product.id,
      name: product.name,
      description: product.description || '',
      price: product.price,
      originalPrice: product.original_price || product.price,
      images: availableImages,
      category: { id: categoryId, name: categoryName, slug: categorySlug, description: '', image: '', subcategories: [] },
      subcategories: product.subcategories || [],
      brand: product.brand || '',
      sizes: [],
      colors: [],
      inStock: product.is_active && product.stock_quantity > 0,
      rating: product.rating || 0,
      reviewCount: product.review_count || 0,
      tags: [],
      createdAt: new Date(product.created_at),
      updatedAt: new Date(product.updated_at)
    };
  }, [product]);

  // Stabilize wishlist product reference
  useEffect(() => {
    if (product) {
      wishlistProductRef.current = createWishlistProduct();
    }
  }, [product, createWishlistProduct]);

  const handleAddToCart = () => {
    if (!product) return;
    
    // Validation is handled by the modal in ProductInfo/ProductBottomActions components
    // This function is only called if all selections are valid
    
    // Do not block the click handler on network I/O
    // Show brief feedback but don't disable the button
    setIsAddedToCart(true);
    setTimeout(() => setIsAddedToCart(false), 1500);
    void addToCart(product.id, quantity, selectedSize || null);
  };

  const handleBuyNow = () => {
    if (!product) return;
    
    // Validation is handled by the modal in ProductInfo/ProductBottomActions components
    // This function is only called if all selections are valid
    
    // Check if user is authenticated for checkout
    if (!user) {
      openLoginModal();
      return;
    }
    
    // Redirect directly to checkout without adding to cart
    const params = new URLSearchParams({
      direct: 'true',
      productId: product.id,
      quantity: quantity.toString()
    });
    
    // Add size if it's an apparel product
    if (selectedSize) {
      params.append('size', selectedSize);
    }
    
    window.location.href = `/checkout?${params.toString()}`;
  };

  const handleWishlistToggle = useCallback(async (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    if (!product) return;
    if (wishlistLoading) return;
    
    if (!user) {
      try {
        const pendingWishlist = localStorage.getItem('pending-wishlist-add');
        const pendingItems = pendingWishlist ? JSON.parse(pendingWishlist) : [];
        
        if (!pendingItems.find((item: any) => item.id === product.id)) {
          pendingItems.push(wishlistProductRef.current);
          localStorage.setItem('pending-wishlist-add', JSON.stringify(pendingItems));
        }
      } catch {
        // Error handled silently
      }
      openLoginModal();
      return;
    }
    
    const isWishlisted = isInWishlist(product.id);
    if (isWishlisted) {
      await removeFromWishlist(product.id);
    } else {
      if (wishlistProductRef.current) {
        await addToWishlist(wishlistProductRef.current);
      }
    }
  }, [product, user, wishlistLoading, isInWishlist, addToWishlist, removeFromWishlist, openLoginModal]);

  const handleShare = useCallback(async (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    if (!product || isSharing) {
      return;
    }

    setIsSharing(true);

    const copyToClipboardFn = async () => {
      if (typeof window === 'undefined' || typeof navigator === 'undefined') return;
      
      try {
        await navigator.clipboard.writeText(window.location.href);
        // Show a more user-friendly notification
        const notification = document.createElement('div');
        notification.textContent = 'Product link copied to clipboard!';
        notification.className = 'fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-md shadow-lg z-50';
        document.body.appendChild(notification);
        
        setTimeout(() => {
          if (document.body.contains(notification)) {
            document.body.removeChild(notification);
          }
        }, 3000);
      } catch (err) {
        // Final fallback - show the URL in a prompt
        if (typeof prompt !== 'undefined') {
          prompt('Copy this link to share:', window.location.href);
        }
      }
    };

    try {
      const shareData = {
        title: product.name,
        text: `Check out this product: ${product.name}`,
        url: typeof window !== 'undefined' ? window.location.href : '',
      };

      if (typeof navigator !== 'undefined' && navigator.share && navigator.canShare && navigator.canShare(shareData)) {
        try {
          await navigator.share(shareData);
        } catch (err: any) {
          // User cancelled or share failed - fallback to clipboard
          if (err.name !== 'AbortError') {
            await copyToClipboardFn();
          }
        }
      } else {
        await copyToClipboardFn();
      }
    } catch (err) {
      // Final fallback
      await copyToClipboardFn();
    } finally {
      setIsSharing(false);
    }
  }, [product, isSharing]);

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-sm">
        <div className="text-center">
          <Spinner className="size-12 text-blue-600 mx-auto" />
          <p className="mt-4 text-gray-600">Loading product...</p>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center max-w-2xl mx-auto px-4">
          <h1 className="text-2xl font-medium text-gray-900 mb-4">Product Not Found</h1>
          <p className="text-gray-600 mb-4">The product you&apos;re looking for doesn&apos;t exist.</p>
          <p className="text-sm text-gray-500 mb-6">
            Slug: {slug}<br />
            {error && `Error: ${error}`}
          </p>
          <Link
            href="/products"
            className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-brand hover:bg-brand-600"
          >
            Browse Products
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white pb-24 sm:pb-8">
      <div className="max-w-[1450px] mx-auto w-full px-1 sm:px-2 md:px-4 lg:px-6 pt-1 pb-8">
        {/* Breadcrumb Navigation - Desktop only */}
        <nav className="hidden sm:flex mb-2" aria-label="Breadcrumb">
          <ol className="flex items-center space-x-2">
            <li>
              <Link href="/" className="text-gray-500 hover:text-gray-700 text-xs">
                Home Page
              </Link>
            </li>
            <li>
              <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
            </li>
            <li>
              <Link href="/products" className="text-gray-500 hover:text-gray-700 text-xs">
                Products
              </Link>
            </li>
            <li>
              <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
            </li>
            <li>
              <Link 
                href={categorySlug ? `/products/${categorySlug}` : `/products`}
                className="text-gray-500 hover:text-gray-700 text-xs"
              >
                {typeof product.category === 'string' ? product.category : product.category?.name || 'Category'}
              </Link>
            </li>
            {product.subcategory && (
              <>
                <li>
                  <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                </li>
                <li>
                  <Link 
                    href={categorySlug && subcategorySlug ? `/products/${categorySlug}/${subcategorySlug}` : `/products/${categorySlug || 'category'}`}
                    className="text-gray-500 hover:text-gray-700 text-xs"
                  >
                    {product.subcategory}
                  </Link>
                </li>
              </>
            )}
            <li>
              <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
            </li>
            <li>
              <span className="text-gray-900 font-medium text-xs" aria-current="page">
                {product.name}
              </span>
            </li>
          </ol>
        </nav>

        <div className="bg-white mb-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-1 md:gap-2 lg:gap-3 overflow-visible">
            {/* Product Images */}
            <ProductMedia
              product={product}
              selectedImage={selectedImage}
              setSelectedImage={setSelectedImage}
              handleWishlistToggle={handleWishlistToggle}
              handleShare={handleShare}
              isInWishlist={isInWishlist}
              wishlistLoading={wishlistLoading}
              isSharing={isSharing}
            />

          {/* Product Info */}
          <div className="space-y-3 sm:space-y-6">
            <ProductInfo
              product={product}
              quantity={quantity}
              setQuantity={setQuantity}
              selectedSize={selectedSize}
              setSelectedSize={setSelectedSize}
              selectedColor={selectedColor}
              setSelectedColor={setSelectedColor}
              handleAddToCart={handleAddToCart}
              handleBuyNow={handleBuyNow}
              isAddedToCart={isAddedToCart}
              user={user}
              slug={slug}
            />
            
            {/* Product Details */}
            <ProductDetails product={product} />
          </div>
        </div>
      </div>

      {/* Product Reviews Section */}
        {product && (
          <ProductReviews
            productId={product.id}
            onRatingUpdate={(avgRating, reviewCount) => {
              setProduct(prev => prev ? {
                ...prev,
                rating: avgRating,
                review_count: reviewCount
              } : null);
            }}
          />
        )}

        {/* Related Products Section - Edge to Edge */}
        <div className="mt-6 mb-8 -mx-1 sm:-mx-2 md:-mx-4 lg:-mx-6">
          <div className="text-center mb-6 px-1 sm:px-2 md:px-4 lg:px-6">
            <h2 className="text-xl sm:text-3xl font-medium text-gray-900 mb-3">Related Products</h2>
            <p className="text-gray-600 text-sm sm:text-lg">You might also like these products</p>
          </div>
          
          {relatedLoading ? (
            <div className="flex justify-center items-center py-12">
              <div className="text-center py-12">
                <Spinner className="size-12 text-blue-600 mx-auto" />
                <p className="mt-4 text-gray-600">Loading related products...</p>
              </div>
            </div>
          ) : relatedProducts.length > 0 ? (
            <div className={`${PRODUCT_GRID_CLASSES_SMALL_GAP} px-1 sm:px-2 md:px-4 lg:px-6`}>
              {relatedProducts.map((relatedProduct: any) => (
                <ProductCard 
                  key={relatedProduct.id} 
                  product={{
                    ...relatedProduct,
                    original_price: relatedProduct.original_price ?? undefined
                  }}
                />
              ))}
            </div>
          ) : (
            <div className="px-1 sm:px-2 md:px-4 lg:px-6">
              <EmptyState
                icon="📦"
                title="No related products found"
                variant="compact"
                className="bg-white rounded-xl border border-gray-200"
              />
            </div>
          )}
        </div>
      </div>

      {/* Sticky Buttons - Mobile Only */}
      {product && (
        <ProductBottomActions
          product={product}
          selectedSize={selectedSize}
          setSelectedSize={setSelectedSize}
          selectedColor={selectedColor}
          setSelectedColor={setSelectedColor}
          handleAddToCart={handleAddToCart}
          handleBuyNow={handleBuyNow}
          isAddedToCart={isAddedToCart}
          user={user}
          slug={slug}
        />
      )}
    </div>
  );
}
