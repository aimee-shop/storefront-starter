import type { ZodError } from 'zod';

/**
 * Result shape for marketing form server actions (newsletter, contact).
 * Expected failures return as values for inline display -- never thrown.
 */
export type MarketingFormResult =
  | { ok: true }
  | { ok: false; formError?: string; fieldErrors?: Record<string, string> };

export const MARKETING_GENERIC_ERROR = 'Something went wrong. Please try again.';

export function zodFieldErrors(error: ZodError): Record<string, string> {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    const field = issue.path[0];
    if (typeof field === 'string' && !(field in fieldErrors)) {
      fieldErrors[field] = issue.message;
    }
  }
  return fieldErrors;
}
