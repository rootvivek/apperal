'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();
  const [verifying, setVerifying] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    let subscription: any = null;
    let timeoutId: NodeJS.Timeout | null = null;
    let hasRedirected = false;

    const updateUserProfile = async (userId: string, email: string, metadata: any) => {
      const displayName = metadata.full_name || metadata.name || 'User';
      
      // Update profile (profile is created automatically by database trigger on signup)
      // This update ensures metadata is current after email verification
      const { error: updateError } = await supabase
        .from('user_profiles')
        .update({
          email: email,
          full_name: displayName,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);
      
      if (updateError) {
        // Silently fail - profile might not exist yet (race condition with trigger)
        // The trigger will create it, and this update will work on next verification
        console.log('Profile update skipped (will be handled by trigger):', updateError.message);
      } else {
        console.log('✅ User profile updated after email verification!');
      }
    };

    const handleVerification = async (session: any) => {
      if (hasRedirected) return;
      
      if (session?.user?.id) {
        hasRedirected = true;
        
        // Update user profile (created automatically by database trigger)
        await updateUserProfile(
          session.user.id,
          session.user.email || '',
          session.user.user_metadata || {}
        );

        setSuccess(true);
        setVerifying(false);

        // Get redirect URL from localStorage or default to home
        const redirectTo = localStorage.getItem('signup-redirect') || '/';
        localStorage.removeItem('signup-redirect');

        // Wait a moment to show success message, then redirect
        setTimeout(() => {
          router.push(redirectTo);
        }, 2000);
      }
    };

    // Listen for auth state changes (Supabase automatically handles hash tokens)
    const { data: { subscription: authSubscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session) {
        await handleVerification(session);
      }
    });

    subscription = authSubscription;

    // Also check for existing session immediately
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session && !hasRedirected) {
        handleVerification(session);
      }
    });

    // Check URL hash for tokens (Supabase email links use hash fragments)
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const token = hashParams.get('token');
    const type = hashParams.get('type');
    
    // Also check query params as fallback
    const tokenQuery = searchParams.get('token');
    const typeQuery = searchParams.get('type');
    
    const verificationToken = token || tokenQuery;
    const verificationType = (type || typeQuery || 'email') as any;

    // If we have a token in the hash, Supabase will automatically handle it
    // The onAuthStateChange listener will handle the verification automatically
    // No need to manually verify here

    // Set a timeout to show error if nothing happens
    timeoutId = setTimeout(() => {
      if (!hasRedirected && verifying) {
        setError('Verification timeout. Please check your email and try the link again.');
        setVerifying(false);
      }
    }, 10000);

    return () => {
      if (subscription) {
        subscription.unsubscribe();
      }
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [router, searchParams, supabase]);

  if (verifying) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Verifying your email...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                <svg className="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
                Verification Failed
              </h2>
              <p className="mt-2 text-center text-sm text-gray-600">
                {error}
              </p>
              <div className="mt-6">
                <a
                  href="/login"
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                >
                  Go to Login
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
                <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
                Email Verified Successfully!
              </h2>
              <p className="mt-2 text-center text-sm text-gray-600">
                Your account has been verified and you are now logged in.
              </p>
              <p className="mt-2 text-center text-sm text-gray-600">
                Redirecting you...
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <VerifyEmailContent />
    </Suspense>
  );
}

