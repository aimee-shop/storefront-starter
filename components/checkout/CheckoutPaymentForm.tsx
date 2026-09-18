'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
// /pure: do not inject js.stripe.com until loadStripe() is called.
// Default @stripe/stripe-js entry auto-loads the CDN script on module eval.
import { loadStripe } from '@stripe/stripe-js/pure';
import {
  Elements,
  CardElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import { cn } from '@/lib/utils';

const CARD_ELEMENT_OPTIONS = {
  style: {
    base: {
      fontSize: '16px',
      color: 'var(--foreground, #0a0a0a)',
      fontFamily:
        'ui-sans-serif, system-ui, sans-serif, "Apple Color Emoji", "Segoe UI Emoji"',
      '::placeholder': { color: '#a3a3a3' },
    },
    invalid: { color: '#dc2626', iconColor: '#dc2626' },
  },
  // Postal code already collected on the shipping address step.
  hidePostalCode: true,
};

export type PaymentConfirmResult =
  | {
      success: true;
      paymentIntentId: string;
      paymentIntentStatus?: string;
    }
  | { success: false; error: string };

export type ConfirmPaymentFn = (
  clientSecret: string
) => Promise<PaymentConfirmResult>;

/**
 * Inner form inside Stripe Elements. Exposes confirmPayment via onReady.
 * Card data goes only to Stripe (SAQ A) -- never to Aimee servers.
 */
function StripeCardInput({
  onReady,
  disabled,
}: {
  onReady?: (confirmPayment: ConfirmPaymentFn) => void;
  disabled?: boolean;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = useState<string | null>(null);

  const confirmPayment = useCallback(
    async (clientSecret: string): Promise<PaymentConfirmResult> => {
      if (!stripe || !elements) {
        return { success: false, error: 'Stripe is still loading' };
      }

      const cardElement = elements.getElement(CardElement);
      if (!cardElement) {
        return { success: false, error: 'Card field not found' };
      }

      const { error: stripeError, paymentIntent } =
        await stripe.confirmCardPayment(clientSecret, {
          payment_method: { card: cardElement },
        });

      if (stripeError) {
        const message = stripeError.message ?? 'Payment failed';
        setError(message);
        return { success: false, error: message };
      }

      const paymentIntentId = paymentIntent?.id;
      const status = paymentIntent?.status;
      // confirmCardPayment resolves after 3DS; only treat terminal success as done.
      if (!paymentIntentId || (status && status !== 'succeeded' && status !== 'requires_capture')) {
        const message =
          status === 'processing'
            ? 'Payment is still processing. Please wait a moment and try again.'
            : 'Payment was not completed. Please try again.';
        setError(message);
        return { success: false, error: message };
      }

      setError(null);
      return {
        success: true,
        paymentIntentId,
        paymentIntentStatus: status,
      };
    },
    [stripe, elements]
  );

  useEffect(() => {
    if (stripe && elements && onReady) {
      onReady(confirmPayment);
    }
  }, [stripe, elements, onReady, confirmPayment]);

  return (
    <div>
      <div
        className={cn(
          'rounded-md border bg-background px-3 py-3',
          error
            ? 'border-destructive focus-within:border-destructive'
            : 'border-input focus-within:border-ring'
        )}
      >
        <CardElement options={{ ...CARD_ELEMENT_OPTIONS, disabled }} />
      </div>
      {error && (
        <p className="mt-1.5 text-xs text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

/**
 * Stripe Elements card form for checkout.
 * publishableKey comes from PaymentIntent create response (not a static env key).
 */
export function CheckoutPaymentForm({
  publishableKey,
  onReady,
  disabled,
}: {
  publishableKey: string;
  onReady?: (confirmPayment: ConfirmPaymentFn) => void;
  disabled?: boolean;
}) {
  const stripePromise = useMemo(
    () => (publishableKey ? loadStripe(publishableKey) : null),
    [publishableKey]
  );

  if (!stripePromise) {
    return (
      <p className="py-4 text-sm text-muted-foreground">
        Loading payment form...
      </p>
    );
  }

  return (
    <Elements key={publishableKey} stripe={stripePromise}>
      <StripeCardInput onReady={onReady} disabled={disabled} />
    </Elements>
  );
}
