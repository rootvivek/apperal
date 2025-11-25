/**
 * Cart database operations utilities
 */

import { createClient } from '@/lib/supabase/client';
import { DB_ERROR_CODES, CART } from '@/constants';
import type { CartItem } from '@/contexts/CartContext';

/**
 * Gets or creates a cart for a user
 */
export async function getOrCreateCart(userId: string): Promise<{ id: string } | null> {
  const supabase = createClient();

  // Try to get existing cart
  let { data: cart, error: cartError } = await supabase
    .from('carts')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle();

  if (cartError && cartError.code !== DB_ERROR_CODES.NOT_FOUND) {
    return null;
  }

  if (cart) {
    return cart;
  }

  // Create cart if it doesn't exist
  const { data: newCart, error: createError } = await supabase
    .from('carts')
    .insert({ user_id: userId })
    .select('id')
    .single();

  if (createError) {
    // If foreign key error, wait a bit and retry once
    if (createError.code === DB_ERROR_CODES.FOREIGN_KEY_VIOLATION) {
      await new Promise(resolve => setTimeout(resolve, CART.CART_RETRY_WAIT));
      const retryResult = await supabase
        .from('carts')
        .insert({ user_id: userId })
        .select('id')
        .single();
      
      if (!retryResult.error && retryResult.data) {
        return retryResult.data;
      }
    }
    return null;
  }

  return newCart;
}

/**
 * Transforms cart item data from Supabase to CartItem format
 */
export function transformCartItem(item: any): CartItem {
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
      subcategory: (() => {
        const subcats = item.products.subcategories;
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
}

