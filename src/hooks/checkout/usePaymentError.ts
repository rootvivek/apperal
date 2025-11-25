import { useState, useCallback } from 'react';

/**
 * Hook for managing payment error state and modal
 */
export function usePaymentError() {
  const [showPaymentFailedModal, setShowPaymentFailedModal] = useState(false);
  const [paymentError, setPaymentError] = useState('');

  const showError = useCallback((error: string) => {
    setPaymentError(error);
    setShowPaymentFailedModal(true);
  }, []);

  const hideError = useCallback(() => {
    setShowPaymentFailedModal(false);
    setPaymentError('');
  }, []);

  const scrollToPayment = useCallback(() => {
    hideError();
    setTimeout(() => {
      const paymentSection = document.querySelector('[name="paymentMethod"]');
      if (paymentSection) {
        paymentSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);
  }, [hideError]);

  return {
    showPaymentFailedModal,
    paymentError,
    showError,
    hideError,
    scrollToPayment,
  };
}

