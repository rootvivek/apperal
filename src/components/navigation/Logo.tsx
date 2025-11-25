'use client';

import Link from 'next/link';

interface LogoProps {
  className?: string;
  maxWidth?: string;
}

export default function Logo({ className = "h-8 sm:h-10 w-auto", maxWidth = "180px" }: LogoProps) {
  return (
    <Link href="/" className="flex items-center">
      {/* Mobile logo - circular icon */}
      <img 
        src="/logo-circle.svg" 
        alt="Nipto" 
        className="h-8 w-8 sm:hidden" 
        width={500}
        height={500}
        loading="eager"
        fetchPriority="high"
      />
      {/* Desktop logo - text logo */}
      <img 
        src="/logotext.svg" 
        alt="Nipto" 
        className={`hidden sm:block ${className}`}
        style={{ maxWidth }} 
        width={2000}
        height={796}
        loading="eager"
        fetchPriority="high"
      />
    </Link>
  );
}

