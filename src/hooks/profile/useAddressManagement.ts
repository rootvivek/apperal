import { useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { normalizePhone } from '@/utils/phone';

export interface Address {
  id: string;
  user_id: string;
  address_line1: string;
  full_name: string | null;
  city: string;
  state: string;
  zip_code: string;
  phone: number | null;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

interface AddressFormData {
  address_line1: string;
  full_name: string;
  city: string;
  state: string;
  zip_code: string;
  phone: string;
  is_default: boolean;
}

/**
 * Hook for managing addresses in the profile page
 */
export function useAddressManagement(userId: string | undefined) {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);
  const [addressForm, setAddressForm] = useState<AddressFormData>({
    address_line1: '',
    full_name: '',
    city: '',
    state: '',
    zip_code: '',
    phone: '',
    is_default: false,
  });
  const [savingAddress, setSavingAddress] = useState(false);
  const supabase = createClient();

  const fetchAddresses = useCallback(async () => {
    if (!userId) return;

    try {
      const { data, error: fetchError } = await supabase
        .from('addresses')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (fetchError && fetchError.code !== 'PGRST116') {
        setAddresses([]);
        return;
      }

      setAddresses(data || []);
    } catch {
      setAddresses([]);
    }
  }, [userId, supabase]);

  const handleAddressSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!userId) return;

    try {
      setSavingAddress(true);

      const normalizedPhone = addressForm.phone ? normalizePhone(addressForm.phone) : null;

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
            phone: normalizedPhone ? parseInt(normalizedPhone, 10) : null,
            is_default: addressForm.is_default,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingAddress.id);

        if (updateError) {
          throw updateError;
        }

        // If setting as default, unset others
        if (addressForm.is_default) {
          await supabase
            .from('addresses')
            .update({ is_default: false })
            .eq('user_id', userId)
            .neq('id', editingAddress.id);
        }
      } else {
        // Create new address
        // If setting as default, unset others first
        if (addressForm.is_default) {
          await supabase
            .from('addresses')
            .update({ is_default: false })
            .eq('user_id', userId)
            .eq('is_default', true);
        }

        const { error: insertError } = await supabase
          .from('addresses')
          .insert({
            user_id: userId,
            address_line1: addressForm.address_line1.trim(),
            full_name: addressForm.full_name.trim() || null,
            city: addressForm.city.trim(),
            state: addressForm.state.trim(),
            zip_code: addressForm.zip_code.trim(),
            phone: normalizedPhone ? parseInt(normalizedPhone, 10) : null,
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
        phone: '',
        is_default: false,
      });
      setShowAddressForm(false);
      setEditingAddress(null);
      return true;
    } catch (err: any) {
      throw new Error(err.message || 'Failed to save address');
    } finally {
      setSavingAddress(false);
    }
  }, [userId, addressForm, editingAddress, fetchAddresses, supabase]);

  const handleEditAddress = useCallback((address: Address) => {
    setEditingAddress(address);
    setAddressForm({
      address_line1: address.address_line1,
      full_name: address.full_name || '',
      city: address.city,
      state: address.state,
      zip_code: address.zip_code,
      phone: address.phone ? String(address.phone) : '',
      is_default: address.is_default,
    });
    setShowAddressForm(true);
  }, []);

  const handleDeleteAddress = useCallback(async (addressId: string) => {
    if (!confirm('Are you sure you want to delete this address?')) return false;

    try {
      const { error } = await supabase
        .from('addresses')
        .delete()
        .eq('id', addressId);

      if (error) throw error;

      await fetchAddresses();
      return true;
    } catch (err: any) {
      throw new Error(err.message || 'Failed to delete address');
    }
  }, [fetchAddresses, supabase]);

  const handleSetDefaultAddress = useCallback(async (addressId: string) => {
    if (!userId) return false;

    try {
      // Unset all defaults and set this one as default
      await supabase
        .from('addresses')
        .update({ is_default: false })
        .eq('user_id', userId);

      const { error } = await supabase
        .from('addresses')
        .update({ is_default: true })
        .eq('id', addressId);

      if (error) throw error;

      await fetchAddresses();
      return true;
    } catch (err: any) {
      throw new Error(err.message || 'Failed to set default address');
    }
  }, [userId, fetchAddresses, supabase]);

  const resetAddressForm = useCallback(() => {
    setAddressForm({
      address_line1: '',
      full_name: '',
      city: '',
      state: '',
      zip_code: '',
      phone: '',
      is_default: false,
    });
    setEditingAddress(null);
  }, []);

  return {
    addresses,
    showAddressForm,
    editingAddress,
    addressForm,
    savingAddress,
    setAddresses,
    setShowAddressForm,
    setAddressForm,
    fetchAddresses,
    handleAddressSubmit,
    handleEditAddress,
    handleDeleteAddress,
    handleSetDefaultAddress,
    resetAddressForm,
  };
}

