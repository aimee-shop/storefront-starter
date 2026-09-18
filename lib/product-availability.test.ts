import { describe, expect, it } from 'vitest';
import {
  getAvailabilityState,
  isProductSellable,
  type VariantInventory,
} from '@/lib/product-availability';

function inventory(
  status: VariantInventory['status'],
  totalAvailable = 0,
): VariantInventory {
  return {
    totalOnHand: totalAvailable,
    totalAvailable,
    totalReserved: 0,
    totalIncoming: 0,
    status,
    locationCount: 1,
  };
}

describe('getAvailabilityState', () => {
  it('renders the status the platform reports', () => {
    const base = { isAvailable: true, variantId: 'var-1' };
    expect(
      getAvailabilityState({ ...base, inventory: inventory('in_stock', 250) }),
    ).toBe('in-stock');
    expect(
      getAvailabilityState({ ...base, inventory: inventory('low_stock', 2) }),
    ).toBe('low-stock');
    expect(
      getAvailabilityState({ ...base, inventory: inventory('backorder') }),
    ).toBe('backorder');
    expect(
      getAvailabilityState({ ...base, inventory: inventory('out_of_stock') }),
    ).toBe('unavailable');
  });

  it('treats a missing summary as unknown, not out of stock', () => {
    const input = {
      isAvailable: true,
      variantId: 'var-1',
      inventory: null,
    };
    expect(getAvailabilityState(input)).toBe('unknown');
    expect(isProductSellable(input)).toBe(true);
  });

  it('is unavailable without a variant or when the catalog flag is off', () => {
    const inStock = inventory('in_stock', 5);
    expect(
      getAvailabilityState({
        isAvailable: true,
        variantId: '',
        inventory: inStock,
      }),
    ).toBe('unavailable');
    expect(
      getAvailabilityState({
        isAvailable: false,
        variantId: 'var-1',
        inventory: inStock,
      }),
    ).toBe('unavailable');
  });

  it('sells untracked goods without consulting stock', () => {
    expect(
      getAvailabilityState({
        isAvailable: true,
        variantId: 'var-1',
        inventory: null,
        productTracked: false,
      }),
    ).toBe('in-stock');
    expect(
      getAvailabilityState({
        isAvailable: true,
        variantId: 'var-1',
        inventory: null,
        productTracked: false,
        variantTracked: true,
      }),
    ).toBe('unknown');
  });
});
