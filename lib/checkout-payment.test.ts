import { describe, expect, it } from 'vitest';
import {
  isReusablePaymentIntent,
  isValidPaymentIntent,
  parseAmountCents,
  resolvePaymentCustomerId,
} from '@/lib/checkout-payment';

describe('parseAmountCents', () => {
  it('parses cent strings', () => {
    expect(parseAmountCents('2660')).toBe(2660);
  });

  it('rounds numbers and rejects non-positive', () => {
    expect(parseAmountCents(10.4)).toBe(10);
    expect(parseAmountCents(0)).toBe(0);
    expect(parseAmountCents(-5)).toBe(0);
    expect(parseAmountCents(undefined)).toBe(0);
    expect(parseAmountCents('')).toBe(0);
    expect(parseAmountCents('abc')).toBe(0);
  });
});

describe('resolvePaymentCustomerId', () => {
  it('prefers signed-in customer', () => {
    expect(
      resolvePaymentCustomerId({
        signedInCustomerId: 'cust-signed',
        sessionCustomerId: 'cust-session',
        checkoutId: 'chk-1',
      })
    ).toBe('cust-signed');
  });

  it('falls back to session then guest synthetic id', () => {
    expect(
      resolvePaymentCustomerId({
        signedInCustomerId: null,
        sessionCustomerId: 'cust-session',
        checkoutId: 'chk-1',
      })
    ).toBe('cust-session');
    expect(
      resolvePaymentCustomerId({
        signedInCustomerId: null,
        sessionCustomerId: null,
        checkoutId: 'chk-99',
      })
    ).toBe('guest:chk-99');
  });
});

describe('isReusablePaymentIntent / isValidPaymentIntent', () => {
  it('allows pending and requires_action', () => {
    expect(isReusablePaymentIntent('pending')).toBe(true);
    expect(isReusablePaymentIntent('requires_action')).toBe(true);
    expect(isReusablePaymentIntent('succeeded')).toBe(false);
    expect(isReusablePaymentIntent('failed')).toBe(false);
  });

  it('validates full intent shape', () => {
    expect(
      isValidPaymentIntent({
        clientSecret: 'pi_x_secret_y',
        paymentId: 'pay-1',
        publishableKey: 'pk_test_x',
        status: 'pending',
      })
    ).toBe(true);
    expect(
      isValidPaymentIntent({
        clientSecret: 'pi_x_secret_y',
        paymentId: 'pay-1',
        publishableKey: 'pk_test_x',
        status: 'succeeded',
      })
    ).toBe(false);
    expect(isValidPaymentIntent(null)).toBe(false);
  });
});
