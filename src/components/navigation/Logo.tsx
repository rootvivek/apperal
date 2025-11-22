'use client';

import Link from 'next/link';

interface LogoProps {
  className?: string;
  maxWidth?: string;
}

export default function Logo({ className = "h-8 sm:h-10 w-auto", maxWidth = "120px" }: LogoProps) {
  return (
    <Link href="/" className="flex items-center">
      <img 
        src="/logo.webp" 
        alt="Carts24" 
        className={className} 
        style={{ maxWidth }} 
        width={96}
        height={93}
        loading="eager"
        fetchPriority="high"
      />
    </Link>
  );
}

