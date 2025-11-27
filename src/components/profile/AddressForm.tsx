'use client';

import TextInput from '@/components/profile-ui/TextInput';
import PhoneInput from '@/components/profile-ui/PhoneInput';
import CheckboxField from '@/components/profile-ui/CheckboxField';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { INDIAN_STATES } from '@/lib/constants/states';

interface AddressFormData {
  address_line1: string;
  full_name: string;
  city: string;
  state: string;
  zip_code: string;
  phone: string;
  is_default: boolean;
}

interface AddressFormProps {
  formData: AddressFormData;
  onFormDataChange: (data: AddressFormData) => void;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
  saving: boolean;
  isEditing: boolean;
}

export default function AddressForm({
  formData,
  onFormDataChange,
  onSubmit,
  onCancel,
  saving,
  isEditing,
}: AddressFormProps) {
  const updateField = (field: keyof AddressFormData, value: string | boolean) => {
    onFormDataChange({ ...formData, [field]: value });
  };

  return (
    <form onSubmit={onSubmit} className="py-3 sm:py-4">
      <div className="space-y-4">
        <TextInput
          label="Address Line 1 *"
          required
          value={formData.address_line1}
          onChange={(e) => updateField('address_line1', e.target.value)}
          placeholder="Street address"
        />

        <TextInput
          label="Full Name"
          value={formData.full_name}
          onChange={(e) => {
            // Only allow alphabets and spaces
            const value = e.target.value.replace(/[^a-zA-Z\s]/g, '');
            updateField('full_name', value);
          }}
          placeholder="Recipient's full name"
        />

        <div className="grid grid-cols-3 gap-2">
          <TextInput
            label="City *"
            required
            value={formData.city}
            onChange={(e) => {
              // Only allow alphabets and spaces
              const value = e.target.value.replace(/[^a-zA-Z\s]/g, '');
              updateField('city', value);
            }}
            placeholder="City"
          />

          <div className="space-y-2">
            <label className="text-sm font-medium leading-none">State *</label>
            <Select
            value={formData.state}
              onValueChange={(value) => updateField('state', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select state" />
              </SelectTrigger>
              <SelectContent>
                {INDIAN_STATES.map((state) => (
                  <SelectItem key={state.code} value={state.code}>
                    {state.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
        </div>

          <TextInput
            label="ZIP Code *"
            required
            inputMode="numeric"
            pattern="[0-9]*"
            value={formData.zip_code}
            onChange={(e) => {
              const numericValue = e.target.value.replace(/\D/g, '');
              updateField('zip_code', numericValue);
            }}
            placeholder="ZIP code"
            maxLength={6}
          />
        </div>

          <PhoneInput
            label="Phone Number"
            value={formData.phone}
            onChange={(value) => updateField('phone', value)}
          />

        <CheckboxField
          label="Set as default address"
          checked={formData.is_default}
          onCheckedChange={(checked) => updateField('is_default', checked)}
        />

        <div className="pt-4">
          <div className="flex justify-end space-x-4">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={saving}
            >
              {saving ? 'Saving...' : isEditing ? 'Update Address' : 'Add Address'}
            </Button>
          </div>
        </div>
      </div>
    </form>
  );
}
