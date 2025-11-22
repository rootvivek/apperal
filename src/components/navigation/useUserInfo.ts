'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';

const ADMIN_PHONE = process.env.NEXT_PUBLIC_ADMIN_PHONE;

interface User {
  id: string;
  phone?: string | null;
  user_metadata?: {
    phone?: string;
  };
}

export function useUserInfo(user: User | null) {
  const [userFullName, setUserFullName] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const supabase = createClient();

  // Check if user is admin
  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!user || !ADMIN_PHONE) {
        setIsAdmin(false);
        return;
      }

      try {
        const { data: profile, error } = await supabase
          .from('user_profiles')
          .select('phone')
          .eq('id', user.id)
          .maybeSingle();

        if (error) {
          setIsAdmin(false);
          return;
        }

        const userPhone = profile?.phone || user.phone || user.user_metadata?.phone || '';
        const normalizedUserPhone = userPhone.replace(/\D/g, '');
        const normalizedAdminPhone = ADMIN_PHONE.replace(/\D/g, '');
        const userLast10 = normalizedUserPhone.slice(-10);
        const adminLast10 = normalizedAdminPhone.slice(-10);
        
        const hasAdminAccess = userLast10 === adminLast10 && userLast10.length === 10;
        setIsAdmin(hasAdminAccess);
      } catch (error) {
        setIsAdmin(false);
      }
    };

    checkAdminStatus();
  }, [user, supabase]);

  // Fetch user's full name from Supabase profile
  const fetchUserFullName = useCallback(async () => {
    if (!user?.id) {
      setUserFullName(null);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('full_name')
        .eq('id', user.id)
        .maybeSingle();

      if (!error && data?.full_name) {
        setUserFullName(data.full_name);
      } else {
        setUserFullName(null);
      }
    } catch (error) {
      // Error handled silently
      setUserFullName(null);
    }
  }, [user?.id, supabase]);

  useEffect(() => {
    fetchUserFullName();
  }, [fetchUserFullName]);

  // Listen for profile updates
  useEffect(() => {
    const handleProfileUpdate = (event: CustomEvent) => {
      if (event.detail?.full_name !== undefined) {
        setUserFullName(event.detail.full_name);
      } else {
        // If no name in event, refetch from database
        fetchUserFullName();
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('profileUpdated', handleProfileUpdate as EventListener);
      return () => {
        window.removeEventListener('profileUpdated', handleProfileUpdate as EventListener);
      };
    }
  }, [fetchUserFullName]);

  return {
    userFullName,
    isAdmin,
  };
}

