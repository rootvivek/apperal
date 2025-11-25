/**
 * Utilities for managing product selections (size, color) in localStorage
 */

const SELECTED_SIZE_KEY = (slug: string) => `selectedSize_${slug}`;
const SELECTED_COLOR_KEY = (slug: string) => `selectedColor_${slug}`;

/**
 * Saves selected size for a product
 */
export function saveSelectedSize(slug: string, size: string): void {
  if (typeof window === 'undefined') return;
  try {
    if (size) {
      localStorage.setItem(SELECTED_SIZE_KEY(slug), size);
    } else {
      localStorage.removeItem(SELECTED_SIZE_KEY(slug));
    }
  } catch {
    // Error handled silently
  }
}

/**
 * Gets saved selected size for a product
 */
export function getSelectedSize(slug: string): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(SELECTED_SIZE_KEY(slug));
  } catch {
    return null;
  }
}

/**
 * Saves selected color for a product
 */
export function saveSelectedColor(slug: string, color: string): void {
  if (typeof window === 'undefined') return;
  try {
    if (color) {
      localStorage.setItem(SELECTED_COLOR_KEY(slug), color);
    } else {
      localStorage.removeItem(SELECTED_COLOR_KEY(slug));
    }
  } catch {
    // Error handled silently
  }
}

/**
 * Gets saved selected color for a product
 */
export function getSelectedColor(slug: string): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(SELECTED_COLOR_KEY(slug));
  } catch {
    return null;
  }
}

/**
 * Clears saved selections for a product
 */
export function clearProductSelections(slug: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(SELECTED_SIZE_KEY(slug));
    localStorage.removeItem(SELECTED_COLOR_KEY(slug));
  } catch {
    // Error handled silently
  }
}

