'use server';

import { ValidationError } from '@aimee.shop/sdk';
import { sdk } from '@/lib/sdk';
import {
  MARKETING_GENERIC_ERROR,
  type MarketingFormResult,
  zodFieldErrors,
} from '@/lib/marketing-form';
import {
  contactSchema,
  type ContactValues,
} from '@/lib/validations/marketing';

export type { MarketingFormResult };

export async function submitContactAction(
  input: ContactValues
): Promise<MarketingFormResult> {
  const parsed = contactSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, fieldErrors: zodFieldErrors(parsed.error) };
  }

  try {
    await sdk.storefront.submitContactForm(parsed.data);
  } catch (error) {
    if (error instanceof ValidationError) {
      return {
        ok: false,
        formError: 'Please check your details and try again.',
      };
    }
    return { ok: false, formError: MARKETING_GENERIC_ERROR };
  }

  return { ok: true };
}
