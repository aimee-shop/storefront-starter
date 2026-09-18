import { z } from 'zod';

export const ADDRESS_TYPES = [
  'shipping',
  'billing',
  'home',
  'work',
  'other',
] as const;

export type AddressTypeValue = (typeof ADDRESS_TYPES)[number];

export const ADDRESS_TYPE_LABELS: Record<AddressTypeValue, string> = {
  shipping: 'Shipping',
  billing: 'Billing',
  home: 'Home',
  work: 'Work',
  other: 'Other',
};

export function isAddressType(value: string): value is AddressTypeValue {
  return (ADDRESS_TYPES as readonly string[]).includes(value);
}

export const addressSchema = z.object({
  type: z.enum(ADDRESS_TYPES, { message: 'Select an address type' }),
  firstName: z.string().max(100).optional(),
  lastName: z.string().max(100).optional(),
  label: z.string().max(100).optional(),
  address1: z.string().trim().min(1, 'Enter your street address').max(255),
  address2: z.string().max(255).optional(),
  city: z.string().trim().min(1, 'Enter your city').max(100),
  state: z.string().max(100).optional(),
  zip: z.string().trim().min(1, 'Enter a postal code').max(20),
  country: z
    .string()
    .trim()
    .min(2, 'Enter a 2-letter country code (e.g. US)')
    .max(2, 'Use a 2-letter country code (e.g. US)')
    .transform((value) => value.toUpperCase()),
  phone: z.string().max(30).optional(),
});

export type AddressFormValues = z.infer<typeof addressSchema>;
