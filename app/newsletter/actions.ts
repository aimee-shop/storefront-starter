'use server';

import { ValidationError } from '@aimee.shop/sdk';
import { sdk } from '@/lib/sdk';
import {
  MARKETING_GENERIC_ERROR,
  type MarketingFormResult,
  zodFieldErrors,
} from '@/lib/marketing-form';
import {
  newsletterSchema,
  type NewsletterValues,
} from '@/lib/validations/marketing';

export type { MarketingFormResult };

export async function subscribeNewsletterAction(
  input: NewsletterValues
): Promise<MarketingFormResult> {
  const parsed = newsletterSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, fieldErrors: zodFieldErrors(parsed.error) };
  }

  try {
    await sdk.storefront.subscribeNewsletter({
      email: parsed.data.email,
      source: 'storefront-footer',
    });
  } catch (error) {
    if (error instanceof ValidationError) {
      return { ok: false, formError: 'Enter a valid email address.' };
    }
    return { ok: false, formError: MARKETING_GENERIC_ERROR };
  }

  return { ok: true };
}
