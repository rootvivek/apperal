/**
 * Formats a price number to a string with 2 decimal places
 */
export function formatPrice(price: number): string {
  return (typeof price === 'number' && !isNaN(price) && price >= 0 ? price.toFixed(2) : '0.00');
}

