import { useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';

export interface AdminUser {
  id: string;
  full_name: string;
  phone: string;
  created_at: string;
}

export interface AdminProduct {
  id: string;
  name: string;
  price: number;
  original_price?: number;
  stock_quantity: number;
  rating: number;
  review_count: number;
  created_at: string;
  description?: string;
  category?: string;
  subcategory?: string;
  badge?: string;
  is_active?: boolean;
  show_in_hero?: boolean;
  image_url?: string;
}

export interface AdminOrder {
  id: string;
  order_number: string;
  user_id: string;
  total_amount: number;
  status: string;
  payment_method: string;
  created_at: string;
  notes?: string;
  razorpay_payment_id?: string;
  razorpay_order_id?: string;
  first_item_image?: string;
  item_count?: number;
  shipping_address_id?: string;
  shipping_address?: string;
  shipping_address_line2?: string;
  shipping_city?: string;
  shipping_state?: string;
  shipping_zip_code?: string;
  shipping_country?: string;
}

/**
 * Hook for fetching admin dashboard users
 */
export function useAdminDashboardUsers() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await supabase
        .from('user_profiles')
        .select('id, full_name, phone, created_at')
        .order('created_at', { ascending: false });
      
      setUsers(data || []);
    } catch {
      // Error handled silently - users state remains empty
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  return { users, loading, fetchUsers, setUsers };
}

/**
 * Hook for fetching admin dashboard products
 */
export function useAdminDashboardProducts(userId: string | undefined) {
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      
      if (!userId) {
        setProducts([]);
        return;
      }

      const response = await fetch('/api/admin/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': userId,
        },
        body: JSON.stringify({ userId }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch products');
      }

      setProducts(result.products || []);
    } catch {
      // Error handled silently - products state remains empty
    } finally {
      setLoading(false);
    }
  }, [userId]);

  return { products, loading, fetchProducts, setProducts };
}

/**
 * Hook for fetching admin dashboard orders
 */
export function useAdminDashboardOrders() {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false }) as any;
      
      // Fetch first item image for each order
      const ordersWithImages = await Promise.all(
        (data || []).map(async (order: AdminOrder) => {
          let firstItemImage = null;
          let itemCount = 0;
          
          try {
            const { data: itemsData } = await supabase
              .from('order_items')
              .select(`
                products:product_id (
                  image_url
                )
              `)
              .eq('order_id', order.id)
              .limit(1);
            
            if (itemsData && itemsData.length > 0) {
              const products = itemsData[0]?.products;
              const product = Array.isArray(products) ? products[0] : products;
              firstItemImage = (product as any)?.image_url || null;
            }
          } catch {
            // Silently handle error - firstItemImage remains null
          }
          
          try {
            const { count } = await supabase
              .from('order_items')
              .select('*', { count: 'exact', head: true })
              .eq('order_id', order.id);
            
            if (count !== null) {
              itemCount = count;
            }
          } catch {
            // Silently handle error - itemCount remains 0
          }
          
          return {
            ...order,
            first_item_image: firstItemImage,
            item_count: itemCount
          };
        })
      );
      
      setOrders(ordersWithImages);
    } catch {
      // Error handled silently - orders state remains empty
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  return { orders, loading, fetchOrders, setOrders };
}

