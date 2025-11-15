'use client';

import Button from './Button';

interface ErrorStateProps {
  icon?: string;
  title?: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  variant?: 'default' | 'compact' | 'minimal';
  className?: string;
}

export default function ErrorState({
  icon = '⚠️',
  title = 'Error',
  message,
  actionLabel,
  onAction,
  variant = 'default',
  className = '',
}: ErrorStateProps) {
  const containerClasses = {
    default: 'text-center py-12',
    compact: 'text-center py-6',
    minimal: 'text-center py-4',
  };

  const iconSizeClasses = {
    default: 'text-6xl',
    compact: 'text-4xl',
    minimal: 'text-2xl',
  };

  const titleSizeClasses = {
    default: 'text-lg font-medium',
    compact: 'text-base font-medium',
    minimal: 'text-sm font-medium',
  };

  const messageSizeClasses = {
    default: 'text-base',
    compact: 'text-sm',
    minimal: 'text-xs',
  };

  return (
    <div className={`${containerClasses[variant]} ${className}`}>
      {icon && (
        <div className={`${iconSizeClasses[variant]} mb-4 text-red-500`}>
          {icon}
        </div>
      )}
      {title && (
        <h3 className={`${titleSizeClasses[variant]} text-gray-900 mb-2`}>
          {title}
        </h3>
      )}
      <p className={`${messageSizeClasses[variant]} text-gray-500 mb-4`}>
        {message}
      </p>
      {actionLabel && onAction && (
        <Button variant="primary" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}

