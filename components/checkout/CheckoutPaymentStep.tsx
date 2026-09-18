'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import type { ConfirmPaymentFn } from '@/components/checkout/CheckoutPaymentForm';
import { FormAlert } from '@/components/account/FormAlert';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
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

/**
 * Payment step: create PaymentIntent, collect card via Stripe Elements,
 * confirm (incl. 3DS), then checkout.complete. On success: clear cart and
 * redirect to /checkout/confirmation.
 */
export function CheckoutPaymentStep() {
  const router = useRouter();
  const paymentIntent = useCheckoutStore((s) => s.paymentIntent);
  const completion = useCheckoutStore((s) => s.completion);
  const isLoading = useCheckoutStore((s) => s.isLoading);
  const storeError = useCheckoutStore((s) => s.error);
  const ensurePaymentIntent = useCheckoutStore((s) => s.ensurePaymentIntent);
  const completeCheckout = useCheckoutStore((s) => s.completeCheckout);
  const clearPaymentIntent = useCheckoutStore((s) => s.clearPaymentIntent);
  const clearCart = useCartStore((s) => s.clearCart);

  const [formError, setFormError] = useState<string | null>(null);
  const [paying, setPaying] = useState(false);
  const [postPayError, setPostPayError] = useState<string | null>(null);
  const confirmRef = useRef<ConfirmPaymentFn | null>(null);
  const loadStarted = useRef(false);

  // Load intent once on mount (same latch pattern as ShippingMethodForm rates).
  useEffect(() => {
    if (completion) return;
    if (loadStarted.current) return;
    loadStarted.current = true;
    void ensurePaymentIntent().catch(() => {
      // Error surface via storeError
    });
  }, [ensurePaymentIntent, completion]);

  const handleReady = useCallback((confirm: ConfirmPaymentFn) => {
    confirmRef.current = confirm;
  }, []);

  const handleRetryIntent = () => {
    setFormError(null);
    clearPaymentIntent();
    loadStarted.current = false;
    loadStarted.current = true;
    void ensurePaymentIntent().catch(() => {
      // storeError
    });
  };

  const handlePay = async () => {
    if (!paymentIntent?.clientSecret) {
      setFormError('Payment is not ready. Please try again.');
      return;
    }
    if (!confirmRef.current) {
      setFormError('Card form is still loading. Wait a moment and try again.');
      return;
    }

    setFormError(null);
    setPaying(true);
    try {
      const result = await confirmRef.current(paymentIntent.clientSecret);
      if (!result.success) {
        // Session stays OPEN / payment_setup server-side; allow another card.
        clearPaymentIntent();
        loadStarted.current = false;
        setFormError(
          result.error ||
            'Payment failed. Try another card or payment method.'
        );
        // Recreate a fresh PaymentIntent for the next attempt.
        void ensurePaymentIntent().catch(() => {
          // storeError
        });
        return;
      }

      // Stripe PI id (pi_...); 3DS is handled inside confirmCardPayment.
      const completionResult = await completeCheckout(result.paymentIntentId);
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
    } catch {
      // storeError set by completeCheckout if order completion fails
    } finally {
      setPaying(false);
    }
  };

  // After complete: redirect UI, or post-pay error if order number missing.
  if (completion || paying) {
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
    const showRedirect = Boolean(completion);
    return (
      <div
        role="status"
        className="rounded-lg border border-primary/20 bg-primary/5 p-6 text-center"
      >
        <h3 className="text-lg font-semibold">
          {showRedirect ? 'Order placed' : 'Processing payment...'}
        </h3>
        <p className="mt-2 text-sm text-muted-foreground">
          {showRedirect
            ? 'Taking you to your confirmation...'
            : 'Please wait while we confirm your payment.'}
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

      <div>
        <p className="mb-2 text-sm font-medium">Card details</p>
        <CheckoutPaymentForm
          publishableKey={paymentIntent.publishableKey}
          onReady={handleReady}
          disabled={busy}
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
