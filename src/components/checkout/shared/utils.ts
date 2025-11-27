/**
 * Shared utility functions for checkout flow
 */

export interface OrderConfirmationData {
  orderNumber: string;
  orderId: string;
  formData: any;
  orderedItems: any[];
  subtotal: number;
  total: number;
}

/**
 * Prepares order confirmation data for sessionStorage
 */
export function prepareOrderConfirmationData(
  orderNumber: string,
  orderId: string,
  formData: any,
  items: any[],
  subtotal: number,
  total: number
): OrderConfirmationData {
  return {
    orderNumber,
    orderId,
    formData,
    orderedItems: items.map(item => ({
      id: item.id,
      product: item.product,
      quantity: item.quantity,
    })),
    subtotal,
    total,
  };
}

/**
 * Stores order confirmation data in sessionStorage
 */
export function storeOrderConfirmation(data: OrderConfirmationData): void {
  sessionStorage.setItem('orderConfirmation', JSON.stringify(data));
}

/**
 * Calculates order totals
 */
export function calculateOrderTotals(items: any[]) {
  const subtotal = items.reduce((total, item) => total + (item.product.price * item.quantity), 0);
  const shipping = 0; // Free shipping
  const tax = subtotal * 0.1;
  const total = subtotal + shipping + tax;
  
  return { subtotal, shipping, tax, total };
}

/**
 * Gets total item count from items array
 */
export function getItemCount(items: any[]): number {
  return items.reduce((acc, item) => acc + item.quantity, 0);
}

