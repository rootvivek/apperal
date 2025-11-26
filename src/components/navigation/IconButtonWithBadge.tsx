'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';

interface IconButtonWithBadgeProps {
  href: string;
  icon: LucideIcon;
  count?: number;
  className?: string;
  iconClassName?: string;
  badgeColor?: string;
  showOnMobile?: boolean;
  hoverEffect?: 'scale' | 'color';
  hoverColor?: string;
}

export default function IconButtonWithBadge({
  href,
  icon: Icon,
  count = 0,
  className = '',
  iconClassName = '',
  badgeColor = '#D7882B',
  showOnMobile = true,
  hoverEffect = 'scale',
  hoverColor,
}: IconButtonWithBadgeProps) {
  const visibilityClass = showOnMobile ? '' : 'hidden sm:flex';
  const baseClasses = `${visibilityClass} p-2 sm:p-2.5 md:p-2.5 hover:bg-gray-50 rounded-xl transition-colors relative group`;
  const iconClasses = `w-4 h-4 sm:w-[18px] sm:h-[18px] md:w-5 md:h-5 text-gray-700 ${iconClassName}`;
  const hoverClasses = hoverEffect === 'scale' 
    ? 'group-hover:scale-110 transition-transform'
    : hoverEffect === 'color' && hoverColor
    ? 'group-hover:text-red-500 transition-colors'
    : 'transition-colors';

  return (
    <Link href={href} className={`${baseClasses} ${className}`}>
      <Icon className={`${iconClasses} ${hoverClasses}`} />
      {count > 0 && (
        <motion.span
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          whileHover={hoverEffect === 'scale' ? { scale: 1.1 } : undefined}
          className="absolute -top-1 -right-1 text-white text-xs w-5 h-5 flex items-center justify-center rounded-full"
          style={{ backgroundColor: badgeColor }}
        >
          {count > 9 ? '9+' : count}
        </motion.span>
      )}
    </Link>
  );
}

