'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useAddresses } from '@/hooks/useAddresses';
import { useCheckout } from './useCheckout';
import { useAddressForm } from '../address/useAddressForm';
import { isAddressComplete } from './validateCheckout';
import { getStateName } from '@/lib/constants/states';
import { CheckoutFormData } from '@/lib/schemas/checkout';
// Razorpay handler is dynamically imported when payment button is clicked
import { Spinner } from '@/components/ui/spinner';
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
  
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [showPaymentFailedModal, setShowPaymentFailedModal] = useState(false);
  const [paymentError, setPaymentError] = useState('');

  const checkout = useCheckout({
    onPaymentError: setPaymentError,
    onShowPaymentFailedModal: setShowPaymentFailedModal,
  });

  const addressForm = useAddressForm({
    userId: user?.id,
    addresses,
    onAddressSelect: () => {
      // Address selection handled internally
    },
    checkoutForm: checkout.form,
  });

  const handleAddressSave = useCallback(async (data: CheckoutFormData) => {
    if (!user?.id) return;

    const stateName = getStateName(data.state) || data.state;

    if (addressForm.editingAddressId) {
      const result = await updateAddress(addressForm.editingAddressId, {
        address_line1: data.address.trim(),
        full_name: data.fullName.trim() || undefined,
        city: data.city.trim(),
        state: stateName,
        zip_code: data.zipCode.trim(),
        phone: data.phone ? parseInt(data.phone, 10) : undefined,
      });

      if (result) {
        addressForm.closeModal();
        addressForm.setSelectedAddressId(addressForm.editingAddressId);
      }
    } else {
      if (addresses.length >= 3) {
        alert('You have reached the maximum limit of 3 addresses.');
        return;
      }

      const result = await saveAddress({
        address_line1: data.address.trim(),
        full_name: data.fullName.trim() || undefined,
        city: data.city.trim(),
        state: stateName,
        zip_code: data.zipCode.trim(),
        phone: data.phone ? parseInt(data.phone, 10) : undefined,
        is_default: true,
      });

      if (result) {
        addressForm.closeModal();
        addressForm.setSelectedAddressId(result.id);
      }
    }
  }, [user?.id, addresses.length, addressForm, saveAddress, updateAddress]);

  const handleSubmit = useCallback(async (data: CheckoutFormData) => {
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
          onError: (error) => {
            setPaymentError(error);
            setShowPaymentFailedModal(true);
          },
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
        setShowAddressModal(true);
      }
    }
  }, [checkout, addressForm.selectedAddressId, user?.id]);

  if (checkout.isLoading) {
    const loadingText = checkout.mounted && checkout.isDirectPurchase ? 'Loading product details...' : 'Loading checkout...';
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-sm">
        <div className="text-center">
          <Spinner className="size-12 text-blue-600 mx-auto" />
          <p className="mt-4 text-gray-600">{loadingText}</p>
        </div>
      </div>
    );
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
    <div className="min-h-screen bg-white pb-20 sm:pb-0">
      <div className="max-w-[1450px] mx-auto w-full">
        <div className="bg-white">
          <Form {...checkout.form}>
            <form 
              id="checkout-form" 
              onSubmit={checkout.handleSubmit(
                handleSubmit,
                (errors) => {
                  if (Object.keys(errors).length > 0) {
                    setPaymentError('Please fill in all required fields correctly');
                    setShowPaymentFailedModal(true);
                  }
                }
              )} 
              className="space-y-0"
            >
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-0">
                {/* Left Column: Address */}
                <div className="lg:col-span-1 order-1 lg:order-1">
                  <div className="px-3 sm:px-4 py-3 sm:py-4">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className={`${mobileTypography.title14Bold} sm:text-lg`}>Shipping Address</h2>
                      {addresses.length >= 3 && (
                        <span className={`${mobileTypography.body12} sm:text-sm text-muted-foreground`}>Maximum 3 addresses allowed</span>
                      )}
                    </div>
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
                        <AddressForm control={checkout.form.control} />
                      )}
                    </div>
                  </div>
                </div>

                {/* Right Column: Order Summary + Payment Method + Submit */}
                <div className="order-2 lg:order-2">
                  <OrderSummary
                    items={checkout.items}
                    subtotal={checkout.subtotal}
                    shipping={checkout.shipping}
                    total={checkout.total}
                    productSubcategories={checkout.productSubcategories}
                    loading={checkout.loadingDirectProduct}
                    isDirectPurchase={checkout.isDirectPurchase}
                  />
                  
                  <div className="px-3 sm:px-4">
                    <div className="border-t border-gray-200"></div>
                  </div>

                  <div className="px-3 sm:px-4 py-3 sm:py-4">
                    <h2 className="text-sm sm:text-lg font-semibold mb-4">Payment Method</h2>
                    <PaymentMethod control={checkout.form.control} />
                  </div>

                  <div className="hidden sm:block px-3 sm:px-4 pb-3 sm:pb-4">
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

      <Dialog open={showPaymentFailedModal} onOpenChange={setShowPaymentFailedModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Payment Failed</DialogTitle>
            <DialogDescription>
              {paymentError || 'Your payment could not be processed. Please try again.'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPaymentFailedModal(false)}>
              Close
            </Button>
            <Button onClick={() => {
              setShowPaymentFailedModal(false);
              const paymentSection = document.querySelector('[name="paymentMethod"]');
              if (paymentSection) {
                paymentSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }
            }}>
              Try Again
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

