'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import type { ConfirmPaymentFn } from '@/components/checkout/CheckoutPaymentForm';
import { FormAlert } from '@/components/account/FormAlert';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Skeleton } from '@/components/ui/skeleton';
import type { SavedPaymentMethod } from '@/app/account/payment-methods/types';
import {
  paymentMethodExpiryLabel,
  paymentMethodLabel,
} from '@/lib/payment-method-label';
import {
  buildGuestConfirmationHandoff,
  resolveConfirmationOrderParam,
  saveGuestConfirmationHandoff,
} from '@/lib/checkout-confirmation';
import { useCartStore } from '@/stores/cart-store';
import { useCheckoutStore } from '@/stores/checkout-store';

// Defer @stripe/* until a PaymentIntent exists (not during intent create).
const CheckoutPaymentForm = dynamic(
  () =>
    import('@/components/checkout/CheckoutPaymentForm').then(
      (m) => m.CheckoutPaymentForm
    ),
  {
    ssr: false,
    loading: () => <Skeleton className="h-12 w-full" />,
  }
);

const NEW_CARD = 'new';

/**
 * Payment step: create PaymentIntent, collect card via Stripe Elements,
 * confirm (incl. 3DS), then checkout.complete. On success: clear cart and
 * redirect to /checkout/confirmation.
 */
