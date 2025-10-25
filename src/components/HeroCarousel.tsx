'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

interface HeroProduct {
  id: string;
  name: string;
  price: number;
  original_price?: number;
  image_url: string;
  slug: string;
  category_name?: string;
  images?: {
    id: string;
    image_url: string;
    alt_text?: string;
    display_order: number;
  }[];
}

export default function HeroCarousel() {
  const [allHeroProducts, setAllHeroProducts] = useState<HeroProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    fetchHeroProducts();
  }, []);

  // Auto-cycle through product cards every 2 seconds (circular sliding)
  useEffect(() => {
    if (allHeroProducts.length === 0) return;

      console.log('Hero products for circular cycling:', allHeroProducts);
      console.log('Hero products count:', allHeroProducts.length);

    const interval = setInterval(() => {
      setCurrentIndex(prev => {
        const nextIndex = (prev + 1) % allHeroProducts.length;
        console.log(`HeroCarousel: circular sliding ${prev} -> ${nextIndex} (total: ${allHeroProducts.length})`);
        return nextIndex;
      });
    }, 2000);

    return () => clearInterval(interval);
  }, [allHeroProducts]);

  const fetchHeroProducts = async () => {
    try {
      console.log('HeroCarousel: Starting to fetch hero products...');
      const supabase = createClient();
      
      // Check if we're using mock client or if no data is returned
      const isMockClient = !supabase.from || typeof supabase.from !== 'function';
      if (isMockClient) {
        console.warn('HeroCarousel: Using mock Supabase client! Using sample data.');
        // Use sample data when mock client is detected
        const sampleProducts: HeroProduct[] = [
          {
            id: 'sample-1',
            name: 'Premium Wireless Headphones',
            price: 2999.00,
            original_price: 3999.00,
            image_url: '/images/products/headphones-1.jpg',
            slug: 'premium-wireless-headphones',
            category_name: 'Electronics',
            images: [{ id: '1', image_url: '/images/products/headphones-1.jpg', alt_text: 'Premium Wireless Headphones', display_order: 1 }]
          },
          {
            id: 'sample-2',
            name: 'Smart Watch Series 5',
            price: 8999.00,
            original_price: 11999.00,
            image_url: '/images/products/smartwatch-1.jpg',
            slug: 'smart-watch-series-5',
            category_name: 'Electronics',
            images: [{ id: '2', image_url: '/images/products/smartwatch-1.jpg', alt_text: 'Smart Watch Series 5', display_order: 1 }]
          },
          {
            id: 'sample-3',
            name: 'Bluetooth Speaker',
            price: 1999.00,
            original_price: 2499.00,
            image_url: '/images/products/speaker-1.jpg',
            slug: 'bluetooth-speaker',
            category_name: 'Electronics',
            images: [{ id: '3', image_url: '/images/products/speaker-1.jpg', alt_text: 'Bluetooth Speaker', display_order: 1 }]
          },
          {
            id: 'sample-4',
            name: 'Designer Sunglasses',
            price: 1299.00,
            original_price: 1599.00,
            image_url: '/images/products/sunglasses-1.jpg',
            slug: 'designer-sunglasses',
            category_name: 'Accessories',
            images: [{ id: '4', image_url: '/images/products/sunglasses-1.jpg', alt_text: 'Designer Sunglasses', display_order: 1 }]
          }
        ];
        setAllHeroProducts(sampleProducts);
        setLoading(false);
        return;
      }
      
      console.log('HeroCarousel: Using real Supabase client');
      
      // First, get products with stock > 0
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select(`
          id,
          name,
          price,
          original_price,
          image_url,
          slug,
          category_id,
          stock_quantity
        `)
        .eq('show_in_hero', true)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(10); // Get more products first, then filter

      console.log('HeroCarousel: Raw products data:', productsData);
      console.log('HeroCarousel: Products error:', productsError);

      if (productsError) {
        console.error('Error fetching hero products:', productsError);
        return;
      }

      // Filter products with stock > 0
      const filteredProducts = (productsData || []).filter(product => product.stock_quantity > 0).slice(0, 4);

      // Fetch category names and images for each product
      const productsWithCategories = await Promise.all(
        filteredProducts.map(async (product: any) => {
          // Fetch category name
          let categoryName = 'Unknown';
          if (product.category_id) {
            try {
              const categoryResponse = await supabase
                .from('categories')
                .select('name')
                .eq('id', product.category_id);
              categoryName = (categoryResponse as any).data?.[0]?.name || 'Unknown';
            } catch (error) {
              console.error('Error fetching category:', error);
            }
          }

          // Fetch product images
          let images = [];
          try {
            const imagesResponse = await supabase
              .from('product_images')
              .select('id, image_url, alt_text, display_order')
              .eq('product_id', product.id)
              .order('display_order', { ascending: true });
            images = (imagesResponse as any).data || [];
          } catch (error) {
            console.error('Error fetching images:', error);
          }

          return {
            ...product,
            category_name: categoryName,
            images: images
          };
        })
      );

      console.log('Final products with categories:', productsWithCategories);
      setAllHeroProducts(productsWithCategories);
    } catch (error) {
      console.error('Error fetching hero products:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="relative w-full h-[70vh] overflow-hidden bg-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (allHeroProducts.length === 0) {
    return (
      <div className="relative w-full h-[70vh] overflow-hidden bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
        <div className="text-center text-white">
          <h1 className="text-4xl font-bold mb-4">Welcome to Apperal</h1>
          <p className="text-xl">Discover amazing products</p>
        </div>
      </div>
    );
  }

  // Create circular array for smooth sliding
  const createCircularArray = () => {
    if (allHeroProducts.length === 0) return [];
    
    // Create array with 3 sets of products for smooth circular effect
    const tripleArray = [...allHeroProducts, ...allHeroProducts, ...allHeroProducts];
    return tripleArray;
  };

  const circularProducts = createCircularArray();
  const translateX = -((currentIndex + allHeroProducts.length) * (100 / 4)); // 4 cards visible

  return (
    <div className="relative w-full h-[70vh] overflow-hidden bg-gray-50 -mt-0">
      {/* Circular Sliding Carousel */}
      <div className="h-full flex items-center justify-center">
        <div className="relative w-full h-full overflow-hidden">
          <div 
            className="flex transition-transform duration-1000 ease-in-out h-full"
            style={{ 
              transform: `translateX(${translateX}%)`,
              width: `${(circularProducts.length / 4) * 100}%`
            }}
          >
            {circularProducts.map((product, index) => (
              <div key={`${product.id}-${index}`} className="w-1/4 h-full px-1">
                <Link
                  href={`/product/${product.id}`}
                  className="group relative bg-white shadow-sm transition-all duration-500 overflow-hidden transform hover:scale-105 block h-full"
                >
                  {/* Product Image Only */}
                  <div className="h-full overflow-hidden">
                    {(() => {
                      // Get the first available image with fallback
                      let imageUrl = '/placeholder-product.jpg';
                      
                      if (product.images && product.images.length > 0) {
                        const firstImage = product.images[0];
                        imageUrl = typeof firstImage === 'string' ? firstImage : firstImage.image_url;
                      } else if (product.image_url) {
                        imageUrl = product.image_url;
                      }
                      
                      // Fallback to placeholder if image doesn't exist
                      if (!imageUrl || imageUrl === '/placeholder-product.jpg') {
                        imageUrl = '/placeholder-product.jpg';
                      }

                      console.log(`Rendering circular product card ${product.id}:`, {
                        imageUrl,
                        index,
                        currentIndex,
                        translateX
                      });

                      return (
                        <img
                          src={imageUrl}
                          alt={product.name}
                          className="h-full w-full object-cover group-hover:scale-110 transition-transform duration-500"
                          onError={(e) => {
                            console.error(`Image failed to load: ${imageUrl}, falling back to placeholder`);
                            // Only set placeholder if it's not already the placeholder to prevent infinite loop
                            if (e.currentTarget.src !== window.location.origin + '/placeholder-product.jpg') {
                              e.currentTarget.src = '/placeholder-product.jpg';
                            }
                          }}
                          onLoad={() => {
                            console.log(`Image loaded successfully: ${imageUrl}`);
                          }}
                        />
                      );
                    })()}
                  </div>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      {/* Fallback message if no products */}
      {allHeroProducts.length === 0 && (
        <div className="h-full flex items-center justify-center">
          <div className="text-center text-gray-500">
            <h2 className="text-2xl font-semibold mb-2">No Featured Products</h2>
            <p>Select products to feature in the hero section from the admin panel.</p>
          </div>
        </div>
      )}
    </div>
  );
}