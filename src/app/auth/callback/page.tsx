'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Suspense } from 'react';

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();
  const [error, setError] = useState<string | null>(null);
  const [redirected, setRedirected] = useState(false);

  useEffect(() => {
    let subscription: any = null;
    let timeoutId: NodeJS.Timeout | null = null;
    
    const code = searchParams.get('code');
    const errorParam = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');
    const next = searchParams.get('next') ?? '/';

    // Handle OAuth errors from provider
    if (errorParam) {
      console.error('OAuth error:', errorParam, errorDescription);
      router.push(`/auth/auth-code-error?error=${encodeURIComponent(errorParam)}&description=${encodeURIComponent(errorDescription || 'Unknown error')}`);
      return;
    }

    // If there's a code, listen for auth state changes
    // Supabase will automatically exchange the code when the page loads
    if (code) {
      // Set up a listener for auth state changes
      const {
        data: { subscription: authSubscription },
      } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (redirected) return;
        
        if (event === 'SIGNED_IN' && session?.user) {
          setRedirected(true);
          
          // Update user profile for OAuth users (profile is created automatically by database trigger)
          const userId = session.user.id;
          const userEmail = session.user.email || '';
          const userMetadata = session.user.user_metadata || {};
          const displayName = userMetadata.full_name || userMetadata.name || 'User';
          
          // Update profile if metadata has changed (profile already exists from trigger)
          supabase
            .from('user_profiles')
            .update({
              email: userEmail,
              full_name: displayName,
              updated_at: new Date().toISOString()
            })
            .eq('id', userId)
            .then((result: any) => {
              if (result.error) {
                // Silently fail - profile might not exist yet (race condition with trigger)
                // The trigger will create it, and this update will work on next OAuth login
                console.log('Profile update skipped (will be handled by trigger):', result.error.message);
              } else {
                console.log('✅ User profile updated for OAuth user!');
              }
            });
          
          // Redirect to the intended page
          router.push(next);
        } else if (event === 'SIGNED_OUT' || (event === 'TOKEN_REFRESHED' && !session)) {
          // If we're signed out or token refresh failed, show error
          if (!redirected) {
            setRedirected(true);
            router.push(`/auth/auth-code-error?error=${encodeURIComponent('Authentication failed')}`);
          }
        }
      });

      subscription = authSubscription;

      // Also try to get session immediately (with timeout)
      timeoutId = setTimeout(async () => {
        if (redirected) return;
        
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('Error getting session:', sessionError);
          if (!redirected) {
            setRedirected(true);
            router.push(`/auth/auth-code-error?error=${encodeURIComponent(sessionError.message || 'Failed to get session')}`);
          }
          return;
        }

        if (session?.user && !redirected) {
          setRedirected(true);
          router.push(next);
        }
      }, 1000);
    } else {
      // No code provided
      router.push(`/auth/auth-code-error?error=${encodeURIComponent('No code provided')}`);
    }

    // Cleanup
    return () => {
      if (subscription) {
        subscription.unsubscribe();
      }
      if (timeoutId) {
        clearTimeout(timeoutId);
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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
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
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <AuthCallbackContent />
    </Suspense>
  );
}

