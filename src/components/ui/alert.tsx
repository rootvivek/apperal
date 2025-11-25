'use client';

import { useEffect } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

export type AlertVariant = 'success' | 'error' | 'warning' | 'info';

interface AlertProps {
  message: string;
  onClose?: () => void;
  variant?: AlertVariant;
  className?: string;
  autoDismiss?: number; // Auto-dismiss after milliseconds
  title?: string;
}

const variantStyles: Record<AlertVariant, string> = {
  success: 'bg-green-50 border-green-200 text-green-800',
  error: 'bg-red-50 border-red-200 text-red-800',
  warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
  info: 'bg-blue-50 border-blue-200 text-blue-800',
};

const variantIconColors: Record<AlertVariant, string> = {
  success: 'text-green-600 hover:text-green-800',
  error: 'text-red-600 hover:text-red-800',
  warning: 'text-yellow-600 hover:text-yellow-800',
  info: 'text-blue-600 hover:text-blue-800',
};

export default function Alert({
  message,
  onClose,
  variant = 'info',
  className,
  autoDismiss,
  title,
}: AlertProps) {
  // Auto-dismiss logic
  useEffect(() => {
    if (autoDismiss && autoDismiss > 0 && onClose) {
      const timer = setTimeout(() => {
        onClose();
      }, autoDismiss);
      return () => clearTimeout(timer);
    }
  }, [autoDismiss, onClose]);

  return (
    <div className={cn('border rounded-md px-4 py-3 flex items-start justify-between', variantStyles[variant], className)}>
      <div className="flex-1">
        {title && (
          <p className={cn('font-medium mb-1', variant === 'success' ? 'text-green-700' : variant === 'error' ? 'text-red-700' : variant === 'warning' ? 'text-yellow-700' : 'text-blue-700')}>
            {title}
          </p>
        )}
        <p className={cn('text-sm', variant === 'success' ? 'text-green-600' : variant === 'error' ? 'text-red-600' : variant === 'warning' ? 'text-yellow-600' : 'text-blue-600')}>
          {message}
        </p>
      </div>
      {onClose && (
        <button
          onClick={onClose}
          className={cn('ml-4 flex-shrink-0', variantIconColors[variant])}
          aria-label="Close"
          type="button"
        >
          <X className="w-5 h-5" />
        </button>
      )}
    </div>
  );
}

