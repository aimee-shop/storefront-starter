/**
 * Pure address-book helpers (unit-tested without server actions / network).
 */

import {
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
} from '@aimee.shop/sdk/storefront';
import type {
  CustomerAddress,
  DefaultAddressType,
} from '@aimee.shop/sdk';
import type { AuthResult } from '@/lib/auth-form';

const INVALID_ADDRESS_FORM_ERROR =
  'This address could not be validated. Please check the details.';

/** Minimal address fields used for default-badge / set-default UI. */
export type AddressDefaultFields = Pick<
  CustomerAddress,
  'type' | 'isDefaultBilling' | 'isDefaultShipping'
>;

/** Address snapshot compared against provider standardized suggestions. */
export type AddressValidationPayload = {
  address1: string;
  city: string;
  zip: string;
  country: string;
};

export type AddressValidationProviderResult = {
  isValid: boolean;
  standardizedAddress?: {
    address1?: string;
    city?: string;
    zip?: string;
    country?: string;
  };
};

export function isDefaultForType(address: AddressDefaultFields): boolean {
  if (address.type === 'billing') return address.isDefaultBilling;
  if (address.type === 'shipping') return address.isDefaultShipping;
  return false;
}

export function canSetDefault(
  address: Pick<CustomerAddress, 'type'>
): address is Pick<CustomerAddress, 'type'> & { type: DefaultAddressType } {
  return address.type === 'billing' || address.type === 'shipping';
}

/**
 * Map a validateAddressData provider response into an AuthResult, or null
 * when validation should not block the save path.
 */
export function interpretAddressValidationResult(
  result: AddressValidationProviderResult,
  payload: AddressValidationPayload
): AuthResult | null {
  if (result.isValid) return null;

  const fieldErrors: Record<string, string> = {};
  const standardized = result.standardizedAddress;
  if (standardized) {
    if (standardized.address1 && standardized.address1 !== payload.address1) {
      fieldErrors.address1 = 'Street address could not be verified.';
    }
    if (standardized.city && standardized.city !== payload.city) {
      fieldErrors.city = 'City could not be verified.';
    }
    if (standardized.zip && standardized.zip !== payload.zip) {
      fieldErrors.zip = 'Postal code could not be verified.';
    }
    if (standardized.country && standardized.country !== payload.country) {
      fieldErrors.country = 'Country could not be verified.';
    }
  }

  return {
    ok: false,
    formError: INVALID_ADDRESS_FORM_ERROR,
    fieldErrors: Object.keys(fieldErrors).length > 0 ? fieldErrors : undefined,
  };
}

/**
 * Provider-down / network / unexpected failures soft-pass so local Zod remains
 * the hard gate. Auth and not-found must still surface to the caller.
 */
export function isSoftValidationFailure(error: unknown): boolean {
  if (
    error instanceof AuthorizationError ||
    error instanceof AuthenticationError ||
    error instanceof NotFoundError
  ) {
    return false;
  }
  return true;
}
