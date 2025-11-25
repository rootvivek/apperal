import type { AdminUser } from '@/hooks/admin/useAdminUsers';

/**
 * Filters users based on search query
 */
export function filterUsers(users: AdminUser[], search: string): AdminUser[] {
  if (!search) return users;
  
  const searchLower = search.toLowerCase();
  return users.filter(user => 
    user.full_name?.toLowerCase().includes(searchLower) ||
    user.phone?.toLowerCase().includes(searchLower)
  );
}

