'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { createClient } from '@/lib/supabase/client';

export interface CartItem {
  id: string;
  product_id: string;
  quantity: number;
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
  addToCart: (productId: string, quantity?: number) => Promise<void>;
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

  const fetchCartItems = async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      // Get user's cart
      const { data: cart, error: cartError } = await supabase
        .from('carts')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (cartError && cartError.code !== 'PGRST116') {
        console.error('Error fetching cart:', cartError);
        if (cartError.message.includes('Could not find the table')) {
          console.error('❌ MISSING TABLE: The carts table does not exist. Please run the SQL script to create it.');
        }
        return;
      }

      if (!cart) {
        // Create cart if it doesn't exist
        const { data: newCart, error: createError } = await supabase
          .from('carts')
          .insert({ user_id: user.id })
          .select('id')
          .single();

        if (createError) {
          console.error('Error creating cart:', createError);
          if (createError.message.includes('Could not find the table')) {
            console.error('❌ MISSING TABLE: The carts table does not exist. Please run the SQL script to create it.');
          }
          return;
        }

        setCartItems([]);
        return;
      }

      // Fetch cart items with product details
      const { data: items, error: itemsError } = await supabase
        .from('cart_items')
        .select(`
          id,
          quantity,
          product_id,
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
        console.error('Error fetching cart items:', itemsError);
        return;
      }

      // Transform the data to match our interface
      const transformedItems: CartItem[] = items?.map(item => ({
        id: item.id,
        product_id: item.product_id,
        quantity: item.quantity,
        product: {
          id: item.products.id,
          name: item.products.name,
          price: item.products.price,
          image_url: item.products.image_url,
          stock_quantity: item.products.stock_quantity,
        }
      })) || [];

      setCartItems(transformedItems);
    } catch (error) {
      console.error('Error fetching cart items:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch cart items when user logs in
  useEffect(() => {
    if (user) {
      fetchCartItems();
    } else {
      // Clear cart when user logs out
      setCartItems([]);
    }
  }, [user]);

  const addToCart = async (productId: string, quantity: number = 1) => {
    if (!user) {
      // Show a simple alert instead of redirecting
      alert('Please login to add items to cart');
      return;
    }


    try {
      // Get user's cart
      let { data: cart, error: cartError } = await supabase
        .from('carts')
        .select('id')
        .eq('user_id', user.id)
        .single();


      if (cartError && cartError.code === 'PGRST116') {
        // Create cart if it doesn't exist
        const { data: newCart, error: createError } = await supabase
          .from('carts')
          .insert({ user_id: user.id })
          .select('id')
          .single();

        if (createError) {
          console.error('Error creating cart:', createError);
          if (createError.message.includes('Could not find the table')) {
            console.error('❌ MISSING TABLE: The carts table does not exist. Please run the SQL script to create it.');
            alert('❌ Cart table missing! Please contact admin to fix this issue.');
          }
          return;
        }
        cart = newCart;
      } else if (cartError) {
        console.error('Error fetching cart:', cartError);
        if (cartError.message.includes('Could not find the table')) {
          console.error('❌ MISSING TABLE: The carts table does not exist. Please run the SQL script to create it.');
          alert('❌ Cart table missing! Please contact admin to fix this issue.');
        }
        return;
      }

      if (!cart) {
        console.error('No cart found');
        return;
      }


      // Check if item already exists in cart
      const { data: existingItem, error: existingError } = await supabase
        .from('cart_items')
        .select('id, quantity')
        .eq('cart_id', cart.id)
        .eq('product_id', productId)
        .single();


      if (existingItem) {
        // Update existing item quantity
        const { error: updateError } = await supabase
          .from('cart_items')
          .update({ quantity: existingItem.quantity + quantity })
          .eq('id', existingItem.id);


        if (updateError) {
          console.error('Error updating cart item:', updateError);
          return;
        }
      } else {
        // Add new item to cart
        const { error: insertError } = await supabase
          .from('cart_items')
          .insert({
            cart_id: cart.id,
            product_id: productId,
            quantity: quantity
          });


        if (insertError) {
          console.error('Error adding to cart:', insertError);
          return;
        }
      }

      // Refresh cart items
      await fetchCartItems();
    } catch (error) {
      console.error('Error adding to cart:', error);
    }
  };

  const removeFromCart = async (cartItemId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('cart_items')
        .delete()
        .eq('id', cartItemId);

      if (error) {
        console.error('Error removing from cart:', error);
        return;
      }

      // Refresh cart items
      await fetchCartItems();
    } catch (error) {
      console.error('Error removing from cart:', error);
    }
  };

  const updateQuantity = async (cartItemId: string, quantity: number) => {
    if (!user) return;

    if (quantity <= 0) {
      await removeFromCart(cartItemId);
      return;
    }

    try {
      const { error } = await supabase
        .from('cart_items')
        .update({ quantity })
        .eq('id', cartItemId);

      if (error) {
        console.error('Error updating quantity:', error);
        return;
      }

      // Refresh cart items
      await fetchCartItems();
    } catch (error) {
      console.error('Error updating quantity:', error);
    }
  };

  const clearCart = async () => {
    if (!user) return;

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
