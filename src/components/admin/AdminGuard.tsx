'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase/client';
import { Spinner } from '@/components/ui/spinner';

interface AdminGuardProps {
  children: React.ReactNode;
}

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

      // If no user logged in, deny access
      if (!user) {
        setIsAdmin(false);
        setIsChecking(false);
        return;
      }

      try {
        // Check is_admin from user_profiles table (for Firebase phone auth)
        const { data: profile, error } = await supabase
          .from('user_profiles')
          .select('is_admin')
          .eq('id', user.id)
          .maybeSingle();

        if (error) {
          setIsAdmin(false);
          setIsChecking(false);
          return;
        }

        const adminStatus = profile?.is_admin === true;
        setIsAdmin(adminStatus);
        setIsChecking(false);
      } catch {
        setIsAdmin(false);
        setIsChecking(false);
      }
    };

    checkAdminAccess();
  }, [user, loading, supabase]);

  // Show loading while checking
  if (loading || isChecking) {
      return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-sm">
          <div className="text-center">
            <Spinner className="size-12 text-blue-600 mx-auto" />
            <p className="mt-4 text-gray-600">Loading...</p>
          </div>
        </div>
      );
  }

  // Show 404 if: no user logged in OR user is not admin
  if (!user || !isAdmin) {
    return <NotFoundPage router={router} />;
  }

  // Only render children if user is confirmed admin
  return <>{children}</>;
}
