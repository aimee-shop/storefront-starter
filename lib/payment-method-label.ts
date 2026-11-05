import type { SavedPaymentMethod } from '@/app/account/payment-methods/types';

/** "visa" -> "Visa"; non-card types fall back to a capitalized type label. */
export function paymentMethodLabel(pm: SavedPaymentMethod): string {
  const brand = pm.cardBrand ?? pm.type;
  const name =
    brand.charAt(0).toUpperCase() + brand.slice(1).replace(/_/g, ' ');
  return pm.cardLastFour ? `${name} **** ${pm.cardLastFour}` : name;
}

export function paymentMethodExpiryLabel(
  pm: SavedPaymentMethod
): string | null {
  if (pm.cardExpMonth == null || pm.cardExpYear == null) return null;
  return `Expires ${String(pm.cardExpMonth).padStart(2, '0')}/${pm.cardExpYear}`;
}
