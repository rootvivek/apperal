'use client';

import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { useAuth } from './AuthContext';
import { createClient } from '@/lib/supabase/client';
import { CART, DB_ERROR_CODES } from '@/constants';
import { loadGuestCart, saveGuestCart, clearGuestCart } from '@/utils/cart/guestCart';
import { getOrCreateCart, transformCartItem } from '@/utils/cart/cartOperations';
import { ensureUserProfileExists } from '@/utils/cart/userProfile';
import { transferGuestCartToUser } from '@/utils/cart/guestCartTransfer';

export interface CartItem {
  id: string;
  product_id: string;
  quantity: number;
  size?: string | null;
  product: {
    id: string;
    name: string;
    price: number;
    image_url: string;
    stock_quantity: number;
    subcategory?: {
      id: string;
      name: string;
      slug: string;
      detail_type?: string | null;
    } | null;
  };
}

interface CartContextType {
  cartItems: CartItem[];
  cartCount: number;
  loading: boolean;
  addToCart: (productId: string, quantity?: number, size?: string | null) => Promise<void>;
  removeFromCart: (cartItemId: string) => Promise<void>;
  updateQuantity: (cartItemId: string, quantity: number) => Promise<void>;
  clearCart: () => Promise<void>;
  refreshCart: () => Promise<void>;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const supabase = createClient();

  // Memoize cart count to prevent recalculation on every render
  const cartCount = useMemo(() => 
    cartItems.reduce((total, item) => total + item.quantity, 0),
    [cartItems]
  );

