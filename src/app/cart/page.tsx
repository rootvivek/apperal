'use client';

import { Suspense } from 'react';
import { Spinner } from '@/components/ui/spinner';
import OrderSummaryPage from '@/components/checkout/OrderSummaryPage';

function CartContent() {
  return <OrderSummaryPage />;
}

export default function CartPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <Spinner className="size-12 text-blue-600" />
            <p className="text-gray-600">Loading cart...</p>
          </div>
        </div>
      }
    >
      <CartContent />
    </Suspense>
  );
}
