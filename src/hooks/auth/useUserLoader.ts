import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { User } from '@/utils/auth/types';

interface UseUserLoaderReturn {
  user: User | null;
  loading: boolean;
  error: string | null;
  banned: { show: boolean; reason: string };
  lastUserIdRef: React.MutableRefObject<string | null>;
}

/**
 * Hook for loading user from localStorage and validating against database
 */
export function useUserLoader(): UseUserLoaderReturn {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [banned, setBanned] = useState<{ show: boolean; reason: string }>({ show: false, reason: '' });
  const lastUserIdRef = useRef<string | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;

    const loadUser = async () => {
      try {
        if (typeof window === 'undefined') {
          setLoading(false);
          return;
        }

        // Check localStorage for user session
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
          try {
            const parsedUser = JSON.parse(storedUser) as User;
            
            // Verify user still exists and is active
            const supabase = createClient();
            const { data: profile, error: profileError } = await supabase
              .from('user_profiles')
              .select('id, full_name, phone, deleted_at, is_active')
              .eq('id', parsedUser.id)
              .maybeSingle();

            if (profileError || !profile) {
              // User doesn't exist, clear storage
              localStorage.removeItem('user');
              setUser(null);
              setLoading(false);
              setError(null);
              setBanned({ show: false, reason: '' });
              return;
            }

            // Check if user is deleted or deactivated
            if (profile.deleted_at) {
              localStorage.removeItem('user');
              setUser(null);
              setLoading(false);
              setError(null);
              setBanned({ show: true, reason: 'deleted' });
              return;
            }

            if (profile.is_active === false) {
              localStorage.removeItem('user');
              setUser(null);
              setLoading(false);
              setError(null);
              setBanned({ show: true, reason: 'deactivated' });
              return;
            }

            // User is valid, update state
            const mappedUser: User = {
              id: profile.id,
              phone: profile.phone,
              user_metadata: {
                full_name: profile.full_name,
                phone: profile.phone || undefined,
              },
            };

            setUser(mappedUser);
            setLoading(false);
            setError(null);
            setBanned({ show: false, reason: '' });
            lastUserIdRef.current = mappedUser.id;
          } catch {
            // Invalid stored user, clear it
            localStorage.removeItem('user');
            setLoading(false);
          }
        } else {
          setLoading(false);
        }
      } catch {
        setLoading(false);
      }
    };

    loadUser();

    return () => {
      mountedRef.current = false;
    };
  }, []);

  return {
    user,
    loading,
    error,
    banned,
    lastUserIdRef,
  };
}

