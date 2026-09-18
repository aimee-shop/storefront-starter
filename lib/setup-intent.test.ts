import { describe, expect, it } from 'vitest';
import { isValidSetupIntent } from '@/lib/setup-intent';

describe('isValidSetupIntent', () => {
  const valid = {
    clientSecret: 'seti_x_secret_y',
    setupIntentId: 'seti_x',
    publishableKey: 'pk_test_x',
    status: 'requires_payment_method',
  };

  it('accepts a complete intent', () => {
    expect(isValidSetupIntent(valid)).toBe(true);
  });

  it('rejects missing or empty publishableKey', () => {
    expect(isValidSetupIntent({ ...valid, publishableKey: '' })).toBe(false);
    expect(isValidSetupIntent({ ...valid, publishableKey: undefined })).toBe(
      false
    );
  });

  it('rejects incomplete secrets, ids, or status', () => {
    expect(isValidSetupIntent({ ...valid, clientSecret: '' })).toBe(false);
    expect(isValidSetupIntent({ ...valid, setupIntentId: '' })).toBe(false);
    expect(isValidSetupIntent({ ...valid, status: '' })).toBe(false);
    expect(isValidSetupIntent(null)).toBe(false);
    expect(isValidSetupIntent(undefined)).toBe(false);
  });
});
