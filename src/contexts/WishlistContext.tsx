'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { Product } from '@/types/product';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface WishlistContextType {
  wishlist: Product[];
  addToWishlist: (product: Product) => Promise<void>;
  removeFromWishlist: (productId: string) => Promise<void>;
  isInWishlist: (productId: string) => boolean;
  wishlistCount: number;
  loading: boolean;
}

const WishlistContext = createContext<WishlistContextType | undefined>(undefined);

export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const supabase = createClient();
  
  // Initialize wishlist from localStorage immediately for guest users (synchronous)
  const getInitialWishlist = (): Product[] => {
    if (typeof window === 'undefined') return [];
    try {
      const savedWishlist = localStorage.getItem('guest-wishlist');
      if (savedWishlist) {
        return JSON.parse(savedWishlist);
      }
    } catch {
      // Error handled silently
    }
    return [];
  };

  const [wishlist, setWishlist] = useState<Product[]>(getInitialWishlist);
  const [isFetching, setIsFetching] = useState(false);

  // Computed loading: only true if user is logged in AND we're actually fetching
  // Never true for guest users or when auth is loading
  const loading = !!(user && !authLoading && isFetching);

  // Always ensure wishlist is loaded from localStorage for guest users
  useEffect(() => {
    if (!authLoading && !user) {
      const guestWishlist = getInitialWishlist();
      setWishlist(guestWishlist);
      setIsFetching(false);
    }
  }, [authLoading, user]);

  // Load wishlist from database when user changes
  useEffect(() => {
    // Don't do anything while auth is loading
    if (authLoading) {
      setIsFetching(false);
      return;
    }

    // For guest users, load immediately from localStorage (no loading state)
    if (!user) {
      const guestWishlist = getInitialWishlist();
      setWishlist(guestWishlist);
      setIsFetching(false);
      return;
    }

    // Only for logged-in users: transfer guest wishlist and pending items first, then load from database
    const loadWishlist = async () => {
      setIsFetching(true);
      try {
        // Transfer pending wishlist items (items user tried to add before login)
        const pendingWishlistStr = localStorage.getItem('pending-wishlist-add');
        if (pendingWishlistStr) {
          try {
            const pendingWishlist: Product[] = JSON.parse(pendingWishlistStr);
            if (pendingWishlist.length > 0) {
              // Add each pending item to database
              let addedCount = 0;
              for (const product of pendingWishlist) {
                try {
                  // Check if item already exists in user wishlist
                  const { data: existingItem, error: checkError } = await supabase
                    .from('wishlist')
                    .select('id')
                    .eq('user_id', user.id)
                    .eq('product_id', product.id)
                    .maybeSingle();

                  if (checkError && checkError.code !== 'PGRST116') {
                    continue; // Skip this item if there's an error
                  }

                  if (!existingItem) {
                    // Add new item to database wishlist
                    const { error: insertError } = await supabase
                      .from('wishlist')
                      .insert({
                        user_id: user.id,
                        product_id: product.id
                      })
                      .select();

                    if (!insertError) {
                      addedCount++;
                    }
                  }
                } catch {
                  // Continue with other items
                }
              }

              // Clear pending wishlist after successful transfer
              localStorage.removeItem('pending-wishlist-add');
            }
          } catch {
            // Clear invalid localStorage data
            localStorage.removeItem('pending-wishlist-add');
          }
        }

        // Transfer guest wishlist items to database after login
        const guestWishlistStr = localStorage.getItem('guest-wishlist');
        if (guestWishlistStr) {
          try {
            const guestWishlist: Product[] = JSON.parse(guestWishlistStr);
            if (guestWishlist.length > 0) {
              // Transfer each guest wishlist item to database
              let transferredCount = 0;
              for (const product of guestWishlist) {
                try {
                  // Check if item already exists in user wishlist
                  const { data: existingItem, error: checkError } = await supabase
                    .from('wishlist')
                    .select('id')
                    .eq('user_id', user.id)
                    .eq('product_id', product.id)
                    .maybeSingle();

                  if (checkError && checkError.code !== 'PGRST116') {
                    continue; // Skip this item if there's an error
                  }

                  if (!existingItem) {
                    // Add new item to database wishlist
                    const { error: insertError } = await supabase
                      .from('wishlist')
                      .insert({
                        user_id: user.id,
                        product_id: product.id
                      })
                      .select();

                    if (!insertError) {
                      transferredCount++;
                    }
                  }
                } catch {
                  // Continue with other items
                }
              }

              // Clear guest wishlist after successful transfer
              if (transferredCount > 0) {
                localStorage.removeItem('guest-wishlist');
              }
            }
          } catch {
            // Clear invalid localStorage data
            localStorage.removeItem('guest-wishlist');
          }
        }

        // Now load wishlist from database
        const { data: wishlistRows, error } = await supabase
          .from('wishlist')
          .select('product_id')
          .eq('user_id', user.id);

        if (error) {
          // Only log if it's not a "no rows" type error (PGRST116 = no rows returned)
          if (error.code !== 'PGRST116') {
            // Error handled silently
          }
          setWishlist([]);
        } else {
          const productIds = (wishlistRows || []).map((r: any) => r.product_id).filter(Boolean);
          if (productIds.length === 0) {
            setWishlist([]);
          } else {
            const { data: productsData, error: productsError } = await supabase
              .from('products')
              .select(`
                id,
                name,
                slug,
                description,
                price,
                image_url,
                category_id,
                brand,
                in_stock,
                stock_quantity,
                rating,
                review_count,
                created_at,
                updated_at,
                product_images (image_url)
              `)
              .in('id', productIds);

            if (productsError) {
              setWishlist([]);
            } else {
              // Transform to Product type
              const products = (productsData || []).map((dbProduct: any) => {
                // Collect images from product_images table and fallback to image_url
                const images: string[] = [];
                
                // Add main image_url if it exists
                if (dbProduct.image_url) {
                  images.push(dbProduct.image_url);
                }
                
                // Add product_images if they exist
                if (dbProduct.product_images && Array.isArray(dbProduct.product_images)) {
                  dbProduct.product_images.forEach((img: any) => {
                    if (img?.image_url && !images.includes(img.image_url)) {
                      images.push(img.image_url);
                    }
                  });
                }
                
                const finalImages = images.length > 0 ? images : (dbProduct.image_url ? [dbProduct.image_url] : []);
                
                return {
                  id: dbProduct.id,
                  name: dbProduct.name,
                  description: dbProduct.description || '',
                  price: dbProduct.price,
                  originalPrice: dbProduct.price,
                  image_url: dbProduct.image_url || (finalImages.length > 0 ? finalImages[0] : ''),
                  images: finalImages,
                  category: {
                    id: dbProduct.category_id || 'unknown',
                    name: 'Uncategorized',
                    slug: 'uncategorized',
                    description: '',
                    image: '',
                    subcategories: []
                  },
                  subcategories: [],
                  brand: dbProduct.brand || '',
                  sizes: [],
                  colors: [],
                  inStock: dbProduct.in_stock,
                  rating: dbProduct.rating || 0,
                  reviewCount: dbProduct.review_count || 0,
                  tags: [],
                  createdAt: new Date(dbProduct.created_at),
                  updatedAt: new Date(dbProduct.updated_at)
                };
              }) as Product[];
              setWishlist(products);
            }
          }
        }
      } catch {
        setWishlist([]);
      } finally {
        setIsFetching(false);
      }
    };

    loadWishlist();
  }, [user, supabase, authLoading]);

  const addToWishlist = async (product: Product) => {
    if (!user) {
      // For guest users, save to localStorage
      setWishlist(prev => {
        if (prev.find(item => item.id === product.id)) {
          return prev; // Already in wishlist
        }
        const newWishlist = [...prev, product];
        localStorage.setItem('guest-wishlist', JSON.stringify(newWishlist));
        return newWishlist;
      });
      return;
    }

    // For logged-in users, save to database
    try {
      const response = await (supabase
        .from('wishlist')
        .insert({
          user_id: user.id,
          product_id: product.id
        }) as any);

      if (response.error) {
        return;
      }

      // Update local state
      setWishlist(prev => {
        if (prev.find(item => item.id === product.id)) {
          return prev; // Already in wishlist
        }
        return [...prev, product];
      });
    } catch (error) {
      // Error adding to wishlist
    }
  };

  const removeFromWishlist = async (productId: string) => {
    if (!user) {
      // For guest users, remove from localStorage
      setWishlist(prev => {
        const newWishlist = prev.filter(item => item.id !== productId);
        localStorage.setItem('guest-wishlist', JSON.stringify(newWishlist));
        return newWishlist;
      });
      return;
    }

    // For logged-in users, remove from database
    try {
      const deleteQuery = supabase
        .from('wishlist')
        .delete() as any;
      
      const response = await deleteQuery
        .eq('user_id', user.id)
        .eq('product_id', productId);

      if (response.error) {
        return;
      }

      // Update local state
      setWishlist(prev => prev.filter(item => item.id !== productId));
    } catch (error) {
      // Error removing from wishlist
    }
  };

  const isInWishlist = (productId: string) => {
    return wishlist.some(item => item.id === productId);
  };

  const wishlistCount = wishlist.length;

  const value = {
    wishlist,
    addToWishlist,
    removeFromWishlist,
    isInWishlist,
    wishlistCount,
    loading,
  };

  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
}

export function useWishlist() {
  const context = useContext(WishlistContext);
  if (context === undefined) {
    throw new Error('useWishlist must be used within a WishlistProvider');
  }
  return context;
}