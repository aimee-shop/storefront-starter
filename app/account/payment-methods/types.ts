/**
 * Safe-to-display payment method fields only.
 * Mirrors core-api StorefrontPaymentMethodDto display fields (never PAN).
 * Shared by server fetch helpers and client list/card components.
 */
export interface SavedPaymentMethod {
  id: string;
  customerId: string;
  /** PSP that vaulted the method (e.g. 'stripe'). */
  provider: string;
  /** PSP method id (Stripe pm_...). Not secret; Stripe.js needs it to confirm. */
  providerMethodId: string;
  type: string;
  cardBrand: string | null;
  cardLastFour: string | null;
  cardExpMonth: number | null;
  cardExpYear: number | null;
  isDefault: boolean;
}
