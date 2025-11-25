'use client';

import { useState, useEffect } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import AdminGuard from '@/components/admin/AdminGuard';
import DataTable from '@/components/DataTable';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Alert from '@/components/ui/alert';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog';
import { useAuth } from '@/contexts/AuthContext';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';
import { UserDetailsModal } from '@/components/admin/users/UserDetailsModal';
import {
  AdminUser,
  useAdminUsersActions,
} from '@/hooks/admin/useAdminUsers';
import { useAdminUserDetails } from '@/hooks/admin/useAdminUserDetails';
import { usePendingUserAction } from '@/hooks/admin/usePendingUserAction';
import { filterUsers } from '@/utils/admin/filterUsers';
import {
  formatAdminDateShort,
  formatAdminCurrency,
} from '@/utils/adminFormat';

export default function UsersPage() {
  const { user, loading: authLoading } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'active' | 'deleted'>('active');
  
  // User details management
  const {
    selectedUser,
    showUserDetails,
    userOrders,
    userCartItems,
    userWishlistItems,
    userDetailsTab,
    setUserDetailsTab,
    fetchUserDetails,
    closeUserDetails,
  } = useAdminUserDetails();

  // Pending action management
  const {
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
  } = usePendingUserAction();
  
  // Lock body scroll when modal is open
  useBodyScrollLock(showUserDetails);

  const { fetchUsers, deleteUser, reactivateUser, toggleUserStatus } =
    useAdminUsersActions({
      authUserId: user?.id || null,
      activeTab,
      setUsers,
      setError,
      setSuccess,
    });

  useEffect(() => {
    // Wait for auth to finish loading before fetching users
    if (!authLoading) {
      fetchUsers(setLoading);
    }
  }, [authLoading, user?.id, activeTab, fetchUsers]);

  const executePendingAction = async () => {
    if (!pendingAction) return;
    const target = pendingAction.user;

    if (pendingAction.type === 'delete') {
      await deleteUser(
        target,
        setDeletingUserId,
        () => fetchUsers(setLoading),
        closeUserDetails,
        selectedUser?.id || null,
      );
    } else if (pendingAction.type === 'reactivate') {
      await reactivateUser(
        target,
        setReactivatingUserId,
        () => fetchUsers(setLoading),
        closeUserDetails,
        selectedUser?.id || null,
        setActiveTab,
      );
    } else if (pendingAction.type === 'toggle' && pendingAction.toggleAction) {
      await toggleUserStatus(
        target,
        pendingAction.toggleAction,
        setTogglingUserId,
        () => fetchUsers(setLoading),
      );
    }

    clearPendingAction();
  };

  const filteredUsers = filterUsers(users, search);

  const formatDate = formatAdminDateShort;
  const formatCurrency = formatAdminCurrency;

  return (
    <AdminGuard>
      <AdminLayout>
        <div className="space-y-1">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
            <p className="text-gray-600">View and manage all registered users</p>
          </div>

          <div className="bg-white rounded-lg shadow p-1">
            {error && (
              <div className="mb-1">
                <Alert
                  variant="error"
                  title="Error loading users"
                  message={error}
                  onClose={() => setError(null)}
                />
                <div className="mt-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fetchUsers(setLoading)}
                >
                  Try again
                  </Button>
                </div>
              </div>
            )}
            
            {success && (
              <div className="mb-1">
                <Alert
                  variant="success"
                  message={
                    activeTab === 'deleted'
                  ? 'User account reactivated successfully! User can now log in again.'
                      : 'User deleted successfully!'
                  }
                  autoDismiss={3000}
                  onClose={() => setSuccess(false)}
                />
              </div>
            )}
            
            {/* Tabs for Active/Deleted Users */}
            <div className="mb-6 border-b border-gray-200">
              <nav className="flex gap-1" aria-label="Tabs">
                <button
                  onClick={() => {
                    setActiveTab('active');
                    setSearch('');
                  }}
                  className={`py-1 px-0.5 border-b-2 font-medium text-xs ${
                    activeTab === 'active'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Active Users
                </button>
                <button
                  onClick={() => {
                    setActiveTab('deleted');
                    setSearch('');
                  }}
                  className={`py-1 px-0.5 border-b-2 font-medium text-xs ${
                    activeTab === 'deleted'
                      ? 'border-red-500 text-red-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Deleted Users
                </button>
              </nav>
            </div>
            
            <div className="flex items-center justify-between mb-4 gap-2">
              <div className={`px-1 py-0.5 rounded-lg ${
                activeTab === 'active' ? 'bg-blue-50' : 'bg-red-50'
              }`}>
                <p className="text-sm text-gray-600">
                  {activeTab === 'active' ? 'Total Active Users' : 'Total Deleted Users'}
                </p>
                <p className={`text-2xl font-bold ${
                  activeTab === 'active' ? 'text-blue-600' : 'text-red-600'
                }`}>
                  {users.length}
                </p>
              </div>
              <Input
                type="text"
                placeholder="Search users..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="flex-1 max-w-md text-xs"
              />
            </div>

            <DataTable
              columns={[
                {
                  key: 'full_name',
                  label: 'User',
                  sortable: true,
                  render: (value: string, row: AdminUser) => (
                    <div className="flex items-center gap-1">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold ${
                        row.isAdmin ? 'bg-red-600' : 'bg-blue-600'
                      } text-white`}>
                        {row.full_name?.[0]?.toUpperCase() || 'U'}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-0.5">
                          <p className="font-medium text-gray-900">{row.full_name || 'Unnamed'}</p>
                          {row.isAdmin && (
                            <Badge variant="destructive" className="text-[10px]">
                              ADMIN
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-500">{row.phone || 'No phone'}</p>
                      </div>
                    </div>
                  ),
                },
                {
                  key: 'is_admin',
                  label: 'Admin',
                  sortable: false,
                  render: (value: string, row: AdminUser) => (
                    <Badge
                      variant={row.is_admin ? 'secondary' : 'outline'}
                      className="text-[10px]"
                    >
                      {row.is_admin ? 'Yes' : 'No'}
                    </Badge>
                  ),
                },
                { 
                  key: 'phone', 
                  label: 'Phone', 
                  sortable: false,
                  render: (value: string, row: AdminUser) => (
                    <div className="flex items-center space-x-2">
                      <span>{value || '—'}</span>
                      {row.isAdmin && (
                        <span className="text-xs text-red-600 font-medium">(Admin)</span>
                      )}
                    </div>
                  ),
                },
                {
                  key: 'created_at',
                  label: 'Member Since',
                  sortable: true,
                  render: (value: string) => formatDate(value),
                },
                {
                  key: 'is_active',
                  label: 'Status',
                  sortable: false,
                  render: (value: boolean, row: AdminUser) => {
                    if (row.deleted_at) {
                      return (
                        <Badge
                          variant="destructive"
                          className="text-[10px] px-2 py-0.5"
                        >
                          Deleted
                        </Badge>
                      );
                    }
                    return (
                      <Badge
                        variant={value === false ? 'secondary' : 'secondary'}
                        className={`text-[10px] px-2 py-0.5 ${
                          value === false
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-green-100 text-green-800'
                        }`}
                      >
                        {value === false ? 'Deactivated' : 'Active'}
                      </Badge>
                    );
                  },
                },
                ...(activeTab === 'deleted' ? [{
                  key: 'deleted_at',
                  label: 'Deleted On',
                  sortable: true,
                  render: (value: string) => value ? formatDate(value) : '—',
                }] : []),
                {
                  key: 'total_orders',
                  label: 'Total Orders',
                  sortable: true,
                  render: (value: number, row: AdminUser) => (
                    <span className="font-medium text-gray-900">
                      {row.total_orders || 0}
                    </span>
                  ),
                },
                {
                  key: 'actions',
                  label: 'Actions',
                  sortable: false,
                  render: (value: any, row: AdminUser) => (
                    <div className="flex items-center space-x-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          fetchUserDetails(row);
                        }}
                      >
                        View
                      </Button>
                      {!row.isAdmin && activeTab === 'active' && (
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteUser(row);
                          }}
                          disabled={deletingUserId === row.id}
                          className="text-red-600 hover:bg-red-50"
                          title="Delete user and all their data"
                        >
                          {deletingUserId === row.id ? 'Deleting...' : 'Delete'}
                        </Button>
                      )}
                      {!row.isAdmin && activeTab === 'deleted' && (
                        <Button
                          type="button"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleReactivateUser(row);
                          }}
                          disabled={reactivatingUserId === row.id}
                          className="bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Reactivate user account (allows user to log in again)"
                        >
                          {reactivatingUserId === row.id
                            ? 'Reactivating...'
                            : 'Reactivate'}
                        </Button>
                      )}
                      {!row.isAdmin && activeTab === 'active' && (
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          onClick={(e) => {
                            e.stopPropagation();
                            const action =
                              row.is_active === false ? 'activate' : 'deactivate';
                            handleToggleUser(row, action);
                          }}
                          disabled={togglingUserId === row.id}
                          className="bg-yellow-50 text-yellow-800 hover:bg-yellow-100 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {togglingUserId === row.id
                            ? 'Processing...'
                            : row.is_active === false
                            ? 'Activate'
                            : 'Deactivate'}
                        </Button>
                      )}
                      {row.isAdmin && (
                        <span className="px-3 py-1 text-sm text-gray-500 italic">
                          Protected
                        </span>
                      )}
                    </div>
                  ),
                },
              ]}
              data={filteredUsers}
              isLoading={loading}
              emptyMessage={activeTab === 'deleted' ? 'No deleted users found' : 'No users found'}
              onRowClick={fetchUserDetails}
              rowKey="id"
            />
          </div>

          <UserDetailsModal
            open={showUserDetails && !!selectedUser}
            onClose={closeUserDetails}
            user={selectedUser}
            userOrders={userOrders}
            userCartItems={userCartItems}
            userWishlistItems={userWishlistItems}
            activeTab={userDetailsTab}
            onTabChange={setUserDetailsTab}
            formatDate={formatDate}
            formatCurrency={formatCurrency}
          />

          {/* Confirm Dialog */}
          <AlertDialog
            open={!!pendingAction}
            onOpenChange={(open: boolean) => {
              if (!open) clearPendingAction();
            }}
                  >
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  {pendingAction?.type === 'delete'
                    ? 'Delete user'
                    : pendingAction?.type === 'reactivate'
                    ? 'Reactivate user'
                    : pendingAction?.toggleAction === 'activate'
                    ? 'Activate user'
                    : 'Deactivate user'}
                </AlertDialogTitle>
                <AlertDialogDescription>
                  {pendingAction?.type === 'delete' &&
                    `Are you sure you want to delete user "${pendingAction.user.full_name || pendingAction.user.phone || 'User'}"? This will delete all user data and mark the profile as deleted. This action cannot be undone.`}
                  {pendingAction?.type === 'reactivate' &&
                    `Are you sure you want to reactivate user "${pendingAction.user.full_name || pendingAction.user.phone || 'User'}"? This will restore the account and allow the user to log in again.`}
                  {pendingAction?.type === 'toggle' &&
                    (pendingAction.toggleAction === 'activate'
                      ? `Are you sure you want to activate this user?`
                      : `Are you sure you want to deactivate this user?`)}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={executePendingAction}>
                  Confirm
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </AdminLayout>
    </AdminGuard>
  );
}
