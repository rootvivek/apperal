import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface Address {
  id: string;
  user_id: string;
  address_line1: string;
  address_line2?: string;
  city: string;
  state: string;
  zip_code: string;
  full_name?: string | null;
  phone?: number | null;
  is_default: boolean;
  created_at?: string;
  updated_at?: string;
}

export function useAddresses() {
  const { user } = useAuth();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const supabase = createClient();

  const fetchAddresses = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('addresses')
        .select('*')
        .eq('user_id', user.id)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: false });

      if (!error && data) {
        setAddresses(data);
      }
    } catch {
      // Error handled silently
    } finally {
      setLoading(false);
    }
  }, [user?.id, supabase]);

  const saveAddress = useCallback(async (addressData: Omit<Address, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    if (!user?.id) return null;
    setSaving(true);
    try {
      // If this is set as default, unset other defaults
      if (addressData.is_default) {
        await (supabase
          .from('addresses')
          .update({ is_default: false })
          .eq('user_id', user.id) as any)
          .eq('is_default', true);
      }

      const { data, error } = await (supabase
        .from('addresses')
        .insert({
          ...addressData,
          user_id: user.id,
        })
        .select() as any)
        .single();

      if (error) throw error;
      await fetchAddresses();
      return data;
    } catch {
      return null;
    } finally {
      setSaving(false);
    }
  }, [user?.id, supabase, fetchAddresses]);

  const updateAddress = useCallback(async (id: string, addressData: Partial<Address>) => {
    if (!user?.id) return null;
    setSaving(true);
    try {
      // If this is set as default, unset other defaults
      if (addressData.is_default) {
        await (supabase
          .from('addresses')
          .update({ is_default: false }) as any)
          .eq('user_id', user.id)
          .eq('is_default', true)
          .neq('id', id);
      }

      const { data, error } = await (supabase
        .from('addresses')
        .update(addressData) as any)
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;
      await fetchAddresses();
      return data;
    } catch {
      return null;
    } finally {
      setSaving(false);
    }
  }, [user?.id, supabase, fetchAddresses]);

  const deleteAddress = useCallback(async (id: string) => {
    if (!user?.id) return false;
    try {
      const { error } = await (supabase
        .from('addresses')
        .delete() as any)
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;
      await fetchAddresses();
      return true;
    } catch {
      return false;
    }
  }, [user?.id, supabase, fetchAddresses]);

  useEffect(() => {
    fetchAddresses();
  }, [fetchAddresses]);

  return {
    addresses,
    loading,
    saving,
    fetchAddresses,
    saveAddress,
    updateAddress,
    deleteAddress,
  };
}

