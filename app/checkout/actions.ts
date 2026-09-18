'use server';

import type { CheckoutCompletionResult } from '@aimee.shop/sdk';
import { config } from '@/lib/config';
import { getCustomerSession } from '@/lib/customer-session';
import {
  parseAmountCents,
  resolvePaymentCustomerId,
  type CheckoutPaymentIntent,
} from '@/lib/checkout-payment';
import { sdk } from '@/lib/sdk';

export interface CreateCheckoutPaymentIntentInput {
  /** Checkout session id -- amount/currency are loaded server-side from this session. */
  checkoutId: string;
}

/**
 * Create a Stripe PaymentIntent for the current checkout (server-side).
 *
 * Loads amount/currency from Core checkout session via the API key so the
 * client cannot undercharge. Uses AIMEE_API_KEY (never browser). The storefront
 * SDK entry has no payments client; this posts to the payments intents API
 * directly (same contract as PaymentIntentsClient.create).
 *
 * Requires the API key to hold `payments:process` and `checkout:read`.
 */
export async function createCheckoutPaymentIntent(
  input: CreateCheckoutPaymentIntentInput
): Promise<CheckoutPaymentIntent> {
  const apiKey = config.apiKey;
  const baseUrl = config.paymentsApiUrl;
  const storeId = config.storeId;

  if (!apiKey) {
    throw new Error(
      'Payment is not configured (missing AIMEE_API_KEY). Contact the store administrator.'
    );
  }
  if (!baseUrl) {
    throw new Error(
      'Payment is not configured (missing API URL). Contact the store administrator.'
    );
  }
  if (!input.checkoutId) {
    throw new Error('No checkout session.');
  }

  let session;
  try {
    session = await sdk.checkout.get(input.checkoutId);
  } catch {
    throw new Error(
      'Could not load checkout for payment. Refresh and try again.'
    );
  }

  // Prefer recalculated totals when shipping/tax are already on the session.
  let amountSource = session.total;
  let currency = session.currency || 'usd';
  try {
    const totals = await sdk.checkout.calculateTotals(input.checkoutId, {
      includeShipping: true,
      includeTax: true,
    });
    amountSource = totals.total;
    currency = totals.currency || currency;
  } catch {
    // Fall back to session.total from last shipping/totals step.
  }

  const amount = parseAmountCents(amountSource);
  if (amount < 1) {
    throw new Error(
      'Order total is not ready for payment. Go back and select shipping.'
    );
  }

  const signedIn = await getCustomerSession();
  const customerId = resolvePaymentCustomerId({
    signedInCustomerId: signedIn?.id ?? null,
    sessionCustomerId: session.customerId,
    checkoutId: input.checkoutId,
  });

  const customerEmail = session.shippingAddress?.email ?? signedIn?.email ?? null;
  const url = `${baseUrl.replace(/\/$/, '')}/v1/payments/intents`;

  const body: Record<string, unknown> = {
    customerId,
    amount,
    currency: currency.toLowerCase(),
    provider: 'stripe',
    metadata: { checkoutId: input.checkoutId },
  };
  if (customerEmail) {
    body.customerEmail = customerEmail;
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-api-key': apiKey,
  };
  if (storeId) {
    headers['x-store-id'] = storeId;
  }

  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      cache: 'no-store',
    });
  } catch {
    throw new Error(
      'Could not reach the payment service. Please try again in a moment.'
    );
  }

  if (!response.ok) {
    // Log status server-side; never pass raw upstream payloads to the client.
    console.error(
      `[checkout] payment intent create failed: status=${response.status}`
    );
    if (response.status === 401 || response.status === 403) {
      throw new Error(
        'Payment is not authorized for this storefront. The API key may need payments:process.'
      );
    }
    throw new Error('Could not start payment. Please try again.');
  }

  const data = (await response.json()) as Partial<CheckoutPaymentIntent>;
  if (!data.clientSecret || !data.publishableKey || !data.paymentId) {
    throw new Error('Payment service returned an incomplete response.');
  }

  return {
    clientSecret: data.clientSecret,
    paymentId: data.paymentId,
    publishableKey: data.publishableKey,
    status: data.status ?? 'pending',
  };
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
