'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { usePathname, useRouter } from 'next/navigation';
import { LoginModalProvider, useLoginModal } from '@/contexts/LoginModalContext';
import { useAuth } from '@/contexts/AuthContext';
import LoginModal from '@/components/auth/LoginModal/LoginModal';
import Modal from '@/components/Modal';

// Preload MSG91 script on mount for faster OTP sending
function MSG91ScriptPreloader() {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    // Suppress hCaptcha localhost warning in development (expected behavior)
    if (process.env.NODE_ENV === 'development') {
      const originalWarn = console.warn;
      const originalError = console.error;
      
      console.warn = (...args: any[]) => {
        const message = args[0]?.toString() || '';
        // Filter out hCaptcha localhost warnings (expected in dev, doesn't affect functionality)
        if (message.includes('[hCaptcha]') && message.includes('localhost')) {
          return; // Suppress this warning
        }
        originalWarn.apply(console, args);
      };
      
      console.error = (...args: any[]) => {
        const message = args[0]?.toString() || '';
        // Also filter from console.error (some browsers log it there)
        if (message.includes('[hCaptcha]') && message.includes('localhost')) {
          return; // Suppress this warning
        }
        originalError.apply(console, args);
      };
    }
    
    // Check if script already exists
    if (document.querySelector('script[src*="otp-provider.js"]')) {
      return;
    }

    // Preload MSG91 script in background
    const script = document.createElement('script');
    script.src = 'https://verify.msg91.com/otp-provider.js';
    script.async = true;
    script.onerror = () => {
      // Script will load on demand if preload fails
    };
    document.body.appendChild(script);
  }, []);

  return null;
}

// Lazy load heavy components to improve initial load time
const ConditionalNavigation = dynamic(() => import('@/components/ConditionalNavigation'), {
  ssr: true,
  loading: () => <div className="h-14 sm:h-[72px] bg-white" /> // Placeholder to prevent layout shift
});

const Footer = dynamic(() => import('@/components/Footer'), {
  ssr: true,
});

function ClientLayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const isCheckoutPage = pathname === '/checkout';
  const isProductDetailPage = pathname?.startsWith('/product/');
  const isHomePage = pathname === '/';
  const isAdminPage = pathname?.startsWith('/admin');
  const { isOpen, closeModal, redirectTo } = useLoginModal();
  const { banned } = useAuth();
  const showBannedModal = banned.show;
  const bannedReason = banned.reason;

  // Banned modal messages
  const bannedMessages: Record<string, string> = {
    deleted: 'Your account has been suspended.',
    deactivated: 'Your account has been banned.',
    default: 'Your account is not accessible. Please contact administrator for assistance.'
  };

  // Prevent navigation while banned modal is open
  useEffect(() => {
    if (!showBannedModal) return;

    const handleLinkClick = (e: MouseEvent) => {
      if (showBannedModal) {
        const target = e.target as HTMLElement;
        const link = target.closest('a');
        if (link && link.href && !link.href.startsWith('#')) {
          e.preventDefault();
          e.stopPropagation();
        }
      }
    };

    const handlePopState = (e: PopStateEvent) => {
      if (showBannedModal) {
        window.history.pushState(null, '', window.location.href);
      }
    };

    window.history.pushState(null, '', window.location.href);
    document.addEventListener('click', handleLinkClick, true);
    window.addEventListener('popstate', handlePopState);
    
    return () => {
      document.removeEventListener('click', handleLinkClick, true);
      window.removeEventListener('popstate', handlePopState);
    };
  }, [showBannedModal]);

  const handleBannedAcknowledge = () => {
    localStorage.removeItem('supabase.auth.token');
    localStorage.removeItem('user');
    sessionStorage.clear();
    router.push('/');
    router.refresh();
  };
  
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

  // Show footer only on home page for mobile, or on all pages (except checkout/product detail/admin) for desktop
  const shouldShowFooter = !isCheckoutPage && !isProductDetailPage && !isAdminPage;
  const footerClassName = isHomePage ? '' : 'hidden md:block';

  return (
    <>
      <MSG91ScriptPreloader />
      {!isAdminPage && <ConditionalNavigation />}
      <div className="relative">
        {/* Fill padding area with navbar color to eliminate white space - only show on non-home pages and non-admin pages */}
        {!isHomePage && !isAdminPage && (
          <div 
            className="absolute top-0 left-0 right-0 bg-white pointer-events-none"
            style={{ height: `${navbarHeight}px` }}
          ></div>
        )}
        <div 
          className="relative"
          style={{ paddingTop: (isHomePage || isAdminPage) ? '0' : `${navbarHeight}px` }} // No padding on home page or admin pages, match navbar height on other pages
        >
          {children}
        </div>
      </div>
      {shouldShowFooter && (
        <Footer className={footerClassName} />
      )}
      <Modal
        isOpen={showBannedModal}
        onClose={() => {}}
        preventClose={true}
        size="md"
        className="z-[9999]"
      >
        <div className="flex flex-col items-center mb-4">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-2xl font-semibold text-gray-900 text-center">Account Access Restricted</h2>
        </div>
        <div className="mt-4 text-center">
          <p className="text-gray-600 mb-4">
            {bannedMessages[bannedReason] || bannedMessages.default}
          </p>
          <p className="text-sm text-gray-500 mb-2">
            Please read this message carefully and click "I Understand" below to continue.
          </p>
          <p className="text-sm text-gray-500 font-medium">
            You will be redirected to the home page after acknowledgment.
          </p>
        </div>
        <div className="mt-6 space-y-4">
          <button
            onClick={handleBannedAcknowledge}
            className="w-full bg-red-600 text-white py-3 px-4 rounded-md hover:bg-red-700 transition-colors font-medium"
          >
            I Understand
          </button>
          <p className="text-xs text-center text-gray-500">
            If you believe this is a mistake, please contact our support team for assistance.
          </p>
        </div>
      </Modal>
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
