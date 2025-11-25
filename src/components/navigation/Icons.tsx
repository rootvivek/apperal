'use client';

import {
  ArrowLeft,
  Search,
  ChevronDown,
  User,
  PackageSearch,
  LogOut,
  ShieldCheck,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type IconProps = React.SVGProps<SVGSVGElement>;

interface ChevronDownIconProps extends IconProps {
  rotated?: boolean;
}

export function BackArrowIcon(props: IconProps) {
  return <ArrowLeft {...props} />;
}

export function SearchIcon(props: IconProps) {
  return <Search {...props} />;
}

export function ChevronDownIcon({
  rotated,
  className,
  ...props
}: ChevronDownIconProps) {
  return (
    <ChevronDown
      className={cn(
        'transition-transform duration-150',
        rotated ? 'rotate-180' : '',
        className,
      )}
      {...props}
    />
  );
}

export function UserIcon(props: IconProps) {
  return <User {...props} />;
}

export function OrdersIcon(props: IconProps) {
  return <PackageSearch {...props} />;
}

export function SignOutIcon(props: IconProps) {
  return <LogOut {...props} />;
}

export function AdminIcon(props: IconProps) {
  return <ShieldCheck {...props} />;
}

export function CrossIcon(props: IconProps) {
  return <X {...props} />;
}


