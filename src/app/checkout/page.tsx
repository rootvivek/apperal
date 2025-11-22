'use client';

import { Suspense } from 'react';
import { Spinner } from '@/components/ui/spinner';
import CheckoutPage from '@/components/checkout/CheckoutPage';

function CheckoutContent() {
  return <CheckoutPage />;
}

export default function CheckoutPageWrapper() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <Spinner className="size-12 text-blue-600" />
            <p className="text-gray-600">Loading checkout...</p>
          </div>
        </div>
      }
    >
      <CheckoutContent />
    </Suspense>
  );
}
