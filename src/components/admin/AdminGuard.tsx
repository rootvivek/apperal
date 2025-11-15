'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase/client';
import LoadingLogo from '@/components/LoadingLogo';

interface AdminGuardProps {
  children: React.ReactNode;
}

// Admin phone number - only this user can access admin panel
const ADMIN_PHONE = process.env.NEXT_PUBLIC_ADMIN_PHONE;
if (!ADMIN_PHONE) {
  console.error('NEXT_PUBLIC_ADMIN_PHONE environment variable is required');
}

export default function AdminGuard({ children }: AdminGuardProps) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const supabase = createClient();
  const [isChecking, setIsChecking] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [accessDenied, setAccessDenied] = useState(false);

  useEffect(() => {
    const checkAdminAccess = async () => {
      // Always start with checking state
      setIsChecking(true);
      setAccessDenied(false);

      // Wait for auth to finish loading
      if (loading) {
        return;
      }

      // If no user, redirect to login immediately
      if (!user) {
        router.replace('/login?redirect=/admin');
        return;
      }

      try {
        // Fetch user profile to get phone number
        const { data: profile, error } = await supabase
          .from('user_profiles')
          .select('phone')
          .eq('id', user.id)
          .maybeSingle();

        if (error) {
          setAccessDenied(true);
          setIsAdmin(false);
          setIsChecking(false);
          return;
        }

        // Check if phone number matches admin phone
        const userPhone = profile?.phone || user.phone || user.user_metadata?.phone || '';
        const normalizedUserPhone = userPhone.replace(/\D/g, ''); // Remove all non-digits
        const normalizedAdminPhone = ADMIN_PHONE.replace(/\D/g, '');

        // Strict matching - only exact match for security
        const hasAdminAccess = ADMIN_PHONE && normalizedUserPhone === normalizedAdminPhone;

        if (!hasAdminAccess) {
          setAccessDenied(true);
          setIsAdmin(false);
        } else {
          setIsAdmin(true);
        }
        setIsChecking(false);
      } catch (error) {
        setAccessDenied(true);
        setIsAdmin(false);
        setIsChecking(false);
      }
    };

    checkAdminAccess();
  }, [user, loading, router, supabase]);

  // Show loading while checking
  if (loading || isChecking) {
      return <LoadingLogo fullScreen text="Loading..." />;
  }

  // If no user, don't render anything (will redirect)
  if (!user) {
    return null;
  }

  // If access denied or not admin, show 404 page
  if (accessDenied || !isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <h1 className="text-9xl font-bold text-gray-300 mb-4">404</h1>
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Page Not Found</h2>
          <p className="text-gray-600 mb-8">
            The page you&apos;re looking for doesn&apos;t exist or has been moved.
          </p>
          <button
            onClick={() => router.push('/')}
            className="inline-flex items-center px-6 py-3 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-[#4736FE] hover:bg-[#3a2dd4] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#4736FE]"
          >
            ← Back to Home
          </button>
        </div>
      </div>
    );
  }

  // Only render children if user is confirmed admin
  return <>{children}</>;
}
