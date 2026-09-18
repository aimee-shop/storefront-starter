import { z } from 'zod';

/**
 * Guest contact + shipping address form.
 * Required fields match UpdateShippingAddressDto; email is required in the UI
 * for guest contact and is stored on shippingAddress.email.
 */
export const shippingAddressSchema = z.object({
  email: z.email('Enter a valid email address'),
  firstName: z.string().min(1, 'Enter your first name'),
  lastName: z.string().min(1, 'Enter your last name'),
  address1: z.string().min(1, 'Enter your street address'),
  address2: z.string().optional(),
  city: z.string().min(1, 'Enter your city'),
  state: z.string().optional(),
  zip: z.string().optional(),
  country: z.string().min(1, 'Enter a country code (e.g. US)'),
  phone: z.string().optional(),
});

export type ShippingAddressValues = z.infer<typeof shippingAddressSchema>;
