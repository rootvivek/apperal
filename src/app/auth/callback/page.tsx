'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Suspense } from 'react';
import { Spinner } from '@/components/ui/spinner';

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();
  const [error, setError] = useState<string | null>(null);
  const [redirected, setRedirected] = useState(false);

  useEffect(() => {
    let subscription: any = null;
    let timeoutId: NodeJS.Timeout | null = null;
    let maxWaitTimeout: NodeJS.Timeout | null = null;
    
    const code = searchParams.get('code');
    const errorParam = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');
    const next = searchParams.get('next') ?? '/';

    // Handle OAuth errors from provider
    if (errorParam) {
      setError(errorParam);
      router.push(`/auth/auth-code-error?error=${encodeURIComponent(errorParam)}&description=${encodeURIComponent(errorDescription || 'Unknown error')}`);
      return;
    }

    // If there's a code, listen for auth state changes
    // Supabase will automatically exchange the code when the page loads
    if (code) {
      let sessionReceived = false;
      
      // Set up a listener for auth state changes
      const {
        data: { subscription: authSubscription },
      } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (redirected || sessionReceived) return;
        
        if (event === 'SIGNED_IN' && session?.user) {
          sessionReceived = true;
          setRedirected(true);
          
          // Update user profile for OAuth users (profile is created automatically by database trigger)
          const userId = session.user.id;
          const userMetadata = session.user.user_metadata || {};
          const displayName = userMetadata.full_name || userMetadata.name || 'User';
          
          // Update profile if metadata has changed (profile already exists from trigger)
          supabase
            .from('user_profiles')
            .update({
              full_name: displayName,
              updated_at: new Date().toISOString()
            })
            .eq('id', userId)
            .then(() => {
              // Profile updated successfully
            });
          
          // Redirect to the intended page
          router.push(next);
        } else if (event === 'SIGNED_OUT') {
          if (!redirected) {
            setRedirected(true);
            router.push(`/auth/auth-code-error?error=${encodeURIComponent('Authentication failed: User was signed out')}`);
          }
        } else if (event === 'TOKEN_REFRESHED' && !session) {
          // Don't treat this as an error immediately, wait for the timeout
        }
      });

      subscription = authSubscription;

      // Try to get session with multiple attempts
      const checkSession = async (attempt: number = 1) => {
        if (redirected || sessionReceived) return;
        
        try {
          const { data: { session }, error: sessionError } = await supabase.auth.getSession();
          
          if (sessionError) {
            console.error(`Error getting session (attempt ${attempt}):`, sessionError);
            // Don't fail immediately, wait for auth state change listener
            if (attempt < 3) {
              setTimeout(() => checkSession(attempt + 1), 1000);
            } else if (!redirected) {
              setRedirected(true);
              router.push(`/auth/auth-code-error?error=${encodeURIComponent(sessionError.message || 'Failed to get session after multiple attempts')}`);
            }
            return;
          }

          if (session?.user && !redirected && !sessionReceived) {
            sessionReceived = true;
            setRedirected(true);
            router.push(next);
          } else if (!session && attempt < 3) {
            // Session not ready yet, try again
            setTimeout(() => checkSession(attempt + 1), 1000);
          }
        } catch (err: any) {
          if (attempt >= 3 && !redirected) {
            setRedirected(true);
            router.push(`/auth/auth-code-error?error=${encodeURIComponent(err.message || 'Failed to complete authentication')}`);
          }
        }
      };

      // Start checking for session after a short delay
      timeoutId = setTimeout(() => checkSession(1), 500);
      
      // Maximum wait time before showing error (10 seconds)
      maxWaitTimeout = setTimeout(() => {
        if (!redirected && !sessionReceived) {
          setRedirected(true);
          router.push(`/auth/auth-code-error?error=${encodeURIComponent('Authentication timeout. Please try again.')}&description=${encodeURIComponent('The authentication process took too long. This might be due to network issues or configuration problems.')}`);
        }
      }, 10000);
    } else {
      // No code provided
      setError('No code provided');
      router.push(`/auth/auth-code-error?error=${encodeURIComponent('No authorization code provided')}&description=${encodeURIComponent('The OAuth provider did not return an authorization code. Please try signing in again.')}`);
    }

    // Cleanup
    return () => {
      if (subscription) {
        subscription.unsubscribe();
      }
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      if (maxWaitTimeout) {
        clearTimeout(maxWaitTimeout);
      }
    };
  }, [router, searchParams, supabase]);

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center">
        <div className="text-center">
          <div className="text-red-600 mb-4">Error: {error}</div>
          <a href="/login" className="text-blue-600 hover:underline">Return to Login</a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center">
      <div className="text-center">
        <Spinner className="size-12 text-blue-600" />
        <p className="mt-4 text-gray-600">Authenticating...</p>
        <p className="mt-4 text-gray-600">Completing authentication...</p>
      </div>
    </div>
  );
}

export default function AuthCallback() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center">
        <div className="text-center">
          <Spinner className="size-12 text-blue-600" />
        <p className="mt-4 text-gray-600">Authenticating...</p>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <AuthCallbackContent />
    </Suspense>
  );
}

