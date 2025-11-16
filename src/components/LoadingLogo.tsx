'use client';

interface LoadingLogoProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
  fullScreen?: boolean;
  inline?: boolean;
}

export default function LoadingLogo({ 
  size = 'md', 
  text = 'Loading...',
  fullScreen = false,
  inline = false
}: LoadingLogoProps) {
  const sizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-12 w-12',
    lg: 'h-16 w-16'
  };

  const containerClasses = fullScreen
    ? 'fixed inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-sm'
    : inline
    ? 'flex items-center gap-2'
    : 'flex items-center justify-center py-8';

  if (inline) {
    return (
      <div className={containerClasses}>
        {/* Logo - inline version */}
        <img 
          src="/logo.webp" 
          alt="Loading" 
          className={`${sizeClasses[size]} object-contain animate-pulse`}
          width={96}
          height={93}
          loading="eager"
        />
        {/* Loading text */}
        {text && (
          <span className="text-sm text-gray-600 font-medium">{text}</span>
        )}
      </div>
    );
  }

  return (
    <div className={containerClasses}>
      <div className="flex flex-col items-center justify-center gap-4">
        {/* Logo with pulse animation */}
        <img 
          src="/logo.webp" 
          alt="Loading" 
          className={`${sizeClasses[size]} object-contain animate-pulse`}
          width={96}
          height={93}
          loading="eager"
        />
        {/* Loading text */}
        {text && (
          <p className="text-sm text-gray-600 font-medium animate-pulse">{text}</p>
        )}
      </div>
    </div>
  );
}

