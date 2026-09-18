import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCustomerSession } from '@/lib/customer-session';
import { safeAccountReturnPath } from '@/lib/account-return-path';
import { AuthPanel } from '@/components/account/AuthPanel';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { logoutAction } from './actions';

export const metadata: Metadata = {
  alternates: { canonical: '/account' },
  title: 'My Account',
  description: 'Sign in to manage your orders, addresses, and account settings.',
};

// Session comes from cookies; never statically render this page.
export const dynamic = 'force-dynamic';

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{ reset?: string; next?: string }>;
}) {
  const { reset, next: nextParam } = await searchParams;
  const nextPath = safeAccountReturnPath(nextParam);
  const customer = await getCustomerSession();

  if (customer && nextPath) {
    redirect(nextPath);
  }

  if (!customer) {
    return (
      <div className="py-16 sm:py-20 lg:py-24">
        <div className="mx-auto max-w-md px-4 sm:px-6 lg:px-8">
          <div className="mb-8 text-center">
            <AccountIcon />
            <h1 className="mt-4 text-2xl font-bold tracking-tight">My Account</h1>
            <p className="mt-2 text-muted-foreground">
              Sign in to manage your orders, addresses, and account settings.
            </p>
          </div>
          {reset === '1' && (
            <div
              role="status"
              className="mb-6 rounded-lg border border-green-600/30 bg-green-500/5 px-3 py-2 text-sm text-green-700 dark:text-green-400"
            >
              Password reset successful. Sign in with your new password.
            </div>
          )}
          <AuthPanel nextPath={nextPath} />
        </div>
      </div>
    );
  }

  const fullName = [customer.firstName, customer.lastName]
    .filter(Boolean)
    .join(' ');

  return (
    <div className="py-16 sm:py-20 lg:py-24">
      <div className="mx-auto max-w-md px-4 sm:px-6 lg:px-8">
        <div className="rounded-lg border p-6 sm:p-8">
          <div className="text-center">
            <AccountIcon />
            <h1 className="mt-4 text-2xl font-bold tracking-tight">
              {fullName || 'My Account'}
            </h1>
            {customer.email && (
              <p className="mt-2 text-muted-foreground">{customer.email}</p>
            )}
          </div>
          <Separator className="my-6" />
          <nav aria-label="Account">
            <ul>
              <li>
                <Link
                  href="/account/orders"
                  className="flex items-center justify-between rounded-md px-3 py-2.5 text-sm font-medium transition-colors hover:bg-muted"
                >
                  Order History
                  <span aria-hidden="true" className="text-muted-foreground">
                    &rsaquo;
                  </span>
                </Link>
              </li>
              <li>
                <Link
                  href="/account/addresses"
                  className="flex items-center justify-between rounded-md px-3 py-2.5 text-sm font-medium transition-colors hover:bg-muted"
                >
                  Addresses
                  <span aria-hidden="true" className="text-muted-foreground">
                    &rsaquo;
                  </span>
                </Link>
              </li>
              <li>
                <Link
                  href="/account/payment-methods"
                  className="flex items-center justify-between rounded-md px-3 py-2.5 text-sm font-medium transition-colors hover:bg-muted"
                >
                  Payment Methods
                  <span aria-hidden="true" className="text-muted-foreground">
                    &rsaquo;
                  </span>
                </Link>
              </li>
            </ul>
          </nav>
          <form action={logoutAction} className="mt-6">
            <Button type="submit" variant="outline" className="w-full">
              Sign Out
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}

function AccountIcon() {
  return (
    <svg
      className="mx-auto h-12 w-12 text-muted-foreground"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1}
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
      />
    </svg>
  );
}
