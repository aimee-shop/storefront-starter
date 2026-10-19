/**
 * Pure address-book helpers (unit-tested without server actions / network).
 */

import type {
  StorefrontAddress,
  StorefrontDefaultAddressType,
} from '@aimee.shop/sdk';

/** Minimal address fields used for default-badge / set-default UI. */
export type AddressDefaultFields = Pick<
  StorefrontAddress,
  'type' | 'isDefaultBilling' | 'isDefaultShipping'
>;

export function isDefaultForType(address: AddressDefaultFields): boolean {
  if (address.type === 'billing') return address.isDefaultBilling;
  if (address.type === 'shipping') return address.isDefaultShipping;
  return false;
}

export function canSetDefault(
  address: Pick<StorefrontAddress, 'type'>
): address is Pick<StorefrontAddress, 'type'> & { type: StorefrontDefaultAddressType } {
  return address.type === 'billing' || address.type === 'shipping';
}
