'use client';

import { CheckoutFormData } from '@/lib/schemas/checkout';
import { mobileTypography } from '@/utils/mobileTypography';
import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';

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
          <div
            key={address.id}
            className={`border rounded-lg p-4 transition-colors cursor-pointer ${
              isSelected
                ? 'border-primary bg-primary/5'
                : 'border-gray-200 hover:border-gray-300'
            }`}
            onClick={() => onSelect(address)}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="font-medium mb-1">{address.full_name || watch('fullName') || 'Address'}</p>
                <p className={`${mobileTypography.title14} text-muted-foreground`}>
                  {address.address_line1}
                </p>
                <p className={`${mobileTypography.title14} text-muted-foreground`}>
                  {address.city}, {address.state} {address.zip_code}
                </p>
                {address.phone && (
                  <p className={`${mobileTypography.title14} text-muted-foreground mt-1`}>
                    Phone: {address.phone}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2 ml-4">
                {isSelected && (
                  <>
                    <Check className="w-5 h-5 text-primary" />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        onEdit(address);
                      }}
                    >
                      Edit
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
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

