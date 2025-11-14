'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import { getAuth, updateProfile } from 'firebase/auth';

interface UserProfile {
  id: string;
  email: string | null;
  full_name: string | null;
  phone: string | null;
  user_number?: string | null;
  created_at: string;
  updated_at: string;
}

interface Address {
  id: string;
  user_id: string;
  address_line1: string;
  full_name: string | null;
  city: string;
  state: string;
  zip_code: string;
  phone: string | null;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

function ProfileContent() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const supabase = createClient();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  
  // Form state
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  
  // Address form state
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);
  const [addressForm, setAddressForm] = useState({
    address_line1: '',
    full_name: '',
    city: '',
    state: '',
    zip_code: '',
    is_default: false,
  });
  const [savingAddress, setSavingAddress] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }

    if (user) {
      fetchProfile();
      fetchAddresses();
    }
  }, [user, authLoading, router]);

  const fetchProfile = async () => {
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
        setEmail(data.email || '');
        setFullName(data.full_name || '');
        setPhone(data.phone || '');
      } else {
        // Profile doesn't exist, create one for Firebase user
        // Note: Firebase users don't trigger Supabase auth.users triggers, so we create manually
        // Create user profile for Firebase user
        const insertQuery = supabase
          .from('user_profiles')
          .insert({
            id: user.id,
            email: user.email || '',
            full_name: user.user_metadata?.full_name || user.user_metadata?.first_name || 'User',
            phone: user.phone || null,
          })
          .select();
        
        const insertResult = await insertQuery;

        if (insertResult.error) {
          // If insert fails (e.g., RLS policy or duplicate), try to fetch existing profile
          // Profile insert failed, check if it exists
          const { data: existingProfile } = await supabase
              .from('user_profiles')
              .select('*')
              .eq('id', user.id)
              .maybeSingle();
            
          if (existingProfile) {
            setProfile(existingProfile);
            setEmail(existingProfile.email || '');
            setFullName(existingProfile.full_name || '');
            setPhone(existingProfile.phone || '');
          } else {
            // Profile doesn't exist and couldn't be created - set defaults
            setProfile({
              id: user.id,
              email: user.email || '',
              full_name: user.user_metadata?.full_name || null,
              phone: user.phone || null,
              user_number: null,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            });
            setEmail(user.email || '');
            setFullName(user.user_metadata?.full_name || '');
            setPhone(user.phone || '');
            // Fall back to in-memory profile
          }
        } else if (insertResult.data && insertResult.data.length > 0) {
          const newProfile = insertResult.data[0];
          setProfile(newProfile);
          setEmail(newProfile.email || '');
          setFullName(newProfile.full_name || '');
          setPhone(newProfile.phone || '');
        }
      }
    } catch (err: any) {
      console.error('Error fetching profile:', err);
      setError(err.message || 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user?.id) return;

    try {
      setSaving(true);
      setError(null);
      setSuccess(false);

      const { error: updateError } = await supabase
        .from('user_profiles')
        .update({
          email: email.trim() || null,
          full_name: fullName.trim() || null,
          phone: phone.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (updateError) {
        throw updateError;
      }

      // Also update Firebase displayName so it persists after refresh
      try {
        const auth = getAuth();
        const currentUser = auth.currentUser;
        if (currentUser) {
          await updateProfile(currentUser, {
            displayName: fullName.trim() || null
          });
        }
      } catch (firebaseError) {
        // Log but don't fail - Supabase update succeeded
        // Could not update Firebase display name
      }

      // Update local state
      if (profile) {
        setProfile({
          ...profile,
          email: email.trim() || null,
          full_name: fullName.trim() || null,
          phone: phone.trim() || null,
        });
      }

      // Dispatch custom event to notify Navigation component to refresh user name
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('profileUpdated', {
          detail: { full_name: fullName.trim() || null }
        }));
      }

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      console.error('Error updating profile:', err);
      setError(err.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const fetchAddresses = async () => {
    if (!user?.id) return;

    try {
      const { data, error: fetchError } = await supabase
        .from('addresses')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (fetchError) {
        // Only log if it's not a "no rows" type error (PGRST116 = no rows returned)
        // This is expected for new users who don't have addresses yet
        if (fetchError.code !== 'PGRST116') {
          // Only log actual errors, not empty results
          // No addresses found or error fetching
        }
        setAddresses([]);
        return;
      }

      setAddresses(data || []);
    } catch (err: any) {
      // Silently handle errors - addresses might not exist yet for new users
      // No addresses found or error fetching
      setAddresses([]);
    }
  };

  const handleAddressSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user?.id) return;

    try {
      setSavingAddress(true);
      setError(null);
      setSuccess(false);

      if (editingAddress) {
        // Update existing address
        const { error: updateError } = await supabase
          .from('addresses')
          .update({
            address_line1: addressForm.address_line1.trim(),
            full_name: addressForm.full_name.trim() || null,
            city: addressForm.city.trim(),
            state: addressForm.state.trim(),
            zip_code: addressForm.zip_code.trim(),
            is_default: addressForm.is_default,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingAddress.id);

        if (updateError) {
          throw updateError;
        }
      } else {
        // Create new address
        // If setting as default, unset other defaults first
        if (addressForm.is_default) {
          // Find and update default addresses for this user
          const { data: defaultAddresses } = await supabase
            .from('addresses')
            .select('id')
            .eq('user_id', user.id)
            .eq('is_default', true);
          
          if (defaultAddresses && defaultAddresses.length > 0) {
            for (const addr of defaultAddresses) {
              await supabase
                .from('addresses')
                .update({ is_default: false })
                .eq('id', addr.id);
            }
          }
        }

        const { error: insertError } = await supabase
          .from('addresses')
          .insert({
            user_id: user.id,
            address_line1: addressForm.address_line1.trim(),
            full_name: addressForm.full_name.trim() || null,
            city: addressForm.city.trim(),
            state: addressForm.state.trim(),
            zip_code: addressForm.zip_code.trim(),
            is_default: addressForm.is_default,
          })
          .select();

        if (insertError) {
          throw insertError;
        }
      }

      // Refresh addresses
      await fetchAddresses();
      
      // Reset form
      setAddressForm({
        address_line1: '',
        full_name: '',
        city: '',
        state: '',
        zip_code: '',
        is_default: false,
      });
      setShowAddressForm(false);
      setEditingAddress(null);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      console.error('Error saving address:', err);
      setError(err.message || 'Failed to save address');
    } finally {
      setSavingAddress(false);
    }
  };

  const handleEditAddress = (address: Address) => {
    setEditingAddress(address);
    setAddressForm({
      address_line1: address.address_line1,
      full_name: address.full_name || '',
      city: address.city,
      state: address.state,
      zip_code: address.zip_code,
      is_default: address.is_default,
    });
    setShowAddressForm(true);
  };

  const handleDeleteAddress = async (addressId: string) => {
    if (!confirm('Are you sure you want to delete this address?')) return;

    try {
      const { error } = await supabase
        .from('addresses')
        .delete()
        .eq('id', addressId);

      if (error) throw error;

      await fetchAddresses();
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      console.error('Error deleting address:', err);
      setError(err.message || 'Failed to delete address');
    }
  };

  const handleSetDefaultAddress = async (addressId: string) => {
    if (!user?.id) return;

    try {
      // Unset all other defaults
      await supabase
        .from('addresses')
        .update({ is_default: false })
        .eq('user_id', user.id);

      // Set this one as default
      const { error } = await supabase
        .from('addresses')
        .update({ is_default: true })
        .eq('id', addressId);

      if (error) throw error;

      await fetchAddresses();
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      console.error('Error setting default address:', err);
      setError(err.message || 'Failed to set default address');
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#4736FE] mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      <div className="max-w-[1450px] mx-auto w-full px-1 sm:px-4 md:px-6 lg:px-8 pt-1 pb-8">

        {/* Success Message */}
        {success && (
          <div className="mb-6 bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-md">
            Profile updated successfully!
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-md">
            {error}
          </div>
        )}

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          {/* Profile Form */}
          <form onSubmit={handleSubmit} className="p-6">
            <div className="space-y-6">
              {/* Email */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#4736FE] focus:border-transparent"
                />
              </div>

              {/* Full Name */}
              <div>
                <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-2">
                  Full Name
                </label>
                <input
                  type="text"
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Enter your full name"
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#4736FE] focus:border-transparent"
                />
              </div>

              {/* Phone */}
              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number
                </label>
                <input
                  type="tel"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  id="phone"
                  value={phone}
                  onChange={(e) => {
                    // Only allow digits
                    const numericValue = e.target.value.replace(/\D/g, '');
                    setPhone(numericValue);
                  }}
                  placeholder="Enter your phone number"
                  maxLength={10}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#4736FE] focus:border-transparent"
                />
              </div>

              {/* User Number (Read-only) */}
              {profile?.user_number && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    User ID
                  </label>
                  <input
                    type="text"
                    value={profile.user_number}
                    disabled
                    className="w-full px-4 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-600 cursor-not-allowed"
                  />
                </div>
              )}

              {/* Account Created Date */}
              {profile?.created_at && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Member Since
                  </label>
                  <input
                    type="text"
                    value={new Date(profile.created_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                    disabled
                    className="w-full px-4 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-600 cursor-not-allowed"
                  />
                </div>
              )}
            </div>
          </form>

          {/* Addresses Section */}
          <div className="border-t border-gray-200">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Addresses</h2>
                <p className="mt-1 text-sm text-gray-600">Manage your shipping and billing addresses</p>
              </div>
              {addresses.length < 3 && (
                <button
                  onClick={() => {
                    setEditingAddress(null);
                    setAddressForm({
                      address_line1: '',
                      full_name: '',
                      city: '',
                      state: '',
                      zip_code: '',
                      is_default: false,
                    });
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
              <form onSubmit={handleAddressSubmit} className="p-6 border-b border-gray-200">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Address Line 1 *
                  </label>
                  <input
                    type="text"
                    required
                    value={addressForm.address_line1}
                    onChange={(e) => setAddressForm({ ...addressForm, address_line1: e.target.value })}
                    placeholder="Street address"
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#4736FE] focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={addressForm.full_name}
                    onChange={(e) => setAddressForm({ ...addressForm, full_name: e.target.value })}
                    placeholder="Recipient's full name"
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#4736FE] focus:border-transparent"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      City *
                    </label>
                    <input
                      type="text"
                      required
                      value={addressForm.city}
                      onChange={(e) => setAddressForm({ ...addressForm, city: e.target.value })}
                      placeholder="City"
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#4736FE] focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      State *
                    </label>
                    <input
                      type="text"
                      required
                      value={addressForm.state}
                      onChange={(e) => setAddressForm({ ...addressForm, state: e.target.value })}
                      placeholder="State"
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#4736FE] focus:border-transparent"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      ZIP Code *
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      required
                      value={addressForm.zip_code}
                      onChange={(e) => {
                        // Only allow digits
                        const numericValue = e.target.value.replace(/\D/g, '');
                        setAddressForm({ ...addressForm, zip_code: numericValue });
                      }}
                      placeholder="ZIP code"
                      maxLength={6}
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#4736FE] focus:border-transparent"
                    />
                  </div>

                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="is_default"
                    checked={addressForm.is_default}
                    onChange={(e) => setAddressForm({ ...addressForm, is_default: e.target.checked })}
                    className="h-4 w-4 text-[#4736FE] focus:ring-[#4736FE] border-gray-300 rounded"
                  />
                  <label htmlFor="is_default" className="ml-2 block text-sm text-gray-700">
                    Set as default address
                  </label>
                </div>

                <div className="flex justify-end space-x-4 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddressForm(false);
                      setEditingAddress(null);
                      setAddressForm({
                        address_line1: '',
                        full_name: '',
                        city: '',
                        state: '',
                        zip_code: '',
                        is_default: false,
                      });
                    }}
                    className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingAddress}
                    className="px-6 py-2 bg-[#4736FE] text-white rounded-md hover:bg-[#3a2dd4] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {savingAddress ? 'Saving...' : editingAddress ? 'Update Address' : 'Add Address'}
                  </button>
                </div>
              </div>
              </form>
            )}

            {/* Addresses List */}
            <div className="p-6">
            {addresses.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No addresses saved yet. Add your first address above.</p>
            ) : (
              <div className="space-y-4">
                {addresses.map((address) => (
                  <div
                    key={address.id}
                    className={`border rounded-lg p-3 transition-colors ${
                      address.is_default ? 'border-orange-600 bg-orange-50' : 'border-gray-200'
                    }`}
                  >
                    {/* Action Buttons Row */}
                    <div className="flex items-center justify-end gap-2 mb-2 pb-2 border-b border-gray-200">
                      {!address.is_default && (
                        <button
                          onClick={() => handleSetDefaultAddress(address.id)}
                          className="px-3 py-1 text-sm text-orange-600 hover:bg-orange-50 rounded transition-colors whitespace-nowrap"
                          title="Set as default"
                        >
                          Set Default
                        </button>
                      )}
                      <button
                        onClick={() => handleEditAddress(address)}
                        className="px-3 py-1 text-sm text-gray-700 hover:bg-gray-100 rounded transition-colors whitespace-nowrap"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteAddress(address.id)}
                        className="px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded transition-colors whitespace-nowrap"
                      >
                        Delete
                      </button>
                    </div>
                    
                    {/* Address Details Row */}
                    <div className="flex items-start">
                      <div className="flex-1">
                        {address.is_default && (
                          <span className="inline-block mb-2 px-2 py-1 text-xs font-semibold text-orange-600 bg-orange-100 rounded">
                            Default
                          </span>
                        )}
                        <p className="font-medium text-gray-900 mb-1">{address.full_name || 'Address'}</p>
                        <p className="text-gray-700 text-sm">{address.address_line1}</p>
                        <p className="text-gray-700 text-sm">
                          {address.city}, {address.state} {address.zip_code}
                        </p>
                        {address.phone && (
                          <p className="text-gray-700 text-sm mt-1">Phone: {address.phone}</p>
                        )}
                      </div>
                      {address.is_default && (
                        <svg className="w-5 h-5 text-orange-600 ml-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
            </div>
          </div>

          {/* Profile Submit Buttons - At the end of all profile content */}
          <div className="p-6 border-t border-gray-200 flex justify-end space-x-4">
            <button
              type="button"
                onClick={() => {
                  // Reset form to original profile values
                  if (profile) {
                    setEmail(profile.email || '');
                    setFullName(profile.full_name || '');
                    setPhone(profile.phone || '');
                  }
                  setError(null);
                  setSuccess(false);
                }}
              className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                handleSubmit(e as any);
              }}
              disabled={saving}
              className="px-6 py-2 bg-[#4736FE] text-white rounded-md hover:bg-[#3a2dd4] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
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
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#4736FE] mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading...</p>
          </div>
        </div>
      }
    >
      <ProfileContent />
    </Suspense>
  );
}