  // Load guest cart from localStorage ONLY on initial mount
  useEffect(() => {
    if (!user) {
      const guestCart = loadGuestCart();
      if (guestCart.length > 0) {
        setCartItems(guestCart);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty deps - only run once on mount


  const fetchCartItems = async () => {
    if (!user) {
      // For guest users, do nothing - state is already set on mount
      // Don't clear the cart items
      return;
    }

    try {
      setLoading(true);
      
      // Ensure user profile exists before creating cart
      const profileExists = await ensureUserProfileExists(user.id, user);
      if (!profileExists) {
        // Retry after a delay - profile might be created by AuthContext
        setTimeout(() => {
          fetchCartItems();
        }, CART.FETCH_RETRY_DELAY);
        return;
      }
      
      // Transfer guest cart items to user cart after login
      const guestCart = loadGuestCart();
      if (guestCart.length > 0) {
        try {
          await transferGuestCartToUser(user.id, guestCart);
        } catch {
          // Clear invalid localStorage data
          clearGuestCart();
        }
      }
      
      // Get or create user's cart
      const cart = await getOrCreateCart(user.id);
      if (!cart) {
        return;
      }

      // Fetch cart items with product details including subcategory
      const { data: items, error: itemsError } = await supabase
        .from('cart_items')
        .select(`
          id,
          quantity,
          product_id,
          size,
          products (
            id,
            name,
            price,
            image_url,
            stock_quantity,
            subcategory_id,
            subcategories (
              id,
              name,
              slug,
              detail_type
            )
          )
        `)
        .eq('cart_id', cart.id);

      if (itemsError) {
        // NOT_FOUND = no rows returned, which is expected for empty carts
        setCartItems([]);
        return;
      }

      // Transform the data to match our interface
      const transformedItems: CartItem[] = items?.map(transformCartItem) || [];

      setCartItems(transformedItems);
    } catch {
      // Error handled silently - cart might not exist yet for new users
    } finally {
      setLoading(false);
    }
  };

  // Fetch cart items when user logs in or changes
  useEffect(() => {
    // Only call fetchCartItems if we have a user
    // Guest cart is already loaded on mount
    if (user) {
      fetchCartItems();
    }
  }, [user]);

  const addToCart = async (productId: string, quantity: number = 1, size: string | null = null) => {
    // Handle guest cart (localStorage) - save items but redirect to login
    if (!user) {
      try {
        // Fetch product details first including subcategory
        const { data: product, error: productError } = await supabase
          .from('products')
          .select(`
            id,
            name,
            price,
            image_url,
            stock_quantity,
            subcategory_id,
            subcategories (
              id,
              name,
              slug,
              detail_type
            )
          `)
          .eq('id', productId)
          .single();

        if (productError || !product) {
          // Error handled silently
          const currentUrl = window.location.pathname;
          window.location.href = `/login?redirect=${encodeURIComponent(currentUrl)}`;
          return;
        }

        // Get existing guest cart
        const existingCart = loadGuestCart();

        // Check if item already exists in cart (same product_id AND same size)
        const existingItem = existingCart.find(item => 
          item.product_id === productId && 
          (item.size === size || (!item.size && !size))
        );

        let updatedCart: CartItem[];
        if (existingItem) {
          // Update existing item quantity (same product and size)
          updatedCart = existingCart.map(item =>
            item.product_id === productId && 
            (item.size === size || (!item.size && !size))
              ? { ...item, quantity: item.quantity + quantity }
              : item
          );
        } else {
          // Add new item to cart (different size = separate item)
          const newItem: CartItem = {
            id: `guest-${productId}-${size || 'no-size'}-${Date.now()}`,
            product_id: productId,
            quantity: quantity,
            size: size || null,
            product: {
              id: product.id,
              name: product.name,
              price: product.price,
              image_url: product.image_url,
              stock_quantity: product.stock_quantity,
              subcategory: (() => {
                const subcats = product.subcategories;
                if (!subcats) return null;
                const subcat = Array.isArray(subcats) ? subcats[0] : subcats;
                return subcat ? {
                  id: subcat.id,
                  name: subcat.name,
                  slug: subcat.slug,
                  detail_type: subcat.detail_type || null,
                } : null;
              })(),
            }
          };
          updatedCart = [...existingCart, newItem];
        }

        // Save to localStorage
        saveGuestCart(updatedCart);
        setCartItems(updatedCart);
      } catch {
        // Error handled silently
      }
      return;
    }

    // Handle logged-in user cart (database)
    try {
      // Get or create user's cart
      const cart = await getOrCreateCart(user.id);
      if (!cart) {
        return;
      }


      // Check if item already exists in cart (same product_id AND same size)
      let query = supabase
        .from('cart_items')
        .select('id, quantity')
        .eq('cart_id', cart.id)
        .eq('product_id', productId);
      
      // Match by size (both null or same value)
      if (size) {
        query = query.eq('size', size);
      } else {
        query = query.is('size', null);
      }
      
      const { data: existingItem, error: existingError } = await query.maybeSingle();

      if (existingError && existingError.code !== DB_ERROR_CODES.NOT_FOUND) {
        alert('Error adding item to cart. Please try again.');
        return;
      }

      if (existingItem) {
        // Update existing item quantity
        const { error: updateError } = await supabase
          .from('cart_items')
          .update({ quantity: existingItem.quantity + quantity })
          .eq('id', existingItem.id);

        if (updateError) {
          alert('Error updating cart. Please try again.');
          return;
        }

        // Optimistically update local state instead of full refetch
        setCartItems(prevItems =>
          prevItems.map(item =>
            item.id === existingItem.id
              ? { ...item, quantity: item.quantity + quantity }
              : item
          )
        );
      } else {
        // Add new item to cart
        const { data: productData, error: productError } = await supabase
          .from('products')
          .select('id, name, price, image_url, stock_quantity')
          .eq('id', productId)
          .single();

        if (productError || !productData) {
          alert('Error fetching product details. Please try again.');
          return;
        }

        const { data: insertData, error: insertError } = await supabase
          .from('cart_items')
          .insert({
            cart_id: cart.id,
            product_id: productId,
            quantity: quantity,
            size: size || null
          })
          .select('id');

        if (insertError) {
          alert('Error adding item to cart. Please try again.');
          return;
        }

        if (insertData && insertData.length > 0) {
          // Optimistically add item to local state instead of full refetch
          const newItem: CartItem = {
            id: insertData[0].id,
            product_id: productId,
            quantity: quantity,
            product: {
              id: productData.id,
              name: productData.name,
              price: productData.price,
              image_url: productData.image_url,
              stock_quantity: productData.stock_quantity,
            }
          };
          setCartItems(prevItems => [...prevItems, newItem]);
        }
      }
    } catch {
      // Error handled silently
    }
  };

  const removeFromCart = async (cartItemId: string) => {
    // Handle guest cart
    if (!user) {
      try {
        const guestCartStr = localStorage.getItem('guest-cart');
        const existingCart: CartItem[] = guestCartStr ? JSON.parse(guestCartStr) : [];
        
        const updatedCart = existingCart.filter(item => item.id !== cartItemId);
        
        localStorage.setItem('guest-cart', JSON.stringify(updatedCart));
        setCartItems(updatedCart);
      } catch {
        // Error handled silently
      }
      return;
    }

    // Handle logged-in user cart
    try {
      const { error } = await supabase
        .from('cart_items')
        .delete()
        .eq('id', cartItemId);

      if (error) {
        return;
      }

      // Optimistically update local state instead of full refetch
      setCartItems(prevItems => prevItems.filter(item => item.id !== cartItemId));
    } catch {
      // Error handled silently
    }
  };

  const updateQuantity = async (cartItemId: string, quantity: number) => {
    if (quantity <= 0) {
      await removeFromCart(cartItemId);
      return;
    }

    // Handle guest cart
    if (!user) {
      try {
        const guestCartStr = localStorage.getItem('guest-cart');
        const existingCart: CartItem[] = guestCartStr ? JSON.parse(guestCartStr) : [];
        
        const updatedCart = existingCart.map(item =>
          item.id === cartItemId ? { ...item, quantity } : item
        );
        
        localStorage.setItem('guest-cart', JSON.stringify(updatedCart));
        setCartItems(updatedCart);
      } catch {
        // Error handled silently
      }
      return;
    }

    // Handle logged-in user cart
    try {
      const { error } = await supabase
        .from('cart_items')
        .update({ quantity })
        .eq('id', cartItemId);

      if (error) {
        return;
      }

      // Optimistically update local state instead of full refetch
      setCartItems(prevItems =>
        prevItems.map(item =>
          item.id === cartItemId ? { ...item, quantity } : item
        )
      );
    } catch {
      // Error handled silently
    }
  };

  const clearCart = async () => {
    // Handle guest cart
    if (!user) {
      clearGuestCart();
      setCartItems([]);
      return;
    }

    // Handle logged-in user cart
    try {
      // Get user's cart
      const cart = await getOrCreateCart(user.id);
      if (cart) {
        const { error } = await supabase
          .from('cart_items')
          .delete()
          .eq('cart_id', cart.id);

        if (error) {
          return;
        }
      }

      // Refresh cart items
      await fetchCartItems();
    } catch {
      // Error handled silently
    }
  };

  const refreshCart = async () => {
    await fetchCartItems();
  };

  // Memoize context value to prevent unnecessary re-renders
  const contextValue = useMemo(() => ({
        cartItems,
        cartCount,
        loading,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        refreshCart,
  }), [cartItems, cartCount, loading, addToCart, removeFromCart, updateQuantity, clearCart, refreshCart]);

  return (
    <CartContext.Provider value={contextValue}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}

