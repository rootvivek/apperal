'use client';

import { motion } from 'framer-motion';
import { Check, MapPin } from 'lucide-react';
import { Form, FormField, FormItem, FormLabel, FormControl } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import AddressList from '../address/AddressList';
import AddressForm from '../address/AddressForm';
import AddressModal from '../address/AddressModal';
import PaymentMethod from '../payment/PaymentMethod';
import OrderSummarySidebar from '../shared/OrderSummarySidebar';

interface CheckoutFormProps {
  checkout: any;
  addressForm: any;
  addresses: any[];
  addressesLoading: boolean;
  showAddressError: boolean;
  isAddressCompleteValue: boolean;
  paymentError: any;
  handleSubmit: (data: any) => Promise<void>;
  handleAddressSave: (data: any) => Promise<void>;
}

export default function CheckoutForm({
  checkout,
  addressForm,
  addresses,
  addressesLoading,
  showAddressError,
  isAddressCompleteValue,
  paymentError,
  handleSubmit,
  handleAddressSave,
}: CheckoutFormProps) {
  return (
    <div className="min-h-screen bg-background pt-2 sm:pt-4 pb-20 sm:pb-12 px-3 sm:px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header Section - Full Width */}
        <div className="mb-3 sm:mb-6">
          <h1 className="text-2xl sm:text-3xl mb-1 sm:mb-2">Checkout</h1>
          <p className="text-sm sm:text-base text-muted-foreground">Complete your order in a few simple steps</p>
        </div>

        <div className="grid lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
          {/* Form Section */}
          <div className="lg:col-span-2 space-y-4 sm:space-y-6">
            <Form {...checkout.form}>
              <form 
                id="checkout-form" 
                onSubmit={checkout.handleSubmit(
                  handleSubmit,
                  (errors: any) => {
                    if (Object.keys(errors).length > 0) {
                      paymentError.showError('Please fill in all required fields correctly');
                    }
                  }
                )} 
                className="space-y-6"
              >
                {/* Shipping Address */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="bg-card rounded-2xl p-3 sm:p-4 lg:p-6 border border-border"
                >
                  <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
                    <h2 className="flex items-center gap-1.5 sm:gap-2 text-base sm:text-lg lg:text-xl">
                      <MapPin className="w-4 h-4 sm:w-5 sm:h-5" />
                      Shipping Address
                    </h2>
                  </div>

                  {/* Address Error Message */}
                  {showAddressError && (
                    <div className="mb-3 sm:mb-4 p-2.5 sm:p-3 bg-red-50 border border-red-200 rounded-md">
                      <p className="text-xs sm:text-sm text-red-600 font-medium">
                        Please complete your delivery address before proceeding to payment.
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
                </motion.div>

                {/* Payment Method */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="bg-card rounded-2xl p-3 sm:p-4 lg:p-6 border border-border"
                >
                  <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
                    <h2 className="text-base sm:text-lg lg:text-xl">Payment Method</h2>
                  </div>

                  <PaymentMethod control={checkout.form.control} />
                </motion.div>
              </form>
            </Form>
          </div>

          {/* Order Summary Sidebar */}
          <div className="lg:col-span-1">
            <OrderSummarySidebar
              items={checkout.items}
              subtotal={checkout.subtotal}
              shipping={checkout.shipping}
              total={checkout.total}
              showTrustBadges={true}
              checkout={checkout}
            />
          </div>
        </div>

        {/* Submit Button - Fixed Bottom (Mobile) */}
        <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 p-3 sm:p-4 bg-background border-t border-border shadow-lg">
          <button
            type="submit"
            form="checkout-form"
            disabled={checkout.isSubmitting}
            className="w-full bg-primary text-primary-foreground py-3 rounded-xl hover:opacity-90 transition-all flex items-center justify-center gap-2 disabled:opacity-50 text-sm sm:text-base"
          >
            <Check className="w-4 h-4 sm:w-5 sm:h-5" />
            <span>
              {checkout.isSubmitting
                ? 'Processing...'
                : checkout.paymentMethod === 'cod'
                ? `Place Order (COD) - ₹${checkout.total.toFixed(2)}`
                : checkout.paymentMethod === 'upi'
                ? `Pay with UPI - ₹${checkout.total.toFixed(2)}`
                : `Complete Order - ₹${checkout.total.toFixed(2)}`}
            </span>
          </button>
        </div>
      </div>

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

