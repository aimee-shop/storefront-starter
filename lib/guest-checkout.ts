/**
 * Read features.checkout.guestCheckout from merged store configuration.
 * Missing or non-boolean values default to true (matches core-api defaults).
 */
export function readGuestCheckout(features: unknown): boolean {
  if (!features || typeof features !== 'object') return true;
  const checkout = (features as Record<string, unknown>).checkout;
  if (!checkout || typeof checkout !== 'object') return true;
  const value = (checkout as Record<string, unknown>).guestCheckout;
  return typeof value === 'boolean' ? value : true;
}
