import { describe, expect, it } from 'vitest';
import { ApiError, ValidationError } from '@aimee.shop/sdk/storefront';
import { normalizeCountryCode } from './geo-country';
import {
  buildCreateCartDto,
  countryFromLocale,
  isMarketCreateError,
} from './market-context';

describe('normalizeCountryCode', () => {
  it('uppercases and accepts alpha-2', () => {
    expect(normalizeCountryCode('de')).toBe('DE');
    expect(normalizeCountryCode(' US ')).toBe('US');
  });

  it('rejects invalid values', () => {
    expect(normalizeCountryCode('usa')).toBeNull();
    expect(normalizeCountryCode('')).toBeNull();
    expect(normalizeCountryCode(null)).toBeNull();
  });
});

describe('buildCreateCartDto', () => {
  it('returns empty body when no preference', () => {
    expect(buildCreateCartDto({ marketId: null, countryCode: null })).toEqual(
      {}
    );
  });

  it('prefers marketId over countryCode', () => {
    expect(
      buildCreateCartDto({ marketId: 'mkt-1', countryCode: 'DE' })
    ).toEqual({ marketId: 'mkt-1' });
  });

  it('sends countryCode uppercase', () => {
    expect(
      buildCreateCartDto({ marketId: null, countryCode: 'de' })
    ).toEqual({ countryCode: 'DE' });
  });

  it('omits invalid countryCode', () => {
    expect(
      buildCreateCartDto({ marketId: null, countryCode: 'invalid' })
    ).toEqual({});
  });
});

describe('countryFromLocale', () => {
  it('extracts region subtag', () => {
    expect(countryFromLocale('en-GB')).toBe('GB');
    expect(countryFromLocale('de_DE')).toBe('DE');
  });

  it('returns null without region', () => {
    expect(countryFromLocale('en')).toBeNull();
  });
});

describe('isMarketCreateError', () => {
  it('matches typed market create codes on ApiError', () => {
    expect(
      isMarketCreateError(new ApiError('inactive', 400, 'MARKET_INACTIVE'))
    ).toBe(true);
    expect(
      isMarketCreateError(
        new ApiError('nope', 400, 'MARKET_NOT_ENABLED_FOR_STORE')
      )
    ).toBe(true);
  });

  it('matches market codes embedded in ValidationError messages', () => {
    // SDK maps all HTTP 400s to ValidationError with code VALIDATION_ERROR.
    expect(
      isMarketCreateError(
        new ValidationError('Market inactive MARKET_INACTIVE')
      )
    ).toBe(true);
    expect(
      isMarketCreateError(
        new ValidationError('bad CURRENCY_NOT_IN_MARKET for store')
      )
    ).toBe(true);
  });

  it('does not treat unrelated ValidationErrors as market failures', () => {
    // Even when the create body had a market hint, a generic 400 must not
    // clear the user's region selection.
    expect(isMarketCreateError(new ValidationError('bad payload'))).toBe(
      false
    );
    expect(
      isMarketCreateError(new ValidationError('Market EU is not active'))
    ).toBe(false);
    expect(isMarketCreateError(new Error('nope'))).toBe(false);
  });
});
