'use client';

import { notFound } from 'next/navigation';
import ProductCard from '@/components/ProductCard';
import { createClient } from '@/lib/supabase/client';
import { useState, useEffect } from 'react';

interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  image_url: string;
  parent_category_id: string | null;
}

interface Subcategory {
  id: string;
  name: string;
  slug: string;
  description: string;
  image_url: string;
  parent_category_id: string;
}

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  subcategory: string;
  image_url: string;
  stock_quantity: number;
  is_active: boolean;
  images?: (string | {
    id: string;
    image_url: string;
    alt_text?: string;
    display_order: number;
  })[];
}

interface CategoryPageProps {
  params: {
    category: string;
  };
}

export default function CategoryPage({ params }: CategoryPageProps) {
  const [category, setCategory] = useState<Category | null>(null);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [selectedSubcategory, setSelectedSubcategory] = useState<Subcategory | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    fetchCategoryAndProducts();
  }, [params.category]);

  // Load all products when category is available
  useEffect(() => {
    if (category) {
      fetchAllProductsForCategory();
    }
  }, [category]);

  const fetchCategoryAndProducts = async () => {
    try {
      setLoading(true);
      
      // Fetch category
      const { data: categoryData, error: categoryError } = await supabase
        .from('categories')
        .select('*')
        .eq('slug', params.category)
        .single();

      if (categoryError) {
        console.error('Error fetching category:', categoryError);
        notFound();
        return;
      }

      setCategory(categoryData);

      // Fetch subcategories for this category
      const { data: subcategoriesData, error: subcategoriesError } = await supabase
        .from('categories')
        .select('*')
        .eq('parent_category_id', categoryData.id)
        .order('name', { ascending: true });

      if (subcategoriesError) {
        console.error('Error fetching subcategories:', subcategoriesError);
        setSubcategories([]);
      } else {
        setSubcategories(subcategoriesData || []);
      }

      // Reset selected subcategory and products
      setSelectedSubcategory(null);
      setProducts([]);
    } catch (error) {
      console.error('Error:', error);
      notFound();
    } finally {
      setLoading(false);
    }
  };

  const fetchAllProductsForCategory = async () => {
    try {
      setLoading(true);
      setSelectedSubcategory(null);

      console.log('Fetching products for category:', category?.name, 'ID:', category?.id);

      // First, let's check what category_ids exist in the products table
      const { data: allProductsCheck, error: checkError } = await supabase
        .from('products')
        .select('id, name, category_id')
        .eq('is_active', true)
        .limit(20);
      
      console.log('All products in database:', allProductsCheck);
      console.log('Looking for category_id:', category?.id);

      // Fetch ALL products for this category (regardless of subcategory)
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select('*')
        .eq('category_id', category?.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      console.log('Category ID being searched:', category?.id);
      console.log('Products found with category_id:', productsData?.length || 0);

      // If no products found with category_id, try a broader search
      let finalProductsData = productsData;
      let finalProductsError = productsError;

      if ((!productsData || productsData.length === 0) && !productsError) {
        console.log('No products found with category_id, trying broader search...');
        
        // Try to find products that might belong to this category by name matching
        const { data: broaderMatch, error: broaderError } = await supabase
          .from('products')
          .select('*')
          .eq('is_active', true)
          .order('created_at', { ascending: false })
          .limit(20); // Get some products to work with

        console.log('Broader search found:', broaderMatch?.length || 0, 'products');
        
        if (broaderMatch && broaderMatch.length > 0) {
          // Filter products that seem related to this category
          const filteredProducts = broaderMatch.filter(product => {
            const categoryName = category?.name?.toLowerCase() || '';
            const productName = product.name?.toLowerCase() || '';
            const productDesc = product.description?.toLowerCase() || '';
            const productSubcategory = product.subcategory?.toLowerCase() || '';
            
            return productName.includes(categoryName) || 
                   productDesc.includes(categoryName) || 
                   productSubcategory.includes(categoryName);
          });
          
          console.log('Filtered products for category:', filteredProducts.length);
          finalProductsData = filteredProducts;
          finalProductsError = broaderError;
        }
        
        // If still no products, show a few products as fallback
        if ((!finalProductsData || finalProductsData.length === 0) && broaderMatch && broaderMatch.length > 0) {
          console.log('No filtered products found, showing first few products as fallback');
          finalProductsData = broaderMatch.slice(0, 6); // Show first 6 products
        }
      }

      console.log('Final products to process:', finalProductsData?.length || 0);

      if (finalProductsError) {
        console.error('Error fetching products:', finalProductsError);
        setProducts([]);
      } else {
        // Process products with images
        const productsWithImages = await Promise.all(
          (finalProductsData || []).map(async (product) => {
            try {
              // Try to fetch images from product_images table
              const { data: images, error: imagesError } = await supabase
                .from('product_images')
                .select('*')
                .eq('product_id', product.id)
                .order('display_order', { ascending: true });

              if (imagesError) {
                console.log(`No images found for product ${product.id}, using fallback`);
                const processedProduct = {
                  ...product,
                  images: product.image_url ? [{ image_url: product.image_url, alt_text: product.name, display_order: 0 }] : []
                };
                
                if (product.name === 'Classic Cotton T-Shirt') {
                  console.log('Processing Classic Cotton T-Shirt (All Products):', {
                    originalImageUrl: product.image_url,
                    finalImages: processedProduct.images
                  });
                }
                
                return processedProduct;
              }

              // If images found, use them; otherwise fallback to image_url
              if (images && images.length > 0) {
                const processedProduct = {
                  ...product,
                  images: images.map(img => ({
                    id: img.id,
                    image_url: img.image_url,
                    alt_text: img.alt_text,
                    display_order: img.display_order
                  }))
                };
                
                if (product.name === 'Classic Cotton T-Shirt') {
                  console.log('Processing Classic Cotton T-Shirt (with images):', {
                    originalImageUrl: product.image_url,
                    imagesFromTable: images,
                    finalImages: processedProduct.images
                  });
                }
                
                return processedProduct;
              } else if (product.image_url) {
                const processedProduct = {
                  ...product,
                  images: [{ image_url: product.image_url, alt_text: product.name, display_order: 0 }]
                };
                
                if (product.name === 'Classic Cotton T-Shirt') {
                  console.log('Processing Classic Cotton T-Shirt (fallback):', {
                    originalImageUrl: product.image_url,
                    imagesFromTable: images,
                    finalImages: processedProduct.images
                  });
                }
                
                return processedProduct;
              } else {
                return {
                  ...product,
                  images: []
                };
              }
            } catch (error) {
              console.error(`Error fetching images for product ${product.id}:`, error);
              const processedProduct = {
                ...product,
                images: product.image_url ? [{ image_url: product.image_url, alt_text: product.name, display_order: 0 }] : []
              };
              
              if (product.name === 'Classic Cotton T-Shirt') {
                console.log('Processing Classic Cotton T-Shirt (error):', {
                  originalImageUrl: product.image_url,
                  finalImages: processedProduct.images
                });
              }
              
              return processedProduct;
            }
          })
        );

        setProducts(productsWithImages);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchProductsForSubcategory = async (subcategory: Subcategory) => {
    try {
      setLoading(true);
      setSelectedSubcategory(subcategory);

      // Fetch products for this subcategory
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select('*')
        .eq('subcategory', subcategory.name)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (productsError) {
        console.error('Error fetching products:', productsError);
        setProducts([]);
      } else {
        // Fetch images for each product
        const productsWithImages = await Promise.all(
          (productsData || []).map(async (product) => {
            try {
              // Try to fetch images from product_images table
              const { data: images, error: imagesError } = await supabase
                .from('product_images')
                .select('*')
                .eq('product_id', product.id)
                .order('display_order', { ascending: true });

              if (imagesError) {
                console.log(`No images found for product ${product.id}, using fallback`);
                // If no images from product_images table, create fallback from image_url
                const processedProduct = {
                  ...product,
                  images: product.image_url ? [{ image_url: product.image_url, alt_text: product.name, display_order: 0 }] : []
                };
                
                // Debug logging for Classic Cotton T-Shirt
                if (product.name === 'Classic Cotton T-Shirt') {
                  console.log('Processing Classic Cotton T-Shirt (Category Page - no images):', {
                    originalImageUrl: product.image_url,
                    finalImages: processedProduct.images
                  });
                }
                
                return processedProduct;
              }

              // If images found, use them; otherwise fallback to image_url
              if (images && images.length > 0) {
                const processedProduct = {
                  ...product,
                  images: images.map(img => ({
                    id: img.id,
                    image_url: img.image_url,
                    alt_text: img.alt_text,
                    display_order: img.display_order
                  }))
                };
                
                // Debug logging for Classic Cotton T-Shirt
                if (product.name === 'Classic Cotton T-Shirt') {
                  console.log('Processing Classic Cotton T-Shirt (Category Page - with images):', {
                    originalImageUrl: product.image_url,
                    imagesFromTable: images,
                    finalImages: processedProduct.images
                  });
                }
                
                return processedProduct;
              } else if (product.image_url) {
                const processedProduct = {
                  ...product,
                  images: [{ image_url: product.image_url, alt_text: product.name, display_order: 0 }]
                };
                
                // Debug logging for Classic Cotton T-Shirt
                if (product.name === 'Classic Cotton T-Shirt') {
                  console.log('Processing Classic Cotton T-Shirt (Category Page - fallback):', {
                    originalImageUrl: product.image_url,
                    imagesFromTable: images,
                    finalImages: processedProduct.images
                  });
                }
                
                return processedProduct;
              } else {
                return {
                  ...product,
                  images: []
                };
              }
            } catch (error) {
              console.error(`Error fetching images for product ${product.id}:`, error);
              const processedProduct = {
                ...product,
                images: product.image_url ? [{ image_url: product.image_url, alt_text: product.name, display_order: 0 }] : []
              };
              
              // Debug logging for Classic Cotton T-Shirt
              if (product.name === 'Classic Cotton T-Shirt') {
                console.log('Processing Classic Cotton T-Shirt (Category Page - error):', {
                  originalImageUrl: product.image_url,
                  finalImages: processedProduct.images
                });
              }
              
              return processedProduct;
            }
          })
        );

        setProducts(productsWithImages);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!category) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Category Header */}
      <div className="bg-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">{category.name}</h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">{category.description}</p>
            
            {/* Breadcrumb */}
            <div className="mt-4 flex items-center justify-center space-x-2 text-sm text-gray-500">
              <span>Home</span>
              <span>›</span>
              <span>{category.name}</span>
              {selectedSubcategory && (
                <>
                  <span>›</span>
                  <span className="text-gray-900 font-medium">{selectedSubcategory.name}</span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content - Two Column Layout */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Left Column - Subcategories */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 sticky top-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Subcategories
              </h3>
              
              {/* All Products Option */}
              <div className="mb-4">
                <button
                  onClick={fetchAllProductsForCategory}
                  className={`w-full text-left px-4 py-3 rounded-md font-medium transition-colors ${
                    !selectedSubcategory 
                      ? 'bg-blue-100 text-blue-700 border border-blue-200' 
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <span className="mr-2">🛍️</span>
                  All Products
                </button>
              </div>

              {/* Subcategory List */}
              {subcategories.length > 0 ? (
                <div className="space-y-2">
                  {subcategories.map((subcategory) => (
                    <button
                      key={subcategory.id}
                      onClick={() => fetchProductsForSubcategory(subcategory)}
                      className={`w-full text-left px-4 py-3 rounded-md font-medium transition-colors ${
                        selectedSubcategory?.id === subcategory.id
                          ? 'bg-blue-100 text-blue-700 border border-blue-200'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <span className="mr-2">📁</span>
                      {subcategory.name}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4">
                  <div className="text-gray-400 text-2xl mb-2">📂</div>
                  <p className="text-sm text-gray-500">No subcategories</p>
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Products */}
          <div className="lg:col-span-3">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  {selectedSubcategory ? `${selectedSubcategory.name} Products` : `All ${category.name} Products`}
                </h2>
                <p className="text-gray-600 mt-1">
                  {products.length} products found
                </p>
              </div>
              <div className="flex items-center space-x-4">
                <select className="border border-gray-300 rounded-md px-3 py-2 text-sm">
                  <option>Sort by: Featured</option>
                  <option>Price: Low to High</option>
                  <option>Price: High to Low</option>
                  <option>Customer Rating</option>
                  <option>Newest</option>
                </select>
              </div>
            </div>

            {products.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {products.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="text-gray-400 text-6xl mb-4">📦</div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No products found</h3>
                <p className="text-gray-500">
                  {selectedSubcategory 
                    ? `No products are available in ${selectedSubcategory.name} yet.`
                    : `No products are available in ${category.name} yet.`
                  }
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}