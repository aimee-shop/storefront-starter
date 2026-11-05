'use client';

import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { StorefrontAddress } from '@aimee.shop/sdk';
import type { SavedPaymentMethod } from '@/app/account/payment-methods/types';
import { useCartStore } from '@/stores/cart-store';
import { useCheckoutStore } from '@/stores/checkout-store';
import { CheckoutSteps } from '@/components/checkout/CheckoutSteps';
import { CheckoutOrderSummary } from '@/components/checkout/CheckoutOrderSummary';
import { ShippingAddressForm } from '@/components/checkout/ShippingAddressForm';
import { ShippingMethodForm } from '@/components/checkout/ShippingMethodForm';
import { Button, buttonVariants } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

// Stripe is only needed on the payment step; keep it out of the initial
// /checkout bundle so Lighthouse script budgets stay under gate.
const CheckoutPaymentStep = dynamic(
  () =>
    import('@/components/checkout/CheckoutPaymentStep').then(
      (m) => m.CheckoutPaymentStep
    ),
  {
    ssr: false,
    loading: () => (
      <div className="space-y-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-10 w-32" />
      </div>
    ),
  }
);

/**
 * Multi-step checkout client flow. Rendered only after the RSC gate on
 * /checkout allows guests (or the shopper is signed in).
 */
