import { describe, expect, it } from 'vitest';
import { toShippingAddressPayload } from '@/lib/address-codes';

const base = {
  email: 'buyer@example.com',
  firstName: 'Ada',
  lastName: 'Lovelace',
  address1: '123 Main St',
  city: 'Richmond',
  zip: '23220',
};

describe('toShippingAddressPayload', () => {
  it('turns United States + Virginia into ISO codes and display names', () => {
    expect(
      toShippingAddressPayload({ ...base, country: 'United States', state: 'Virginia' })
    ).toMatchObject({
      country: 'US',
      countryName: 'United States',
      state: 'VA',
      stateName: 'Virginia',
    });
  });

  it('passes free-text state through outside US/CA', () => {
    expect(
      toShippingAddressPayload({ ...base, country: 'FR', state: 'Ile-de-France' })
    ).toMatchObject({ country: 'FR', state: 'Ile-de-France' });
  });

  it('rejects an unknown country', () => {
    expect(() => toShippingAddressPayload({ ...base, country: 'Narnia' })).toThrow();
  });
});
