'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
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

  const cartCount = cartItems.reduce((total, item) => total + item.quantity, 0);

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
        console.error('Error loading guest cart on mount:', error);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty deps - only run once on mount

  // Helper function to ensure user profile exists before cart operations
  const ensureUserProfileExists = async (userId: string, maxRetries = 10): Promise<boolean> => {
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
        console.error('Error checking user profile:', error);
      }

      // If profile doesn't exist and we have user info, try to create it
      if (!profile && i === 2 && user) {
        try {
          // Generate email - use user email if available, otherwise create placeholder from phone
          let userEmail = user.email || '';
          if (!userEmail && user.phone) {
            // Create placeholder email from phone number (email column is NOT NULL)
            const cleanPhone = user.phone.replace(/\D/g, ''); // Remove non-digits
            userEmail = `phone_${cleanPhone}@apperal.local`;
          } else if (!userEmail) {
            // Fallback if no phone either
            userEmail = `user_${userId.substring(0, 8)}@apperal.local`;
          }
          
          // Try to create profile with minimal data
          const { error: createError } = await supabase
            .from('user_profiles')
            .insert({
              id: userId,
              email: userEmail, // Now always has a value
              full_name: user.user_metadata?.full_name || 'User',
              phone: user.phone || null,
            });

          if (!createError) {
            console.log('User profile created from cart context:', userId);
            return true;
          } else if (createError.code === '23505') {
            // Duplicate key - profile was created by another process
            console.log('Profile already exists (duplicate key):', userId);
            return true;
          } else {
            console.warn('Failed to create profile from cart context:', createError);
          }
        } catch (err) {
          console.warn('Exception creating profile from cart context:', err);
        }
      }

      // Wait before retrying (exponential backoff)
      if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, 500 * (i + 1)));
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
        console.error('User profile does not exist, cannot create cart');
        return;
      }
      
      // Transfer guest cart items to user cart after login
      const guestCartStr = localStorage.getItem('guest-cart');
      if (guestCartStr) {
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
            console.error('Error fetching cart:', cartError);
          }

          if (!cart) {
            // Create cart if it doesn't exist
            const { data: newCartData, error: createError } = await supabase
              .from('carts')
              .insert({ user_id: user.id })
              .select('id');

            if (createError) {
              console.error('Error creating cart:', createError);
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
            for (const guestItem of guestCart) {
              // Check if item already exists in user cart
              const { data: existingItem } = await supabase
                .from('cart_items')
                .select('id, quantity')
                .eq('cart_id', cart.id)
                .eq('product_id', guestItem.product_id)
                .maybeSingle();

              if (existingItem) {
                // Update quantity if item exists
                await supabase
                  .from('cart_items')
                  .update({ quantity: existingItem.quantity + guestItem.quantity })
                  .eq('id', existingItem.id);
              } else {
                // Add new item
                await supabase
                  .from('cart_items')
                  .insert({
                    cart_id: cart.id,
                    product_id: guestItem.product_id,
                    quantity: guestItem.quantity
                  });
              }
            }
          }

          // Clear guest cart after transfer
          localStorage.removeItem('guest-cart');
          console.log('Guest cart transferred to user account');
        }
      }
      
      // Get user's cart
      let { data: cart, error: cartError } = await supabase
        .from('carts')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (cartError && cartError.code !== 'PGRST116') {
        // Only log actual errors, not empty results
        console.log('Note: Error fetching cart:', cartError.message || cartError);
        if (cartError.message?.includes('Could not find the table')) {
          console.error('❌ MISSING TABLE: The carts table does not exist. Please run the SQL script to create it.');
        }
        return;
      }

      if (!cart) {
        // Ensure user profile exists before creating cart
        const profileExists = await ensureUserProfileExists(user.id);
        if (!profileExists) {
          console.error('User profile does not exist, cannot create cart');
          return;
        }

        // Create cart if it doesn't exist
        const { data: newCartData, error: createError } = await supabase
          .from('carts')
          .insert({ user_id: user.id })
          .select('id');

        if (createError) {
          console.error('Error creating cart:', createError);
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
              console.error('❌ MISSING TABLE: The carts table does not exist. Please run the SQL script to create it.');
            }
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

      // Fetch cart items with product details
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
            stock_quantity
          )
        `)
        .eq('cart_id', cart.id);

      if (itemsError) {
        // Only log if it's not a "no rows" type error (PGRST116 = no rows returned)
        // This is expected for users who don't have items in their cart yet
        if (itemsError.code !== 'PGRST116') {
          console.log('Note: Error fetching cart items:', itemsError.message || itemsError);
        }
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
          }
        };
      }) || [];

      setCartItems(transformedItems);
    } catch (error: any) {
      // Silently handle errors - cart might not exist yet for new users
      console.log('Note: Error fetching cart items:', error?.message || error);
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
        // Fetch product details first
        const { data: product, error: productError } = await supabase
          .from('products')
          .select('id, name, price, image_url, stock_quantity')
          .eq('id', productId)
          .single();

        if (productError || !product) {
          console.error('Error fetching product:', productError);
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
            }
          };
          updatedCart = [...existingCart, newItem];
        }

        // Save to localStorage
        localStorage.setItem('guest-cart', JSON.stringify(updatedCart));
        setCartItems(updatedCart);
      } catch (error) {
        console.error('Error adding to guest cart:', error);
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
        console.error('Error fetching cart:', cartError);
        if (cartError.message.includes('Could not find the table')) {
          console.error('❌ MISSING TABLE: The carts table does not exist. Please run the SQL script to create it.');
          alert('❌ Cart table missing! Please contact admin to fix this issue.');
        }
        return;
      }

      // If no cart exists, create one
      if (!cart) {
        // Ensure user profile exists before creating cart
        const profileExists = await ensureUserProfileExists(user.id);
        if (!profileExists) {
          console.error('User profile does not exist, cannot create cart');
          return;
        }

        const { data: newCartData, error: createError } = await supabase
          .from('carts')
          .insert({ user_id: user.id })
          .select('id');

        if (createError) {
          console.error('Error creating cart:', createError);
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
              console.error('❌ MISSING TABLE: The carts table does not exist. Please run the SQL script to create it.');
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
        console.error('Error checking existing cart item:', existingError);
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
          console.error('Error updating cart item:', updateError);
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
          console.error('Error fetching product:', productError);
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
          console.error('Error adding to cart:', insertError);
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
      
      // Show success notification
      console.log('Item added to cart successfully!');
    } catch (error) {
      console.error('Error adding to cart:', error);
    }
  };

  const removeFromCart = async (cartItemId: string) => {
    // Handle guest cart
    if (!user) {
      try {
        const guestCartStr = localStorage.getItem('guest-cart');
        const existingCart: CartItem[] = guestCartStr ? JSON.parse(guestCartStr) : [];
        
        const updatedCart = existingCart.filter(item => item.id !== cartItemId);
        
        console.log('Removing item from guest cart:', cartItemId, 'Updated cart:', updatedCart);
        localStorage.setItem('guest-cart', JSON.stringify(updatedCart));
        setCartItems(updatedCart);
      } catch (error) {
        console.error('Error removing from guest cart:', error);
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
        console.error('Error removing from cart:', error);
        return;
      }

      // Optimistically update local state instead of full refetch
      setCartItems(prevItems => prevItems.filter(item => item.id !== cartItemId));
    } catch (error) {
      console.error('Error removing from cart:', error);
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
      } catch (error) {
        console.error('Error updating guest cart quantity:', error);
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
        console.error('Error updating quantity:', error);
        return;
      }

      // Optimistically update local state instead of full refetch
      setCartItems(prevItems =>
        prevItems.map(item =>
          item.id === cartItemId ? { ...item, quantity } : item
        )
      );
    } catch (error) {
      console.error('Error updating quantity:', error);
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
        console.error('Error fetching cart:', cartError);
        return;
      }

      if (cart) {
        const { error } = await supabase
          .from('cart_items')
          .delete()
          .eq('cart_id', cart.id);

        if (error) {
          console.error('Error clearing cart:', error);
          return;
        }
      }

      // Refresh cart items
      await fetchCartItems();
    } catch (error) {
      console.error('Error clearing cart:', error);
    }
  };

  const refreshCart = async () => {
    await fetchCartItems();
  };

  return (
    <CartContext.Provider
      value={{
        cartItems,
        cartCount,
        loading,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        refreshCart,
      }}
    >
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
