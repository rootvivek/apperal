'use client';

import dynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';

// Lazy load heavy components to improve initial load time
const ConditionalNavigation = dynamic(() => import('@/components/ConditionalNavigation'), {
  ssr: true,
  loading: () => <div className="h-16 bg-white" /> // Placeholder to prevent layout shift
});

const Footer = dynamic(() => import('@/components/Footer'), {
  ssr: true,
});

const BannedModal = dynamic(() => import('@/components/BannedModal').then(mod => ({ default: mod.BannedModal })), {
  ssr: false, // Modal doesn't need SSR
});

interface ClientLayoutProps {
  children: React.ReactNode;
}

export default function ClientLayout({ children }: ClientLayoutProps) {
  const pathname = usePathname();
  const isCheckoutPage = pathname === '/checkout';
  const isProductDetailPage = pathname?.startsWith('/product/');

  return (
    <>
      <ConditionalNavigation />
      {children}
      {!isCheckoutPage && !isProductDetailPage && <Footer />}
      <BannedModal />
    </>
  );
}
