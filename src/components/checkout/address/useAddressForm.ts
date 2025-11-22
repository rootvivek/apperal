import { useState, useEffect, useCallback } from 'react';
import { useForm, UseFormReturn } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { checkoutFormSchema, type CheckoutFormData } from '@/lib/schemas/checkout';
import { getStateCode } from '@/lib/constants/states';
import { createClient } from '@/lib/supabase/client';

interface UseAddressFormProps {
  userId: string | undefined;
  addresses: any[];
  onAddressSelect: (addressId: string) => void;
  checkoutForm: UseFormReturn<CheckoutFormData>;
}

export function useAddressForm({
  userId,
  addresses,
  onAddressSelect,
  checkoutForm,
}: UseAddressFormProps) {
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [hasLoadedInitialAddress, setHasLoadedInitialAddress] = useState(false);

  const form = useForm<CheckoutFormData>({
    resolver: zodResolver(checkoutFormSchema),
    defaultValues: {
      fullName: '',
      address: '',
      city: '',
      state: '',
      zipCode: '',
      phone: '',
      paymentMethod: 'upi',
      cardNumber: '',
      expiryDate: '',
      cvv: '',
      cardName: '',
    },
  });

  const { setValue, watch } = form;
  const checkoutSetValue = checkoutForm.setValue;

  // Load default address on mount (only once)
  useEffect(() => {
    if (!userId || hasLoadedInitialAddress || editingAddressId) return;

    const loadDefaultAddress = async () => {
      try {
        const supabase = createClient();
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('full_name, phone')
          .eq('id', userId)
          .maybeSingle();

        const { data: defaultAddress } = await supabase
          .from('addresses')
          .select('*')
          .eq('user_id', userId)
          .eq('is_default', true)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        let address = defaultAddress;
        if (!address) {
          const { data: recentAddress } = await supabase
            .from('addresses')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();
          address = recentAddress;
        }

        if (address) {
          const stateCode = getStateCode(address.state);
          // Use address phone if available, otherwise use profile phone, otherwise empty
          const phone = address.phone ? String(address.phone) : (profile?.phone ? String(profile.phone) : '');
          const fullName = address.full_name || profile?.full_name || '';
          setValue('fullName', fullName);
          setValue('phone', phone);
          setValue('address', address.address_line1 || '');
          setValue('city', address.city || '');
          setValue('state', stateCode || '');
          setValue('zipCode', address.zip_code || '');
          checkoutSetValue('fullName', fullName);
          checkoutSetValue('phone', phone);
          checkoutSetValue('address', address.address_line1 || '');
          checkoutSetValue('city', address.city || '');
          checkoutSetValue('state', stateCode || '');
          checkoutSetValue('zipCode', address.zip_code || '');
          setSelectedAddressId(address.id);
          onAddressSelect(address.id);
        } else if (profile) {
          setValue('fullName', profile.full_name || '');
          setValue('phone', profile.phone ? String(profile.phone) : '');
          checkoutSetValue('fullName', profile.full_name || '');
          checkoutSetValue('phone', profile.phone ? String(profile.phone) : '');
        }
        setHasLoadedInitialAddress(true);
      } catch {
        // Error handled silently
      }
    };

    loadDefaultAddress();
  }, [userId, setValue, checkoutSetValue, onAddressSelect, editingAddressId, hasLoadedInitialAddress]);

  const selectAddress = useCallback((address: any) => {
    setSelectedAddressId(address.id);
    const stateCode = getStateCode(address.state);
    setValue('fullName', address.full_name || '');
    setValue('phone', address.phone ? String(address.phone) : '');
    setValue('address', address.address_line1 || '');
    setValue('city', address.city || '');
    setValue('state', stateCode || '');
    setValue('zipCode', address.zip_code || '');
    checkoutSetValue('fullName', address.full_name || '');
    checkoutSetValue('phone', address.phone ? String(address.phone) : '');
    checkoutSetValue('address', address.address_line1 || '');
    checkoutSetValue('city', address.city || '');
    checkoutSetValue('state', stateCode || '');
    checkoutSetValue('zipCode', address.zip_code || '');
    onAddressSelect(address.id);
  }, [setValue, checkoutSetValue, onAddressSelect]);

  const openEditModal = useCallback((address: any) => {
    setEditingAddressId(address.id);
    const stateCode = getStateCode(address.state);
    // Pre-fill with address data when editing
    setValue('fullName', address.full_name || '');
    setValue('phone', address.phone ? String(address.phone) : '');
    setValue('address', address.address_line1 || '');
    setValue('city', address.city || '');
    setValue('state', stateCode || '');
    setValue('zipCode', address.zip_code || '');
    // Also update checkout form to keep them in sync
    checkoutSetValue('fullName', address.full_name || '');
    checkoutSetValue('phone', address.phone ? String(address.phone) : '');
    checkoutSetValue('address', address.address_line1 || '');
    checkoutSetValue('city', address.city || '');
    checkoutSetValue('state', stateCode || '');
    checkoutSetValue('zipCode', address.zip_code || '');
    setShowAddressModal(true);
  }, [setValue, checkoutSetValue]);

  const openAddModal = useCallback(() => {
    setEditingAddressId(null);
    setValue('address', '');
    setValue('city', '');
    setValue('state', '');
    setValue('zipCode', '');
    setValue('fullName', '');
    setValue('phone', '');
    setShowAddressModal(true);
  }, [setValue]);

  const closeModal = useCallback(() => {
    setShowAddressModal(false);
    setEditingAddressId(null);
  }, []);

  return {
    selectedAddressId,
    editingAddressId,
    showAddressModal,
    form,
    selectAddress,
    openEditModal,
    openAddModal,
    closeModal,
    setSelectedAddressId,
    setEditingAddressId,
    setShowAddressModal,
  };
}

