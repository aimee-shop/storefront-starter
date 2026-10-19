import { describe, expect, it } from 'vitest';
import {
  isReusablePaymentIntent,
  isValidPaymentIntent,
} from '@/lib/checkout-payment';

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
        paymentIntentId: 'pi_1',
        revision: 1,
        publishableKey: 'pk_test_x',
        status: 'pending',
      })
    ).toBe(true);
    expect(
      isValidPaymentIntent({
        clientSecret: 'pi_x_secret_y',
        paymentIntentId: 'pi_1',
        revision: 1,
        publishableKey: 'pk_test_x',
        status: 'succeeded',
      })
    ).toBe(false);
    expect(isValidPaymentIntent(null)).toBe(false);
  });
});
