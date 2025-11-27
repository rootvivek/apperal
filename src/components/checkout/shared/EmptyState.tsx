'use client';

import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

interface EmptyStateProps {
  icon?: LucideIcon | string;
  title: string;
  description?: string | React.ReactNode;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
  variant?: 'default' | 'compact' | 'minimal';
  className?: string;
  animated?: boolean;
}

export default function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  actionHref,
  onAction,
  variant = 'default',
  className = '',
  animated = true,
}: EmptyStateProps) {
  const containerClasses = {
    default: 'text-center py-12',
    compact: 'text-center py-6',
    minimal: 'text-center py-4',
  };

  const iconSizeClasses = {
    default: 'w-32 h-32',
    compact: 'w-24 h-24',
    minimal: 'w-16 h-16',
  };

  const titleSizeClasses = {
    default: 'text-3xl',
    compact: 'text-xl',
    minimal: 'text-lg',
  };

  const content = (
    <div className={`${containerClasses[variant]} ${className}`}>
      {icon && (
        <div className={`${iconSizeClasses[variant]} bg-muted rounded-full flex items-center justify-center mx-auto mb-6`}>
          {typeof icon === 'string' ? (
            <span className={`${variant === 'default' ? 'text-6xl' : variant === 'compact' ? 'text-4xl' : 'text-2xl'} text-gray-400`}>
              {icon}
            </span>
          ) : (
            (() => {
              const IconComponent = icon as LucideIcon;
              return <IconComponent className={`${variant === 'default' ? 'w-16 h-16' : variant === 'compact' ? 'w-12 h-12' : 'w-8 h-8'} text-muted-foreground`} />;
            })()
          )}
        </div>
      )}
      <h1 className={`${titleSizeClasses[variant]} mb-4`}>{title}</h1>
      {description && (
        <div className="text-muted-foreground mb-8">
          {typeof description === 'string' ? (
            <p>{description}</p>
          ) : (
            description
          )}
        </div>
      )}
      {actionLabel && actionHref && (
        <Link href={actionHref}>
          <Button variant="default" className="bg-primary text-primary-foreground px-8 py-3 rounded-xl hover:opacity-90 transition-opacity">
            {actionLabel}
          </Button>
        </Link>
      )}
      {actionLabel && onAction && (
        <Button onClick={onAction} className="bg-primary text-primary-foreground px-8 py-3 rounded-xl hover:opacity-90 transition-opacity">
          {actionLabel}
        </Button>
      )}
    </div>
  );

  if (animated) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-2xl mx-auto"
      >
        {content}
      </motion.div>
    );
  }

  return <div className="max-w-2xl mx-auto">{content}</div>;
}

