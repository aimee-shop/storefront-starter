/**
 * Format a price in minor units for display.
 * Currency comes from the API (cart/order); never convert client-side.
 *
 * Minor-unit exponents mirror core-api MoneyUtil (0 / 2 / 3 / 4).
 */

/** Currencies with no fractional minor unit (1 major = 1 minor). */
const ZERO_DECIMAL_CURRENCIES: ReadonlySet<string> = new Set([
  'BIF',
  'CLP',
  'DJF',
  'GNF',
  'ISK',
  'JPY',
  'KMF',
  'KRW',
  'MGA',
  'PYG',
  'RWF',
  'UGX',
  'UYI',
  'VND',
  'VUV',
  'XAF',
  'XOF',
  'XPF',
]);

/** Currencies with three decimal minor units (1 major = 1000 minor). */
const THREE_DECIMAL_CURRENCIES: ReadonlySet<string> = new Set([
  'BHD',
  'IQD',
  'JOD',
  'KWD',
  'LYD',
  'OMR',
  'TND',
]);

/** Currencies with four decimal minor units (1 major = 10000 minor). */
const FOUR_DECIMAL_CURRENCIES: ReadonlySet<string> = new Set(['CLF', 'UYW']);

/** Decimal places for an ISO 4217 code (0, 2, 3, or 4). */
export function currencyDecimalPlaces(currencyCode: string): number {
  const code = currencyCode.trim().toUpperCase();
  if (ZERO_DECIMAL_CURRENCIES.has(code)) return 0;
  if (THREE_DECIMAL_CURRENCIES.has(code)) return 3;
  if (FOUR_DECIMAL_CURRENCIES.has(code)) return 4;
  return 2;
}

/** Minor units to a major-unit amount (1200 USD -> 12). */
export function minorUnitsToMajor(cents: number, currencyCode: string): number {
  const decimals = currencyDecimalPlaces(currencyCode);
  const divisor = 10 ** decimals;
  return cents / divisor;
}

export interface ListedProductPrice {
  price?: number | null;
  currency?: string;
  priceRange?: { min: number; max: number; currency: string } | null;
}

/** True when the range bounds differ, so the label reads "From {min}". */
export function priceRangeSpans(
  range: ListedProductPrice['priceRange']
): boolean {
  return range != null && range.min !== range.max;
}

/**
 * Card and PDP price label.
 * A range whose bounds differ is "From {min}". Otherwise the scalar price, then the range min.
 */
export function formatListedPrice(product: ListedProductPrice): string | null {
  const range = product.priceRange ?? undefined;
  // USD is the intended fallback when the product carries no currency.
  const currency = range?.currency ?? product.currency;
  if (range && priceRangeSpans(range)) {
    return `From ${formatPrice(range.min, currency)}`;
  }
  const amount = product.price ?? range?.min;
  if (amount == null) return null;
  return formatPrice(amount, currency);
}

export function formatPrice(cents: number, currency = 'USD'): string {
  const code = currency.trim().toUpperCase() || 'USD';
  const amount = minorUnitsToMajor(cents, code);
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: code,
    }).format(amount);
  } catch {
    // Malformed ISO code must not throw in-render. Keep already-scaled major
    // units for this code (do not re-scale as USD).
    const decimals = currencyDecimalPlaces(code);
    return `${amount.toFixed(decimals)} ${code}`;
  }
}

/**
 * Format an SDK money field (minor-unit string/number) for display.
 * Pass cart.currency / order.currency so multi-market carts show correctly.
 */
export function formatMoney(
  value: string | number | undefined | null,
  currency = 'USD'
): string {
  if (value === undefined || value === null || value === '') {
    return formatPrice(0, currency);
  }
  const cents = typeof value === 'number' ? value : Number(value);
  return formatPrice(Number.isFinite(cents) ? cents : 0, currency);
}

/**
 * Format an ISO date string as a medium date (e.g. "Jun 12, 2026").
 */
export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' }).format(
    new Date(iso)
  );
}
