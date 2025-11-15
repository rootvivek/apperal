'use client';

import { notFound } from 'next/navigation';
import ProductListing from '@/components/ProductListing';
import LoadingLogo from '@/components/LoadingLogo';
import { createClient } from '@/lib/supabase/client';
import { useState, useEffect, use } from 'react';

interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  image_url: string;
}

interface Subcategory {
  id: string;
  name: string;
  slug: string;
  parent_category_id: string;
}

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  subcategory: string;
  subcategories: string[];
  image_url: string;
  stock_quantity: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  product_images?: {
    id: string;
    image_url: string;
    alt_text?: string;
    display_order: number;
  }[];
  images?: {
    id: string;
    image_url: string;
    alt_text?: string;
    display_order: number;
  }[];
}

interface SubcategoryPageProps {
  params: Promise<{
    category: string;
    subcategory: string;
  }>;
}

export default function SubcategoryPage({ params }: SubcategoryPageProps) {
  // Unwrap params Promise (Next.js 15+)
  const { category: categorySlug, subcategory: subcategorySlug } = use(params);
  
  const [category, setCategory] = useState<Category | null>(null);
  const [subcategory, setSubcategory] = useState<Subcategory | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const fetchSubcategoryAndProducts = async () => {
    try {
      setLoading(true);
      
      // Decode URL parameters to handle spaces and special characters
      const decodedCategory = decodeURIComponent(categorySlug);
      const decodedSubcategory = decodeURIComponent(subcategorySlug);
      
      // Try optimized RPC function first, fallback to regular queries if it fails
      const { data: result, error } = await supabase.rpc('get_subcategory_products', {
        category_slug_param: decodedCategory,
        subcategory_slug_param: decodedSubcategory
      });

      if (error || !result) {
        // RPC function not available, use fallback
        await fetchSubcategoryFallback();
        return;
      }

      // Set category and subcategory data
      setCategory(result.category);
      setSubcategory(result.subcategory);
      
      // Fetch all subcategories for this category for the filter sidebar
      const { data: subcategoriesData } = await supabase
        .from('subcategories')
        .select('*')
        .eq('parent_category_id', result.category.id)
        .eq('is_active', true)
        .order('name', { ascending: true });
      
      setSubcategories(subcategoriesData || []);

      // Fetch ALL products from the parent category (not just current subcategory)
      // This allows filtering between subcategories
      const { data: allCategoryProducts } = await supabase.rpc('get_category_products', {
        category_slug_param: decodedCategory
      });

      // Transform and set products - use all category products if available, otherwise fallback to subcategory products
      const productsToUse = allCategoryProducts?.products || result.products || [];
      const transformedProducts = productsToUse.map((product: any) => {
        // Get subcategory name from the product or from subcategories lookup
        let subcategoryName = product.subcategory || '';
        if (!subcategoryName && product.subcategory_id && subcategoriesData) {
          const subcat = subcategoriesData.find((sc: any) => sc.id === product.subcategory_id);
          subcategoryName = subcat?.name || '';
        }
        
        return {
          id: product.id,
          slug: product.slug,
          name: product.name,
          description: product.description || '',
          price: product.price,
          category: result.category.name,
          subcategory: subcategoryName || result.subcategory.name,
          image_url: product.main_image_url || product.image_url,
          stock_quantity: product.stock_quantity || 0,
          is_active: product.is_active !== false,
          created_at: product.created_at,
          updated_at: product.updated_at || product.created_at,
          images: product.additional_images || product.images || []
        };
      });

      setProducts(transformedProducts);
    } catch (error) {
      await fetchSubcategoryFallback();
    } finally {
      setLoading(false);
    }
  };

  const fetchSubcategoryFallback = async () => {
    try {
      // Decode URL parameters
      const decodedCategory = decodeURIComponent(categorySlug);
      const decodedSubcategory = decodeURIComponent(subcategorySlug);
      
      // Fetch category by slug (only active categories)
      const { data: categoryData, error: categoryError } = await supabase
        .from('categories')
        .select('*')
        .eq('slug', decodedCategory)
        .eq('is_active', true)
        .single();

      // Create fallback category if not found
      const fallbackCategory = categoryError || !categoryData 
        ? {
            id: `fallback-${categorySlug}`,
            name: categorySlug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
            slug: categorySlug,
            description: '',
            image_url: null,
            parent_category_id: null
          }
        : categoryData;

      if (!fallbackCategory) {
        setProducts([]);
        setLoading(false);
        return;
      }

      // Fetch subcategory by slug and parent category from subcategories table (only active subcategories)
      const { data: subcategoryData, error: subcategoryError } = await supabase
        .from('subcategories')
        .select('*')
        .eq('slug', decodedSubcategory)
        .eq('parent_category_id', fallbackCategory.id)
        .eq('is_active', true)
        .single();

      // Create fallback subcategory if not found in database
      const fallbackSubcategory = subcategoryError || !subcategoryData 
        ? {
            id: `fallback-${subcategorySlug}`,
            name: subcategorySlug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
            slug: subcategorySlug,
            description: '',
            image_url: null,
            parent_category_id: fallbackCategory.id
          }
        : subcategoryData;

      setCategory(fallbackCategory);
      setSubcategory(fallbackSubcategory);
      
      // Fetch all subcategories for this category for the filter sidebar
      const { data: subcategoriesData } = await supabase
        .from('subcategories')
        .select('*')
        .eq('parent_category_id', fallbackCategory.id)
        .eq('is_active', true)
        .order('name', { ascending: true });
      
      setSubcategories(subcategoriesData || []);

      // Fetch ALL products from the parent category (not just current subcategory)
      // This allows filtering between subcategories
      let productsData: any[] = [];
      let productsError = null;
      
      // Get all subcategory IDs for this category
      const subcategoryIds = subcategoriesData?.map((sub: any) => sub.id) || [];
      
      // Fetch products from category (UUID relationship)
      const { data: categoryProducts, error: categoryProductsError } = await supabase
        .from('products')
        .select('*, product_images (id, image_url, alt_text, display_order)')
        .eq('category_id', fallbackCategory.id)
        .eq('is_active', true);
      
      if (!categoryProductsError && categoryProducts) {
        productsData = [...productsData, ...categoryProducts];
      }
      
      // Fetch products from all subcategories (UUID relationship)
      if (subcategoryIds.length > 0) {
        const { data: subcategoryProducts, error: subcategoryError } = await supabase
          .from('products')
          .select('*, product_images (id, image_url, alt_text, display_order)')
          .in('subcategory_id', subcategoryIds)
          .eq('is_active', true);
        
        if (!subcategoryError && subcategoryProducts) {
          // Combine and remove duplicates by product ID
          const existingIds = new Set(productsData.map((p: any) => p.id));
          const newProducts = subcategoryProducts.filter((p: any) => !existingIds.has(p.id));
          productsData = [...productsData, ...newProducts];
        }
      }
      
      // If no products found with UUID relationship, try legacy string fields
      if (productsData.length === 0) {
        const subcategoryNames = subcategoriesData?.map((sub: any) => sub.name) || [];
        
        // Fetch products from category (legacy)
        const { data: legacyCategoryProducts, error: legacyCategoryError } = await supabase
          .from('products')
          .select('*, product_images (id, image_url, alt_text, display_order)')
          .eq('category', fallbackCategory.name)
          .eq('is_active', true);
        
        if (!legacyCategoryError && legacyCategoryProducts) {
          productsData = [...productsData, ...legacyCategoryProducts];
        }
        
        // Fetch products from subcategories (legacy)
        if (subcategoryNames.length > 0) {
          const { data: legacySubcategoryProducts, error: legacySubcategoryError } = await supabase
            .from('products')
            .select('*, product_images (id, image_url, alt_text, display_order)')
            .in('subcategory', subcategoryNames)
            .eq('is_active', true);
          
          if (!legacySubcategoryError && legacySubcategoryProducts) {
            const existingIds = new Set(productsData.map((p: any) => p.id));
            const newProducts = legacySubcategoryProducts.filter((p: any) => !existingIds.has(p.id));
            productsData = [...productsData, ...newProducts];
          }
        }
      }

      if (productsError) {
        setProducts([]);
        return;
      }

      if (!productsData || productsData.length === 0) {
        setProducts([]);
        return;
      }

      // Get subcategory names map for UUID-based products
      const productSubcategoryIds = Array.from(new Set(
        productsData
          .filter((p: any) => p.subcategory_id)
          .map((p: any) => p.subcategory_id)
      ));
      
      let subcategoryNameMap: { [key: string]: string } = {};
      if (productSubcategoryIds.length > 0) {
        const { data: subcats } = await supabase
          .from('subcategories')
          .select('id, name')
          .in('id', productSubcategoryIds);
        if (subcats) {
          subcategoryNameMap = Object.fromEntries(
            subcats.map((sc: any) => [sc.id, sc.name])
          );
        }
      }

      // Transform products
      const transformedProducts = productsData.map((product: any) => {
        // Get subcategory name - prefer legacy string, fallback to UUID lookup
        let subcategoryName = product.subcategory || '';
        if (!subcategoryName && product.subcategory_id) {
          subcategoryName = subcategoryNameMap[product.subcategory_id] || '';
        }
        
        return {
          id: product.id,
          slug: product.slug,
          name: product.name,
          description: product.description || '',
          price: product.price,
          category: fallbackCategory.name,
          subcategory: subcategoryName,
          image_url: product.image_url,
          stock_quantity: product.stock_quantity || 0,
          is_active: product.is_active,
          created_at: product.created_at,
          updated_at: product.updated_at,
          product_images: product.product_images,
          images: product.product_images?.map((img: any) => img.image_url) || []
        };
      });

      setProducts(transformedProducts);
    } catch (error) {
      setProducts([]);
    }
  };

  useEffect(() => {
    fetchSubcategoryAndProducts();
  }, [categorySlug, subcategorySlug]);

  if (loading) {
    return <LoadingLogo fullScreen text="Loading subcategory..." />;
  }

  if (!category || !subcategory) {
    notFound();
  }

  // Transform subcategories for filter options
  const filterOptions = subcategories.map((subcat) => ({
    id: subcat.id,
    name: subcat.name,
    slug: subcat.slug
  }));

  return (
    <ProductListing
      products={products}
      filterOptions={filterOptions}
      filterType="subcategory"
      initialFilter={subcategory?.slug || 'all'}
      showFilter={true}
      emptyMessage="No products found."
    />
  );
}