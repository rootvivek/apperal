'use client';

import { useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

type BannedMessages = {
  deleted: string;
  deactivated: string;
  default: string;
  [key: string]: string;
};

export function BannedModal() {
  const router = useRouter();
  const { showBannedModal, setBannedModal, bannedReason } = useAuth();

  // Prevent modal from being closed by hitting escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showBannedModal) {
        e.preventDefault();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [showBannedModal]);

  // Prevent navigation while modal is open using Next.js router blocking
  useEffect(() => {
    if (!showBannedModal) return;

    // Block Next.js navigation using the router
    const handleRouteChange = (url: string) => {
      // Prevent navigation if modal is open
      if (showBannedModal) {
        // Cancel navigation
        throw new Error('Navigation blocked: Banned modal is open');
      }
    };

    // Use Next.js router to intercept navigation
    // Note: Next.js App Router doesn't have built-in blocking, so we use a workaround
    // by preventing default link behavior and programmatic navigation
    
    // Intercept clicks on links
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

    // Intercept browser back/forward buttons using popstate
    const handlePopState = (e: PopStateEvent) => {
      if (showBannedModal) {
        // Push current state back to prevent navigation
        window.history.pushState(null, '', window.location.href);
      }
    };

    // Push state to enable popstate interception
    window.history.pushState(null, '', window.location.href);

    // Add event listeners
    document.addEventListener('click', handleLinkClick, true);
    window.addEventListener('popstate', handlePopState);
    
    return () => {
      document.removeEventListener('click', handleLinkClick, true);
      window.removeEventListener('popstate', handlePopState);
    };
  }, [showBannedModal, router]);

  if (!showBannedModal) return null;

  const messages: BannedMessages = {
    deleted: 'Your account has been suspended.',
    deactivated: 'Your account has been banned.',
    default: 'Your account is not accessible. Please contact administrator for assistance.'
  };

  const handleAcknowledge = () => {
    // Clear any stored credentials or session data
    localStorage.removeItem('supabase.auth.token');
    sessionStorage.clear();
    
    // Close modal and redirect
    setBannedModal(false);
    router.push('/');
    router.refresh(); // Force a refresh to ensure clean state
  };

  // Prevent clicking outside from closing the modal
  const handleOverlayClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 z-[9999] flex items-center justify-center p-4" 
      onClick={handleOverlayClick}
    >
      <div className="bg-white rounded-lg p-6 max-w-md w-full shadow-xl" onClick={e => e.stopPropagation()}>
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
            {messages[bannedReason] || messages.default}
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
            onClick={handleAcknowledge}
            className="w-full bg-red-600 text-white py-3 px-4 rounded-md hover:bg-red-700 transition-colors font-medium"
          >
            I Understand
          </button>
          <p className="text-xs text-center text-gray-500">
            If you believe this is a mistake, please contact our support team for assistance.
          </p>
        </div>
      </div>
    </div>
  );
}