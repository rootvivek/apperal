import { useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { AdminOrder } from './useAdminDashboard';

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  product_name: string;
  product_image?: string;
  product_price: number;
  quantity: number;
  total_price: number;
  size?: string | null;
}

interface OrderDetailsState {
  orderItems: OrderItem[];
  userName: string;
  userPhone: string;
  userAddress: any;
}

/**
 * Hook for managing order details modal state and data
 */
export function useOrderDetails() {
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [userName, setUserName] = useState<string>('');
  const [userPhone, setUserPhone] = useState<string>('');
  const [userAddress, setUserAddress] = useState<any>(null);
  const supabase = createClient();

  const fetchOrderDetails = useCallback(async (order: AdminOrder) => {
    try {
      // Fetch order items with product data (JOIN)
      const { data: itemsData } = await supabase
        .from('order_items')
        .select(`
          *,
          products:product_id (
            name,
            image_url
          )
        `)
        .eq('order_id', order.id) as any;
      
      const itemsWithImages = (itemsData || []).map((item: any) => {
        const products = item.products;
        const product = Array.isArray(products) ? products[0] : products || {};
        return {
          ...item,
          product_name: product.name || 'Product not found',
          product_image: product.image_url || null
        };
      });
      
      setOrderItems(itemsWithImages);
      
      // Fetch user information if user_id exists
      if (order.user_id) {
        // Priority 1: Check if order has shipping_address_id (new normalized approach)
        if (order.shipping_address_id) {
          const { data: addressData } = await supabase
            .from('addresses')
            .select('*')
            .eq('id', order.shipping_address_id)
            .single() as any;
        
          setUserAddress(addressData || null);
          setUserName(addressData?.full_name || 'N/A');
          setUserPhone(addressData?.phone ? String(addressData.phone) : 'N/A');
        } 
        // Priority 2: Check if address is stored directly in the order (old orders - backward compatibility)
        else if (order.shipping_address) {
          setUserAddress({
            address_line1: order.shipping_address || '',
            address_line2: order.shipping_address_line2 || null,
            city: order.shipping_city || '',
            state: order.shipping_state || '',
            zip_code: order.shipping_zip_code || '',
            country: order.shipping_country || 'India'
          });
          setUserName('N/A');
          setUserPhone('N/A');
        } 
        // Priority 3: Try to fetch default shipping address for user
        else {
          const { data: addressData } = await supabase
            .from('addresses')
            .select('*')
            .eq('user_id', order.user_id)
            .eq('address_type', 'shipping')
            .order('is_default', { ascending: false })
            .limit(1)
            .maybeSingle() as any;
          
          setUserAddress(addressData || null);
          setUserName(addressData?.full_name || 'N/A');
          setUserPhone(addressData?.phone ? String(addressData.phone) : 'N/A');
        }
      } else {
        // Guest order - no user_id means no address available
        setUserName('Guest User');
        setUserPhone('N/A');
        
        // Use shipping address from order if available
        if (order.shipping_address) {
          setUserAddress({
            address_line1: order.shipping_address || '',
            address_line2: order.shipping_address_line2 || null,
            city: order.shipping_city || '',
            state: order.shipping_state || '',
            zip_code: order.shipping_zip_code || '',
            country: order.shipping_country || 'India'
          });
        } else {
          setUserAddress(null);
        }
      }
    } catch {
      // Error handled silently
    }
  }, [supabase]);

  const resetDetails = useCallback(() => {
    setOrderItems([]);
    setUserName('');
    setUserPhone('');
    setUserAddress(null);
  }, []);

  return {
    orderItems,
    userName,
    userPhone,
    userAddress,
    fetchOrderDetails,
    resetDetails,
  };
}

