'use client';

import dynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';
import { LoginModalProvider, useLoginModal } from '@/contexts/LoginModalContext';
import LoginModal from '@/components/LoginModal';

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

function ClientLayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isCheckoutPage = pathname === '/checkout';
  const isProductDetailPage = pathname?.startsWith('/product/');
  const isHomePage = pathname === '/';
  const { isOpen, closeModal, redirectTo } = useLoginModal();

  // Show footer only on home page for mobile, or on all pages (except checkout/product detail) for desktop
  const shouldShowFooter = !isCheckoutPage && !isProductDetailPage;
  const footerClassName = isHomePage ? '' : 'hidden md:block';

  return (
    <>
      <ConditionalNavigation />
      {children}
      {shouldShowFooter && (
        <Footer className={footerClassName} />
      )}
      <BannedModal />
      <LoginModal isOpen={isOpen} onClose={closeModal} redirectTo={redirectTo} />
    </>
  );
}

interface ClientLayoutProps {
  children: React.ReactNode;
}

export default function ClientLayout({ children }: ClientLayoutProps) {
  return (
    <LoginModalProvider>
      <ClientLayoutContent>{children}</ClientLayoutContent>
    </LoginModalProvider>
  );
}
