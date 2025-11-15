'use client';

import { ButtonHTMLAttributes, ReactNode } from 'react';
import LoadingLogo from './LoadingLogo';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  loading?: boolean;
  children: ReactNode;
}

const variantClasses = {
  primary: 'bg-blue-600 hover:bg-blue-700 text-white border-transparent',
  secondary: 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50',
  danger: 'bg-red-600 hover:bg-red-700 text-white border-transparent',
  outline: 'bg-transparent border-gray-300 text-gray-700 hover:bg-gray-50',
};

const sizeClasses = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-3 text-base',
};

export default function Button({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  loading = false,
  disabled = false,
  children,
  className = '',
  ...props
}: ButtonProps) {
  const baseClasses = 'inline-flex items-center justify-center border rounded-md shadow-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2';
  const variantClass = variantClasses[variant];
  const sizeClass = sizeClasses[size];
  const widthClass = fullWidth ? 'w-full' : '';
  const disabledClass = (disabled || loading) ? 'opacity-50 cursor-not-allowed' : '';
  const focusRingClass = variant === 'primary' ? 'focus:ring-blue-500' : 
                         variant === 'danger' ? 'focus:ring-red-500' : 
                         'focus:ring-gray-500';

  return (
    <button
      className={`${baseClasses} ${variantClass} ${sizeClass} ${widthClass} ${disabledClass} ${focusRingClass} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <LoadingLogo size="sm" inline text="" />
      )}
      {children}
    </button>
  );
}

