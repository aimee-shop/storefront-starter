import type { StorefrontAddress } from '@aimee.shop/sdk';
import { getStoreConfig } from '@/lib/store-config';
import {
  getCustomerSession,
  getCustomerSessionWithToken,
} from '@/lib/customer-session';
import { sdk } from '@/lib/sdk';
import { checkoutSavedCards } from '@/lib/checkout-saved-cards';
import { listPaymentMethods } from '@/app/account/payment-methods/payments-api';
import type { SavedPaymentMethod } from '@/app/account/payment-methods/types';
import { CheckoutFlow } from '@/components/checkout/CheckoutFlow';
import { GuestCheckoutSignIn } from '@/components/checkout/GuestCheckoutSignIn';

// Session + store feature flag; never statically render this gate.
export const dynamic = 'force-dynamic';

/**
 * Checkout entry. When guest checkout is disabled and the shopper has no
 * customer session, show sign-in instead of starting the guest flow.
 */
export default async function CheckoutPage() {
  const { guestCheckout } = await getStoreConfig();
  const customer = await getCustomerSession();

  if (!guestCheckout && !customer) {
    return <GuestCheckoutSignIn />;
  }

  let savedAddresses: StorefrontAddress[] = [];
  let savedCards: SavedPaymentMethod[] = [];
  let customerEmail: string | null = customer?.email ?? null;

  if (customer) {
    const session = await getCustomerSessionWithToken();
    if (session) {
      customerEmail = session.customer.email ?? customerEmail;
      try {
        const addresses = await sdk.storefront
          .withCustomer(session.accessToken)
          .addresses.list();
        savedAddresses = (addresses ?? []).filter(
          (address) => address.customerId === session.customer.id
        );
      } catch {
        // Address book is optional at checkout; form still works inline.
        savedAddresses = [];
      }
      try {
        savedCards = checkoutSavedCards(
          await listPaymentMethods(session.accessToken),
          session.customer.id
        );
      } catch {
        // Saved cards are optional at checkout; the card form still works.
        savedCards = [];
      }
    }
  }

  return (
    <CheckoutFlow
      savedAddresses={savedAddresses}
      savedCards={savedCards}
      customerEmail={customerEmail}
    />
  );
}
