import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCustomerSessionWithToken } from '@/lib/customer-session';
import { sdk } from '@/lib/sdk';
import { AddressBook } from '@/components/account/AddressBook';

export const metadata: Metadata = {
  title: 'Addresses',
  description: 'Manage your saved shipping and billing addresses.',
};

// Session comes from cookies; never statically render this page.
export const dynamic = 'force-dynamic';

export default async function AddressesPage() {
  const session = await getCustomerSessionWithToken();
  if (!session) redirect('/account');

  // Ownership is enforced server-side from the customer JWT.
  const addresses = await sdk.storefront
    .withCustomer(session.accessToken)
    .addresses.list();

  // Defense in depth: never render another customer's address if the API
  // ever returns a wider set.
  const ownAddresses = (addresses ?? []).filter(
    (address) => address.customerId === session.customer.id
  );

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
              Addresses
            </li>
          </ol>
        </nav>

        <h1 className="text-2xl font-bold tracking-tight">Addresses</h1>

        <AddressBook addresses={ownAddresses} />
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
