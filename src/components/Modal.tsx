'use client';

import { ReactNode, useEffect } from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  variant?: 'default' | 'glass' | 'simple';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showCloseButton?: boolean;
  closeOnOverlayClick?: boolean;
  className?: string;
}

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  variant = 'default',
  size = 'md',
  showCloseButton = true,
  closeOnOverlayClick = true,
  className = '',
}: ModalProps) {
  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Handle ESC key
  useEffect(() => {
    if (!isOpen) return;
    
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
  };

  const variantClasses = {
    default: 'bg-white rounded-lg shadow-lg',
    glass: 'bg-white/90 backdrop-blur-2xl border border-white/30 rounded-2xl shadow-2xl',
    simple: 'bg-white rounded-lg shadow-xl',
  };

  const backdropClasses = {
    default: 'bg-black bg-opacity-50',
    glass: 'bg-gradient-to-br from-black/40 via-black/30 to-black/40 backdrop-blur-lg',
    simple: 'bg-black bg-opacity-50',
  };

  return (
    <div 
      className={`fixed inset-0 z-[200] flex items-center justify-center p-4`}
      onClick={closeOnOverlayClick ? onClose : undefined}
    >
      {/* Backdrop */}
      <div 
        className={`absolute inset-0 ${backdropClasses[variant]}`}
        onClick={closeOnOverlayClick ? onClose : undefined}
      />
      
      {/* Modal container */}
      <div 
        className={`relative w-full ${sizeClasses[size]} z-10 ${variantClasses[variant]} ${className}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        {(title || showCloseButton) && (
          <div className={`${variant === 'glass' ? 'py-8 px-4 sm:px-10' : 'p-6'} ${variant !== 'glass' ? 'border-b border-gray-200' : ''} flex justify-between items-center ${variant !== 'glass' ? 'sticky top-0 bg-inherit rounded-t-lg' : ''}`}>
            {title && (
              <h2 className={`${variant === 'glass' ? 'text-3xl font-extrabold' : 'text-xl font-bold'} text-gray-900 ${variant === 'glass' ? 'text-center w-full' : ''}`}>
                {title}
              </h2>
            )}
            {showCloseButton && (
              <button
                onClick={onClose}
                className={`text-gray-400 hover:text-gray-600 transition-colors ${variant === 'glass' ? 'absolute top-4 right-4 z-10' : ''}`}
                aria-label="Close"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        )}

        {/* Content */}
        <div className={variant === 'glass' ? (title || showCloseButton ? 'px-4 sm:px-10 pb-8' : 'py-8 px-4 sm:px-10') : 'p-6'}>
          {children}
        </div>
      </div>
    </div>
  );
}

