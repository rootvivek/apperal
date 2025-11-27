'use client';

import { createClient } from '@/lib/supabase/client';
import { normalizePhone } from '@/utils/phone';
import type { ProfileData } from './types';

/**
 * Creates or updates a user profile in Supabase
 * Also creates a default address if none exists
 */
export async function syncUserProfile(
  userId: string,
  phone: string,
  fullName?: string
): Promise<{ success: boolean; error?: string; profile?: ProfileData }> {
  if (!userId || !phone) {
    return { success: false, error: 'User ID and phone are required' };
  }

  try {
    const supabase = createClient();
    const userPhone = normalizePhone(phone);
    const displayName = fullName || 'User';

    // Check if profile exists
    const { data: existingProfile, error: fetchError } = await supabase
      .from('user_profiles')
      .select('id, deleted_at, is_active')
      .eq('id', userId)
      .maybeSingle();

    if (fetchError && fetchError.code !== 'PGRST116') {
      // PGRST116 is "no rows returned" which is expected for new users
      return { success: false, error: 'Failed to check existing profile' };
    }

    // If profile was deleted or deactivated, return error
    if (existingProfile) {
      if (existingProfile.deleted_at) {
        return { success: false, error: 'deleted' };
      }
      if ('is_active' in existingProfile && existingProfile.is_active === false) {
        return { success: false, error: 'deactivated' };
      }

      // Profile exists and is active, update it
      // Get current phone to check if it's actually changing
      const { data: currentProfile } = await supabase
        .from('user_profiles')
        .select('phone')
        .eq('id', userId)
        .maybeSingle();

      const currentPhone = currentProfile?.phone || null;
      const phoneChanged = userPhone !== currentPhone;

      // Only check for phone conflicts if the phone number is actually being changed
      if (phoneChanged && userPhone) {
        const { data: phoneProfile } = await supabase
          .from('user_profiles')
          .select('id, deleted_at, is_active')
          .eq('phone', userPhone)
          .maybeSingle();

        if (phoneProfile && phoneProfile.id !== userId && !phoneProfile.deleted_at && phoneProfile.is_active !== false) {
          return { 
            success: false, 
            error: 'This phone number is already registered. Please use a different number.' 
          };
        }
      }

      const { error: updateError } = await supabase
        .from('user_profiles')
        .update({
          full_name: displayName,
          phone: userPhone,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);

      if (updateError) {
        const isPhoneConflict = 
          updateError.code === '23505' || 
          updateError.message?.includes('phone') ||
          updateError.message?.includes('user_profiles_phone_key');
        
        if (isPhoneConflict) {
          return { 
            success: false, 
            error: 'This phone number is already registered. Please use a different number.' 
          };
        }
        return { success: false, error: 'Failed to update profile' };
      }

      // Ensure default address exists
      await ensureDefaultAddress(userId);
      return { success: true };
    }

    // Profile doesn't exist, create it
    // First, check if phone number is already in use by an active profile
    if (userPhone) {
      const { data: existingPhoneProfile } = await supabase
        .from('user_profiles')
        .select('id, deleted_at, is_active')
        .eq('phone', userPhone)
        .maybeSingle();

      if (existingPhoneProfile) {
        // If it's a soft-deleted profile, hard delete it
        if (existingPhoneProfile.deleted_at) {
          await supabase.from('user_profiles').delete().eq('id', existingPhoneProfile.id);
        } else if (existingPhoneProfile.is_active !== false && existingPhoneProfile.id !== userId) {
          // Active profile with same phone but different user ID - phone conflict
          return { 
            success: false, 
            error: 'This phone number is already registered. Please use a different number or contact support.' 
          };
        }
      }
    }

    // Create new profile
    const { data, error } = await supabase
      .from('user_profiles')
      .insert({
        id: userId,
        full_name: displayName,
        phone: userPhone,
      })
      .select()
      .single();

    if (error) {
      // Handle unique constraint violations
      const isUniqueConstraint = 
        error.code === '23505' || 
        error.message?.includes('unique') || 
        error.message?.includes('duplicate') ||
        error.message?.includes('user_profiles_phone_key');

      if (isUniqueConstraint) {
        // Check if profile already exists (race condition)
        const { data: existing } = await supabase
          .from('user_profiles')
          .select('id')
          .eq('id', userId)
          .maybeSingle();

        if (existing) {
          // Profile exists, this is fine
          await ensureDefaultAddress(userId);
          return { success: true };
        }

        // Phone conflict - check if it's a phone constraint
        if (userPhone && (error.message?.includes('phone') || error.message?.includes('user_profiles_phone_key'))) {
          const { data: phoneProfile } = await supabase
            .from('user_profiles')
            .select('id, deleted_at, is_active')
            .eq('phone', userPhone)
            .maybeSingle();

          if (phoneProfile) {
            if (phoneProfile.deleted_at) {
              // Soft-deleted profile - hard delete and retry
              await supabase.from('user_profiles').delete().eq('id', phoneProfile.id);
              const { data: retryData, error: retryError } = await supabase
                .from('user_profiles')
                .insert({
                  id: userId,
                  full_name: displayName,
                  phone: userPhone,
                })
                .select()
                .single();

              if (!retryError && retryData) {
                await ensureDefaultAddress(userId);
                return { success: true };
              }
            } else if (phoneProfile.id !== userId) {
              // Active profile with same phone - return error
              return { 
                success: false, 
                error: 'This phone number is already registered. Please use a different number or contact support.' 
              };
            }
          }
        }
      }
      return { success: false, error: 'Failed to create profile. Please try again.' };
    }

    // Profile created successfully, ensure default address
    if (data) {
      await ensureDefaultAddress(userId);
      return { success: true, profile: data as ProfileData };
    }

    return { success: false, error: 'Profile creation returned no data' };
  } catch (error) {
    return { success: false, error: 'Unexpected error during profile sync' };
  }
}

/**
 * Ensures user has a default address, creates one if none exists
 */
async function ensureDefaultAddress(userId: string): Promise<void> {
  try {
    const supabase = createClient();

    // Check if user has any addresses
    const { data: addresses } = await supabase
      .from('addresses')
      .select('id')
      .eq('user_id', userId)
      .limit(1);

    // If no addresses exist, create a default one
    if (!addresses || addresses.length === 0) {
      // Get user profile for default values
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('full_name, phone')
        .eq('id', userId)
        .maybeSingle();

      await supabase.from('addresses').insert({
        user_id: userId,
        address_line1: '',
        city: '',
        state: '',
        zip_code: '',
        full_name: profile?.full_name || null,
        phone: profile?.phone ? parseInt(profile.phone, 10) : null,
        is_default: true,
      });
    } else {
      // Check if any address is marked as default
      const { data: defaultAddress } = await supabase
        .from('addresses')
        .select('id')
        .eq('user_id', userId)
        .eq('is_default', true)
        .limit(1)
        .maybeSingle();

      // If no default address, set the first one as default
      if (!defaultAddress && addresses.length > 0) {
        await supabase
          .from('addresses')
          .update({ is_default: true })
          .eq('id', addresses[0].id);
      }
    }
  } catch {
    // Silently fail - address creation is not critical
  }
}

/**
 * Checks if a user profile is active (not deleted or deactivated)
 */
export async function checkUserStatus(
  userId: string
): Promise<{ isActive: boolean; reason?: 'deleted' | 'deactivated' }> {
  try {
    const supabase = createClient();
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('id, deleted_at, is_active')
      .eq('id', userId)
      .maybeSingle();

    if (!profile) {
      return { isActive: false, reason: 'deleted' };
    }

    if (profile.deleted_at) {
      return { isActive: false, reason: 'deleted' };
    }

    if ('is_active' in profile && profile.is_active === false) {
      return { isActive: false, reason: 'deactivated' };
    }

    return { isActive: true };
  } catch {
    return { isActive: false, reason: 'deactivated' };
  }
}
