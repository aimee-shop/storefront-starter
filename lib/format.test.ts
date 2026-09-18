import { describe, expect, it } from 'vitest';
import {
  currencyDecimalPlaces,
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

  it('falls back safely on invalid currency codes', () => {
    expect(() => formatPrice(500, 'NOTACURRENCY')).not.toThrow();
    const out = formatPrice(500, 'NOTACURRENCY');
    expect(out).toMatch(/5\.00/);
    expect(out).toMatch(/NOTACURRENCY/);
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
