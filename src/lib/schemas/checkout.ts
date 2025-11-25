import { z } from 'zod';
import { normalizePhone, validatePhone } from '@/utils/phone';

export const checkoutFormSchema = z.object({
  fullName: z.string().min(1, 'Name is required'),
  address: z.string().min(1, 'Address is required'),
  city: z.string().min(1, 'City is required'),
  state: z.string().min(1, 'State is required'),
  zipCode: z.string().regex(/^\d{6}$/, 'Zip code must be exactly 6 digits'),
  phone: z.string()
    .transform((val) => {
      // Normalize phone number (removes +91, spaces, etc., keeps only 10 digits)
      return normalizePhone(val);
    })
    .refine((val) => {
      const validation = validatePhone(val);
      return validation.isValid;
    }, {
      message: 'Phone number must be exactly 10 digits and start with 6, 7, 8, or 9',
    }),
  // Note: Phone is kept as string in form, normalized to 10 digits when saving to database
  paymentMethod: z.enum(['cod', 'upi']),
  cardNumber: z.string().optional(),
  expiryDate: z.string().optional(),
  cvv: z.string().optional(),
  cardName: z.string().optional(),
});

export type CheckoutFormData = z.infer<typeof checkoutFormSchema>;

