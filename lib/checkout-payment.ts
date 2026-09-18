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

/**
 * Parse an SDK money field (cent string/number) into a positive integer amount.
 */
export function parseAmountCents(total: string | number | undefined | null): number {
  if (total === undefined || total === null || total === '') {
    return 0;
  }
  const n = typeof total === 'number' ? total : Number(total);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.round(n);
}

/**
 * Resolve customerId for PaymentIntent create.
 * Payments service requires a non-empty string but does not validate Core customers.
 */
export function resolvePaymentCustomerId(options: {
  signedInCustomerId?: string | null;
  sessionCustomerId?: string | null;
  checkoutId: string;
}): string {
  if (options.signedInCustomerId) return options.signedInCustomerId;
  if (options.sessionCustomerId) return options.sessionCustomerId;
  return `guest:${options.checkoutId}`;
}

/** Whether an existing intent can be reused for confirm (avoid re-create on retry). */
export function isReusablePaymentIntent(status: string | undefined | null): boolean {
  if (!status) return false;
  return REUSABLE_INTENT_STATUSES.has(status.toLowerCase());
}

export interface CheckoutPaymentIntent {
  clientSecret: string;
  paymentId: string;
  publishableKey: string;
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
