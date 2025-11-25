'use client';

import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';

interface LoadingOverlayProps {
  message?: string;
  className?: string;
  spinnerClassName?: string;
}

export default function LoadingOverlay({
  message = 'Loading...',
  className,
  spinnerClassName,
}: LoadingOverlayProps) {
  return (
    <div className={cn(
      'fixed inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-sm',
      className
    )}>
      <div className="text-center">
        <Spinner className={cn('size-12 text-blue-600 mx-auto', spinnerClassName)} />
        {message && (
          <p className="mt-4 text-gray-600">{message}</p>
        )}
      </div>
    </div>
  );
}

