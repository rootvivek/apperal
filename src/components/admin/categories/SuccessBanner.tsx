'use client';

import { memo, useEffect } from 'react';

interface SuccessBannerProps {
  message: string | null;
  onDismiss?: () => void;
  autoDismiss?: number; // Auto-dismiss after milliseconds
}

const SuccessBanner = memo(function SuccessBanner({ 
  message, 
  onDismiss,
  autoDismiss = 3000 
}: SuccessBannerProps) {
  useEffect(() => {
    if (message && autoDismiss > 0 && onDismiss) {
      const timer = setTimeout(() => {
        onDismiss();
      }, autoDismiss);
      return () => clearTimeout(timer);
    }
  }, [message, autoDismiss, onDismiss]);

  if (!message) return null;

  return (
    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-green-700 font-medium">Success</p>
          <p className="text-green-600 text-sm mt-1">{message}</p>
        </div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="ml-4 text-green-600 hover:text-green-800"
            aria-label="Dismiss success message"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
});

export default SuccessBanner;