export function CheckoutPaymentStep({
  savedCards = [],
}: {
  /** The signed-in shopper's saved Stripe cards, default first. */
  savedCards?: SavedPaymentMethod[];
}) {
  const router = useRouter();
  const paymentIntent = useCheckoutStore((s) => s.paymentIntent);
  const completion = useCheckoutStore((s) => s.completion);
  const isLoading = useCheckoutStore((s) => s.isLoading);
  const storeError = useCheckoutStore((s) => s.error);
  const ensurePaymentIntent = useCheckoutStore((s) => s.ensurePaymentIntent);
  const preparePaymentForConfirm = useCheckoutStore(
    (s) => s.preparePaymentForConfirm
  );
  const completeCheckout = useCheckoutStore((s) => s.completeCheckout);
  const clearPaymentIntent = useCheckoutStore((s) => s.clearPaymentIntent);
  const clearCart = useCartStore((s) => s.clearCart);

  const [formError, setFormError] = useState<string | null>(null);
  const [paying, setPaying] = useState(false);
  const [postPayError, setPostPayError] = useState<string | null>(null);
  // A saved card (default first) is preselected; NEW_CARD shows the card field.
  const [selectedId, setSelectedId] = useState<string>(
    savedCards[0]?.id ?? NEW_CARD
  );
  const savedCard = savedCards.find((pm) => pm.id === selectedId) ?? null;
  // Paying with a saved card needs the shopper's Stripe customer on the intent.
  const intentOptions = { savePaymentMethod: savedCard !== null };
  const confirmRef = useRef<ConfirmPaymentFn | null>(null);
  const loadStarted = useRef(false);

  // Load intent once on mount (same latch pattern as ShippingMethodForm rates).
  useEffect(() => {
    if (completion) return;
    if (loadStarted.current) return;
    loadStarted.current = true;
    void ensurePaymentIntent(intentOptions).catch(() => {
      // Error surface via storeError
    });
    // intentOptions is the selection at mount; Pay re-prepares with the current one.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ensurePaymentIntent, completion]);

  const handleReady = useCallback((confirm: ConfirmPaymentFn) => {
    confirmRef.current = confirm;
  }, []);

  const handleRetryIntent = () => {
    setFormError(null);
    clearPaymentIntent();
    loadStarted.current = false;
    loadStarted.current = true;
    void ensurePaymentIntent(intentOptions).catch(() => {
      // storeError
    });
  };

  const handlePay = async () => {
    if (!paymentIntent?.clientSecret) {
      setFormError('Payment is not ready. Please try again.');
      return;
    }
    const confirm = confirmRef.current;
    if (!confirm) {
      setFormError('Card form is still loading. Wait a moment and try again.');
      return;
    }

    setFormError(null);
    setPaying(true);
    try {
      // A refusal (new total, shipping gone) sets storeError and throws.
      const intent = await preparePaymentForConfirm(intentOptions);
      const result = await confirm(intent.clientSecret);
      if (!result.success) {
        // Session stays OPEN / payment_setup server-side; allow another card.
        clearPaymentIntent();
        loadStarted.current = false;
        setFormError(
          result.error ||
            'Payment failed. Try another card or payment method.'
        );
        // Recreate a fresh PaymentIntent for the next attempt.
        void ensurePaymentIntent(intentOptions).catch(() => {
          // storeError
        });
        return;
      }

      // 3DS is handled inside confirmCardPayment. complete takes the id from
      // preparePayment, not the Stripe PaymentIntent id.
      const completionResult = await completeCheckout(intent.paymentIntentId);
      const email =
        useCheckoutStore.getState().session?.shippingAddress?.email ?? null;
      const guestHandoff = buildGuestConfirmationHandoff(completionResult, {
        email,
      });
      if (guestHandoff) {
        saveGuestConfirmationHandoff(guestHandoff);
      }
      // Clear cart immediately for icon/cart page; keep checkout completion so
      // the empty-cart redirect on /checkout does not race this navigation.
      // createFromCart clears completion on the next checkout.
      clearCart();
      const orderParam = resolveConfirmationOrderParam(completionResult);
      if (!orderParam) {
        setPostPayError(
          'Your order was placed, but we could not open the confirmation page. Check My Account > Orders or your email.'
        );
        return;
      }
      router.replace(
        `/checkout/confirmation?order=${encodeURIComponent(orderParam)}`
      );
    } catch (error) {
      // completeCheckout sets storeError itself. Anything else (a Stripe.js
      // throw) must still reach the shopper instead of failing silently.
      if (!useCheckoutStore.getState().error) {
        setFormError(
          error instanceof Error && error.message
            ? error.message
            : 'Payment failed. Try another card or payment method.'
        );
      }
    } finally {
      setPaying(false);
    }
  };

  // After complete: redirect UI, or post-pay error if order number missing.
  // Not while paying: the card Element must stay mounted until
  // confirmCardPayment settles, or Stripe.js cannot read the card.
  if (completion) {
    if (postPayError) {
      return (
        <div className="space-y-4">
          <div
            role="status"
            className="rounded-lg border border-primary/20 bg-primary/5 p-6 text-center"
          >
            <h3 className="text-lg font-semibold">Order placed</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Payment succeeded. Your cart has been cleared.
            </p>
          </div>
          <FormAlert message={postPayError} />
        </div>
      );
    }
    return (
      <div
        role="status"
        className="rounded-lg border border-primary/20 bg-primary/5 p-6 text-center"
      >
        <h3 className="text-lg font-semibold">Order placed</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Taking you to your confirmation...
        </p>
        <Skeleton className="mx-auto mt-4 h-2 w-32" />
      </div>
    );
  }

  const showIntentSkeleton = isLoading && !paymentIntent;
  const showIntentError = !paymentIntent && !!storeError && !isLoading;

  if (showIntentSkeleton || (!paymentIntent && !storeError)) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-10 w-32" />
      </div>
    );
  }

  if (showIntentError) {
    return (
      <div className="space-y-4">
        <FormAlert message={storeError} />
        <Button type="button" variant="outline" size="sm" onClick={handleRetryIntent}>
          Try again
        </Button>
      </div>
    );
  }

  if (!paymentIntent) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-10 w-32" />
      </div>
    );
  }

  const busy = paying || isLoading;

  return (
    <div className="space-y-4">
      <FormAlert
        message={formError ?? (storeError && paymentIntent ? storeError : null)}
      />

      {savedCards.length > 0 && (
        <RadioGroup
          value={selectedId}
          onValueChange={(value) => setSelectedId(String(value))}
          aria-label="Saved cards"
          disabled={busy}
        >
          {savedCards.map((pm) => (
            <Label
              key={pm.id}
              className="flex items-center gap-3 rounded-md border p-3 font-normal"
            >
              <RadioGroupItem value={pm.id} />
              <span className="text-sm">
                {paymentMethodLabel(pm)}
                {pm.isDefault && (
                  <span className="ml-2 text-xs text-muted-foreground">
                    Default
                  </span>
                )}
                {paymentMethodExpiryLabel(pm) && (
                  <span className="ml-2 text-muted-foreground">
                    {paymentMethodExpiryLabel(pm)}
                  </span>
                )}
              </span>
            </Label>
          ))}
          <Label
            className="flex items-center gap-3 rounded-md border p-3 font-normal"
          >
            <RadioGroupItem value={NEW_CARD} />
            <span className="text-sm">Use a new card</span>
          </Label>
        </RadioGroup>
      )}

      {savedCard && (
        <p className="text-sm text-muted-foreground">
          We will charge the selected card.
        </p>
      )}

      <div>
        {!savedCard && <p className="mb-2 text-sm font-medium">Card details</p>}
        <CheckoutPaymentForm
          publishableKey={paymentIntent.publishableKey}
          onReady={handleReady}
          disabled={isLoading}
          savedMethodId={savedCard?.providerMethodId ?? null}
        />
      </div>

      <p className="text-xs text-muted-foreground">
        Your card is processed securely by Stripe. We never store full card
        numbers.
      </p>

      <Button
        type="button"
        onClick={() => void handlePay()}
        disabled={busy}
        className="w-full sm:w-auto"
      >
        {paying ? 'Processing...' : 'Pay now'}
      </Button>
    </div>
  );
}
