import { useCallback } from 'react';
import type { Dispatch, SetStateAction } from 'react';

export interface AdminUser {
  id: string;
  full_name: string;
  phone: string;
  created_at: string;
  is_admin?: boolean;
  isAdmin?: boolean;
  is_active?: boolean;
  deleted_at?: string;
  total_orders?: number;
}

interface UseAdminUsersArgs {
  authUserId: string | null;
  activeTab: 'active' | 'deleted';
  setUsers: Dispatch<SetStateAction<AdminUser[]>>;
  setError: Dispatch<SetStateAction<string | null>>;
  setSuccess: Dispatch<SetStateAction<boolean>>;
}

export function useAdminUsersActions({
  authUserId,
  activeTab,
  setUsers,
  setError,
  setSuccess,
}: UseAdminUsersArgs) {
  const fetchUsers = useCallback(
    async (setLoading: (loading: boolean) => void) => {
      try {
        setLoading(true);

        if (!authUserId) {
          setError('No active session. Please log in again.');
          setLoading(false);
          return;
        }

        const url = `/api/admin/users?deleted=${
          activeTab === 'deleted' ? 'true' : 'false'
        }`;
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-User-Id': authUserId,
          },
          body: JSON.stringify({ userId: authUserId }),
        });

        const result = await response.json();

        if (!response.ok) {
          const errorMessage =
            result.error || result.details || 'Failed to fetch users';
          throw new Error(errorMessage);
        }

        setUsers(result.users || []);
        setError(null);
      } catch (error: any) {
        setUsers([]);
        setError(
          error?.message ||
            'Failed to fetch users. Please check your database permissions (RLS policies).',
        );
      } finally {
        setLoading(false);
      }
    },
    [authUserId, activeTab, setUsers, setError],
  );

  const deleteUser = useCallback(
    async (
      userToDelete: AdminUser,
      setDeletingUserId: (id: string | null) => void,
      refetch: () => Promise<void>,
      onModalClose?: () => void,
      selectedUserId?: string | null,
    ) => {
      try {
        setDeletingUserId(userToDelete.id);
        setError(null);
        setSuccess(false);

        if (!authUserId) {
          throw new Error('No active session. Please log in again.');
        }

        const response = await fetch('/api/admin/delete-user', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-User-Id': authUserId,
          },
          body: JSON.stringify({ userId: userToDelete.id }),
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || 'Failed to delete user');
        }

        await refetch();

        if (onModalClose && selectedUserId === userToDelete.id) {
          onModalClose();
        }

        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      } catch (error: any) {
        setError(
          error?.message ||
            'Failed to delete user. Please try again.',
        );
      } finally {
        setDeletingUserId(null);
      }
    },
    [authUserId, setError, setSuccess],
  );

  const reactivateUser = useCallback(
    async (
      userToReactivate: AdminUser,
      setReactivatingUserId: (id: string | null) => void,
      refetch: () => Promise<void>,
      onModalClose?: () => void,
      selectedUserId?: string | null,
      onTabChange?: (tab: 'active' | 'deleted') => void,
    ) => {
      try {
        setReactivatingUserId(userToReactivate.id);
        setError(null);
        setSuccess(false);

        if (!authUserId) {
          throw new Error('No active session. Please log in again.');
        }

        const response = await fetch('/api/admin/reactivate-user', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-User-Id': authUserId,
          },
          body: JSON.stringify({ userId: userToReactivate.id }),
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || 'Failed to reactivate user');
        }

        await refetch();

        if (onModalClose && selectedUserId === userToReactivate.id) {
          onModalClose();
        }

        if (onTabChange) {
          onTabChange('active');
        }
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      } catch (error: any) {
        setError(
          error?.message ||
            'Failed to reactivate user. Please try again.',
        );
      } finally {
        setReactivatingUserId(null);
      }
    },
    [authUserId, setError, setSuccess],
  );

  const toggleUserStatus = useCallback(
    async (
      targetUser: AdminUser,
      action: 'activate' | 'deactivate',
      setTogglingUserId: (id: string | null) => void,
      refetch: () => Promise<void>,
    ) => {
      try {
        setTogglingUserId(targetUser.id);

        if (!authUserId) {
          throw new Error('No active session. Please log in again.');
        }

        const res = await fetch('/api/admin/deactivate-user', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-User-Id': authUserId,
          },
          body: JSON.stringify({ userId: targetUser.id, action }),
        });
        const result = await res.json();
        if (!res.ok) throw new Error(result.error || 'Failed');

        await refetch();
      } finally {
        setTogglingUserId(null);
      }
    },
    [authUserId],
  );

  return {
    fetchUsers,
    deleteUser,
    reactivateUser,
    toggleUserStatus,
  };
}


