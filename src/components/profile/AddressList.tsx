'use client';

import { useMemo } from 'react';
import EmptyState from '@/components/EmptyState';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import ShippingAddressCard from '@/components/address/ShippingAddressCard';

interface Address {
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

interface AddressListProps {
  addresses: Address[];
  selectedAddressId: string | null;
  onSelectAddress: (addressId: string) => void;
  onEditAddress: (address: Address) => void;
  onDeleteAddress: (addressId: string) => void;
  onSetDefaultAddress: (addressId: string) => void;
  showAddressForm: boolean;
  onShowAddressForm: (show: boolean) => void;
}

export default function AddressList({
  addresses,
  selectedAddressId,
  onSelectAddress,
  onEditAddress,
  onDeleteAddress,
  onSetDefaultAddress,
  showAddressForm,
  onShowAddressForm,
}: AddressListProps) {
  const defaultAddress = useMemo(() => addresses.find(addr => addr.is_default) || addresses[0], [addresses]);
  const displayAddress = useMemo(() => {
    if (!defaultAddress) return null;
    return selectedAddressId ? addresses.find(addr => addr.id === selectedAddressId) || defaultAddress : defaultAddress;
  }, [addresses, selectedAddressId, defaultAddress]);

  if (addresses.length === 0) {
    return (
      <div className="py-4 sm:py-6">
        <EmptyState icon="📍" title="No addresses saved yet" description="Add your first address above" variant="compact" />
      </div>
    );
  }

  if (!showAddressForm && displayAddress) {
    return (
      <div className="py-4 sm:py-6 space-y-4">
        <ShippingAddressCard
          address={displayAddress}
          variant="display"
          showBadge={true}
          compact={false}
        />
        <Button variant="outline" className="w-full h-12 min-h-[44px]" onClick={() => {
          defaultAddress?.id && onSelectAddress(defaultAddress.id);
          onShowAddressForm(true);
        }}>
          Change Address
        </Button>
      </div>
    );
  }

  return (
    <div className="py-4 sm:py-6">
      <ScrollArea className="h-[calc(100vh-400px)] max-h-[600px]">
        <div className="space-y-3 pr-4">
          {addresses.map((address) => (
            <ShippingAddressCard
              key={address.id}
              address={address}
              variant="editable"
              isSelected={selectedAddressId === address.id}
              showBadge={true}
              showActions={true}
              compact={true}
              onSelect={() => {
                onSelectAddress(address.id);
                address.id === defaultAddress?.id && onShowAddressForm(false);
              }}
              onEdit={(e) => {
                e?.stopPropagation();
                onEditAddress(address);
              }}
              onDelete={(e) => {
                e?.stopPropagation();
                onDeleteAddress(address.id);
              }}
              onSetDefault={(e) => {
                e?.stopPropagation();
                onSetDefaultAddress(address.id);
              }}
            />
          ))}
        </div>
      </ScrollArea>
      <Button variant="outline" className="w-full h-12 min-h-[44px] mt-4" onClick={() => {
        onShowAddressForm(false);
        defaultAddress?.id && onSelectAddress(defaultAddress.id);
      }}>
        Cancel
      </Button>
    </div>
  );
}
