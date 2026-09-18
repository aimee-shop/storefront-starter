import Link from 'next/link';
import { AuthPanel } from '@/components/account/AuthPanel';
// server-safe variants -- do not import from button.tsx (client boundary)
import { buttonVariants } from '@/components/ui/button-variants';
import { cn } from '@/lib/utils';

/**
 * Shown when store features.checkout.guestCheckout is false and the shopper
 * is not signed in. Core API still enforces the flag; this fails early with
 * a clear sign-in path instead of walking into a rejected checkout create.
 */
export function GuestCheckoutSignIn() {
  return (
    <div className="py-16 sm:py-20 lg:py-24">
      <div className="mx-auto max-w-md px-4 sm:px-6 lg:px-8">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold tracking-tight">
            Sign in to checkout
          </h1>
          <p className="mt-2 text-muted-foreground">
            This store requires an account to complete checkout. Sign in or
            create an account to continue.
          </p>
        </div>
        <AuthPanel />
        <p className="mt-6 text-center">
          <Link
            href="/cart"
            className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
          >
            Back to cart
          </Link>
        </p>
      </div>
    </div>
  );
}
