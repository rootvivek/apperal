import { useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { AdminOrder } from './useAdminDashboard';

/**
 * Hook for managing user details modal state and data
 */
export function useUserDetails() {
  const [userOrders, setUserOrders] = useState<AdminOrder[]>([]);
  const [userCartItems, setUserCartItems] = useState<any[]>([]);
  const [userWishlistItems, setUserWishlistItems] = useState<any[]>([]);
  const supabase = createClient();

  const fetchUserDetails = useCallback(async (userId: string) => {
    try {
      // Fetch orders
      const { data: orders } = await supabase
        .from('orders')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      setUserOrders(orders || []);
      
      // Fetch cart items with product details
      const { data: cartData } = await supabase
        .from('cart_items')
        .select(`
          id,
          quantity,
          product:products(id, name, price, image_url)
        `)
        .eq('cart_id', (await supabase
          .from('carts')
          .select('id')
          .eq('user_id', userId)
          .single()).data?.id || '');
      
      setUserCartItems(cartData || []);
      
      // Fetch wishlist items
      const { data: wishlistData } = await supabase
        .from('wishlist')
        .select('id, product_id, products(id, name, price, image_url)')
        .eq('user_id', userId);
      
      // Transform wishlist data to match expected format
      const transformedWishlist = (wishlistData || []).map((item: any) => ({
        id: item.id,
        product: item.products
      }));
      
      setUserWishlistItems(transformedWishlist);
    } catch {
      // Error handled silently
    }
  }, [supabase]);

  const resetDetails = useCallback(() => {
    setUserOrders([]);
    setUserCartItems([]);
    setUserWishlistItems([]);
  }, []);

  return {
    userOrders,
    userCartItems,
    userWishlistItems,
    fetchUserDetails,
    resetDetails,
  };
}

