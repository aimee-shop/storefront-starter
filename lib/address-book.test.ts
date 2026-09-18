import { describe, expect, it } from 'vitest';
import {
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
} from '@aimee.shop/sdk/storefront';
import {
  canSetDefault,
  interpretAddressValidationResult,
  isDefaultForType,
  isSoftValidationFailure,
  type AddressValidationPayload,
} from '@/lib/address-book';

const payload: AddressValidationPayload = {
  address1: '123 Main St',
  city: 'Austin',
  zip: '78701',
  country: 'US',
};

describe('interpretAddressValidationResult', () => {
  it('returns null when the provider marks the address valid', () => {
    expect(
      interpretAddressValidationResult({ isValid: true }, payload)
    ).toBeNull();
  });

  it('returns formError only when invalid with no standardized address', () => {
    expect(
      interpretAddressValidationResult({ isValid: false }, payload)
    ).toEqual({
      ok: false,
      formError:
        'This address could not be validated. Please check the details.',
      fieldErrors: undefined,
    });
  });

  it('returns formError only when standardized fields match the payload', () => {
    expect(
      interpretAddressValidationResult(
        {
          isValid: false,
          standardizedAddress: {
            address1: '123 Main St',
            city: 'Austin',
            zip: '78701',
            country: 'US',
          },
        },
        payload
      )
    ).toEqual({
      ok: false,
      formError:
        'This address could not be validated. Please check the details.',
      fieldErrors: undefined,
    });
  });

  it('maps standardized field diffs to fieldErrors', () => {
    expect(
      interpretAddressValidationResult(
        {
          isValid: false,
          standardizedAddress: {
            address1: '123 Main Street',
            city: 'Austin',
            zip: '78702',
            country: 'CA',
          },
        },
        payload
      )
    ).toEqual({
      ok: false,
      formError:
        'This address could not be validated. Please check the details.',
      fieldErrors: {
        address1: 'Street address could not be verified.',
        zip: 'Postal code could not be verified.',
        country: 'Country could not be verified.',
      },
    });
  });

  it('includes only fields that actually differ', () => {
    const result = interpretAddressValidationResult(
      {
        isValid: false,
        standardizedAddress: {
          city: 'Round Rock',
        },
      },
      payload
    );
    expect(result).toEqual({
      ok: false,
      formError:
        'This address could not be validated. Please check the details.',
      fieldErrors: {
        city: 'City could not be verified.',
      },
    });
  });

  it('ignores empty standardized suggestions', () => {
    expect(
      interpretAddressValidationResult(
        {
          isValid: false,
          standardizedAddress: {
            address1: '',
            city: undefined,
          },
        },
        payload
      )
    ).toEqual({
      ok: false,
      formError:
        'This address could not be validated. Please check the details.',
      fieldErrors: undefined,
    });
  });
});

describe('isSoftValidationFailure', () => {
  it('soft-passes generic and network-style errors', () => {
    expect(isSoftValidationFailure(new Error('network down'))).toBe(true);
    expect(isSoftValidationFailure(new Error('Not Implemented'))).toBe(true);
    expect(isSoftValidationFailure('string error')).toBe(true);
  });

  it('does not soft-pass auth or not-found errors', () => {
    expect(isSoftValidationFailure(new AuthenticationError('nope'))).toBe(
      false
    );
    expect(isSoftValidationFailure(new AuthorizationError('forbidden'))).toBe(
      false
    );
    expect(isSoftValidationFailure(new NotFoundError('missing'))).toBe(false);
  });
});

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
