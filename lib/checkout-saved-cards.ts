import type { SavedPaymentMethod } from '@/app/account/payment-methods/types';

/**
 * Saved methods checkout can pay with. Checkout prepares a Stripe payment, so
 * only the customer's own Stripe cards qualify (a Braintree-vaulted card has
 * no Stripe method id). The default card comes first.
 */
export function checkoutSavedCards(
  methods: SavedPaymentMethod[],
  customerId: string
): SavedPaymentMethod[] {
  return methods
    .filter(
      (pm) =>
        pm.customerId === customerId &&
        pm.provider === 'stripe' &&
        pm.type === 'card' &&
        pm.providerMethodId !== ''
    )
    .sort((a, b) => Number(b.isDefault) - Number(a.isDefault));
}
