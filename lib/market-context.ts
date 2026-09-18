import { ApiError, ValidationError } from '@aimee.shop/sdk/storefront';
import type { CreateCartDto } from '@aimee.shop/sdk';
import {
  GEO_COUNTRY_COOKIE,
  normalizeCountryCode,
} from '@/lib/geo-country';

const MARKET_CREATE_ERROR_CODES = [
  'MARKET_INACTIVE',
  'MARKET_NOT_ENABLED_FOR_STORE',
  'CURRENCY_NOT_IN_MARKET',
] as const;

export interface MarketPreferenceSnapshot {
  marketId: string | null;
  countryCode: string | null;
}

/**
 * Build carts.create body from persisted preference.
 * marketId wins; else countryCode; else empty (store default market).
 */
export function buildCreateCartDto(
  pref: MarketPreferenceSnapshot
): CreateCartDto {
  if (pref.marketId) {
    return { marketId: pref.marketId };
  }
  if (pref.countryCode) {
    const countryCode = normalizeCountryCode(pref.countryCode);
    if (countryCode) return { countryCode };
  }
  return {};
}

function haystackIncludesMarketCode(haystack: string): boolean {
  return (MARKET_CREATE_ERROR_CODES as readonly string[]).some((code) =>
    haystack.includes(code)
  );
}

/**
 * Detect market-resolution failures on cart create.
 *
 * SDK 0.6.0 maps all HTTP 400s to ValidationError with code VALIDATION_ERROR
 * and drops the API body `code` field. Nest BadRequestException({ code, message })
 * still puts the human message (and often the code string) into `message`.
 *
 * Only match known market error codes -- never treat an unrelated ValidationError
 * (bad variant, qty) as a market failure, even when the create body had a hint.
 * Matching solely on "create had market hint" would wipe the user's region.
 */
export function isMarketCreateError(error: unknown): boolean {
  if (error instanceof ApiError) {
    return (MARKET_CREATE_ERROR_CODES as readonly string[]).includes(error.code);
  }
  if (!(error instanceof ValidationError)) return false;

  const haystack = [
    error.message,
    ...error.errors.map((e) => `${e.code ?? ''} ${e.message}`),
  ].join(' ');
  return haystackIncludesMarketCode(haystack);
}

/** Read geo country cookie (browser). */
export function readGeoCountryCookie(): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${GEO_COUNTRY_COOKIE}=`));
  if (!match) return null;
  const raw = decodeURIComponent(match.slice(GEO_COUNTRY_COOKIE.length + 1));
  return normalizeCountryCode(raw);
}

/** Derive country from navigator.language (e.g. en-GB -> GB). */
export function countryFromLocale(
  locale: string | null | undefined
): string | null {
  if (!locale) return null;
  const parts = locale.replace('_', '-').split('-');
  if (parts.length < 2) return null;
  return normalizeCountryCode(parts[parts.length - 1]);
}

export function resolveDerivedCountryCode(): string | null {
  return (
    readGeoCountryCookie() ??
    countryFromLocale(
      typeof navigator !== 'undefined' ? navigator.language : null
    )
  );
}
