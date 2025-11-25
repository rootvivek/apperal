'use client';

import { Form } from 'react-hook-form';
import { CheckoutFormData } from '@/lib/schemas/checkout';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Form as FormComponent } from '@/components/ui/form';
import AddressForm from './AddressForm';
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
      <DialogContent 
        className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-[4px] p-5 w-[calc(100%-20px)] max-w-[calc(100%-20px)] my-[10px] sm:w-full sm:max-w-2xl sm:my-0 [&>button]:hidden sm:[&>button]:block"
      >
        <DialogHeader className="text-center">
          <DialogTitle className="text-center">{editingAddressId ? 'Edit Address' : addresses.length > 0 ? 'Select Address' : 'Add New Address'}</DialogTitle>
          <DialogDescription className="text-center">
            {editingAddressId ? 'Update your address details below.' : addresses.length > 0 ? 'Choose an address or add a new one.' : 'Add a new shipping address for your order.'}
          </DialogDescription>
        </DialogHeader>
        
        {!editingAddressId && addresses.length > 0 && (
          <div className="space-y-2 mb-3">
            {addresses.map((address) => (
              <ShippingAddressCard
                key={address.id}
                address={{
                  id: address.id,
                  full_name: address.full_name,
                  address_line1: address.address_line1,
                  city: address.city,
                  state: address.state,
                  zip_code: address.zip_code,
                  phone: address.phone,
                  is_default: address.is_default,
                }}
                variant="selectable"
                isSelected={selectedAddressId === address.id}
                onSelect={() => {
                  onSelect(address);
                  onClose();
                }}
                onEdit={(e) => {
                  e?.stopPropagation();
                  onEdit(address);
                }}
              />
            ))}
            <div className="border-t border-gray-200 pt-2">
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
            <form onSubmit={handleSubmit(onSave)} className="space-y-2">
              <AddressForm control={form.control} />
              <DialogFooter className="justify-start">
                <Button type="submit" className="w-full">Save Address</Button>
              </DialogFooter>
            </form>
          </FormComponent>
        )}
      </DialogContent>
    </Dialog>
  );
}

