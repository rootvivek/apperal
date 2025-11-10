import { createClient } from './client';

export async function checkUserActiveStatus(userId: string) {
  const supabase = createClient();
  
  const { data: profile, error } = await supabase
    .from('user_profiles')
    .select('is_active, deleted_at, deactivated_at')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    console.error('Error checking user status:', error);
    return { isActive: false, error: 'Failed to check user status' };
  }

  if (!profile) {
    return { isActive: true, error: null }; // New user, consider active
  }

  // Check both soft-delete and deactivation status
  const isActive = profile.is_active === true && !profile.deleted_at;
  
  return {
    isActive,
    error: !isActive ? 'Account is deactivated or deleted' : null
  };
}