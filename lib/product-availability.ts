import type { ProductVariant } from '@aimee.shop/sdk';

/**
 * PDP stock state from `variants.listByProduct(id, { include: ['inventory'] })`.
 * Storefront keys 403 `/v1/inventory/variants/:id/*`; do not call that client.
 */
export type AvailabilityState =
  | 'in-stock'
  | 'low-stock'
  | 'backorder'
  | 'unavailable'
  | 'unknown';

/** The include-expanded inventory summary, as typed by the SDK. */
export type VariantInventory = NonNullable<ProductVariant['inventory']>;

/**
 * Variant overrides product; null inherits. `stores.get` has no inventory
 * settings, so a fully-null chain is treated as tracked (what the cart does).
 */
export function isInventoryTrackingEnabled(input: {
  productTracked?: boolean | null;
  variantTracked?: boolean | null;
}): boolean {
  if (input.variantTracked != null) return input.variantTracked;
  if (input.productTracked != null) return input.productTracked;
  return true;
}

export interface AvailabilityInput {
  /** Catalog-level kill switch: false hides the buy box regardless of stock. */
  isAvailable: boolean;
  variantId?: string | null;
  /** null when the include was empty or the lookup failed. */
  inventory?: VariantInventory | null;
  productTracked?: boolean | null;
  variantTracked?: boolean | null;
}

export function getAvailabilityState(
  input: AvailabilityInput,
): AvailabilityState {
  if (!input.isAvailable || !input.variantId) return 'unavailable';

  // Untracked goods have no stock rows; the cart does not check them.
  if (!isInventoryTrackingEnabled(input)) return 'in-stock';

  // Missing summary is unknown, not out of stock (starter#41).
  if (!input.inventory) return 'unknown';

  switch (input.inventory.status) {
    case 'in_stock':
      return 'in-stock';
    case 'low_stock':
      return 'low-stock';
    case 'backorder':
      return 'backorder';
    default:
      return 'unavailable';
  }
}

/** Whether Add to Cart may be enabled. Backorder and unknown stay sellable. */
export function isProductSellable(input: AvailabilityInput): boolean {
  return getAvailabilityState(input) !== 'unavailable';
}
