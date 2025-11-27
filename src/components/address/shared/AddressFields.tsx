'use client';

import { Control } from 'react-hook-form';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { INDIAN_STATES } from '@/lib/constants/states';
import { formatPhoneForInput } from '@/utils/phone';
import { cn } from '@/lib/utils';

interface AddressFieldsProps {
  control: Control<any>;
  errors?: Record<string, any>;
  fieldNames?: {
    fullName?: string;
    address?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    phone?: string;
  };
}

export default function AddressFields({ 
  control, 
  errors = {},
  fieldNames = {
    fullName: 'fullName',
    address: 'address',
    city: 'city',
    state: 'state',
    zipCode: 'zipCode',
    phone: 'phone',
  }
}: AddressFieldsProps) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField
          control={control}
          name={fieldNames.fullName || 'fullName'}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Full Name *</FormLabel>
              <FormControl>
                <Input 
                  placeholder="John Doe" 
                  {...field}
                  className={cn(
                    errors[fieldNames.fullName || 'fullName'] && "border-red-500 focus-visible:ring-red-500"
                  )}
                  onChange={(e) => {
                    // Only allow alphabets and spaces
                    const value = e.target.value.replace(/[^a-zA-Z\s]/g, '');
                    field.onChange(value);
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name={fieldNames.phone || 'phone'}
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
                    errors[fieldNames.phone || 'phone'] && "border-red-500 focus-visible:ring-red-500"
                  )}
                  onChange={(e) => {
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
      <FormField
        control={control}
        name={fieldNames.address || 'address'}
        render={({ field }) => (
          <FormItem>
            <FormLabel>Address *</FormLabel>
            <FormControl>
              <Input 
                placeholder="Street address" 
                {...field}
                className={cn(
                  errors[fieldNames.address || 'address'] && "border-red-500 focus-visible:ring-red-500"
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
          name={fieldNames.state || 'state'}
          render={({ field }) => (
            <FormItem>
              <FormLabel>State *</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger className={cn(
                    errors[fieldNames.state || 'state'] && "border-red-500 focus:ring-red-500"
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
          name={fieldNames.city || 'city'}
          render={({ field }) => (
            <FormItem>
              <FormLabel>City *</FormLabel>
              <FormControl>
                <Input 
                  placeholder="Enter your city" 
                  {...field}
                  className={cn(
                    errors[fieldNames.city || 'city'] && "border-red-500 focus-visible:ring-red-500"
                  )}
                  onChange={(e) => {
                    // Only allow alphabets and spaces
                    const value = e.target.value.replace(/[^a-zA-Z\s]/g, '');
                    field.onChange(value);
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name={fieldNames.zipCode || 'zipCode'}
          render={({ field }) => (
            <FormItem>
              <FormLabel>ZIP Code *</FormLabel>
              <FormControl>
                <Input
                  placeholder="123456"
                  maxLength={6}
                  {...field}
                  className={cn(
                    errors[fieldNames.zipCode || 'zipCode'] && "border-red-500 focus-visible:ring-red-500"
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
    </div>
  );
}

