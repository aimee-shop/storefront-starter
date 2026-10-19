/**
 * Pure helpers for checkout payment-state handling (unit-tested without network).
 */

/** Intent statuses that can still be confirmed client-side. */
const REUSABLE_INTENT_STATUSES = new Set([
  'pending',
  'requires_action',
  'requires_payment_method',
  'requires_confirmation',
]);

/** Whether an existing intent can be reused for confirm (avoid re-create on retry). */
export function isReusablePaymentIntent(status: string | undefined | null): boolean {
  if (!status) return false;
  return REUSABLE_INTENT_STATUSES.has(status.toLowerCase());
}

export interface CheckoutPaymentIntent {
  clientSecret: string;
  /** Send to checkout.complete after the shopper confirms payment. */
  paymentIntentId: string;
  publishableKey: string;
  /** Checkout revision whose total this attempt froze. */
  revision: number;
  status: string;
}

export function isValidPaymentIntent(
  intent: CheckoutPaymentIntent | null | undefined
): intent is CheckoutPaymentIntent {
  return (
    !!intent &&
    !!intent.clientSecret &&
    !!intent.publishableKey &&
    isReusablePaymentIntent(intent.status)
  );
}
