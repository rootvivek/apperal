'use client';

import { useCallback, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useAddresses } from '@/hooks/useAddresses';
import { useCheckout } from '@/hooks/checkout/useCheckout';
import { useAddressForm } from '@/hooks/checkout/useAddressForm';
import { useAddressValidation } from '@/hooks/checkout/useAddressValidation';
import { useAddressSave } from '@/hooks/checkout/useAddressSave';
import { usePaymentError } from '@/hooks/checkout/usePaymentError';
import { isAddressComplete } from './validateCheckout';
import { CheckoutFormData } from '@/lib/schemas/checkout';
import LoadingOverlay from '@/components/ui/loading-overlay';
import CheckoutForm from './CheckoutForm';
import { prepareOrderConfirmationData, storeOrderConfirmation } from '../shared/utils';

export default function CheckoutPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { addresses, loading: addressesLoading, saveAddress, updateAddress } = useAddresses();

  // Payment error handling
  const paymentError = usePaymentError();

  // Check if user is authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/');
    }
  }, [user, authLoading, router]);

  const checkout = useCheckout({
    onPaymentError: paymentError.showError,
    onShowPaymentFailedModal: (show) => {
      if (show) paymentError.showError('');
    },
  });
  
  // Address validation state
  const [showAddressError, setShowAddressError] = useState(false);

  const addressForm = useAddressForm({
    userId: user?.id,
    addresses,
    onAddressSelect: () => {
      setShowAddressError(false);
    },
    checkoutForm: checkout.form,
  });

  // Address validation
  const addressValidation = useAddressValidation({
    watch: checkout.watch,
    form: checkout.form,
    selectedAddressId: addressForm.selectedAddressId,
    addresses,
    onOpenAddModal: addressForm.openAddModal,
  });

  // Sync validation state
  useEffect(() => {
    setShowAddressError(addressValidation.showAddressError);
  }, [addressValidation.showAddressError]);

  // Address save handler
  const { handleAddressSave } = useAddressSave({
    userId: user?.id,
    addresses,
    editingAddressId: addressForm.editingAddressId,
    saveAddress,
    updateAddress,
    onSaveSuccess: addressForm.setSelectedAddressId,
    onCloseModal: addressForm.closeModal,
  });

  const handleOrderSuccess = useCallback((orderId: string, orderNumber: string, formData: CheckoutFormData) => {
    const orderData = prepareOrderConfirmationData(
      orderNumber,
      orderId,
      formData,
      checkout.items,
      checkout.subtotal,
      checkout.total
    );
    storeOrderConfirmation(orderData);
    router.push(`/checkout/success?orderId=${orderId}`);
  }, [checkout.items, checkout.subtotal, checkout.total, router]);

  const handleSubmit = useCallback(async (data: CheckoutFormData) => {
    // Check session before placing order
    if (!user) {
      router.push('/');
      return;
    }

    if (!addressValidation.checkAddressComplete(data)) {
      return;
    }
    
    try {
      const result = await checkout.onSubmit(data, addressForm.selectedAddressId, (orderId, orderNum) => {
        handleOrderSuccess(orderId, orderNum, data);
      });

      // Handle Razorpay payment for UPI
      if (result && data.paymentMethod !== 'cod') {
        const { handleRazorpayPayment: handlePayment } = await import('./payment/handleRazorpay');
        await handlePayment({
          orderNumber: result.orderNumber,
          orderItemsData: result.orderItemsData,
          formData: result.formData,
          shippingAddressId: result.shippingAddressId,
          total: checkout.total,
          subtotal: checkout.subtotal,
          shipping: checkout.shipping,
          userId: user!.id,
          isDirectPurchase: checkout.isDirectPurchase,
          onError: paymentError.showError,
          onSuccess: (orderId: string) => handleOrderSuccess(orderId, result.orderNumber, data),
          clearCart: async () => {
            // Handled by checkout hook
          },
        });
      }
    } catch (error: any) {
      if (error.message === 'ADDRESS_INCOMPLETE') {
        addressValidation.validateAndHighlightAddress();
        addressForm.openAddModal();
      }
    }
  }, [checkout, addressForm, addressValidation, paymentError.showError, user, router, handleOrderSuccess]);

  // Show loading while checking authentication
  if (authLoading || checkout.isLoading) {
    const loadingText = checkout.mounted && checkout.isDirectPurchase ? 'Loading product details...' : 'Loading checkout...';
    return <LoadingOverlay message={loadingText} />;
  }

  // Redirect if not authenticated
  if (!user) {
    return null;
  }

  if (checkout.items.length === 0 && !checkout.isDirectPurchase) {
    return (
      <div className="min-h-screen bg-background pt-24 pb-12 px-4 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Your cart is empty</h1>
          <p className="text-muted-foreground mb-6">Add some items to your cart before checkout</p>
        </div>
      </div>
    );
  }

  if (checkout.isDirectPurchase && checkout.items.length === 0 && !checkout.loadingDirectProduct) {
    return (
      <div className="min-h-screen bg-background pt-24 pb-12 px-4 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Product not found</h1>
          <p className="text-muted-foreground mb-6">The product you're trying to purchase is no longer available.</p>
        </div>
      </div>
    );
  }

  const isAddressCompleteValue = isAddressComplete(checkout.form.getValues());

  return (
    <CheckoutForm
      checkout={checkout}
      addressForm={addressForm}
      addresses={addresses}
      addressesLoading={addressesLoading}
      showAddressError={showAddressError}
      isAddressCompleteValue={isAddressCompleteValue}
      paymentError={paymentError}
      handleSubmit={handleSubmit}
      handleAddressSave={handleAddressSave}
    />
  );
}

