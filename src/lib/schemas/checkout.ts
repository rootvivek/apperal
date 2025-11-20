import { z } from 'zod';

export const checkoutFormSchema = z.object({
  fullName: z.string().min(1, 'Name is required'),
  address: z.string().min(1, 'Address is required'),
  city: z.string().min(1, 'City is required'),
  state: z.string().min(1, 'State is required'),
  zipCode: z.string().regex(/^\d{6}$/, 'Zip code must be exactly 6 digits'),
  phone: z.string()
    .transform((val) => {
      // Remove +91 prefix if present, then remove all non-digits
      const cleaned = val.replace(/^\+91\s*/, '').replace(/\D/g, '');
      return cleaned;
    })
    .refine((val) => val.length === 10, {
      message: 'Phone number must be exactly 10 digits',
    }),
  // Note: Phone is kept as string in form, converted to number when saving to database
  paymentMethod: z.enum(['cod', 'upi']),
  cardNumber: z.string().optional(),
  expiryDate: z.string().optional(),
  cvv: z.string().optional(),
  cardName: z.string().optional(),
});

export type CheckoutFormData = z.infer<typeof checkoutFormSchema>;

