import { describe, expect, it } from 'vitest';
import { canSetDefault, isDefaultForType } from '@/lib/address-book';

describe('isDefaultForType', () => {
  it('reads billing and shipping default flags', () => {
    expect(
      isDefaultForType({
        type: 'billing',
        isDefaultBilling: true,
        isDefaultShipping: false,
      })
    ).toBe(true);
    expect(
      isDefaultForType({
        type: 'billing',
        isDefaultBilling: false,
        isDefaultShipping: true,
      })
    ).toBe(false);
    expect(
      isDefaultForType({
        type: 'shipping',
        isDefaultBilling: true,
        isDefaultShipping: true,
      })
    ).toBe(true);
    expect(
      isDefaultForType({
        type: 'shipping',
        isDefaultBilling: true,
        isDefaultShipping: false,
      })
    ).toBe(false);
  });

  it('is never default for non-billing/shipping types', () => {
    expect(
      isDefaultForType({
        type: 'home',
        isDefaultBilling: true,
        isDefaultShipping: true,
      })
    ).toBe(false);
    expect(
      isDefaultForType({
        type: 'work',
        isDefaultBilling: true,
        isDefaultShipping: true,
      })
    ).toBe(false);
    expect(
      isDefaultForType({
        type: 'other',
        isDefaultBilling: true,
        isDefaultShipping: true,
      })
    ).toBe(false);
  });
});

describe('canSetDefault', () => {
  it('allows only billing and shipping', () => {
    expect(canSetDefault({ type: 'billing' })).toBe(true);
    expect(canSetDefault({ type: 'shipping' })).toBe(true);
    expect(canSetDefault({ type: 'home' })).toBe(false);
    expect(canSetDefault({ type: 'work' })).toBe(false);
    expect(canSetDefault({ type: 'other' })).toBe(false);
  });
});
