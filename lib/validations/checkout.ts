import { z } from 'zod';
import { resolveCountry, resolveSubdivision } from '@/lib/address-codes';

/**
 * Guest contact + shipping address form.
 * Required fields match UpdateShippingAddressDto; email is required in the UI
 * for guest contact and is stored on shippingAddress.email.
 * country/state accept names or codes; submit maps them to ISO values.
 */
export const shippingAddressSchema = z
  .object({
    email: z.email('Enter a valid email address'),
    firstName: z.string().min(1, 'Enter your first name'),
    lastName: z.string().min(1, 'Enter your last name'),
    address1: z.string().min(1, 'Enter your street address'),
    address2: z.string().optional(),
    city: z.string().min(1, 'Enter your city'),
    state: z.string().optional(),
    zip: z.string().optional(),
    country: z
      .string()
      .trim()
      .min(1, 'Select a country')
      .refine((value) => resolveCountry(value) !== null, 'Select a valid country'),
    phone: z.string().optional(),
  })
  .superRefine((values, ctx) => {
    const country = resolveCountry(values.country);
    if (!country) return;
    if (country.country !== 'US' && country.country !== 'CA') return;

    const state = values.state?.trim() ?? '';
    if (!state) {
      ctx.addIssue({
        code: 'custom',
        path: ['state'],
        message: 'Select a state / province',
      });
      return;
    }
    if (!resolveSubdivision(country.country, state)) {
      ctx.addIssue({
        code: 'custom',
        path: ['state'],
        message: 'Select a valid state / province',
      });
    }
  });

export type ShippingAddressValues = z.infer<typeof shippingAddressSchema>;
