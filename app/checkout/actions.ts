'use server';

import type {
  CheckoutCompletionResult,
  CheckoutRefusalTotals,
} from '@aimee.shop/sdk';
import { CHECKOUT_REFUSAL_CODES, getCheckoutRefusal } from '@aimee.shop/sdk';
import { config } from '@/lib/config';
import type { CheckoutPaymentIntent } from '@/lib/checkout-payment';
import { sdk } from '@/lib/sdk';

export interface PrepareCheckoutPaymentInput {
  checkoutId: string;
  /** Checkout revision whose total the shopper accepted (from totals/session). */
  revision: number;
  /**
   * Bind the customer's Stripe customer to the intent. Needed to pay with a
   * saved card; also vaults a newly entered card, so send it only when the
   * shopper chose a saved card. Registered customers only.
   */
  savePaymentMethod?: boolean;
}

/**
 * Why preparePayment refused:
 * - stale: the priced total changed; `revision`/`totals` carry the new price
 *   when the API sent it. The shopper must review it before paying.
 * - shipping: the selected shipping rate is no longer offered; pick another.
 * - retry: transient; the same call can succeed after `retryAfterSeconds`.
 * - failed: anything else.
 */
export type PrepareRefusalReason = 'stale' | 'shipping' | 'retry' | 'failed';

export type PrepareCheckoutPaymentResult =
  | { ok: true; intent: CheckoutPaymentIntent }
  | {
      ok: false;
      message: string;
      reason: PrepareRefusalReason;
      revision?: number;
      totals?: CheckoutRefusalTotals;
      retryAfterSeconds?: number;
    };

// Compensation statuses where the payment is (being) returned to the shopper.
const RETURNED_STATUSES: ReadonlySet<string> = new Set([
  'pending',
  'undone',
  'refund_accepted',
]);

const STALE_CODES: ReadonlySet<string> = new Set([
  CHECKOUT_REFUSAL_CODES.CHECKOUT_REVISION_CHANGED,
  CHECKOUT_REFUSAL_CODES.CHECKOUT_CART_CHANGED,
  CHECKOUT_REFUSAL_CODES.SHIPPING_RATE_CHANGED,
]);

// The same prepare call can succeed shortly: an attempt being retired, a
// concurrent revision write, preparation still running, or a shipping requote.
const RETRY_CODES: ReadonlySet<string> = new Set([
  CHECKOUT_REFUSAL_CODES.CHECKOUT_ATTEMPT_RETIRING,
  CHECKOUT_REFUSAL_CODES.CHECKOUT_REVISION_CONFLICT,
  CHECKOUT_REFUSAL_CODES.CHECKOUT_ATTEMPT_NOT_READY,
  CHECKOUT_REFUSAL_CODES.SHIPPING_QUOTE_UNAVAILABLE,
]);

/**
 * Price the checkout server-side and freeze that total in a payment attempt
 * (checkout.preparePayment). The browser never sends an amount: the platform
 * prices the session, so the client cannot undercharge. Calling again with the
 * same revision returns the same intent while it can still be paid.
 *
 * Requires the API key to hold `checkout:complete` (secret key, server only).
 */
