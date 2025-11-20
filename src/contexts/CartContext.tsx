'use client';

import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { createClient } from '@/lib/supabase/client';

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
      try {
        const guestCart = localStorage.getItem('guest-cart');
        if (guestCart) {
          const parsed = JSON.parse(guestCart);
          setCartItems(parsed);
        }
      } catch (error) {
        // Failed to load guest cart
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty deps - only run once on mount

  // Helper function to ensure user profile exists before cart operations
  const ensureUserProfileExists = async (userId: string, maxRetries = 15): Promise<boolean> => {
    for (let i = 0; i < maxRetries; i++) {
      const { data: profile, error } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('id', userId)
        .maybeSingle();

      if (profile) {
        return true;
      }

      if (error && error.code !== 'PGRST116') {
        // Continue retrying even on error (might be transient)
        if (i < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, 500 * (i + 1)));
        }
        continue;
      }

      // If profile doesn't exist and we have user info, try to create it
      // Try creating on retries 1, 3, 5, 7, etc. to give AuthContext time first
      if (!profile && i > 0 && i % 2 === 1 && user) {
        try {
          // Check for soft-deleted profiles with same phone (like AuthContext does)
          const userPhone = user.phone || null;
          if (userPhone) {
            const { data: profilesWithPhone } = await supabase
              .from('user_profiles')
              .select('id, deleted_at')
              .eq('phone', userPhone)
              .maybeSingle();

            if (profilesWithPhone?.deleted_at) {
              // Hard delete the soft-deleted profile
              await supabase
                .from('user_profiles')
                .delete()
                .eq('id', profilesWithPhone.id);
            }
          }
          
          // Try to create profile with minimal data
          const { error: createError } = await supabase
            .from('user_profiles')
            .insert({
              id: userId,
              full_name: user.user_metadata?.full_name || 'User',
              phone: userPhone,
            })
            .select();

          if (!createError) {
            // Profile created successfully, verify it exists
            await new Promise(resolve => setTimeout(resolve, 200));
            const { data: verifyProfile } = await supabase
              .from('user_profiles')
              .select('id')
              .eq('id', userId)
              .maybeSingle();
            
            if (verifyProfile) {
              return true;
            }
          } else if (createError.code === '23505') {
            // Duplicate key - profile was created by another process (likely AuthContext)
            // Wait a bit and verify it exists
            await new Promise(resolve => setTimeout(resolve, 300));
            const { data: verifyProfile } = await supabase
              .from('user_profiles')
              .select('id')
              .eq('id', userId)
              .maybeSingle();
            
            if (verifyProfile) {
              return true;
            }
          } else if (createError.code === '23503') {
            // Foreign key constraint - might be a transient issue, continue retrying
          }
        } catch {
          // Error handled silently - will retry
        }
      }

      // Wait before retrying (exponential backoff with longer initial wait)
      if (i < maxRetries - 1) {
        const waitTime = i === 0 ? 1000 : 500 * (i + 1); // Start with 1 second
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
    return false;
  };

  const fetchCartItems = async () => {
    if (!user) {
      // For guest users, do nothing - state is already set on mount
      // Don't clear the cart items
      return;
    }

    try {
      setLoading(true);
      
      // Ensure user profile exists before creating cart
      const profileExists = await ensureUserProfileExists(user.id);
      if (!profileExists) {
        // Retry after a delay - profile might be created by AuthContext
        setTimeout(() => {
          fetchCartItems();
        }, 2000);
        return;
      }
      
      // Transfer guest cart items to user cart after login
      const guestCartStr = localStorage.getItem('guest-cart');
      if (guestCartStr) {
        try {
          const guestCart: CartItem[] = JSON.parse(guestCartStr);
          if (guestCart.length > 0) {
            // Get or create user's cart
            let { data: cartData, error: cartError } = await supabase
              .from('carts')
              .select('id')
              .eq('user_id', user.id)
              .maybeSingle();

            let cart = cartData;

            if (cartError && cartError.code !== 'PGRST116') {
              // Error handled silently
            }

            if (!cart) {
              // Create cart if it doesn't exist
              const { data: newCartData, error: createError } = await supabase
                .from('carts')
                .insert({ user_id: user.id })
                .select('id');

              if (createError) {
                // If foreign key error, wait a bit and retry once
                if (createError.code === '23503') {
                  await new Promise(resolve => setTimeout(resolve, 1000));
                  const retryResult = await supabase
                    .from('carts')
                    .insert({ user_id: user.id })
                    .select('id');
                  if (!retryResult.error && retryResult.data && retryResult.data.length > 0) {
                    cart = retryResult.data[0];
                  }
                }
              } else if (newCartData && newCartData.length > 0) {
                cart = newCartData[0];
              }
            }

            if (cart) {
              // Transfer each guest cart item to user cart
              let transferredCount = 0;
              for (const guestItem of guestCart) {
                try {
                  // Check if item already exists in user cart (same product_id AND same size)
                  const { data: existingItem, error: checkError } = await supabase
                    .from('cart_items')
                    .select('id, quantity')
                    .eq('cart_id', cart.id)
                    .eq('product_id', guestItem.product_id)
                    .eq('size', guestItem.size || null)
                    .maybeSingle();

                  if (checkError && checkError.code !== 'PGRST116') {
                    continue; // Skip this item if there's an error
                  }

                  if (existingItem) {
                    // Update quantity if item exists
                    const { error: updateError } = await supabase
                      .from('cart_items')
                      .update({ quantity: existingItem.quantity + guestItem.quantity })
                      .eq('id', existingItem.id);

                    if (!updateError) {
                      transferredCount++;
                    }
                  } else {
                    // Add new item
                    const { error: insertError } = await supabase
                      .from('cart_items')
                      .insert({
                        cart_id: cart.id,
                        product_id: guestItem.product_id,
                        quantity: guestItem.quantity,
                        size: guestItem.size || null
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

              // Clear guest cart after successful transfer
              if (transferredCount > 0) {
                localStorage.removeItem('guest-cart');
              }
            }
          }
        } catch {
          // Clear invalid localStorage data
          localStorage.removeItem('guest-cart');
        }
      }
      
      // Get user's cart
      let { data: cart, error: cartError } = await supabase
        .from('carts')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (cartError && cartError.code !== 'PGRST116') {
        return;
      }

      if (!cart) {
        // Ensure user profile exists before creating cart
        const profileExists = await ensureUserProfileExists(user.id);
        if (!profileExists) {
          // Profile is being created by AuthContext, retry after a delay
          setTimeout(() => {
            fetchCartItems();
          }, 2000);
          return;
        }

        // Create cart if it doesn't exist
        const { data: newCartData, error: createError } = await supabase
          .from('carts')
          .insert({ user_id: user.id })
          .select('id');

          if (createError) {
            // If foreign key error, wait a bit and retry once
            if (createError.code === '23503') {
            await new Promise(resolve => setTimeout(resolve, 1000));
            const retryResult = await supabase
              .from('carts')
              .insert({ user_id: user.id })
              .select('id');
            if (!retryResult.error && retryResult.data && retryResult.data.length > 0) {
              cart = retryResult.data[0];
            } else {
              return;
            }
            } else {
            return;
          }
        } else if (!newCartData || newCartData.length === 0) {
          return;
        } else {
          cart = newCartData[0];
          setCartItems([]);
          return;
        }
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
        // PGRST116 = no rows returned, which is expected for empty carts
        setCartItems([]);
        return;
      }

      // Transform the data to match our interface
      const transformedItems: CartItem[] = items?.map((item: any) => {
        // Ensure size is properly extracted (handle both direct access and nested)
        const sizeValue = item.size !== undefined ? item.size : null;
        
        return {
          id: item.id,
          product_id: item.product_id,
          quantity: item.quantity,
          size: sizeValue,
          product: {
            id: item.products.id,
            name: item.products.name,
            price: item.products.price,
            image_url: item.products.image_url,
            stock_quantity: item.products.stock_quantity,
            subcategory: item.products.subcategories ? {
              id: item.products.subcategories.id,
              name: item.products.subcategories.name,
              slug: item.products.subcategories.slug,
              detail_type: item.products.subcategories.detail_type || null,
            } : null,
          }
        };
      }) || [];

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
        const guestCartStr = localStorage.getItem('guest-cart');
        const existingCart: CartItem[] = guestCartStr ? JSON.parse(guestCartStr) : [];

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
              subcategory: product.subcategories ? {
                id: product.subcategories.id,
                name: product.subcategories.name,
                slug: product.subcategories.slug,
                detail_type: product.subcategories.detail_type || null,
              } : null,
            }
          };
          updatedCart = [...existingCart, newItem];
        }

        // Save to localStorage
        localStorage.setItem('guest-cart', JSON.stringify(updatedCart));
        setCartItems(updatedCart);
      } catch {
        // Error handled silently
      }
      return;
    }

    // Handle logged-in user cart (database)
    try {
      // Get user's cart
      let { data: cartData, error: cartError } = await supabase
        .from('carts')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      let cart = cartData;

      // If there was an error fetching cart
      if (cartError) {
        if (cartError.message.includes('Could not find the table')) {
          alert('❌ Cart table missing! Please contact admin to fix this issue.');
        }
        return;
      }

      // If no cart exists, create one
      if (!cart) {
        // Ensure user profile exists before creating cart
        const profileExists = await ensureUserProfileExists(user.id);
        if (!profileExists) {
          return;
        }

        const { data: newCartData, error: createError } = await supabase
          .from('carts')
          .insert({ user_id: user.id })
          .select('id');

        if (createError) {
          // If foreign key error, wait a bit and retry once
          if (createError.code === '23503') {
            await new Promise(resolve => setTimeout(resolve, 1000));
            const retryResult = await supabase
              .from('carts')
              .insert({ user_id: user.id })
              .select('id');
            if (!retryResult.error && retryResult.data && retryResult.data.length > 0) {
              cart = retryResult.data[0];
            } else {
              return;
            }
          } else {
            if (createError.message?.includes('Could not find the table')) {
            alert('❌ Cart table missing! Please contact admin to fix this issue.');
          }
          return;
        }
        } else if (!newCartData || newCartData.length === 0) {
          return;
        } else {
        cart = newCartData[0];
        }
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

      if (existingError && existingError.code !== 'PGRST116') {
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
      localStorage.removeItem('guest-cart');
      setCartItems([]);
      return;
    }

    // Handle logged-in user cart
    try {
      // Get user's cart
      const { data: cart, error: cartError } = await supabase
        .from('carts')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (cartError) {
        return;
      }

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
