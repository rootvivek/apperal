'use client';

import { useCallback, useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useAddresses } from '@/hooks/useAddresses';
import { useCheckout } from '@/hooks/checkout/useCheckout';
import { useAddressForm } from '@/hooks/checkout/useAddressForm';
import { useAddressValidation } from '@/hooks/checkout/useAddressValidation';
import { useAddressSave } from '@/hooks/checkout/useAddressSave';
import { usePaymentError } from '@/hooks/checkout/usePaymentError';
import { isAddressComplete } from './validateCheckout';
import { CheckoutFormData } from '@/lib/schemas/checkout';
// Razorpay handler is dynamically imported when payment button is clicked
import LoadingOverlay from '@/components/ui/loading-overlay';
import { OrderSummary } from '@/components/checkout/OrderSummary';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { mobileTypography } from '@/utils/mobileTypography';
import AddressList from '../address/AddressList';
import AddressForm from '../address/AddressForm';
import AddressModal from '../address/AddressModal';
import PaymentMethod from '../payment/PaymentMethod';
import MobileStickyButton from '../footer/MobileStickyButton';

export default function CheckoutPage() {
  const { user } = useAuth();
  const { addresses, loading: addressesLoading, saveAddress, updateAddress } = useAddresses();

  // Payment error handling
  const paymentError = usePaymentError();

  const checkout = useCheckout({
    onPaymentError: paymentError.showError,
    onShowPaymentFailedModal: (show) => {
      if (show) paymentError.showError('');
    },
  });
  
  // Address validation state (needs to be initialized first)
  const [showAddressError, setShowAddressError] = useState(false);

  const addressForm = useAddressForm({
    userId: user?.id,
    addresses,
    onAddressSelect: () => {
      // Clear address error when address is selected
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
    if (addressValidation.showAddressError !== showAddressError) {
      setShowAddressError(addressValidation.showAddressError);
    }
  }, [addressValidation.showAddressError, showAddressError]);

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

  const handleSubmit = useCallback(async (data: CheckoutFormData) => {
    // Check if address is complete before proceeding
    if (!addressValidation.checkAddressComplete(data)) {
      return;
    }
    
    try {
      const result = await checkout.onSubmit(data, addressForm.selectedAddressId, (orderId, orderNumber) => {
        // Success callback for COD
      });

      // If result exists, it means we need to handle Razorpay payment
      if (result && data.paymentMethod !== 'cod') {
        // Dynamically import Razorpay handler only when payment button is clicked
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
          onSuccess: () => {
            // Handled in handleRazorpayPayment
          },
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
  }, [checkout, addressForm, addressValidation, paymentError.showError, user?.id]);

  if (checkout.isLoading) {
    const loadingText = checkout.mounted && checkout.isDirectPurchase ? 'Loading product details...' : 'Loading checkout...';
    return <LoadingOverlay message={loadingText} />;
  }

  if (checkout.items.length === 0 && !checkout.isDirectPurchase) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Your cart is empty</h1>
          <p className="text-gray-600 mb-6">Add some items to your cart before checkout</p>
          <Link href="/">
            <Button>Continue Shopping</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (checkout.isDirectPurchase && checkout.items.length === 0 && !checkout.loadingDirectProduct) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Product not found</h1>
          <p className="text-gray-600 mb-6">The product you're trying to purchase is no longer available.</p>
          <Link href="/">
            <Button>Continue Shopping</Button>
          </Link>
        </div>
      </div>
    );
  }

  const isAddressCompleteValue = isAddressComplete(checkout.form.getValues());

  return (
    <div className="min-h-screen bg-gray-50 pb-20 sm:pb-0">
      <div className="max-w-[1450px] mx-auto w-full p-2.5">
        <Form {...checkout.form}>
          <form 
            id="checkout-form" 
            onSubmit={checkout.handleSubmit(
              handleSubmit,
              (errors) => {
                if (Object.keys(errors).length > 0) {
                  paymentError.showError('Please fill in all required fields correctly');
                }
              }
            )} 
            className="space-y-2"
          >
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
              {/* Left Column: Address */}
              <div className="lg:col-span-1 order-1 lg:order-1" data-address-section>
                <div className="bg-white rounded-[4px] shadow-sm p-2.5">
                  <div className="flex items-center justify-between mb-3">
                    <h2 className={`${mobileTypography.title14Bold} sm:text-lg`}>Delivery Address</h2>
                    {addresses.length >= 3 && (
                      <span className={`${mobileTypography.body12} sm:text-sm text-muted-foreground`}>Maximum 3 addresses allowed</span>
                    )}
                  </div>
                  
                  {/* Address Error Message */}
                  {showAddressError && (
                    <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-md">
                      <p className="text-sm text-red-600 font-medium">
                        Please complete your delivery address before proceeding to payment.
                      </p>
                      <p className="text-xs text-red-500 mt-1">
                        Fill in all required fields marked with *
                      </p>
                    </div>
                  )}
                    <div>
                      {addresses.length > 0 ? (
                        <AddressList
                          addresses={addresses}
                          selectedAddressId={addressForm.selectedAddressId}
                          onSelect={addressForm.selectAddress}
                          onEdit={addressForm.openEditModal}
                          onAddNew={addressForm.openAddModal}
                          watch={checkout.watch}
                        />
                      ) : !addressesLoading && !isAddressCompleteValue ? (
                        <Button
                          type="button"
                          variant="outline"
                          className="w-full border-dashed"
                          onClick={addressForm.openAddModal}
                        >
                          Add New Address
                        </Button>
                      ) : addressesLoading ? (
                        <div className="text-center py-4">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-2"></div>
                          <p className="text-sm text-muted-foreground">Loading addresses...</p>
                        </div>
                      ) : null}

                      {/* Address Form Fields (hidden when address selected) */}
                      {!addressesLoading && !addressForm.selectedAddressId && addresses.length === 0 && (
                        <div className="mt-3">
                          <AddressForm control={checkout.form.control} />
                        </div>
                      )}
                    </div>
                </div>
              </div>

              {/* Right Column: Order Summary + Payment Method + Submit */}
              <div className="order-2 lg:order-2 space-y-2">
                  <OrderSummary
                    items={checkout.items}
                    subtotal={checkout.subtotal}
                    shipping={checkout.shipping}
                    total={checkout.total}
                    productSubcategories={checkout.productSubcategories}
                    loading={checkout.loadingDirectProduct}
                    isDirectPurchase={checkout.isDirectPurchase}
                  />
                  
                  <div className="bg-white rounded-[4px] shadow-sm p-2.5">
                    <h2 className="text-sm sm:text-lg font-semibold mb-3">Payment Method</h2>
                    <PaymentMethod control={checkout.form.control} />
                  </div>

                  <div className="hidden sm:block bg-white rounded-[4px] shadow-sm p-2.5">
                    <Button type="submit" disabled={checkout.isSubmitting} className="w-full" size="lg">
                      {checkout.isSubmitting
                        ? 'Processing...'
                        : checkout.paymentMethod === 'cod'
                        ? 'Place Order (Cash on Delivery)'
                        : checkout.paymentMethod === 'upi'
                        ? 'Pay with UPI'
                        : 'Proceed to Payment'}
                    </Button>
                  </div>
                </div>
              </div>
            </form>
          </Form>
      </div>

      <MobileStickyButton
        isSubmitting={checkout.isSubmitting}
        paymentMethod={checkout.paymentMethod}
        formId="checkout-form"
      />

      <AddressModal
        isOpen={addressForm.showAddressModal}
        onClose={addressForm.closeModal}
        addresses={addresses}
        selectedAddressId={addressForm.selectedAddressId}
        editingAddressId={addressForm.editingAddressId}
        form={addressForm.form}
        onSelect={addressForm.selectAddress}
        onEdit={addressForm.openEditModal}
        onSave={handleAddressSave}
        watch={checkout.watch}
      />

      <Dialog open={paymentError.showPaymentFailedModal} onOpenChange={paymentError.hideError}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Payment Failed</DialogTitle>
            <DialogDescription>
              {paymentError.paymentError || 'Your payment could not be processed. Please try again.'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={paymentError.hideError}>
              Close
            </Button>
            <Button onClick={paymentError.scrollToPayment}>
              Try Again
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

