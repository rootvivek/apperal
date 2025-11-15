'use client';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  color?: 'blue' | 'brand' | 'gray';
  message?: string;
  variant?: 'centered' | 'inline' | 'fullscreen';
  className?: string;
}

const sizeClasses = {
  sm: 'h-8 w-8',
  md: 'h-12 w-12',
  lg: 'h-16 w-16',
};

const colorClasses = {
  blue: 'border-blue-600',
  brand: 'border-brand',
  gray: 'border-gray-600',
};

const containerClasses = {
  centered: 'flex items-center justify-center py-12',
  inline: 'flex items-center gap-3',
  fullscreen: 'flex items-center justify-center min-h-screen',
};

export default function LoadingSpinner({
  size = 'md',
  color = 'blue',
  message,
  variant = 'centered',
  className = '',
}: LoadingSpinnerProps) {
  const spinnerSize = sizeClasses[size];
  const spinnerColor = colorClasses[color];
  const containerClass = containerClasses[variant];

  if (variant === 'inline') {
    return (
      <div className={`${containerClass} ${className}`}>
        <div className={`animate-spin rounded-full ${spinnerSize} border-b-2 ${spinnerColor}`}></div>
        {message && <span className="text-gray-600">{message}</span>}
      </div>
    );
  }

  return (
    <div className={`${containerClass} ${className}`}>
      <div className="text-center">
        <div className={`animate-spin rounded-full ${spinnerSize} border-b-2 ${spinnerColor} mx-auto`}></div>
        {message && <p className="mt-4 text-gray-600">{message}</p>}
      </div>
    </div>
  );
}

