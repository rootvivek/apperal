import { useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { normalizePhone } from '@/utils/phone';
import type { User } from '@/utils/auth/types';

export interface UserProfile {
  id: string;
  full_name: string | null;
  phone: string | null;
  is_admin?: boolean | null;
  created_at: string;
  updated_at: string;
}

/**
 * Hook for fetching and managing user profile data
 */
export function useProfileData(user: User | null) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  const fetchProfile = useCallback(async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (fetchError) {
        throw fetchError;
      }

      if (data) {
        setProfile(data);
      } else {
        // Profile doesn't exist, create one for the user
        const userPhone = user.phone ? normalizePhone(user.phone) : null;
        
        // Check if phone is already in use (race condition protection)
        if (userPhone) {
          const { data: phoneProfile } = await supabase
            .from('user_profiles')
            .select('id, deleted_at, is_active')
            .eq('phone', userPhone)
            .maybeSingle();

          if (phoneProfile && !phoneProfile.deleted_at && phoneProfile.is_active !== false) {
            // Phone already in use - fetch that profile instead
            if (phoneProfile.id === user.id) {
              // Same user, just fetch the profile
              const { data: existingProfile } = await supabase
                .from('user_profiles')
                .select('*')
                .eq('id', user.id)
                .maybeSingle();
              
              if (existingProfile) {
                setProfile(existingProfile);
                return;
              }
            } else {
              // Different user has this phone - skip creation, use in-memory profile
              setProfile({
                id: user.id,
                full_name: user.user_metadata?.full_name || null,
                phone: null, // Don't set phone if it conflicts
                is_admin: false,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              });
              return;
            }
          }
        }

        const insertQuery = supabase
          .from('user_profiles')
          .insert({
            id: user.id,
            full_name: user.user_metadata?.full_name || user.user_metadata?.first_name || 'User',
            phone: userPhone,
            is_admin: false,
          })
          .select();
        
        const insertResult = await insertQuery;

        if (insertResult.error) {
          // Handle unique constraint violations
          const isPhoneConflict = 
            insertResult.error.code === '23505' || 
            insertResult.error.message?.includes('phone') ||
            insertResult.error.message?.includes('user_profiles_phone_key');

          // If insert fails, try to fetch existing profile
          const { data: existingProfile } = await supabase
              .from('user_profiles')
              .select('*')
              .eq('id', user.id)
              .maybeSingle();
            
          if (existingProfile) {
            setProfile(existingProfile);
          } else if (isPhoneConflict) {
            // Phone conflict - use in-memory profile without phone
            setProfile({
              id: user.id,
              full_name: user.user_metadata?.full_name || null,
              phone: null,
              is_admin: false,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            });
          } else {
            // Fall back to in-memory profile
            setProfile({
              id: user.id,
              full_name: user.user_metadata?.full_name || null,
              phone: userPhone,
              is_admin: false,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            });
          }
        } else if (insertResult.data && insertResult.data.length > 0) {
          setProfile(insertResult.data[0]);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  }, [user?.id, supabase]);

  const updateProfile = useCallback(async (fullName: string, phone: string) => {
    if (!user?.id) return false;

    try {
      setError(null);

      // Normalize phone number before saving (10 digits only)
      const phoneStr = typeof phone === 'string' ? phone : '';
      const normalizedPhone = phoneStr.trim() ? normalizePhone(phoneStr.trim()) : null;
      
      // Get current profile to check if phone is actually changing
      const { data: currentProfile } = await supabase
        .from('user_profiles')
        .select('phone')
        .eq('id', user.id)
        .maybeSingle();

      const currentPhone = currentProfile?.phone || null;
      const phoneChanged = normalizedPhone !== currentPhone;
      
      // Only check for phone conflicts if the phone number is actually being changed
      if (phoneChanged && normalizedPhone) {
        const { data: phoneProfile } = await supabase
          .from('user_profiles')
          .select('id, deleted_at, is_active')
          .eq('phone', normalizedPhone)
          .maybeSingle();

        if (phoneProfile && phoneProfile.id !== user.id && !phoneProfile.deleted_at && phoneProfile.is_active !== false) {
          setError('This phone number is already registered. Please use a different number.');
          return false;
        }
      }
      
      const { error: updateError } = await supabase
        .from('user_profiles')
        .update({
          full_name: fullName.trim() || null,
          phone: normalizedPhone || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (updateError) {
        const isPhoneConflict = 
          updateError.code === '23505' || 
          updateError.message?.includes('phone') ||
          updateError.message?.includes('user_profiles_phone_key');
        
        if (isPhoneConflict) {
          setError('This phone number is already registered. Please use a different number.');
        } else {
          setError(updateError.message || 'Failed to update profile');
        }
        return false;
      }

      // Update local state
      if (profile) {
        setProfile({
          ...profile,
          full_name: fullName.trim() || null,
          phone: normalizedPhone || null,
        });
      }

      // Dispatch custom event to notify Navigation component to refresh user name
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('profileUpdated', {
          detail: { full_name: fullName.trim() || null }
        }));
      }

      return true;
    } catch (err: any) {
      setError(err.message || 'Failed to update profile');
      return false;
    }
  }, [user?.id, profile, supabase]);

  return {
    profile,
    loading,
    error,
    setError,
    fetchProfile,
    updateProfile,
    setProfile,
  };
}

