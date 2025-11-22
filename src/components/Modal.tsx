'use client';

import { ReactNode } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  preventClose?: boolean; // Prevent closing on ESC or outside click
  onEscapeKeyDown?: (e: KeyboardEvent) => void;
  onPointerDownOutside?: (e: Event) => void;
  overlayClassName?: string; // Custom overlay styling
}

const sizeClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
};

export default function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  size = 'md',
  className = '',
  preventClose = false,
  onEscapeKeyDown,
  onPointerDownOutside,
  overlayClassName,
}: ModalProps) {
  const handleEscapeKeyDown = (e: KeyboardEvent) => {
    if (preventClose) {
      e.preventDefault();
    }
    onEscapeKeyDown?.(e);
  };

  const handlePointerDownOutside = (e: Event) => {
    if (preventClose) {
      e.preventDefault();
    }
    onPointerDownOutside?.(e);
  };

  return (
    <Dialog open={isOpen} onOpenChange={preventClose ? () => {} : onClose}>
      <DialogContent 
        className={cn(
          sizeClasses[size], 
          className, 
          preventClose && '[&>button]:hidden'
        )}
        onEscapeKeyDown={handleEscapeKeyDown}
        onPointerDownOutside={handlePointerDownOutside}
      >
        {(title || description) && (
          <DialogHeader>
            {title && <DialogTitle>{title}</DialogTitle>}
            {description && <DialogDescription>{description}</DialogDescription>}
          </DialogHeader>
        )}
        {children}
      </DialogContent>
    </Dialog>
  );
}

