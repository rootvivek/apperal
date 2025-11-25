'use client';

import { Control, useFormState } from 'react-hook-form';
import { CheckoutFormData } from '@/lib/schemas/checkout';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { INDIAN_STATES } from '@/lib/constants/states';
import { formatPhoneForInput } from '@/utils/phone';
import { cn } from '@/lib/utils';

interface AddressFormProps {
  control: Control<CheckoutFormData>;
}

export default function AddressForm({ control }: AddressFormProps) {
  const { errors } = useFormState({ control });
  
  return (
    <div className="space-y-4">
      <FormField
        control={control}
        name="fullName"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Full Name *</FormLabel>
            <FormControl>
              <Input 
                placeholder="John Doe" 
                {...field}
                className={cn(
                  errors.fullName && "border-red-500 focus-visible:ring-red-500"
                )}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={control}
        name="address"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Address *</FormLabel>
            <FormControl>
              <Input 
                placeholder="Street address" 
                {...field}
                className={cn(
                  errors.address && "border-red-500 focus-visible:ring-red-500"
                )}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <div className="grid grid-cols-3 gap-2">
        <FormField
          control={control}
          name="state"
          render={({ field }) => (
            <FormItem>
              <FormLabel>State *</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger className={cn(
                    errors.state && "border-red-500 focus:ring-red-500"
                  )}>
                    <SelectValue placeholder="Select state" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {INDIAN_STATES.map((state) => (
                    <SelectItem key={state.code} value={state.code}>
                      {state.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name="city"
          render={({ field }) => (
            <FormItem>
              <FormLabel>City *</FormLabel>
              <FormControl>
                <Input 
                  placeholder="Enter your city" 
                  {...field}
                  className={cn(
                    errors.city && "border-red-500 focus-visible:ring-red-500"
                  )}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name="zipCode"
          render={({ field }) => (
            <FormItem>
              <FormLabel>ZIP Code *</FormLabel>
              <FormControl>
                <Input
                  placeholder="123456"
                  maxLength={6}
                  {...field}
                  className={cn(
                    errors.zipCode && "border-red-500 focus-visible:ring-red-500"
                  )}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '');
                    field.onChange(value);
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
      <FormField
        control={control}
        name="phone"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Phone Number *</FormLabel>
            <FormControl>
              <Input
                placeholder="9876543210"
                maxLength={10}
                inputMode="numeric"
                {...field}
                className={cn(
                  errors.phone && "border-red-500 focus-visible:ring-red-500"
                )}
                onChange={(e) => {
                  // Normalize phone input (removes +91, spaces, etc.)
                  const cleaned = formatPhoneForInput(e.target.value);
                  field.onChange(cleaned);
                }}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}

