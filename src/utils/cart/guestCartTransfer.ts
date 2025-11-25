/**
 * Guest cart transfer utilities
 * Handles transferring guest cart items to user cart after login
 */

import { createClient } from '@/lib/supabase/client';
import { DB_ERROR_CODES, CART } from '@/constants';
import type { CartItem } from '@/contexts/CartContext';
import { getOrCreateCart } from './cartOperations';
import { clearGuestCart } from './guestCart';

/**
 * Transfers guest cart items to user cart after login
 */
export async function transferGuestCartToUser(
  userId: string,
  guestCart: CartItem[]
): Promise<number> {
  if (guestCart.length === 0) {
    return 0;
  }

  const supabase = createClient();
  const cart = await getOrCreateCart(userId);

  if (!cart) {
    return 0;
  }

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

      if (checkError && checkError.code !== DB_ERROR_CODES.NOT_FOUND) {
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
    clearGuestCart();
  }

  return transferredCount;
}

