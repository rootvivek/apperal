import { useState, useEffect, useCallback } from 'react';
import { UseFormWatch } from 'react-hook-form';
import { isAddressComplete } from '@/components/checkout/CheckoutPage/validateCheckout';
import { CheckoutFormData } from '@/lib/schemas/checkout';

interface UseAddressValidationProps {
  watch: UseFormWatch<CheckoutFormData>;
  form: any;
  selectedAddressId: string | null;
  addresses: any[];
  onOpenAddModal: () => void;
}

/**
 * Hook for managing address validation and error state in checkout
 */
export function useAddressValidation({
  watch,
  form,
  selectedAddressId,
  addresses,
  onOpenAddModal,
}: UseAddressValidationProps) {
  const [showAddressError, setShowAddressError] = useState(false);

  // Clear address error when form values change
  useEffect(() => {
    const subscription = watch((value) => {
      if (showAddressError && isAddressComplete(value as CheckoutFormData)) {
        setShowAddressError(false);
      }
    });
    return () => subscription.unsubscribe();
  }, [watch, showAddressError]);

  const validateAndHighlightAddress = useCallback(() => {
    setShowAddressError(true);
    
    // Trigger validation on all address fields to highlight errors
    const addressFields = ['fullName', 'address', 'city', 'state', 'zipCode', 'phone'] as const;
    addressFields.forEach((field) => {
      form.trigger(field);
    });
    
    // Scroll to address section
    setTimeout(() => {
      const addressSection = document.querySelector('[data-address-section]');
      if (addressSection) {
        addressSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
    
    // Open address form if not already visible
    if (addresses.length === 0) {
      onOpenAddModal();
    }
  }, [form, addresses.length, onOpenAddModal]);

  const checkAddressComplete = useCallback((data: CheckoutFormData): boolean => {
    const hasSelectedAddress = selectedAddressId !== null;
    const isAddressFormComplete = isAddressComplete(data);
    
    if (!hasSelectedAddress && !isAddressFormComplete) {
      validateAndHighlightAddress();
      return false;
    }
    
    setShowAddressError(false);
    return true;
  }, [selectedAddressId, validateAndHighlightAddress]);

  return {
    showAddressError,
    setShowAddressError,
    validateAndHighlightAddress,
    checkAddressComplete,
  };
}

