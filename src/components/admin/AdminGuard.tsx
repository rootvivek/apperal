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

// 404 Page Component
function NotFoundPage({ router }: { router: any }) {
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

export default function AdminGuard({ children }: AdminGuardProps) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const supabase = createClient();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const checkAdminAccess = async () => {
      // Wait for auth to finish loading
      if (loading) {
        return;
      }

      // If no user logged in, deny access (will show 404)
      if (!user) {
        setIsAdmin(false);
        setIsChecking(false);
        return;
      }

      // If no admin phone configured, deny access
      if (!ADMIN_PHONE) {
        setIsAdmin(false);
        setIsChecking(false);
        return;
      }

      try {
        // Fetch user profile to get phone number
        const { data: profile, error } = await supabase
          .from('user_profiles')
          .select('phone')
          .eq('id', user.id)
          .maybeSingle();

        // If error fetching profile, deny access
        if (error) {
          setIsAdmin(false);
          setIsChecking(false);
          return;
        }

        // Get user phone from profile or user metadata
        const userPhone = profile?.phone || user.phone || user.user_metadata?.phone || '';
        
        // Normalize phone numbers (remove non-digits) and compare last 10 digits
        const normalizedUserPhone = userPhone.replace(/\D/g, '');
        const normalizedAdminPhone = ADMIN_PHONE.replace(/\D/g, '');
        const userLast10 = normalizedUserPhone.slice(-10);
        const adminLast10 = normalizedAdminPhone.slice(-10);
        
        // Check if user has admin access (last 10 digits must match)
        const hasAdminAccess = userLast10 === adminLast10 && userLast10.length === 10;

        setIsAdmin(hasAdminAccess);
        setIsChecking(false);
      } catch {
        // Any error means access is denied
        setIsAdmin(false);
        setIsChecking(false);
      }
    };

    checkAdminAccess();
  }, [user, loading, supabase]);

  // Show loading while checking
  if (loading || isChecking) {
      return <LoadingLogo fullScreen text="Loading..." />;
  }

  // Show 404 if: no user logged in OR user is not admin
  if (!user || !isAdmin) {
    return <NotFoundPage router={router} />;
  }

  // Only render children if user is confirmed admin
  return <>{children}</>;
}
