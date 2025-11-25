'use client';

import { CheckoutFormData } from '@/lib/schemas/checkout';
import { Button } from '@/components/ui/button';
import ShippingAddressCard from '@/components/address/ShippingAddressCard';

interface Address {
  id: string;
  full_name?: string | null;
  address_line1: string;
  city: string;
  state: string;
  zip_code: string;
  phone?: number | null;
  is_default: boolean;
}

interface AddressListProps {
  addresses: Address[];
  selectedAddressId: string | null;
  onSelect: (address: Address) => void;
  onEdit: (address: Address) => void;
  onAddNew: () => void;
  watch: (field: keyof CheckoutFormData) => any;
}

export default function AddressList({
  addresses,
  selectedAddressId,
  onSelect,
  onEdit,
  onAddNew,
  watch,
}: AddressListProps) {
  return (
    <div className="space-y-3 mb-4">
      {addresses.map((address) => {
        const isSelected = selectedAddressId === address.id || (!selectedAddressId && address.is_default);
        return (
          <ShippingAddressCard
            key={address.id}
            address={{
              ...address,
              full_name: address.full_name || watch('fullName') || undefined,
            }}
            variant="selectable"
            isSelected={isSelected}
            onSelect={() => onSelect(address)}
            onEdit={(e) => {
              e?.stopPropagation();
              onEdit(address);
            }}
          />
        );
      })}
      {addresses.length < 3 && (
        <Button
          type="button"
          variant="outline"
          className="w-full border-dashed"
          onClick={onAddNew}
        >
          + Add New Address
        </Button>
      )}
    </div>
  );
}

