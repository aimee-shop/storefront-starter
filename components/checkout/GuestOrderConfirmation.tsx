'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  clearGuestConfirmationHandoff,
  isGuestHandoffValidForOrder,
  readGuestConfirmationHandoff,
  type GuestConfirmationHandoff,
} from '@/lib/checkout-confirmation';
import { formatDate, formatMoney } from '@/lib/format';
import { buttonVariants } from '@/components/ui/button-variants';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

/**
 * Guest thank-you view. Reads a short-lived sessionStorage handoff written
 * after checkout.complete so guests can see the order number without a
 * customer JWT (storefront order history requires auth).
 */
export function GuestOrderConfirmation({
  orderParam,
}: {
  orderParam: string | null;
}) {
  const [handoff, setHandoff] = useState<GuestConfirmationHandoff | null | undefined>(
    undefined
  );

  useEffect(() => {
    // One-shot mount read of sessionStorage (SSR-safe: undefined until mounted).
    // Sync-from-external-store on mount; not derivable during render.
    const stored = readGuestConfirmationHandoff();
    if (isGuestHandoffValidForOrder(stored, orderParam)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-shot external read
      setHandoff(stored);
      // One-shot: prevent re-show after refresh/navigation on a shared device.
      clearGuestConfirmationHandoff();
    } else {
       
      setHandoff(null);
    }
  }, [orderParam]);

  if (handoff === undefined) {
    return (
      <div className="py-10 sm:py-12 lg:py-16">
        <div className="mx-auto max-w-3xl space-y-4 px-4 sm:px-6 lg:px-8">
          <Skeleton className="mx-auto h-8 w-48" />
          <Skeleton className="mx-auto h-4 w-64" />
        </div>
      </div>
    );
  }

  if (!handoff || !orderParam?.trim()) {
    return (
      <div className="py-10 sm:py-12 lg:py-16">
        <div className="mx-auto max-w-lg px-4 text-center sm:px-6">
          <h1 className="text-2xl font-bold tracking-tight">Order confirmed</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            {orderParam?.trim()
              ? `If you placed order ${orderParam.trim()}, check your email for the receipt. This confirmation link is only available right after checkout on this device.`
              : 'If you just placed an order, check your email for the receipt.'}
          </p>
          <Link
            href="/"
            className={cn(buttonVariants({ variant: 'default' }), 'mt-8 inline-flex')}
          >
            Continue shopping
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="py-10 sm:py-12 lg:py-16">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <p className="text-sm font-medium text-primary">Thank you</p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
            Order confirmed
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Your order{' '}
            <span className="font-medium text-foreground">{handoff.orderNumber}</span>{' '}
            has been placed
            {handoff.completedAt ? ` on ${formatDate(handoff.completedAt)}` : ''}.
          </p>
          {handoff.email && (
            <p className="mt-1 text-sm text-muted-foreground">
              A confirmation will be sent to {handoff.email}.
            </p>
          )}
          {handoff.estimatedDelivery && (
            <p className="mt-1 text-sm text-muted-foreground">
              Estimated delivery: {formatDate(handoff.estimatedDelivery)}
            </p>
          )}
        </div>

        <section className="mt-10" aria-labelledby="guest-confirmation-totals">
          <h2 id="guest-confirmation-totals" className="text-lg font-semibold">
            Totals
          </h2>
          <dl className="mt-4 space-y-2 rounded-lg border p-4 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Items</dt>
              <dd>{handoff.itemsCount}</dd>
            </div>
            <Separator className="my-2" />
            <div className="flex justify-between font-semibold">
              <dt>Total</dt>
              <dd>{formatMoney(handoff.totalAmount, handoff.currency)}</dd>
            </div>
          </dl>
        </section>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <Link href="/" className={cn(buttonVariants({ variant: 'default' }))}>
            Continue shopping
          </Link>
          <Link
            href="/account"
            className={cn(buttonVariants({ variant: 'outline' }))}
          >
            Sign in for order history
          </Link>
        </div>
      </div>
    </div>
  );
}
