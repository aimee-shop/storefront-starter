/**
 * Safe-to-display payment method fields only.
 * Mirrors core-api StorefrontPaymentMethodDto display fields (never PAN).
 * Shared by server fetch helpers and client list/card components.
 */
export interface SavedPaymentMethod {
  id: string;
  customerId: string;
  type: string;
  cardBrand: string | null;
  cardLastFour: string | null;
  cardExpMonth: number | null;
  cardExpYear: number | null;
  isDefault: boolean;
}
