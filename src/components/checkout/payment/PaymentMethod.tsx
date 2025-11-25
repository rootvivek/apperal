'use client';

import { Control } from 'react-hook-form';
import { CheckoutFormData } from '@/lib/schemas/checkout';
import { FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';

interface PaymentMethodProps {
  control: Control<CheckoutFormData>;
}

export default function PaymentMethod({ control }: PaymentMethodProps) {
  return (
    <div>
      <FormField
        control={control}
        name="paymentMethod"
        render={({ field }) => (
          <FormItem>
            <FormControl>
              <RadioGroup
                onValueChange={field.onChange}
                value={field.value}
                className="space-y-2"
              >
                <div className={`flex items-center space-x-3 p-3 border rounded-[4px] transition-colors cursor-pointer ${
                  field.value === 'upi' ? 'border-primary bg-primary/5' : 'border-gray-200 hover:bg-gray-50'
                }`}>
                  <RadioGroupItem value="upi" id="upi" />
                  <Label htmlFor="upi" className="flex-1 cursor-pointer">
                    <div className="font-medium text-sm sm:text-base">UPI</div>
                    <div className="text-xs sm:text-sm text-muted-foreground">
                      Pay with UPI apps like PhonePe, Google Pay, Paytm
                    </div>
                  </Label>
                </div>
                <div className={`flex items-center space-x-3 p-3 border rounded-[4px] transition-colors cursor-pointer ${
                  field.value === 'cod' ? 'border-primary bg-primary/5' : 'border-gray-200 hover:bg-gray-50'
                }`}>
                  <RadioGroupItem value="cod" id="cod" />
                  <Label htmlFor="cod" className="flex-1 cursor-pointer">
                    <div className="font-medium text-sm sm:text-base">Cash on Delivery</div>
                    <div className="text-xs sm:text-sm text-muted-foreground">Pay cash when your order arrives</div>
                  </Label>
                </div>
              </RadioGroup>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}

