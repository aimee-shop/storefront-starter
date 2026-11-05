import { describe, expect, it } from 'vitest';
import type { SavedPaymentMethod } from '@/app/account/payment-methods/types';
import { checkoutSavedCards } from '@/lib/checkout-saved-cards';

function method(overrides: Partial<SavedPaymentMethod>): SavedPaymentMethod {
  return {
    id: 'pm-1',
    customerId: 'cust-1',
    provider: 'stripe',
    providerMethodId: 'pm_1',
    type: 'card',
    cardBrand: 'visa',
    cardLastFour: '4242',
    cardExpMonth: 12,
    cardExpYear: 2030,
    isDefault: false,
    ...overrides,
  };
}

describe('checkoutSavedCards', () => {
  it('keeps only the customer\'s Stripe cards, default first', () => {
    const result = checkoutSavedCards(
      [
        method({ id: 'a' }),
        method({ id: 'b', provider: 'braintree', providerMethodId: 'tok_b' }),
        method({ id: 'c', customerId: 'cust-2' }),
        method({ id: 'd', providerMethodId: '' }),
        method({ id: 'e', isDefault: true }),
      ],
      'cust-1'
    );
    expect(result.map((pm) => pm.id)).toEqual(['e', 'a']);
  });
});
