'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';

interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  user_number?: string | null;
  created_at: string;
  updated_at: string;
}

interface Address {
  id: string;
  user_id: string;
  address_type: string;
  address_line1: string;
  address_line2: string | null;
  city: string;
  state: string;
  zip_code: string;
  country: string;
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
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  
  // Address form state
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);
  const [addressForm, setAddressForm] = useState({
    address_line1: '',
    address_line2: '',
    city: '',
    state: '',
    zip_code: '',
    country: 'USA',
    address_type: 'shipping',
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
        setFullName(data.full_name || '');
        setPhone(data.phone || '');
      } else {
        // Profile doesn't exist, create one
        // Note: Profile should be created by database trigger, but if it doesn't exist, try to create it
        const insertQuery = supabase
          .from('user_profiles')
          .insert({
            id: user.id,
            email: user.email || '',
            full_name: user.user_metadata?.full_name || 'User',
            phone: user.phone || null,
          })
          .select();
        
        const insertResult = await insertQuery;

        if (insertResult.error) {
          // If insert fails (e.g., RLS policy), profile will be created by trigger
          // Just fetch it again after a short delay
          console.log('Profile creation handled by trigger, fetching...');
          setTimeout(async () => {
            const { data: profileData } = await supabase
              .from('user_profiles')
              .select('*')
              .eq('id', user.id)
              .maybeSingle();
            
            if (profileData) {
              setProfile(profileData);
              setFullName(profileData.full_name || '');
              setPhone(profileData.phone || '');
            }
          }, 500);
        } else if (insertResult.data && insertResult.data.length > 0) {
          const newProfile = insertResult.data[0];
          setProfile(newProfile);
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
          full_name: fullName.trim() || null,
          phone: phone.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (updateError) {
        throw updateError;
      }

      // Update local state
      if (profile) {
        setProfile({
          ...profile,
          full_name: fullName.trim() || null,
          phone: phone.trim() || null,
        });
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
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: false });

      if (fetchError) {
        throw fetchError;
      }

      setAddresses(data || []);
    } catch (err: any) {
      console.error('Error fetching addresses:', err);
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
            address_line2: addressForm.address_line2.trim() || null,
            city: addressForm.city.trim(),
            state: addressForm.state.trim(),
            zip_code: addressForm.zip_code.trim(),
            country: addressForm.country.trim(),
            address_type: addressForm.address_type,
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
            address_line2: addressForm.address_line2.trim() || null,
            city: addressForm.city.trim(),
            state: addressForm.state.trim(),
            zip_code: addressForm.zip_code.trim(),
            country: addressForm.country.trim(),
            address_type: addressForm.address_type,
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
        address_line2: '',
        city: '',
        state: '',
        zip_code: '',
        country: 'USA',
        address_type: 'shipping',
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
      address_line2: address.address_line2 || '',
      city: address.city,
      state: address.state,
      zip_code: address.zip_code,
      country: address.country,
      address_type: address.address_type,
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
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/"
            className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-4"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Home
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">My Profile</h1>
          <p className="mt-2 text-gray-600">View and edit your profile information</p>
        </div>

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
              {/* Email (Read-only) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={user.email || profile?.email || ''}
                  disabled
                  className="w-full px-4 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-600 cursor-not-allowed"
                />
                <p className="mt-1 text-xs text-gray-500">Email cannot be changed</p>
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
                  id="phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Enter your phone number"
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

            {/* Submit Button */}
            <div className="mt-8 flex justify-end space-x-4">
              <Link
                href="/"
                className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2 bg-[#4736FE] text-white rounded-md hover:bg-[#3a2dd4] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>

          {/* Addresses Section */}
          <div className="border-t border-gray-200">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Addresses</h2>
                <p className="mt-1 text-sm text-gray-600">Manage your shipping and billing addresses</p>
              </div>
              <button
                onClick={() => {
                  setEditingAddress(null);
                  setAddressForm({
                    address_line1: '',
                    address_line2: '',
                    city: '',
                    state: '',
                    zip_code: '',
                    country: 'USA',
                    address_type: 'shipping',
                    is_default: false,
                  });
                  setShowAddressForm(!showAddressForm);
                }}
                className="px-4 py-2 bg-[#4736FE] text-white rounded-md hover:bg-[#3a2dd4] transition-colors text-sm"
              >
                {showAddressForm ? 'Cancel' : '+ Add Address'}
              </button>
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
                    Address Line 2
                  </label>
                  <input
                    type="text"
                    value={addressForm.address_line2}
                    onChange={(e) => setAddressForm({ ...addressForm, address_line2: e.target.value })}
                    placeholder="Apartment, suite, etc. (optional)"
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
                      required
                      value={addressForm.zip_code}
                      onChange={(e) => setAddressForm({ ...addressForm, zip_code: e.target.value })}
                      placeholder="ZIP code"
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#4736FE] focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Country *
                    </label>
                    <input
                      type="text"
                      required
                      value={addressForm.country}
                      onChange={(e) => setAddressForm({ ...addressForm, country: e.target.value })}
                      placeholder="Country"
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#4736FE] focus:border-transparent"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Address Type
                  </label>
                  <select
                    value={addressForm.address_type}
                    onChange={(e) => setAddressForm({ ...addressForm, address_type: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#4736FE] focus:border-transparent"
                  >
                    <option value="shipping">Shipping</option>
                    <option value="billing">Billing</option>
                  </select>
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
                        address_line2: '',
                        city: '',
                        state: '',
                        zip_code: '',
                        country: 'USA',
                        address_type: 'shipping',
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
                    className={`border rounded-lg p-4 ${address.is_default ? 'border-[#4736FE] bg-blue-50' : 'border-gray-200'}`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        {address.is_default && (
                          <span className="inline-block mb-2 px-2 py-1 text-xs font-semibold text-[#4736FE] bg-blue-100 rounded">
                            Default
                          </span>
                        )}
                        <p className="font-medium text-gray-900 capitalize">{address.address_type} Address</p>
                        <p className="text-gray-700 mt-1">{address.address_line1}</p>
                        {address.address_line2 && (
                          <p className="text-gray-700">{address.address_line2}</p>
                        )}
                        <p className="text-gray-700">
                          {address.city}, {address.state} {address.zip_code}
                        </p>
                        <p className="text-gray-700">{address.country}</p>
                      </div>
                      <div className="flex space-x-2 ml-4">
                        {!address.is_default && (
                          <button
                            onClick={() => handleSetDefaultAddress(address.id)}
                            className="px-3 py-1 text-sm text-[#4736FE] hover:bg-blue-50 rounded transition-colors"
                            title="Set as default"
                          >
                            Set Default
                          </button>
                        )}
                        <button
                          onClick={() => handleEditAddress(address)}
                          className="px-3 py-1 text-sm text-gray-700 hover:bg-gray-100 rounded transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteAddress(address.id)}
                          className="px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            </div>
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


