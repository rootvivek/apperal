import { useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { AdminUser } from './useAdminUsers';

interface Order {
  id: string;
  order_number: string;
  total_amount: number;
  status: string;
  created_at: string;
}

interface UserCartItem {
  id: string;
  quantity: number;
  product: {
    id: string;
    name: string;
    price: number;
    image_url?: string;
  };
}

interface UserWishlistItem {
  id: string;
  product: {
    id: string;
    name: string;
    price: number;
    image_url?: string;
  } | null;
}

/**
 * Hook for fetching and managing user details in the admin users page
 */
export function useAdminUserDetails() {
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [showUserDetails, setShowUserDetails] = useState(false);
  const [userOrders, setUserOrders] = useState<Order[]>([]);
  const [userCartItems, setUserCartItems] = useState<UserCartItem[]>([]);
  const [userWishlistItems, setUserWishlistItems] = useState<UserWishlistItem[]>([]);
  const [userDetailsTab, setUserDetailsTab] = useState<'orders' | 'cart' | 'wishlist'>('orders');
  const supabase = createClient();

  const fetchUserDetails = useCallback(async (user: AdminUser) => {
    setSelectedUser(user);
    setUserDetailsTab('orders');
    
    try {
      // Fetch orders
      const { data: orders } = await supabase
        .from('orders')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      setUserOrders(orders || []);
      
      // Fetch cart items
      const cartResponse = await supabase
        .from('carts')
        .select('id')
        .eq('user_id', user.id)
        .single();
      
      if (cartResponse.data) {
        const { data: cartData } = await supabase
          .from('cart_items')
          .select('id, quantity, product:products(id, name, price, image_url)')
          .eq('cart_id', cartResponse.data.id);
        
        // Transform cart data: Supabase returns product as an array, but we need a single object
        const transformedCartData: UserCartItem[] = (cartData || []).map((item: any) => ({
          id: item.id,
          quantity: item.quantity,
          product: Array.isArray(item.product) && item.product.length > 0 
            ? item.product[0] 
            : item.product || { id: '', name: '', price: 0 }
        }));
        
        setUserCartItems(transformedCartData);
      } else {
        setUserCartItems([]);
      }
      
      // Fetch wishlist items
      const { data: wishlistRows } = await supabase
        .from('wishlist')
        .select('id, product_id')
        .eq('user_id', user.id);
      
      if (wishlistRows && wishlistRows.length > 0) {
        const productIds = wishlistRows.map((row: any) => row.product_id).filter(Boolean);
        
        // Fetch the actual products
        const { data: productsData } = await supabase
          .from('products')
          .select('id, name, price, image_url')
          .in('id', productIds);
        
        // Combine wishlist items with product data
        const transformedWishlist = wishlistRows.map((wishItem: any) => {
          const product = (productsData || []).find((p: { id: string }) => p.id === wishItem.product_id);
          return {
            id: wishItem.id,
            product: product || null
          };
        }).filter((item: any) => item.product !== null);
        
        setUserWishlistItems(transformedWishlist);
      } else {
        setUserWishlistItems([]);
      }
    } catch (error) {
      // Error handled silently
      setUserOrders([]);
      setUserCartItems([]);
      setUserWishlistItems([]);
    }
    
    setShowUserDetails(true);
  }, [supabase]);

  const closeUserDetails = useCallback(() => {
    setShowUserDetails(false);
    setSelectedUser(null);
  }, []);

  return {
    selectedUser,
    showUserDetails,
    userOrders,
    userCartItems,
    userWishlistItems,
    userDetailsTab,
    setUserDetailsTab,
    fetchUserDetails,
    closeUserDetails,
  };
}

