import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCustomerSessionWithToken } from '@/lib/customer-session';
import { customerSdk } from '@/lib/customer-sdk';
import { OrderCard } from '@/components/account/OrderCard';
import { ProductPagination } from '@/components/products/ProductPagination';
import { buttonVariants } from '@/components/ui/button-variants';
import { cn } from '@/lib/utils';

export const metadata: Metadata = {
  title: 'Order History',
  description: 'View your past orders and their status.',
};

// Session comes from cookies; never statically render this page.
export const dynamic = 'force-dynamic';

const PAGE_SIZE = 10;

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const params = await searchParams;
  const session = await getCustomerSessionWithToken();
  if (!session) redirect('/account');

  const page = Math.max(1, Number(params.page) || 1);

  // Customer-JWT-bound call; the API-key role deliberately lacks orders:read.
  // Failures propagate to the root error boundary -- never blank-but-200.
  const ordersResponse = await customerSdk(session.accessToken).orders.list({
    filters: { customerId: session.customer.id },
    page,
    limit: PAGE_SIZE,
    sort: 'createdAt',
    order: 'desc',
  });

  // Defense in depth (matches the detail page): trust the session-derived
  // filter, but never render a row that isn't the customer's own.
  const orders = (ordersResponse.data ?? []).filter(
    (order) => order.customerId === session.customer.id
  );
  const total = ordersResponse.meta?.total ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

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
            <li className="font-medium text-foreground">Orders</li>
          </ol>
        </nav>

        <h1 className="text-2xl font-bold tracking-tight">Order History</h1>

        {orders.length === 0 ? (
          <div className="mt-10 rounded-lg border border-dashed p-10 text-center">
            <p className="text-muted-foreground">
              You have not placed any orders yet.
            </p>
            <Link href="/products" className={cn('mt-6', buttonVariants())}>
              Start Shopping
            </Link>
          </div>
        ) : (
          <>
            <ul className="mt-6 space-y-3">
              {orders.map((order) => (
                <li key={order.id}>
                  <OrderCard order={order} />
                </li>
              ))}
            </ul>
            <div className="mt-8">
              <ProductPagination
                currentPage={page}
                totalPages={totalPages}
                basePath="/account/orders"
              />
            </div>
          </>
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
