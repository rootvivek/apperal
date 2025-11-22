'use client';

import { ArrowLeft, User, ChevronDown, Search, List, LogOut, Settings, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface IconComponentProps {
  className?: string;
  size?: number | string;
}

export const BackArrowIcon = ({ className, size = 20 }: IconComponentProps) => (
  <ArrowLeft 
    className={cn("text-current", className)} 
    size={size}
  />
);

export const UserIcon = ({ className, size = 20 }: IconComponentProps) => (
  <User 
    className={cn("text-current", className)} 
    size={size}
  />
);

export const ChevronDownIcon = ({ 
  className, 
  size = 20,
  rotated = false 
}: IconComponentProps & { rotated?: boolean }) => (
  <ChevronDown 
    className={cn(
      "text-current transition-transform",
      rotated && "rotate-180",
      className
    )} 
    size={size}
  />
);

export const SearchIcon = ({ className, size = 20 }: IconComponentProps) => (
  <Search 
    className={cn("text-current", className)} 
    size={size}
  />
);

export const OrdersIcon = ({ className, size = 20 }: IconComponentProps) => (
  <List 
    className={cn("text-current", className)} 
    size={size}
  />
);

export const SignOutIcon = ({ className, size = 20 }: IconComponentProps) => (
  <LogOut 
    className={cn("text-current", className)} 
    size={size}
  />
);

export const AdminIcon = ({ className, size = 20 }: IconComponentProps) => (
  <Settings 
    className={cn("text-current", className)} 
    size={size}
  />
);

export const CrossIcon = ({ className, size = 20 }: IconComponentProps) => (
  <X 
    className={cn("text-current", className)} 
    size={size}
  />
);
