'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';

interface User {
  id: string;
  phone?: string | null;
  user_metadata?: {
    phone?: string;
    is_admin?: boolean;
  };
}

export function useUserInfo(user: User | null) {
  const [userFullName, setUserFullName] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const supabase = createClient();

  // Check if user is admin - from user_profiles table (for Firebase phone auth)
  const checkAdminStatus = useCallback(async () => {
    if (!user) {
      setIsAdmin(false);
      return;
    }

    try {
      const { data: profile, error } = await supabase
        .from('user_profiles')
        .select('is_admin')
        .eq('id', user.id)
        .maybeSingle();

      if (error) {
        setIsAdmin(false);
        return;
      }

      // Check is_admin from user_profiles table
      const adminStatus = profile?.is_admin === true;
      setIsAdmin(adminStatus);
    } catch (error) {
      setIsAdmin(false);
    }
  }, [user, supabase]);

  useEffect(() => {
    checkAdminStatus();
  }, [checkAdminStatus]);

  // Listen for profile updates
  useEffect(() => {
    const handleProfileUpdate = () => {
      // Always re-check admin status when profile is updated
      // This ensures admin status is refreshed even if set via API
      checkAdminStatus();
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('profileUpdated', handleProfileUpdate as EventListener);
      // Also listen for admin status updates specifically
      window.addEventListener('adminStatusUpdated', handleProfileUpdate as EventListener);
      return () => {
        window.removeEventListener('profileUpdated', handleProfileUpdate as EventListener);
        window.removeEventListener('adminStatusUpdated', handleProfileUpdate as EventListener);
      };
    }
  }, [checkAdminStatus]);

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