export function CheckoutFlow({
  savedAddresses = [],
  savedCards = [],
  customerEmail,
}: {
  /** Saved customer addresses (signed-in only); empty for guests. */
  savedAddresses?: StorefrontAddress[];
  /** Saved Stripe cards (signed-in only); empty for guests. */
  savedCards?: SavedPaymentMethod[];
  /** Signed-in customer email for address form defaults. */
  customerEmail?: string | null;
}) {
  const router = useRouter();
  const cart = useCartStore((s) => s.cart);
  const cartId = useCartStore((s) => s.cartId);
  const hasHydrated = useCartStore((s) => s._hasHydrated);

  const session = useCheckoutStore((s) => s.session);
  const totals = useCheckoutStore((s) => s.totals);
  const checkoutId = useCheckoutStore((s) => s.checkoutId);
  const completion = useCheckoutStore((s) => s.completion);
  const isLoading = useCheckoutStore((s) => s.isLoading);
  const storeError = useCheckoutStore((s) => s.error);
  const createFromCart = useCheckoutStore((s) => s.createFromCart);
  const resetCheckout = useCheckoutStore((s) => s.reset);

  const [createFailed, setCreateFailed] = useState(false);
  // Tracks which cartId a create is in-flight or completed for (not a one-shot latch).
  const createForCartId = useRef<string | null>(null);
  const shippingHeadingRef = useRef<HTMLHeadingElement>(null);
  const paymentHeadingRef = useRef<HTMLHeadingElement>(null);
  const prevWorkflowState = useRef(session?.workflowState);

  const items = cart?.items ?? [];
  const isEmpty = !cartId || items.length === 0;

  // Redirect empty carts once the cart store has rehydrated.
  // Skip while completion is set: post-pay flow clears the cart then
  // navigates to /checkout/confirmation and must not lose that race to /cart.
  useEffect(() => {
    if (!hasHydrated) return;
    if (isEmpty && !completion) {
      router.replace('/cart');
    }
  }, [hasHydrated, isEmpty, completion, router]);

  // Create checkout session from the current cart on first load / cart change.
  useEffect(() => {
    if (!hasHydrated || isEmpty || !cartId) return;
    if (checkoutId && session?.cartId === cartId) {
      createForCartId.current = cartId;
      return;
    }
    // Session belongs to a different cart -- drop it before creating.
    if (session && session.cartId !== cartId) {
      resetCheckout();
      createForCartId.current = null;
    }
    if (createForCartId.current === cartId) return;

    createForCartId.current = cartId;
    setCreateFailed(false);
    void createFromCart(cartId, {
      guestToken: cart?.guestToken ?? null,
    }).catch(() => {
      if (createForCartId.current === cartId) {
        createForCartId.current = null;
      }
      setCreateFailed(true);
    });
  }, [
    hasHydrated,
    isEmpty,
    cartId,
    cart?.guestToken,
    checkoutId,
    session,
    createFromCart,
    resetCheckout,
  ]);

  // Move focus when the workflow advances between steps.
  useEffect(() => {
    const prev = prevWorkflowState.current;
    prevWorkflowState.current = session?.workflowState;
    if (
      prev &&
      (prev === 'cart_review' || prev === 'address_collection') &&
      session?.workflowState === 'shipping_selection'
    ) {
      shippingHeadingRef.current?.focus();
    }
    if (prev === 'shipping_selection' && session?.workflowState === 'payment_setup') {
      paymentHeadingRef.current?.focus();
    }
  }, [session?.workflowState]);

  const handleRetryCreate = () => {
    if (!cartId) return;
    createForCartId.current = null;
    setCreateFailed(false);
    resetCheckout();
    createForCartId.current = cartId;
    void createFromCart(cartId, {
      guestToken: cart?.guestToken ?? null,
    }).catch(() => {
      createForCartId.current = null;
      setCreateFailed(true);
    });
  };

  if (!hasHydrated || (isEmpty && !createFailed && !completion)) {
    return <CheckoutSkeleton />;
  }

  if (isEmpty && !completion) {
    return null;
  }

  const sessionExpired =
    !!session &&
    (session.status === 'expired' || session.status === 'abandoned');

  const workflowState = session?.workflowState;
  const showAddressForm =
    !completion &&
    !sessionExpired &&
    (!workflowState ||
      workflowState === 'cart_review' ||
      workflowState === 'address_collection');
  const showShippingStep =
    !completion && !sessionExpired && workflowState === 'shipping_selection';
  const showPaymentStep =
    !sessionExpired &&
    (!!completion ||
      workflowState === 'payment_setup' ||
      workflowState === 'review' ||
      workflowState === 'processing' ||
      workflowState === 'complete');
  const showOrderSummary =
    !!session &&
    !sessionExpired &&
    (showShippingStep || showPaymentStep || !!totals);

  return (
    <div className="py-10 sm:py-12 lg:py-16">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-bold tracking-tight">Checkout</h1>

        <div className="mt-6">
          <CheckoutSteps workflowState={workflowState} />
        </div>

        {sessionExpired && (
          <div
            role="alert"
            className="mt-8 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm"
          >
            <p className="font-medium text-destructive">
              This checkout session has expired
            </p>
            <p className="mt-1 text-muted-foreground">
              Return to your cart to start a new checkout. Your items are still
              there.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link
                href="/cart"
                className={cn(buttonVariants({ variant: 'default', size: 'sm' }))}
              >
                Back to cart
              </Link>
              <Button type="button" size="sm" variant="outline" onClick={handleRetryCreate}>
                Start new checkout
              </Button>
            </div>
          </div>
        )}

        {(createFailed || storeError) && !session && (
          <div
            role="alert"
            className="mt-8 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive"
          >
            <p>{storeError ?? 'Could not start checkout. Please try again.'}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button type="button" size="sm" onClick={handleRetryCreate}>
                Try again
              </Button>
              <Link
                href="/cart"
                className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
              >
                Back to cart
              </Link>
            </div>
          </div>
        )}

        {isLoading && !session && <CheckoutFormSkeleton />}

        {session && showAddressForm && (
          <section className="mt-8" aria-labelledby="checkout-address-heading">
            <h2 id="checkout-address-heading" className="text-lg font-semibold">
              Contact and shipping
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Enter your email and where we should ship your order.
            </p>
            <div className="mt-6 rounded-lg border p-4 sm:p-6">
              <ShippingAddressForm
                initialAddress={session.shippingAddress}
                savedAddresses={savedAddresses}
                customerEmail={customerEmail}
              />
            </div>
          </section>
        )}

        {session && showShippingStep && (
          <section className="mt-8" aria-labelledby="checkout-shipping-heading">
            <h2
              id="checkout-shipping-heading"
              ref={shippingHeadingRef}
              tabIndex={-1}
              className="rounded-sm text-lg font-semibold focus:outline-2 focus:outline-offset-2 focus:outline-ring"
            >
              Shipping method
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Choose how your order should be delivered.
            </p>
            <div className="mt-6">
              <ShippingMethodForm />
            </div>
          </section>
        )}

        {session && showPaymentStep && (
          <section className="mt-8" aria-labelledby="checkout-payment-heading">
            <h2
              id="checkout-payment-heading"
              ref={paymentHeadingRef}
              tabIndex={-1}
              className="rounded-sm text-lg font-semibold focus:outline-2 focus:outline-offset-2 focus:outline-ring"
            >
              Payment
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Enter your card details to complete your order.
            </p>
            <div className="mt-6 rounded-lg border p-4 sm:p-6">
              <CheckoutPaymentStep savedCards={savedCards} />
            </div>
          </section>
        )}

        {showOrderSummary && (
          <CheckoutOrderSummary
            totals={totals}
            session={session}
            shippingSelected={!!session?.shippingRateId || !!totals}
          />
        )}
      </div>
    </div>
  );
}

function CheckoutSkeleton() {
  return (
    <div className="py-10 sm:py-12 lg:py-16">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <Skeleton className="h-8 w-40" />
        <div className="mt-6 flex gap-4">
          <Skeleton className="h-8 w-8 rounded-full" />
          <Skeleton className="h-8 w-8 rounded-full" />
          <Skeleton className="h-8 w-8 rounded-full" />
          <Skeleton className="h-8 w-8 rounded-full" />
        </div>
        <CheckoutFormSkeleton />
      </div>
    </div>
  );
}

function CheckoutFormSkeleton() {
  return (
    <div className="mt-8 space-y-4 rounded-lg border p-6">
      <Skeleton className="h-10 w-full" />
      <div className="grid gap-4 sm:grid-cols-2">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-32" />
    </div>
  );
}
