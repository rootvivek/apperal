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
      const { error: updateError } = await supabase
        .from('user_profiles')
        .update({
          full_name: displayName,
          phone: userPhone,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);

      if (updateError) {
        return { success: false, error: 'Failed to update profile' };
      }

      // Ensure default address exists
      await ensureDefaultAddress(userId);
      return { success: true };
    }

    // Profile doesn't exist, create it
    // First, check for soft-deleted profiles with same phone
    if (userPhone) {
      const { data: profilesWithPhone } = await supabase
        .from('user_profiles')
        .select('id, deleted_at')
        .eq('phone', userPhone);

      if (profilesWithPhone) {
        const deletedProfile = profilesWithPhone.find((p) => p.deleted_at !== null);
        if (deletedProfile) {
          // Hard delete the soft-deleted profile
          await supabase.from('user_profiles').delete().eq('id', deletedProfile.id);
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
      if (error.code === '23505') {
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

        // Phone conflict - try to resolve
        if (userPhone && error.message?.includes('phone')) {
          const { data: phoneProfile } = await supabase
            .from('user_profiles')
            .select('id, deleted_at')
            .eq('phone', userPhone)
            .maybeSingle();

          if (phoneProfile && (phoneProfile.deleted_at || phoneProfile.id !== userId)) {
            // Delete conflicting profile and retry
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
          }
        }
      }
      return { success: false, error: 'Failed to create profile' };
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
