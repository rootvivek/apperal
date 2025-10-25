'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import CategoryGrid from '@/components/CategoryGrid';
import ProductCard from '@/components/ProductCard';
import HeroCarousel from '@/components/HeroCarousel';
import { createClient } from '@/lib/supabase/client';

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
  created_at: string;
  updated_at: string;
}

interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  image_url: string;
}

interface CategoryWithProducts {
  category: Category;
  products: Product[];
}

export default function Home() {
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [categorySections, setCategorySections] = useState<CategoryWithProducts[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch all active products with enhanced features (more products to group by category)
      const { data: allProductsData, error: allProductsError } = await supabase
        .from('products')
        .select(`
          id,
          name,
          slug,
          description,
          price,
          original_price,
          brand,
          stock_quantity,
          is_active,
          is_new,
          created_at,
          updated_at,
          category_id
        `)
        .gt('stock_quantity', 0)
        .order('created_at', { ascending: false })
        .limit(50); // Increased limit to get more products for grouping

      if (allProductsError) {
        console.error('All products error:', allProductsError);
      } else {
        console.log('All products data:', allProductsData);
      }

      // If no products found, use sample data
      const finalAllProductsData = allProductsData && allProductsData.length > 0 ? allProductsData : [
        {
          id: 'sample-1',
          name: 'Premium Wireless Headphones',
          slug: 'premium-wireless-headphones',
          description: 'High-quality wireless headphones with noise cancellation',
          price: 2999.00,
          original_price: 3999.00,
          brand: 'TechBrand',
          stock_quantity: 15,
          is_active: true,
          is_new: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          category_id: 'electronics-category'
        },
        {
          id: 'sample-2',
          name: 'Smart Watch Series 5',
          slug: 'smart-watch-series-5',
          description: 'Advanced smartwatch with health monitoring',
          price: 8999.00,
          original_price: 11999.00,
          brand: 'TechBrand',
          stock_quantity: 8,
          is_active: true,
          is_new: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          category_id: 'electronics-category'
        },
        {
          id: 'sample-3',
          name: 'Bluetooth Speaker',
          slug: 'bluetooth-speaker',
          description: 'Portable Bluetooth speaker with great sound quality',
          price: 1999.00,
          original_price: 2499.00,
          brand: 'AudioBrand',
          stock_quantity: 12,
          is_active: true,
          is_new: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          category_id: 'electronics-category'
        },
        {
          id: 'sample-4',
          name: 'Designer Sunglasses',
          slug: 'designer-sunglasses',
          description: 'Stylish sunglasses with UV protection',
          price: 1299.00,
          original_price: 1599.00,
          brand: 'FashionBrand',
          stock_quantity: 20,
          is_active: true,
          is_new: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          category_id: 'accessories-category'
        }
      ];

      // Fetch categories
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('categories')
        .select('*')
        .is('parent_category_id', null)
        .order('name', { ascending: true });

      if (categoriesError) {
        console.error('Categories error:', categoriesError);
      } else {
        console.log('Categories data:', categoriesData);
      }

      // If no categories found, use sample data
      const finalCategoriesData = categoriesData && categoriesData.length > 0 ? categoriesData : [
        {
          id: 'electronics-category',
          name: 'Electronics',
          slug: 'electronics',
          description: 'Electronic devices and gadgets',
          image_url: '/images/categories/electronics.jpg',
          parent_category_id: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: 'accessories-category',
          name: 'Accessories',
          slug: 'accessories',
          description: 'Fashion accessories and items',
          image_url: '/images/categories/accessories.jpg',
          parent_category_id: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ];

      // Fetch products for each category
      const categorySectionsData: CategoryWithProducts[] = [];
      
      if (finalCategoriesData) {
        for (const category of finalCategoriesData) {
          const { data: categoryProducts, error: categoryProductsError } = await supabase
            .from('products')
            .select(`
              id,
              name,
              slug,
              description,
              price,
              original_price,
              brand,
              stock_quantity,
              is_active,
              is_new,
              created_at,
              updated_at,
              category_id
            `)
            .eq('category_id', category.id)
            .gt('stock_quantity', 0)
            .order('created_at', { ascending: false })
            .limit(8);

          if (categoryProductsError) {
            console.error(`Error fetching products for ${category.name}:`, categoryProductsError);
          }

          // Process category products with images
          let categoryProductsToProcess = categoryProducts || [];
          
          // If no products found for this category, use sample products that match the category
          if (categoryProductsToProcess.length === 0) {
            categoryProductsToProcess = finalAllProductsData.filter(product => 
              product.category_id === category.id
            );
          }

          const processedCategoryProducts = await Promise.all(
            categoryProductsToProcess.map(async (product) => {
              // Fetch images for this product
              let images = [];
              if (product.id.startsWith('sample-')) {
                // Use sample images for sample products
                const sampleImages = {
                  'sample-1': [{ image_url: '/images/products/headphones-1.jpg', alt_text: 'Premium Wireless Headphones', display_order: 1 }],
                  'sample-2': [{ image_url: '/images/products/smartwatch-1.jpg', alt_text: 'Smart Watch Series 5', display_order: 1 }],
                  'sample-3': [{ image_url: '/images/products/speaker-1.jpg', alt_text: 'Bluetooth Speaker', display_order: 1 }],
                  'sample-4': [{ image_url: '/images/products/sunglasses-1.jpg', alt_text: 'Designer Sunglasses', display_order: 1 }]
                };
                images = sampleImages[product.id as keyof typeof sampleImages] || [];
              } else {
                const { data: fetchedImages } = await supabase
                  .from('product_images')
                  .select('*')
                  .eq('product_id', product.id)
                  .order('display_order');
                images = fetchedImages || [];
              }

              const processedProduct = {
                ...product,
                category_name: category.name,
                category_slug: category.slug,
                image_url: images?.[0]?.image_url || product.image_url || '/placeholder-product.jpg',
                images: images || (product.image_url ? [{ image_url: product.image_url, alt_text: product.name, display_order: 0 }] : [])
              };
              
              // Debug logging for Classic Cotton T-Shirt
              if (product.name === 'Classic Cotton T-Shirt') {
                console.log('Processing Classic Cotton T-Shirt:', {
                  originalImageUrl: product.image_url,
                  imagesFromTable: images,
                  finalImageUrl: processedProduct.image_url,
                  finalImages: processedProduct.images
                });
              }
              
              return processedProduct;
            })
          );

          // Show ALL categories, even if they have no products
          categorySectionsData.push({
            category,
            products: processedCategoryProducts
          });
        }
      }

      // Group products by category for the "All Products" section
      const productsByCategory: { [categoryId: string]: any[] } = {};
      
      // Process all products and group them by category
      for (const product of finalAllProductsData || []) {
        // Fetch images for this product
        let images = [];
        if (product.id.startsWith('sample-')) {
          // Use sample images for sample products
          const sampleImages = {
            'sample-1': [{ image_url: '/images/products/headphones-1.jpg', alt_text: 'Premium Wireless Headphones', display_order: 1 }],
            'sample-2': [{ image_url: '/images/products/smartwatch-1.jpg', alt_text: 'Smart Watch Series 5', display_order: 1 }],
            'sample-3': [{ image_url: '/images/products/speaker-1.jpg', alt_text: 'Bluetooth Speaker', display_order: 1 }],
            'sample-4': [{ image_url: '/images/products/sunglasses-1.jpg', alt_text: 'Designer Sunglasses', display_order: 1 }]
          };
          images = sampleImages[product.id as keyof typeof sampleImages] || [];
        } else {
          const { data: fetchedImages } = await supabase
            .from('product_images')
            .select('*')
            .eq('product_id', product.id)
            .order('display_order');
          images = fetchedImages || [];
        }

        // Fetch category information if category_id exists
        let categoryInfo = { name: 'Unknown', slug: 'unknown' };
        if (product.category_id) {
          const { data: categoryData } = await supabase
            .from('categories')
            .select('name, slug')
            .eq('id', product.category_id)
            .single();
          
          if (categoryData) {
            categoryInfo = categoryData;
          }
        }

        const processedProduct = {
          ...product,
          category_name: categoryInfo.name,
          category_slug: categoryInfo.slug,
          image_url: images?.[0]?.image_url || product.image_url || '/placeholder-product.jpg',
          images: images || (product.image_url ? [{ image_url: product.image_url, alt_text: product.name, display_order: 0 }] : [])
        };
        
        // Debug logging for Classic Cotton T-Shirt
        if (product.name === 'Classic Cotton T-Shirt') {
          console.log('Processing Classic Cotton T-Shirt (All Products):', {
            originalImageUrl: product.image_url,
            imagesFromTable: images,
            finalImageUrl: processedProduct.image_url,
            finalImages: processedProduct.images,
            categoryInfo: categoryInfo
          });
        }
        
        // Group by category
        const categoryKey = product.category_id || 'unknown';
        if (!productsByCategory[categoryKey]) {
          productsByCategory[categoryKey] = [];
        }
        productsByCategory[categoryKey].push(processedProduct);
      }

      // Create a mixed list of products from different categories (max 8 products total)
      const mixedProducts = [];
      const categoryKeys = Object.keys(productsByCategory);
      
      // Take up to 2 products from each category to create a diverse mix
      for (const categoryKey of categoryKeys) {
        const categoryProducts = productsByCategory[categoryKey].slice(0, 2);
        mixedProducts.push(...categoryProducts);
      }
      
      // Limit to 8 products total and shuffle them
      const shuffledProducts = mixedProducts.sort(() => Math.random() - 0.5).slice(0, 8);
      
      setAllProducts(shuffledProducts);
      setCategorySections(categorySectionsData);
      setCategories(categoriesData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      setAllProducts([]);
      setCategorySections([]);
      setCategories([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen m-0 p-0">
        <HeroCarousel />
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading products...</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen m-0 p-0">
      {/* Hero Carousel - Full width, no gaps */}
      <HeroCarousel />

      {/* Categories Section */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-custom mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Shop by Category</h2>
            <p className="text-lg text-gray-600">
              Explore our wide range of products across different categories
            </p>
          </div>
          <CategoryGrid categories={categories} />
        </div>
      </section>

      {/* All Products Section */}
      <section className="py-16 bg-white">
        <div className="max-w-custom mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Featured Products</h2>
            <p className="text-lg text-gray-600">
              A curated selection of products from all our categories
            </p>
          </div>
          {allProducts.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
              {allProducts.map((product) => (
                <ProductCard key={product.id} product={product} hideCategoryAndStock={true} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="text-gray-400 text-6xl mb-4">🛍️</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No products available</h3>
              <p className="text-gray-500">
                Check back soon for new products!
              </p>
            </div>
          )}
          <div className="text-center mt-8">
            <Link
              href="/products"
              className="bg-blue-600 text-white px-8 py-3 rounded-sm font-semibold hover:bg-blue-700 transition-colors"
            >
              Browse All Categories
            </Link>
          </div>
        </div>
      </section>

      {/* Dynamic Category Sections */}
      {categorySections.map((section, index) => {
        const bgColor = index % 2 === 0 ? 'bg-gray-50' : 'bg-white';
        const buttonColors = [
          'bg-green-600 hover:bg-green-700',
          'bg-purple-600 hover:bg-purple-700',
          'bg-orange-600 hover:bg-orange-700',
          'bg-red-600 hover:bg-red-700',
          'bg-indigo-600 hover:bg-indigo-700',
          'bg-pink-600 hover:bg-pink-700',
          'bg-teal-600 hover:bg-teal-700',
          'bg-yellow-600 hover:bg-yellow-700'
        ];
        const buttonColor = buttonColors[index % buttonColors.length];
        
        return (
          <section key={section.category.id} className={`py-16 ${bgColor}`}>
            <div className="max-w-custom mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center mb-12">
                <h2 className="text-3xl font-bold text-gray-900 mb-4">{section.category.name}</h2>
                <p className="text-lg text-gray-600">
                  {section.category.description || `Explore our ${section.category.name.toLowerCase()} collection`}
                </p>
              </div>
              {section.products.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
                  {section.products.map((product) => (
                    <ProductCard key={product.id} product={product} hideCategoryAndStock={true} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="text-gray-400 text-6xl mb-4">📦</div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No products available yet</h3>
                  <p className="text-gray-500">
                    We&apos;re working on adding products to this category. Check back soon!
                  </p>
                </div>
              )}
              <div className="text-center mt-8">
                <Link
                  href={`/products/${section.category.slug}`}
                  className={`${buttonColor} text-white px-8 py-3 rounded-sm font-semibold transition-colors`}
                >
                  Shop {section.category.name}
                </Link>
              </div>
            </div>
          </section>
        );
      })}

    </main>
  );
}
