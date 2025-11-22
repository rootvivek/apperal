import { CheckoutFormData } from '@/lib/schemas/checkout';

/**
 * Validates if address form is complete
 */
export function isAddressComplete(data: CheckoutFormData): boolean {
  return !!(
    data.fullName?.trim() &&
    data.address?.trim() &&
    data.city?.trim() &&
    data.state?.trim() &&
    data.zipCode?.trim().length === 6
  );
}

/**
 * Validates payment method selection
 */
export function isValidPaymentMethod(paymentMethod: string | undefined): boolean {
  return paymentMethod === 'cod' || paymentMethod === 'upi';
}

