/**
 * Guest cart utilities for localStorage operations
 */

import type { CartItem } from '@/contexts/CartContext';
import { CART } from '@/constants';

/**
 * Loads guest cart from localStorage
 */
export function loadGuestCart(): CartItem[] {
  try {
    const guestCart = localStorage.getItem(CART.GUEST_CART_KEY);
    if (guestCart) {
      return JSON.parse(guestCart);
    }
  } catch {
    // Failed to load guest cart
  }
  return [];
}

/**
 * Saves guest cart to localStorage
 */
export function saveGuestCart(cart: CartItem[]): void {
  try {
    localStorage.setItem(CART.GUEST_CART_KEY, JSON.stringify(cart));
  } catch {
    // Failed to save guest cart
  }
}

/**
 * Clears guest cart from localStorage
 */
export function clearGuestCart(): void {
  try {
    localStorage.removeItem(CART.GUEST_CART_KEY);
  } catch {
    // Failed to clear guest cart
  }
}

