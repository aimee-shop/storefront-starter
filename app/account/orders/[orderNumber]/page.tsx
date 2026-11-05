import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { NotFoundError } from '@aimee.shop/sdk';
import type { Order, OrderTimelineEvent } from '@aimee.shop/sdk';
import { getCustomerSessionWithToken } from '@/lib/customer-session';
import { sdk } from '@/lib/sdk';
import { OrderStatusBadge } from '@/components/account/OrderStatusBadge';
import { OrderTimeline } from '@/components/account/OrderTimeline';
import { Separator } from '@/components/ui/separator';
import { formatDate, formatMoney } from '@/lib/format';

export const metadata: Metadata = {
  title: 'Order Details',
  description: 'View the items, status, and totals for your order.',
};

// Session comes from cookies; never statically render this page.
export const dynamic = 'force-dynamic';

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ orderNumber: string }>;
}) {
  const { orderNumber } = await params;
  const session = await getCustomerSessionWithToken();
  if (!session) redirect('/account');

  const scoped = sdk.storefront.withCustomer(session.accessToken);

  let order: Order;
  try {
    order = await scoped.orders.get(orderNumber);
  } catch (error) {
    if (error instanceof NotFoundError) notFound();
    throw error;
  }

  // Defense in depth: never rely solely on server-side scoping. Another
  // customer's order must be indistinguishable from a missing one.
  if (order.customerId !== session.customer.id) notFound();

  // The timeline is supplementary -- render the order without it rather than
  // failing the whole page if the timeline call errors. Log unexpected
  // failures so an outage doesn't silently look like "no timeline".
  let timelineEvents: OrderTimelineEvent[] = [];
  try {
    timelineEvents = (await scoped.orders.timeline(order.id)).events;
  } catch (error) {
    if (!(error instanceof NotFoundError)) {
      console.error(`Order timeline fetch failed for ${order.id}:`, error);
    }
  }

  const shipping = order.shippingAddress;
  const currency = order.currency ?? 'USD';

  return (
    <div className="py-10 sm:py-12 lg:py-16">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <nav className="mb-6 text-sm text-muted-foreground" aria-label="Breadcrumb">
          <ol className="flex items-center gap-1.5">
            <li>
              <Link href="/account" className="transition-colors hover:text-foreground">
                My Account
              </Link>
            </li>
            <li aria-hidden="true"><ChevronIcon /></li>
            <li>
              <Link
                href="/account/orders"
                className="transition-colors hover:text-foreground"
              >
                Orders
              </Link>
            </li>
            <li aria-hidden="true"><ChevronIcon /></li>
            <li className="font-medium text-foreground">
              {order.orderNumber ?? orderNumber}
            </li>
          </ol>
        </nav>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {order.orderNumber ?? orderNumber}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Placed on {formatDate(order.createdAt)}
            </p>
          </div>
          <OrderStatusBadge status={order.status} />
        </div>

        <section className="mt-8" aria-labelledby="order-items-heading">
          <h2 id="order-items-heading" className="text-lg font-semibold">
            Items
          </h2>
          <ul className="mt-4 divide-y rounded-lg border">
            {order.orderItems.map((item) => (
              <li key={item.id} className="flex items-start justify-between gap-4 p-4">
                <div className="min-w-0">
                  <p className="font-medium">{item.productName}</p>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    {item.productSku ? `${item.productSku} · ` : ''}
                    Qty {item.quantity} × {formatMoney(item.unitPrice, currency)}
                  </p>
                </div>
                <span className="shrink-0 font-medium">
                  {formatMoney(item.totalPrice, currency)}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-8" aria-labelledby="order-totals-heading">
          <h2 id="order-totals-heading" className="text-lg font-semibold">
            Totals
          </h2>
          <dl className="mt-4 space-y-2 rounded-lg border p-4 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Subtotal</dt>
              <dd>{formatMoney(order.subtotalAmount, currency)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Shipping</dt>
              <dd>{formatMoney(order.shippingAmount, currency)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Tax</dt>
              <dd>{formatMoney(order.taxAmount, currency)}</dd>
            </div>
            {Number(order.discountAmount) > 0 && (
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Discount</dt>
                <dd>-{formatMoney(order.discountAmount, currency)}</dd>
              </div>
            )}
            <Separator className="my-2" />
            <div className="flex justify-between font-semibold">
              <dt>Total</dt>
              <dd>{formatMoney(order.totalAmount, currency)}</dd>
            </div>
          </dl>
        </section>

        {shipping && (
          <section className="mt-8" aria-labelledby="order-shipping-heading">
            <h2 id="order-shipping-heading" className="text-lg font-semibold">
              Shipping Address
            </h2>
            <address className="mt-4 rounded-lg border p-4 text-sm not-italic leading-relaxed">
              {(shipping.firstName || shipping.lastName) && (
                <p>{[shipping.firstName, shipping.lastName].filter(Boolean).join(' ')}</p>
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

        {timelineEvents.length > 0 && (
          <section className="mt-8" aria-labelledby="order-timeline-heading">
            <h2 id="order-timeline-heading" className="text-lg font-semibold">
              Status Timeline
            </h2>
            <div className="mt-4 rounded-lg border p-4">
              <OrderTimeline events={timelineEvents} />
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

function ChevronIcon() {
  return (
    <svg className="h-3.5 w-3.5 text-muted-foreground/50" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
    </svg>
  );
}
