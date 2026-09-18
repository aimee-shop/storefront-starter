'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
// /pure: do not inject js.stripe.com until loadStripe() is called.
import { loadStripe } from '@stripe/stripe-js/pure';
import {
  CardElement,
  Elements,
  useElements,
  useStripe,
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
};

export type SetupConfirmResult =
  | { success: true; setupIntentId: string }
  | { success: false; error: string };

export type ConfirmSetupFn = (
  clientSecret: string
) => Promise<SetupConfirmResult>;

function StripeCardInput({
  onReady,
  disabled,
}: {
  onReady?: (confirmSetup: ConfirmSetupFn) => void;
  disabled?: boolean;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = useState<string | null>(null);

  const confirmSetup = useCallback(
    async (clientSecret: string): Promise<SetupConfirmResult> => {
      if (!stripe || !elements) {
        return { success: false, error: 'Stripe is still loading' };
      }

      const cardElement = elements.getElement(CardElement);
      if (!cardElement) {
        return { success: false, error: 'Card field not found' };
      }

      const { error: stripeError, setupIntent } = await stripe.confirmCardSetup(
        clientSecret,
        { payment_method: { card: cardElement } }
      );

      if (stripeError) {
        const message = stripeError.message ?? 'Could not save this card.';
        setError(message);
        return { success: false, error: message };
      }

      const setupIntentId = setupIntent?.id;
      const status = setupIntent?.status;
      if (!setupIntentId || status !== 'succeeded') {
        const message =
          status === 'processing'
            ? 'Card verification is still processing. Please wait a moment and try again.'
            : 'Card was not saved. Please try again.';
        setError(message);
        return { success: false, error: message };
      }

      setError(null);
      return { success: true, setupIntentId };
    },
    [stripe, elements]
  );

  useEffect(() => {
    if (stripe && elements && onReady) {
      onReady(confirmSetup);
    }
  }, [stripe, elements, onReady, confirmSetup]);

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
 * Stripe Elements card form for account add-card.
 * publishableKey comes from SetupIntent create response (not a static env key).
 */
export function AddCardPaymentForm({
  publishableKey,
  onReady,
  disabled,
}: {
  publishableKey: string;
  onReady?: (confirmSetup: ConfirmSetupFn) => void;
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
