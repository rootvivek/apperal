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
      
      // Temporarily use localStorage for all users until database is set up
      try {
        const storageKey = user ? `wishlist-${user.id}` : 'guest-wishlist';
        const savedWishlist = localStorage.getItem(storageKey);
        if (savedWishlist) {
          const parsedWishlist = JSON.parse(savedWishlist);
          setWishlist(parsedWishlist);
          console.log('Loaded wishlist from localStorage:', parsedWishlist);
        } else {
          setWishlist([]);
        }
      } catch (error) {
        console.error('Error loading wishlist:', error);
        setWishlist([]);
      }
      
      setLoading(false);

      // TODO: Uncomment when database is ready
      /*
      if (user) {
        // Load from database for logged-in users
        try {
          const { data: wishlistData, error } = await supabase
            .from('wishlist')
            .select(`
              product_id,
              products (
                id,
                name,
                description,
                price,
                category,
                subcategory,
                image_url,
                stock_quantity,
                is_active,
                created_at,
                updated_at
              )
            `)
            .eq('user_id', user.id);

          if (error) {
            console.error('Error loading wishlist from database:', error);
            setWishlist([]);
          } else {
            const products = wishlistData?.map(item => item.products).filter(Boolean) as Product[] || [];
            setWishlist(products);
            console.log('Loaded wishlist from database:', products);
          }
        } catch (error) {
          console.error('Error loading wishlist:', error);
          setWishlist([]);
        }
      } else {
        // Load from localStorage for guest users
        try {
          const savedWishlist = localStorage.getItem('guest-wishlist');
          if (savedWishlist) {
            const parsedWishlist = JSON.parse(savedWishlist);
            setWishlist(parsedWishlist);
            console.log('Loaded guest wishlist from localStorage:', parsedWishlist);
          } else {
            setWishlist([]);
          }
        } catch (error) {
          console.error('Error loading guest wishlist:', error);
          setWishlist([]);
        }
      }
      */
    };

    loadWishlist();
  }, [user, supabase]);

  const addToWishlist = async (product: Product) => {
    // Temporarily use localStorage for all users until database is set up
    setWishlist(prev => {
      if (prev.find(item => item.id === product.id)) {
        return prev; // Already in wishlist
      }
      const newWishlist = [...prev, product];
      const storageKey = user ? `wishlist-${user.id}` : 'guest-wishlist';
      localStorage.setItem(storageKey, JSON.stringify(newWishlist));
      return newWishlist;
    });

    // TODO: Uncomment when database is ready
    /*
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
      const { error } = await supabase
        .from('wishlist')
        .insert({
          user_id: user.id,
          product_id: product.id
        });

      if (error) {
        console.error('Error adding to wishlist:', error);
        return;
      }

      // Update local state
      setWishlist(prev => {
        if (prev.find(item => item.id === product.id)) {
          return prev; // Already in wishlist
        }
        return [...prev, product];
      });

      console.log('Added to wishlist:', product.name);
    } catch (error) {
      console.error('Error adding to wishlist:', error);
    }
    */
  };

  const removeFromWishlist = async (productId: string) => {
    // Temporarily use localStorage for all users until database is set up
    setWishlist(prev => {
      const newWishlist = prev.filter(item => item.id !== productId);
      const storageKey = user ? `wishlist-${user.id}` : 'guest-wishlist';
      localStorage.setItem(storageKey, JSON.stringify(newWishlist));
      return newWishlist;
    });

    // TODO: Uncomment when database is ready
    /*
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
      const { error } = await supabase
        .from('wishlist')
        .delete()
        .eq('user_id', user.id)
        .eq('product_id', productId);

      if (error) {
        console.error('Error removing from wishlist:', error);
        return;
      }

      // Update local state
      setWishlist(prev => prev.filter(item => item.id !== productId));
      console.log('Removed from wishlist:', productId);
    } catch (error) {
      console.error('Error removing from wishlist:', error);
    }
    */
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