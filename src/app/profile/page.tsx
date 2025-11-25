'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Spinner } from '@/components/ui/spinner';
import ProfileForm from '@/components/profile/ProfileForm';
import AddressForm from '@/components/profile/AddressForm';
import AddressList from '@/components/profile/AddressList';
import Alert from '@/components/ui/alert';
import { Card, CardContent } from '@/components/ui/card';
import { useProfileData } from '@/hooks/profile/useProfileData';
import { useProfileForm } from '@/hooks/profile/useProfileForm';
import { useAddressManagement } from '@/hooks/profile/useAddressManagement';
import type { Address } from '@/hooks/profile/useAddressManagement';

function ProfileContent() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);

  // Profile data and form management
  const { profile, loading, error: profileError, setError: setProfileError, fetchProfile, updateProfile } = useProfileData(user);
  const { fullName, phone, setFullName, setPhone, hasChanges, resetForm } = useProfileForm({ profile });

  // Address management
  const {
    addresses,
    showAddressForm,
    editingAddress,
    addressForm,
    savingAddress,
    setShowAddressForm,
    setAddressForm,
    fetchAddresses,
    handleAddressSubmit: handleAddressSubmitInternal,
    handleEditAddress,
    handleDeleteAddress: handleDeleteAddressInternal,
    handleSetDefaultAddress: handleSetDefaultAddressInternal,
    resetAddressForm,
  } = useAddressManagement(user?.id);

  // Instant redirect if not authenticated (no spinner)
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }
  }, [authLoading, user, router]);

  useEffect(() => {
    if (user) {
      fetchProfile();
      fetchAddresses();
    }
  }, [user, fetchProfile, fetchAddresses]);

  // Initialize form when profile loads
  useEffect(() => {
    if (profile) {
      resetForm();
    }
  }, [profile, resetForm]);

  // Sync profile error with main error state
  useEffect(() => {
    if (profileError) {
      setError(profileError);
    }
  }, [profileError]);

  const handleSubmit = async () => {
    if (!user?.id || !hasChanges) return;

    try {
      setSaving(true);
      setError(null);
      setSuccess(false);

      const success = await updateProfile(fullName, phone);

      if (success) {
        setSuccess(true);
        setTimeout(() => setSuccess(false), 2000);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleAddressSubmit = async (e: React.FormEvent) => {
    try {
      setError(null);
      setSuccess(false);
      await handleAddressSubmitInternal(e);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to save address');
    }
  };

  const handleDeleteAddress = async (addressId: string) => {
    try {
      await handleDeleteAddressInternal(addressId);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to delete address');
    }
  };

  const handleSetDefaultAddress = async (addressId: string) => {
    try {
      await handleSetDefaultAddressInternal(addressId);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to set default address');
    }
  };

  // Show loading only if auth is loading or profile is loading
  if (authLoading || loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-sm">
        <div className="text-center">
          <Spinner className="size-12 text-blue-600 mx-auto" />
          <p className="mt-4 text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  // Don't render if not authenticated (redirect will happen)
  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      <div className="max-w-[1450px] mx-auto w-full p-2.5">
        {/* Success Alert */}
        {success && (
          <Alert
            message="Profile updated successfully!"
            onClose={() => setSuccess(false)}
            variant="success"
          />
        )}

        {/* Error Alert */}
        {error && (
          <Alert
            message={error}
            onClose={() => setError(null)}
            variant="error"
          />
        )}

        <div className="bg-white space-y-3 sm:space-y-4">
          {/* Profile Form */}
          <Card className="rounded-[4px]">
            <CardContent className="p-2.5">
          <ProfileForm
            fullName={fullName}
            phone={phone}
            created_at={profile?.created_at}
            onFullNameChange={setFullName}
            onPhoneChange={setPhone}
            onSave={handleSubmit}
            onCancel={() => {
              resetForm();
              setError(null);
              setSuccess(false);
            }}
            saving={saving}
            hasChanges={hasChanges}
          />
            </CardContent>
          </Card>

          {/* Addresses Section */}
          <Card className="rounded-[4px]">
            <CardContent className="p-2.5">
              <div className="py-3 sm:py-4">
                <div className="flex justify-between items-center mb-4 px-2.5">
              <div>
                <h2 className="text-sm sm:text-lg font-semibold text-gray-900">Addresses</h2>
                <p className="mt-1 text-xs sm:text-sm text-gray-600">Manage your shipping and billing addresses</p>
              </div>
              {addresses.length < 3 && (
                <button
                  onClick={() => {
                    resetAddressForm();
                    setShowAddressForm(!showAddressForm);
                  }}
                  className="px-4 py-2 bg-[#4736FE] text-white rounded-md hover:bg-[#3a2dd4] transition-colors text-sm whitespace-nowrap"
                >
                  {showAddressForm ? 'Cancel' : '+ Add Address'}
                </button>
              )}
              {addresses.length >= 3 && (
                <span className="text-sm text-gray-500">Maximum 3 addresses allowed</span>
              )}
            </div>

            {/* Address Form */}
            {showAddressForm && (
              <>
                    <div className="border-t border-gray-200" />
                <AddressForm
                  formData={addressForm}
                  onFormDataChange={setAddressForm}
                  onSubmit={handleAddressSubmit}
                  onCancel={() => {
                    setShowAddressForm(false);
                    resetAddressForm();
                  }}
                  saving={savingAddress}
                  isEditing={!!editingAddress}
                />
                    <div className="border-t border-gray-200" />
              </>
            )}

            {/* Addresses List */}
            {addresses.length > 0 && !showAddressForm && (
                  <div className="border-t border-gray-200" />
            )}
            <AddressList
              addresses={addresses}
              selectedAddressId={selectedAddressId}
              onSelectAddress={setSelectedAddressId}
              onEditAddress={handleEditAddress}
              onDeleteAddress={handleDeleteAddress}
              onSetDefaultAddress={handleSetDefaultAddress}
              showAddressForm={showAddressForm}
              onShowAddressForm={setShowAddressForm}
            />
          </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <Spinner className="size-12 text-blue-600" />
            <p className="mt-4 text-gray-600">Loading...</p>
          </div>
        </div>
      }
    >
      <ProfileContent />
    </Suspense>
  );
}
