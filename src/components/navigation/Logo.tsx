'use client';

import Link from 'next/link';

interface LogoProps {
  className?: string;
  maxWidth?: string;
}

export default function Logo({ className = "h-8 sm:h-10 w-auto", maxWidth = "180px" }: LogoProps) {
  return (
    <Link href="/" className="flex items-center">
      {/* Desktop logo - text logo (used on all screen sizes) */}
      <img 
        src="/logotext.svg" 
        alt="Nipto" 
        className={className}
        style={{ maxWidth }} 
        width={2000}
        height={796}
        loading="eager"
        fetchPriority="high"
      />
    </Link>
  );
}

