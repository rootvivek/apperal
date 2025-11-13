'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

interface AuthGuardProps {
  children: React.ReactNode;
  redirectTo?: string;
}

export default function AuthGuard({ children, redirectTo = '/login' }: AuthGuardProps) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [hasRedirected, setHasRedirected] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [skipLoading, setSkipLoading] = useState(false);
  const redirectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setMounted(true);
    
    // Quick check: if there's no Firebase auth persistence, user is definitely not logged in
    // Check Firebase auth state immediately to avoid showing loading
    if (typeof window !== 'undefined') {
      // Check if Firebase has any auth state persisted
      const checkFirebaseAuth = async () => {
        try {
          const { auth } = await import('@/lib/firebase/config');
          if (auth) {
            // Check current user synchronously if possible
            const currentUser = auth.currentUser;
            if (!currentUser) {
              // No current user, likely not logged in - skip loading and redirect
              setSkipLoading(true);
              const currentUrl = window.location.pathname;
              if (!hasRedirected) {
                setHasRedirected(true);
                router.push(`${redirectTo}?redirect=${encodeURIComponent(currentUrl)}`);
              }
            }
          }
        } catch (error) {
          // If we can't check, proceed normally
        }
      };
      
      checkFirebaseAuth();
    }
  }, [router, redirectTo, hasRedirected]);

  useEffect(() => {
    // Only redirect once auth is done loading and component is mounted
    if (mounted && !loading && !hasRedirected) {
      if (!user) {
        setHasRedirected(true);
        // Clear any pending timeout
        if (redirectTimeoutRef.current) {
          clearTimeout(redirectTimeoutRef.current);
        }
        // Get current URL to redirect back after login
        const currentUrl = window.location.pathname;
        router.push(`${redirectTo}?redirect=${encodeURIComponent(currentUrl)}`);
      }
    }
  }, [user, loading, router, redirectTo, hasRedirected, mounted]);

  // Don't show anything until mounted (prevents hydration issues)
  if (!mounted) {
    return null;
  }

  // If we've already redirected, don't show anything
  if (hasRedirected) {
    return null;
  }

  // If auth is done and no user, return null immediately (redirect is happening)
  if (!loading && !user) {
    return null;
  }

  // Show loading only if:
  // 1. Auth is loading
  // 2. We haven't skipped loading (no quick check found user is not logged in)
  // 3. We haven't redirected yet
  if (loading && !skipLoading && !hasRedirected) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // User is authenticated, show children
  if (user) {
    return <>{children}</>;
  }

  // Fallback: return null if no user
  return null;
}


