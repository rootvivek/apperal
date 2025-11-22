'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Spinner } from '@/components/ui/spinner';
import { createClient } from '@/lib/supabase/client';

interface AuthGuardProps {
  children: React.ReactNode;
  redirectTo?: string;
  roles?: string[];
}

export default function AuthGuard({ children, redirectTo = '/login', roles = [] }: AuthGuardProps) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [checkingRole, setCheckingRole] = useState(false);
  const [hasRole, setHasRole] = useState<boolean | null>(null);
  const hasRedirectedRef = useRef(false);
  const supabase = createClient();

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!mounted || loading || !user || roles.length === 0) {
      setHasRole(null);
      return;
    }
    const checkRole = async () => {
      setCheckingRole(true);
      try {
        if (roles.includes('admin')) {
          const ADMIN_PHONE = process.env.NEXT_PUBLIC_ADMIN_PHONE;
          if (!ADMIN_PHONE) {
            setHasRole(false);
            setCheckingRole(false);
            return;
          }
          const { data: profile } = await supabase.from('user_profiles').select('phone').eq('id', user.id).maybeSingle();
          const userPhone = profile?.phone || user.phone || user.user_metadata?.phone || '';
          const normalizedUserPhone = userPhone.replace(/\D/g, '').slice(-10);
          const normalizedAdminPhone = ADMIN_PHONE.replace(/\D/g, '').slice(-10);
          setHasRole(normalizedUserPhone === normalizedAdminPhone && normalizedUserPhone.length === 10);
        } else {
          setHasRole(false);
        }
      } catch {
        setHasRole(false);
      } finally {
        setCheckingRole(false);
      }
    };
    checkRole();
  }, [mounted, loading, user, roles, supabase]);

  useEffect(() => {
    if (!mounted || loading || checkingRole || hasRedirectedRef.current) return;

    if (!user) {
      hasRedirectedRef.current = true;
      router.replace(`${redirectTo}?redirect=${encodeURIComponent(pathname)}`);
      return;
    }

    if (roles.length > 0 && hasRole === false) {
      hasRedirectedRef.current = true;
      router.replace('/unauthorized');
      return;
    }

    if (roles.length === 0 || hasRole === true) {
      hasRedirectedRef.current = false;
    }
  }, [mounted, loading, user, roles, hasRole, checkingRole, router, redirectTo, pathname]);

  if (!mounted) return null;

  if (loading || checkingRole) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-sm">
        <div className="text-center">
          <Spinner className="size-12 text-blue-600 mx-auto" />
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (hasRedirectedRef.current || !user || (roles.length > 0 && hasRole === false)) {
    return null;
  }

  return <>{children}</>;
}
