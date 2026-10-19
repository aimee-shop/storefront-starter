'use server';

import type { CheckoutCompletionResult } from '@aimee.shop/sdk';
import { CHECKOUT_REFUSAL_CODES, getCheckoutRefusal } from '@aimee.shop/sdk';
import { config } from '@/lib/config';
import type { CheckoutPaymentIntent } from '@/lib/checkout-payment';
import { sdk } from '@/lib/sdk';

export interface PrepareCheckoutPaymentInput {
  checkoutId: string;
  /** Checkout revision whose total the shopper accepted (from totals/session). */
  revision: number;
}

export type PrepareCheckoutPaymentResult =
  | { ok: true; intent: CheckoutPaymentIntent }
  | {
      ok: false;
      message: string;
      /** The priced total changed; refetch totals before retrying. */
      stale: boolean;
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
    throw new Error(
      'Payment is not configured (missing AIMEE_API_KEY). Contact the store administrator.'
    );
  }
  if (!input.checkoutId) {
    throw new Error('No checkout session.');
  }

  try {
    const prepared = await sdk.checkout.preparePayment(input.checkoutId, {
      revision: input.revision,
      provider: 'stripe',
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
        stale: true,
        message: 'Your order total changed. Review the updated total and try again.',
      };
    }
    if (
      refusal?.code === CHECKOUT_REFUSAL_CODES.SHIPPING_RATE_UNAVAILABLE ||
      refusal?.code === CHECKOUT_REFUSAL_CODES.SHIPPING_QUOTE_UNAVAILABLE
    ) {
      return {
        ok: false,
        stale: false,
        message:
          'That shipping method is no longer available. Go back and choose another.',
      };
    }
    if (refusal?.code === CHECKOUT_REFUSAL_CODES.CHECKOUT_PAYMENT_TAKEN) {
      return {
        ok: false,
        stale: false,
        message:
          'A payment for this checkout was already received. Check your email or contact support before paying again.',
      };
    }
    // Log server-side; never pass raw upstream payloads to the client.
    console.error('[checkout] preparePayment failed', error);
    return {
      ok: false,
      stale: false,
      message: 'Could not start payment. Please try again.',
    };
  }
}

export interface CompleteCheckoutSessionInput {
  checkoutId: string;
  paymentIntentId: string;
}

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
): Promise<CheckoutCompletionResult> {
  if (!input.checkoutId) {
    throw new Error('No checkout session.');
  }
  if (!input.paymentIntentId) {
    throw new Error('Missing payment confirmation.');
  }
  if (!config.apiKey) {
    throw new Error(
      'Checkout completion is not configured (missing AIMEE_API_KEY). Contact the store administrator.'
    );
  }

  try {
    return await sdk.checkout.complete(input.checkoutId, {
      paymentIntentId: input.paymentIntentId,
      // MVP has no separate terms checkbox on the payment step.
      termsAccepted: true,
    });
  } catch (error) {
    console.error('[checkout] complete failed', error);
    const compensation = getCheckoutRefusal(error)?.compensation;
    if (compensation && RETURNED_STATUSES.has(compensation.status)) {
      throw new Error(
        'We could not complete your order, and your payment is being returned. Please try again.'
      );
    }
    if (error instanceof Error && /expir/i.test(error.message)) {
      throw new Error(
        'This checkout session has expired. Return to your cart and try again.'
      );
    }
    throw new Error(
      'Payment succeeded but order completion failed. Please contact support with your payment confirmation.'
    );
  }
}
