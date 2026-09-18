/**
 * Edge-safe geo country helpers (no SDK imports).
 * Used by middleware and client market preference seeding.
 */

/** Cookie written by middleware from geo-IP headers. */
export const GEO_COUNTRY_COOKIE = 'aimee-geo-country';

/**
 * Normalize to ISO 3166-1 alpha-2 uppercase. Returns null when invalid.
 * API currently exact-matches country codes (uppercase required).
 */
export function normalizeCountryCode(
  value: string | null | undefined
): string | null {
  if (!value) return null;
  const code = value.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(code)) return null;
  return code;
}
