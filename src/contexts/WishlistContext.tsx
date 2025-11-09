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
  const [wishlist, setWishlist] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const supabase = createClient();

  // Load wishlist from database when user changes
  useEffect(() => {
    const loadWishlist = async () => {
      setLoading(true);
      
      if (user) {
        // Load from database for logged-in users
        try {
          const { data: wishlistRows, error } = await supabase
            .from('wishlist')
            .select('product_id')
            .eq('user_id', user.id);

          if (error) {
            // Only log if it's not a "no rows" type error (PGRST116 = no rows returned)
            // This is expected for users who don't have items in their wishlist yet
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
                  category_id,
                  brand,
                  in_stock,
                  stock_quantity,
                  rating,
                  review_count,
                  created_at,
                  updated_at
                `)
                .in('id', productIds);

              if (productsError) {
                setWishlist([]);
              } else {
                // Transform to Product type
                const products = (productsData || []).map((dbProduct: any) => ({
                  id: dbProduct.id,
                  name: dbProduct.name,
                  description: dbProduct.description || '',
                  price: dbProduct.price,
                  originalPrice: dbProduct.price,
                  images: [],
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
                })) as Product[];
                setWishlist(products);
              }
            }
          }
        } catch (error: any) {
          // Silently handle errors - wishlist might not exist yet for new users
          setWishlist([]);
        }
      } else {
        // Load from localStorage for guest users
        try {
          const savedWishlist = localStorage.getItem('guest-wishlist');
          if (savedWishlist) {
            const parsedWishlist = JSON.parse(savedWishlist);
            setWishlist(parsedWishlist);
          } else {
            setWishlist([]);
          }
        } catch (error) {
          console.error('Error loading guest wishlist:', error);
          setWishlist([]);
        }
      }
      
      setLoading(false);
    };

    loadWishlist();
  }, [user, supabase]);

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