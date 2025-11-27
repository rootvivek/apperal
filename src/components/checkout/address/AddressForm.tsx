'use client';

import { Control, useFormState } from 'react-hook-form';
import { CheckoutFormData } from '@/lib/schemas/checkout';
import AddressFields from '@/components/address/shared/AddressFields';

interface AddressFormProps {
  control: Control<CheckoutFormData>;
}

export default function AddressForm({ control }: AddressFormProps) {
  const { errors } = useFormState({ control });
  
  return <AddressFields control={control} errors={errors} />;
}

