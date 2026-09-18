import { describe, expect, it } from 'vitest';
import { readGuestCheckout } from './guest-checkout';

describe('readGuestCheckout', () => {
  it('defaults to true when features are missing', () => {
    expect(readGuestCheckout(undefined)).toBe(true);
    expect(readGuestCheckout(null)).toBe(true);
    expect(readGuestCheckout({})).toBe(true);
  });

  it('reads features.checkout.guestCheckout', () => {
    expect(readGuestCheckout({ checkout: { guestCheckout: false } })).toBe(
      false
    );
    expect(readGuestCheckout({ checkout: { guestCheckout: true } })).toBe(true);
  });

  it('defaults to true for non-boolean values', () => {
    expect(readGuestCheckout({ checkout: { guestCheckout: 'no' } })).toBe(true);
    expect(readGuestCheckout({ checkout: {} })).toBe(true);
  });
});
