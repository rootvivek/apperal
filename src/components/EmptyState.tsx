'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';

interface EmptyStateProps {
  icon?: string;
  title: string;
  description?: string | React.ReactNode;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
  variant?: 'default' | 'compact' | 'minimal';
  className?: string;
}

export default function EmptyState({
  icon = '🔍',
  title,
  description,
  actionLabel,
  actionHref,
  onAction,
  variant = 'default',
  className = '',
}: EmptyStateProps) {
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

  return (
    <div className={`${containerClasses[variant]} ${className}`}>
      {icon && (
        <div className={`${iconSizeClasses[variant]} mb-4 text-gray-400`}>
          {icon}
        </div>
      )}
      <h3 className={`${titleSizeClasses[variant]} text-gray-900 mb-2`}>
        {title}
      </h3>
      {description && (
        <div className="text-gray-500 mb-4">
          {typeof description === 'string' ? (
            <p>{description}</p>
          ) : (
            description
          )}
        </div>
      )}
      {(actionLabel && actionHref) && (
        <Link href={actionHref}>
          <Button variant="default">
            {actionLabel}
          </Button>
        </Link>
      )}
      {(actionLabel && onAction) && (
        <Button variant="default" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}

