'use client';

import { Form } from 'react-hook-form';
import { CheckoutFormData } from '@/lib/schemas/checkout';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Form as FormComponent } from '@/components/ui/form';
import { Check } from 'lucide-react';
import AddressForm from './AddressForm';
import AddressList from './AddressList';
import { mobileTypography } from '@/utils/mobileTypography';

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

interface AddressModalProps {
  isOpen: boolean;
  onClose: () => void;
  addresses: Address[];
  selectedAddressId: string | null;
  editingAddressId: string | null;
  form: any; // Form from react-hook-form
  onSelect: (address: Address) => void;
  onEdit: (address: Address) => void;
  onSave: (data: CheckoutFormData) => Promise<void>;
  watch: (field: keyof CheckoutFormData) => any;
}

export default function AddressModal({
  isOpen,
  onClose,
  addresses,
  selectedAddressId,
  editingAddressId,
  form,
  onSelect,
  onEdit,
  onSave,
  watch,
}: AddressModalProps) {
  const { handleSubmit } = form;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editingAddressId ? 'Edit Address' : addresses.length > 0 ? 'Select Address' : 'Add New Address'}</DialogTitle>
          <DialogDescription>
            {editingAddressId ? 'Update your address details below.' : addresses.length > 0 ? 'Choose an address or add a new one.' : 'Add a new shipping address for your order.'}
          </DialogDescription>
        </DialogHeader>
        
        {!editingAddressId && addresses.length > 0 && (
          <div className="space-y-3 mb-4">
            {addresses.map((address) => (
              <div
                key={address.id}
                className={`border rounded-lg p-4 transition-colors ${
                  selectedAddressId === address.id
                    ? 'border-primary bg-primary/5'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div 
                    className="flex-1 cursor-pointer"
                    onClick={() => {
                      onSelect(address);
                      onClose();
                    }}
                  >
                    <p className="font-medium mb-1">{address.full_name || 'Address'}</p>
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
                    {selectedAddressId === address.id && (
                      <Check className="w-5 h-5 text-primary" />
                    )}
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
                  </div>
                </div>
              </div>
            ))}
            <div className="border-t border-gray-200 pt-3">
              <Button
                type="button"
                variant="outline"
                className="w-full border-dashed"
                onClick={() => {
                  form.setValue('address', '');
                  form.setValue('city', '');
                  form.setValue('state', '');
                  form.setValue('zipCode', '');
                  form.setValue('fullName', '');
                  form.setValue('phone', '');
                }}
              >
                + Add New Address
              </Button>
            </div>
          </div>
        )}
        
        {(!addresses.length || editingAddressId !== null) && (
          <FormComponent {...form}>
            <form onSubmit={handleSubmit(onSave)} className="space-y-4">
              <AddressForm control={form.control} />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={onClose}>
                  Cancel
                </Button>
                <Button type="submit">Save Address</Button>
              </DialogFooter>
            </form>
          </FormComponent>
        )}
      </DialogContent>
    </Dialog>
  );
}

