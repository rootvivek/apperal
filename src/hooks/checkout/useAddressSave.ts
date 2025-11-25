import { useCallback } from 'react';
import { getStateName } from '@/lib/constants/states';
import { CheckoutFormData } from '@/lib/schemas/checkout';
import type { Address } from '@/hooks/useAddresses';

interface UseAddressSaveProps {
  userId: string | undefined;
  addresses: Address[];
  editingAddressId: string | null;
  saveAddress: (data: Omit<Address, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => Promise<Address | null>;
  updateAddress: (id: string, data: Partial<Address>) => Promise<Address | null>;
  onSaveSuccess: (addressId: string) => void;
  onCloseModal: () => void;
}

/**
 * Hook for handling address save operations in checkout
 */
export function useAddressSave({
  userId,
  addresses,
  editingAddressId,
  saveAddress,
  updateAddress,
  onSaveSuccess,
  onCloseModal,
}: UseAddressSaveProps) {
  const handleAddressSave = useCallback(async (data: CheckoutFormData) => {
    if (!userId) return;

    const stateName = getStateName(data.state) || data.state;

    if (editingAddressId) {
      const result = await updateAddress(editingAddressId, {
        address_line1: data.address.trim(),
        full_name: data.fullName.trim() || undefined,
        city: data.city.trim(),
        state: stateName,
        zip_code: data.zipCode.trim(),
        phone: data.phone ? parseInt(data.phone, 10) : undefined,
      });

      if (result) {
        onCloseModal();
        onSaveSuccess(editingAddressId);
      }
    } else {
      if (addresses.length >= 3) {
        alert('You have reached the maximum limit of 3 addresses.');
        return;
      }

      const result = await saveAddress({
        address_line1: data.address.trim(),
        full_name: data.fullName.trim() || undefined,
        city: data.city.trim(),
        state: stateName,
        zip_code: data.zipCode.trim(),
        phone: data.phone ? parseInt(data.phone, 10) : undefined,
        is_default: true,
      });

      if (result) {
        onCloseModal();
        onSaveSuccess(result.id);
      }
    }
  }, [userId, addresses.length, editingAddressId, saveAddress, updateAddress, onSaveSuccess, onCloseModal]);

  return {
    handleAddressSave,
  };
}

