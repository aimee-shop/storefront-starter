import { describe, expect, it } from 'vitest';
import {
  currencyDecimalPlaces,
  formatListedPrice,
  formatMoney,
  formatPrice,
} from './format';

describe('currencyDecimalPlaces', () => {
  it('returns 0 for zero-decimal currencies', () => {
    expect(currencyDecimalPlaces('JPY')).toBe(0);
    expect(currencyDecimalPlaces('krw')).toBe(0);
  });

  it('returns 3 for three-decimal currencies', () => {
    expect(currencyDecimalPlaces('KWD')).toBe(3);
  });

  it('defaults to 2', () => {
    expect(currencyDecimalPlaces('USD')).toBe(2);
    expect(currencyDecimalPlaces('EUR')).toBe(2);
  });
});

describe('formatPrice', () => {
  it('formats USD cents as dollars', () => {
    expect(formatPrice(1000, 'USD')).toMatch(/\$10\.00|USD/);
  });

  it('formats EUR minor units', () => {
    const eur = formatPrice(1000, 'EUR');
    expect(eur).toMatch(/€|EUR/);
    expect(eur).toMatch(/10/);
  });

  it('does not divide zero-decimal currencies by 100', () => {
    // 100 yen minor units = ¥100, not ¥1.00
    const jpy = formatPrice(100, 'JPY');
    expect(jpy).toMatch(/100/);
    expect(jpy).not.toMatch(/1\.00/);
  });

  it('scales three-decimal currencies by 1000', () => {
    // 25500 fils = 25.500 KWD
    const kwd = formatPrice(25500, 'KWD');
    expect(kwd).toMatch(/25\.5/);
  });

  it('does not divide ISK by 100', () => {
    // core-api sends ISK with no minor unit: 1500 = 1,500 kr
    expect(formatPrice(1500, 'ISK')).toMatch(/1,500/);
  });

  it('scales four-decimal currencies by 10000', () => {
    // 123456 minor units = 12.3456 CLF
    expect(formatPrice(123456, 'CLF')).toMatch(/12\.3456/);
  });

  it('falls back safely on invalid currency codes', () => {
    expect(() => formatPrice(500, 'NOTACURRENCY')).not.toThrow();
    const out = formatPrice(500, 'NOTACURRENCY');
    expect(out).toMatch(/5\.00/);
    expect(out).toMatch(/NOTACURRENCY/);
  });
});

describe('formatListedPrice', () => {
  it('shows From the minimum only when the range bounds differ', () => {
    expect(
      formatListedPrice({
        price: 1500,
        priceRange: { min: 1500, max: 2500, currency: 'USD' },
      }),
    ).toBe(`From ${formatPrice(1500, 'USD')}`);
    expect(
      formatListedPrice({
        priceRange: { min: 1500, max: 1500, currency: 'USD' },
      }),
    ).toBe(formatPrice(1500, 'USD'));
  });

  it('uses a top-level currency when there is a price and no range', () => {
    expect(formatListedPrice({ price: 1800, currency: 'GBP' })).toBe(
      formatPrice(1800, 'GBP'),
    );
    // No currency on the product: formatPrice falls back to USD.
    expect(formatListedPrice({ price: 1800 })).toBe(formatPrice(1800, 'USD'));
  });
});

describe('formatMoney', () => {
  it('formats with cart currency (no client FX)', () => {
    const eur = formatPrice(1000, 'EUR');
    expect(formatMoney('1000', 'EUR')).toBe(eur);
    expect(formatMoney(null, 'USD')).toMatch(/\$|USD/);
  });

  it('treats empty values as zero', () => {
    expect(formatMoney('', 'USD')).toBe(formatPrice(0, 'USD'));
    expect(formatMoney(undefined, 'JPY')).toBe(formatPrice(0, 'JPY'));
  });
});

describe('formatListedPrice currency', () => {
  it('renders the product currency, not USD, for a EUR product', () => {
    const label = formatListedPrice({ price: 1000, currency: 'EUR' });
    expect(label).toBe(formatPrice(1000, 'EUR'));
    expect(label).not.toContain('$');
  });
});
