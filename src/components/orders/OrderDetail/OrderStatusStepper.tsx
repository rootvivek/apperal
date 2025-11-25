'use client';

import { cn } from '@/lib/utils';
import { CheckCircle2, Circle } from 'lucide-react';

interface OrderStatusStepperProps {
  status: string;
}

// Three-phase stepper: first step label switches Pending/Confirmed based on status
const ORDER_STEPS = [
  { key: 'primary', label: '' }, // dynamic: "Order Pending" or "Order Confirmed"
  { key: 'shipped', label: 'Shipped' },
  { key: 'delivered', label: 'Delivery' },
];

// Map backend statuses into one of the three phases
const STATUS_PROGRESS_MAP: Record<string, number> = {
  pending: 0,
  created: 0,
  paid: 0,
  confirmed: 0,
  processing: 0,
  shipped: 1,
  out_for_delivery: 1,
  delivered: 2,
  completed: 2,
  cancelled: 2,
};

export function OrderStatusStepper({ status }: OrderStatusStepperProps) {
  const normalizedStatus = status.toLowerCase();
  const activeIndex =
    STATUS_PROGRESS_MAP[normalizedStatus] ?? STATUS_PROGRESS_MAP.pending;

  return (
    <div className="mt-2 sm:mt-3">
      <div className="relative">
        {ORDER_STEPS.map((step, index) => {
          const isActive = index === activeIndex;
          const isCompleted = index < activeIndex;

          // Dynamic label for first step
          let label = step.label;
          if (step.key === 'primary') {
            // Show "Pending" only while status is actually pending/created,
            // otherwise treat as confirmed once admin updates status.
            label =
              normalizedStatus === 'pending' || normalizedStatus === 'created'
                ? 'Order Pending'
                : 'Order Confirmed';
          }

          return (
            <div
              key={step.key}
              className={cn('relative flex items-start gap-3 py-2 sm:py-3')}
            >
              {/* Icon + connector */}
              <div className="relative flex flex-col items-center">
                {isCompleted || isActive ? (
                  <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-[#4736FE] flex-shrink-0" />
                ) : (
                  <Circle className="w-4 h-4 sm:w-5 sm:h-5 text-gray-300 flex-shrink-0" />
                )}
                {index < ORDER_STEPS.length - 1 && (
                  <div
                    className={cn(
                      'w-[2px] min-h-[24px] sm:min-h-[32px] mt-1',
                      isCompleted ? 'bg-[#4736FE]' : 'bg-gray-300'
                    )}
                  />
                )}
              </div>

              {/* Text */}
              <div className="flex-1 flex items-center">
                <p
                  className={cn(
                    'text-xs sm:text-sm font-medium',
                    isActive || isCompleted ? 'text-gray-900' : 'text-gray-400'
                  )}
                >
                  {label}
                </p>
              </div>
            </div>
          );
        })}
      </div>
      {normalizedStatus === 'cancelled' && (
        <p className="mt-2 text-[11px] sm:text-xs text-red-600">
          This order has been cancelled.
        </p>
      )}
    </div>
  );
}


