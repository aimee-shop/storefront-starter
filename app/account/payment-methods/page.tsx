import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCustomerSessionWithToken } from '@/lib/customer-session';
import { PaymentMethodList } from '@/components/account/PaymentMethodList';
import { listPaymentMethods, PaymentMethodsApiError } from './payments-api';

export const metadata: Metadata = {
  title: 'Payment Methods',
  description: 'Manage your saved payment methods.',
};

// Session comes from cookies; never statically render this page.
export const dynamic = 'force-dynamic';

export default async function PaymentMethodsPage() {
  const session = await getCustomerSessionWithToken();
  if (!session) redirect('/account');

  let paymentMethods: Awaited<ReturnType<typeof listPaymentMethods>> = [];
  let loadError: string | null = null;

  try {
    const methods = await listPaymentMethods(session.accessToken);
    // Defense in depth: API is self-scoped; never render another customer's
    // methods if a wider set ever arrives.
    paymentMethods = methods.filter(
      (pm) => pm.customerId === session.customer.id
    );
  } catch (error) {
    if (error instanceof PaymentMethodsApiError && error.status === 401) {
      redirect('/account');
    }
    loadError = 'Could not load payment methods. Please try again later.';
  }

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
            <li aria-hidden="true">
              <ChevronIcon />
            </li>
            <li className="font-medium text-foreground" aria-current="page">
              Payment Methods
            </li>
          </ol>
        </nav>

        <h1 className="text-2xl font-bold tracking-tight">Payment Methods</h1>

        {loadError ? (
          <p className="mt-6 text-sm text-destructive" role="alert">
            {loadError}
          </p>
        ) : (
          <PaymentMethodList paymentMethods={paymentMethods} />
        )}
      </div>
    </div>
  );
}

function ChevronIcon() {
  return (
    <svg
      className="h-3.5 w-3.5 text-muted-foreground/50"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2}
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="m8.25 4.5 7.5 7.5-7.5 7.5"
      />
    </svg>
  );
}
