'use client';

import { Button } from '@/components/ui/button';

interface MobileStickyButtonProps {
  isSubmitting: boolean;
  paymentMethod: string;
  formId: string;
}

export default function MobileStickyButton({
  isSubmitting,
  paymentMethod,
  formId,
}: MobileStickyButtonProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 w-full bg-white border-t shadow-lg z-50 px-3 py-4 sm:hidden">
      <Button
        type="submit"
        form={formId}
        disabled={isSubmitting}
        className="w-full"
        size="lg"
      >
        {isSubmitting
          ? 'Processing...'
          : paymentMethod === 'cod'
          ? 'Place Order (Cash on Delivery)'
          : paymentMethod === 'upi'
          ? 'Pay with UPI'
          : 'Proceed to Payment'}
      </Button>
    </div>
  );
}

