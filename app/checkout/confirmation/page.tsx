import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { NotFoundError } from '@aimee.shop/sdk';
import type { Order } from '@aimee.shop/sdk';
import { GuestOrderConfirmation } from '@/components/checkout/GuestOrderConfirmation';
import { getCustomerSessionWithToken } from '@/lib/customer-session';
import { sdk } from '@/lib/sdk';
import {
  isOrderOwnedByCustomer,
  shouldRedirectAwayFromConfirmation,
} from '@/lib/checkout-confirmation';
import { formatDate, formatPrice } from '@/lib/format';
import { Separator } from '@/components/ui/separator';
import { buttonVariants } from '@/components/ui/button-variants';
import { cn } from '@/lib/utils';

export const metadata: Metadata = {
  title: 'Order confirmed',
  description: 'Thank you for your order.',
};

// Session + order lookup; never statically render.
export const dynamic = 'force-dynamic';

export default async function CheckoutConfirmationPage({
  searchParams,
}: {
  searchParams: Promise<{ order?: string | string[] }>;
}) {
  const params = await searchParams;
  const rawOrder = params.order;
  const orderParam = Array.isArray(rawOrder) ? rawOrder[0] : rawOrder;
  const trimmedOrder = orderParam?.trim() ?? null;

  const session = await getCustomerSessionWithToken();

  // Guests: client handoff from complete (no order-history JWT).
  if (!session) {
    return <GuestOrderConfirmation orderParam={trimmedOrder} />;
  }

  let order: Order | null = null;
  let lookupFailed = false;

  if (trimmedOrder) {
    try {
      order = await sdk.storefront
        .withCustomer(session.accessToken)
        .orders.get(trimmedOrder);
    } catch (error) {
      // Soft-home for missing orders (issue #16). Surface real outages.
      if (error instanceof NotFoundError) {
        lookupFailed = true;
        order = null;
      } else {
        throw error;
      }
    }
  }

  if (
    shouldRedirectAwayFromConfirmation({
      orderParam: trimmedOrder,
      hasSession: true,
      lookupFailed: lookupFailed || !order,
      order,
      customerId: session.customer.id,
    }) ||
    !order ||
    !isOrderOwnedByCustomer(order, session.customer.id)
  ) {
    redirect('/');
  }

  const displayNumber = order.orderNumber ?? trimmedOrder!;
  const currency = order.currency ?? 'USD';
  const shipping = order.shippingAddress;
  const estimated =
    order.estimatedDeliveryDate ??
    (typeof order.metadata?.estimatedDelivery === 'string'
      ? order.metadata.estimatedDelivery
      : undefined);

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
            <span className="font-medium text-foreground">{displayNumber}</span>{' '}
            has been placed
            {order.createdAt ? ` on ${formatDate(order.createdAt)}` : ''}.
          </p>
          {estimated && (
            <p className="mt-1 text-sm text-muted-foreground">
              Estimated delivery: {formatDate(estimated)}
            </p>
          )}
        </div>

        <section className="mt-10" aria-labelledby="confirmation-items-heading">
          <h2 id="confirmation-items-heading" className="text-lg font-semibold">
            Items
          </h2>
          <ul className="mt-4 divide-y rounded-lg border">
            {order.orderItems.map((item) => (
              <li
                key={item.id}
                className="flex items-start justify-between gap-4 p-4"
              >
                <div className="min-w-0">
                  <p className="font-medium">{item.productName}</p>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    {item.productSku ? `${item.productSku} · ` : ''}
                    Qty {item.quantity} × {formatPrice(item.unitPrice, currency)}
                  </p>
                </div>
                <span className="shrink-0 font-medium">
                  {formatPrice(item.totalPrice, currency)}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-8" aria-labelledby="confirmation-totals-heading">
          <h2 id="confirmation-totals-heading" className="text-lg font-semibold">
            Totals
          </h2>
          <dl className="mt-4 space-y-2 rounded-lg border p-4 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Subtotal</dt>
              <dd>{formatPrice(order.subtotalAmount, currency)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Shipping</dt>
              <dd>{formatPrice(order.shippingAmount, currency)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Tax</dt>
              <dd>{formatPrice(order.taxAmount, currency)}</dd>
            </div>
            {order.discountAmount > 0 && (
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Discount</dt>
                <dd>-{formatPrice(order.discountAmount, currency)}</dd>
              </div>
            )}
            <Separator className="my-2" />
            <div className="flex justify-between font-semibold">
              <dt>Total</dt>
              <dd>{formatPrice(order.totalAmount, currency)}</dd>
            </div>
          </dl>
        </section>

        {shipping && (
          <section
            className="mt-8"
            aria-labelledby="confirmation-shipping-heading"
          >
            <h2
              id="confirmation-shipping-heading"
              className="text-lg font-semibold"
            >
              Shipping Address
            </h2>
            <address className="mt-4 rounded-lg border p-4 text-sm not-italic leading-relaxed">
              {(shipping.firstName || shipping.lastName) && (
                <p>
                  {[shipping.firstName, shipping.lastName]
                    .filter(Boolean)
                    .join(' ')}
                </p>
              )}
              <p>{shipping.address1}</p>
              {shipping.address2 && <p>{shipping.address2}</p>}
              <p>
                {[shipping.city, shipping.state, shipping.zip]
                  .filter(Boolean)
                  .join(', ')}
              </p>
              <p>{shipping.countryName ?? shipping.country}</p>
            </address>
          </section>
        )}

        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <Link href="/" className={cn(buttonVariants({ variant: 'default' }))}>
            Continue shopping
          </Link>
          {displayNumber && (
            <Link
              href={`/account/orders/${encodeURIComponent(displayNumber)}`}
              className={cn(buttonVariants({ variant: 'outline' }))}
            >
              View order details
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
