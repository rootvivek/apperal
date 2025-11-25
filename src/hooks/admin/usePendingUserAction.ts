import { useState, useCallback } from 'react';
import type { AdminUser } from './useAdminUsers';

type PendingActionType = 'delete' | 'reactivate' | 'toggle';

interface PendingAction {
  type: PendingActionType;
  user: AdminUser;
  toggleAction?: 'activate' | 'deactivate';
}

/**
 * Hook for managing pending user actions (delete, reactivate, toggle status)
 */
export function usePendingUserAction() {
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const [togglingUserId, setTogglingUserId] = useState<string | null>(null);
  const [reactivatingUserId, setReactivatingUserId] = useState<string | null>(null);

  const handleDeleteUser = useCallback((target: AdminUser) => {
    setPendingAction({ type: 'delete', user: target });
  }, []);

  const handleReactivateUser = useCallback((target: AdminUser) => {
    setPendingAction({ type: 'reactivate', user: target });
  }, []);

  const handleToggleUser = useCallback((target: AdminUser, action: 'activate' | 'deactivate') => {
    setPendingAction({ type: 'toggle', user: target, toggleAction: action });
  }, []);

  const clearPendingAction = useCallback(() => {
    setPendingAction(null);
  }, []);

  return {
    pendingAction,
    deletingUserId,
    togglingUserId,
    reactivatingUserId,
    setDeletingUserId,
    setTogglingUserId,
    setReactivatingUserId,
    handleDeleteUser,
    handleReactivateUser,
    handleToggleUser,
    clearPendingAction,
  };
}