export async function prepareCheckoutPayment(
  input: PrepareCheckoutPaymentInput
): Promise<PrepareCheckoutPaymentResult> {
  if (!config.apiKey) {
    return {
      ok: false,
      reason: 'failed',
      message:
        'Payment is not configured (missing AIMEE_API_KEY). Contact the store administrator.',
    };
  }
  if (!input.checkoutId) {
    return { ok: false, reason: 'failed', message: 'No checkout session.' };
  }

  try {
    const prepared = await sdk.checkout.preparePayment(input.checkoutId, {
      revision: input.revision,
      provider: 'stripe',
      ...(input.savePaymentMethod ? { savePaymentMethod: true } : {}),
    });
    if (!prepared.publishableKey || !prepared.clientSecret) {
      throw new Error('Payment service returned an incomplete response.');
    }
    return {
      ok: true,
      intent: {
        clientSecret: prepared.clientSecret,
        paymentIntentId: prepared.paymentIntentId,
        publishableKey: prepared.publishableKey,
        revision: prepared.revision,
        status: prepared.status,
      },
    };
  } catch (error) {
    const refusal = getCheckoutRefusal(error);
    if (refusal && STALE_CODES.has(refusal.code)) {
      return {
        ok: false,
        reason: 'stale',
        message: 'Your order total changed. Review the updated total and try again.',
        ...(refusal.revision !== undefined ? { revision: refusal.revision } : {}),
        ...(refusal.totals ? { totals: refusal.totals } : {}),
      };
    }
    if (refusal?.code === CHECKOUT_REFUSAL_CODES.SHIPPING_RATE_UNAVAILABLE) {
      return {
        ok: false,
        reason: 'shipping',
        message: 'That shipping method is no longer available. Choose another.',
      };
    }
    if (refusal && RETRY_CODES.has(refusal.code)) {
      return {
        ok: false,
        reason: 'retry',
        message: 'Could not start payment. Please try again.',
        ...(refusal.retryAfterSeconds !== undefined
          ? { retryAfterSeconds: refusal.retryAfterSeconds }
          : {}),
      };
    }
    if (refusal?.code === CHECKOUT_REFUSAL_CODES.CHECKOUT_PAYMENT_TAKEN) {
      return {
        ok: false,
        reason: 'failed',
        message:
          'A payment for this checkout was already received. Check your email or contact support before paying again.',
      };
    }
    // Log server-side; never pass raw upstream payloads to the client.
    console.error('[checkout] preparePayment failed', error);
    return {
      ok: false,
      reason: 'failed',
      message: 'Could not start payment. Please try again.',
    };
  }
}

export interface CompleteCheckoutSessionInput {
  checkoutId: string;
  paymentIntentId: string;
}

// Like PrepareCheckoutPaymentResult: a thrown server action error reaches a
// production client only as React error #441, so refusals come back as a
// result the shopper can read.
export type CompleteCheckoutSessionResult =
  | { ok: true; completion: CheckoutCompletionResult }
  | { ok: false; message: string };

/**
 * Complete checkout and create the order (server-side).
 *
 * Uses AIMEE_API_KEY -- checkout:complete is outside the publishable-key
 * permission ceiling. The browser only sends checkoutId + paymentIntentId
 * after Stripe client-side confirmation (incl. 3DS).
 *
 * Requires the API key to hold `checkout:complete` (and related reads).
 */
export async function completeCheckoutSession(
  input: CompleteCheckoutSessionInput
): Promise<CompleteCheckoutSessionResult> {
  if (!input.checkoutId) {
    return { ok: false, message: 'No checkout session.' };
  }
  if (!input.paymentIntentId) {
    return { ok: false, message: 'Missing payment confirmation.' };
  }
  if (!config.apiKey) {
    return {
      ok: false,
      message:
        'Checkout completion is not configured (missing AIMEE_API_KEY). Contact the store administrator.',
    };
  }

  try {
    const completion = await sdk.checkout.complete(
      input.checkoutId,
      {
        paymentIntentId: input.paymentIntentId,
        // MVP has no separate terms checkbox on the payment step.
        termsAccepted: true,
      },
      // One key per paid attempt: a retry or double submit replays the
      // first completion instead of completing twice.
      {
        idempotencyKey: `checkout-complete:${input.checkoutId}:${input.paymentIntentId}`,
      }
    );
    return { ok: true, completion };
  } catch (error) {
    console.error('[checkout] complete failed', error);
    const compensation = getCheckoutRefusal(error)?.compensation;
    if (compensation && RETURNED_STATUSES.has(compensation.status)) {
      return {
        ok: false,
        message:
          'We could not complete your order, and your payment is being returned. Please try again.',
      };
    }
    if (error instanceof Error && /expir/i.test(error.message)) {
      return {
        ok: false,
        message:
          'This checkout session has expired. Return to your cart and try again.',
      };
    }
    return {
      ok: false,
      message:
        'Payment succeeded but order completion failed. Please contact support with your payment confirmation.',
    };
  }
}
