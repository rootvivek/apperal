'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';
import { LoginModalProvider, useLoginModal } from '@/contexts/LoginModalContext';
import LoginModal from '@/components/LoginModal';

// Lazy load heavy components to improve initial load time
const ConditionalNavigation = dynamic(() => import('@/components/ConditionalNavigation'), {
  ssr: true,
  loading: () => <div className="h-14 sm:h-[72px] bg-white" /> // Placeholder to prevent layout shift
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
  
  // Fixed navbar height: 56px on mobile, 72px on desktop - matches navbar fixed height to prevent overlap
  const [navbarHeight, setNavbarHeight] = useState(72);
  
  useEffect(() => {
    const updateNavbarHeight = () => {
      setNavbarHeight(window.innerWidth < 640 ? 56 : 72);
    };
    updateNavbarHeight();
    window.addEventListener('resize', updateNavbarHeight);
    return () => window.removeEventListener('resize', updateNavbarHeight);
  }, []);

  // Scroll to top whenever pathname changes (page navigation)
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  // Show footer only on home page for mobile, or on all pages (except checkout/product detail) for desktop
  const shouldShowFooter = !isCheckoutPage && !isProductDetailPage;
  const footerClassName = isHomePage ? '' : 'hidden md:block';

  return (
    <>
      <ConditionalNavigation />
      <div className="relative">
        {/* Fill padding area with navbar color to eliminate white space - only show on non-home pages */}
        {!isHomePage && (
          <div 
            className="absolute top-0 left-0 right-0 bg-brand-500 pointer-events-none"
            style={{ height: `${navbarHeight}px` }}
          ></div>
        )}
        <div 
          className="relative"
          style={{ paddingTop: isHomePage ? '0' : `${navbarHeight}px` }} // No padding on home page, match navbar height on other pages
        >
          {children}
        </div>
      </div>
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
