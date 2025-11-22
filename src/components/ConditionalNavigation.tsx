'use client';

import { usePathname } from 'next/navigation';
import Navigation from './navigation';

export default function ConditionalNavigation() {
  const pathname = usePathname();
  
  // Don't render Navigation for admin pages
  if (pathname.startsWith('/admin')) {
    return null;
  }
  
  return <Navigation />;
}
