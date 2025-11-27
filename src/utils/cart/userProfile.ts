/**
 * User profile utilities for cart operations
 */

import { createClient } from '@/lib/supabase/client';
import { DB_ERROR_CODES, CART } from '@/constants';

interface User {
  id: string;
  phone?: string | null;
  user_metadata?: {
    full_name?: string | null;
  } | null;
}

/**
 * Ensures user profile exists before cart operations
 * Retries with exponential backoff if profile doesn't exist yet
 */
export async function ensureUserProfileExists(
  userId: string,
  user: User | null,
  maxRetries: number = CART.PROFILE_CHECK_MAX_RETRIES
): Promise<boolean> {
  const supabase = createClient();

  for (let i = 0; i < maxRetries; i++) {
    const { data: profile, error } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('id', userId)
      .maybeSingle();

    if (profile) {
      return true;
    }

    if (error && error.code !== DB_ERROR_CODES.NOT_FOUND) {
      // Continue retrying even on error (might be transient)
      if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, CART.PROFILE_CHECK_RETRY_WAIT * (i + 1)));
      }
      continue;
    }

    // If profile doesn't exist and we have user info, try to create it
    // Try creating on retries 1, 3, 5, 7, etc. to give AuthContext time first
    if (!profile && i > 0 && i % 2 === 1 && user) {
      try {
        const userPhone = user.phone || null;
        
        // Check if phone is already in use by an active profile
        if (userPhone) {
          const { data: phoneProfile } = await supabase
            .from('user_profiles')
            .select('id, deleted_at, is_active')
            .eq('phone', userPhone)
            .maybeSingle();

          if (phoneProfile) {
            if (phoneProfile.deleted_at) {
              // Hard delete the soft-deleted profile
              await supabase
                .from('user_profiles')
                .delete()
                .eq('id', phoneProfile.id);
            } else if (phoneProfile.is_active !== false && phoneProfile.id !== userId) {
              // Active profile with same phone but different user ID - skip creation
              // This will be handled by AuthContext
              continue;
            }
          }
        }
        
        // Try to create profile with minimal data
        const { error: createError } = await supabase
          .from('user_profiles')
          .insert({
            id: userId,
            full_name: user.user_metadata?.full_name || 'User',
            phone: userPhone,
          })
          .select();

        if (!createError) {
          // Profile created successfully, verify it exists
          await new Promise(resolve => setTimeout(resolve, 200));
          const { data: verifyProfile } = await supabase
            .from('user_profiles')
            .select('id')
            .eq('id', userId)
            .maybeSingle();
          
          if (verifyProfile) {
            return true;
          }
        } else if (createError.code === DB_ERROR_CODES.UNIQUE_VIOLATION) {
          // Duplicate key - profile was created by another process (likely AuthContext)
          // Wait a bit and verify it exists
          await new Promise(resolve => setTimeout(resolve, 300));
          const { data: verifyProfile } = await supabase
            .from('user_profiles')
            .select('id')
            .eq('id', userId)
            .maybeSingle();
          
          if (verifyProfile) {
            return true;
          }
        } else if (createError.code === DB_ERROR_CODES.FOREIGN_KEY_VIOLATION) {
          // Foreign key constraint - might be a transient issue, continue retrying
        }
      } catch {
        // Error handled silently - will retry
      }
    }

    // Wait before retrying (exponential backoff with longer initial wait)
    if (i < maxRetries - 1) {
      const waitTime = i === 0 ? CART.PROFILE_CHECK_INITIAL_WAIT : CART.PROFILE_CHECK_RETRY_WAIT * (i + 1);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }
  return false;
}

