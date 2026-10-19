import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ConflictError } from '@aimee.shop/sdk';
import type { sdk } from '@/lib/sdk';

type Checkout = typeof sdk.checkout;

const { preparePayment, complete } = vi.hoisted(() => ({
  preparePayment: vi.fn<Checkout['preparePayment']>(),
  complete: vi.fn<Checkout['complete']>(),
}));

vi.mock('server-only', () => ({}));
vi.mock('@/lib/config', () => ({ config: { apiKey: 'sk_test_key' } }));
vi.mock('@/lib/sdk', () => ({ sdk: { checkout: { preparePayment, complete } } }));

import { completeCheckoutSession, prepareCheckoutPayment } from './actions';

describe('prepareCheckoutPayment', () => {
  beforeEach(() => {
    preparePayment.mockReset();
    complete.mockReset();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('sends only the accepted revision and maps the prepared attempt', async () => {
    preparePayment.mockResolvedValue({
      attemptId: 'att-1',
      revision: 3,
      provider: 'stripe',
      paymentId: 'pay-1',
      paymentIntentId: 'pi_1',
      clientSecret: 'pi_1_secret',
      publishableKey: 'pk_test',
      status: 'requires_payment_method',
      amount: '2660',
      currency: 'USD',
    });

    const result = await prepareCheckoutPayment({ checkoutId: 'chk-1', revision: 3 });

    expect(preparePayment).toHaveBeenCalledWith('chk-1', {
      revision: 3,
      provider: 'stripe',
    });
    expect(result).toEqual({
      ok: true,
      intent: {
        clientSecret: 'pi_1_secret',
        paymentIntentId: 'pi_1',
        publishableKey: 'pk_test',
        revision: 3,
        status: 'requires_payment_method',
      },
    });
  });

  it('flags a revision-changed refusal as stale', async () => {
    preparePayment.mockRejectedValue(
      new ConflictError('changed', {
        code: 'CHECKOUT_REVISION_CHANGED',
        retryable: true,
        revision: 4,
      })
    );

    const result = await prepareCheckoutPayment({ checkoutId: 'chk-1', revision: 3 });

    expect(result).toMatchObject({ ok: false, stale: true });
  });

  it('points to support when the payment was already taken', async () => {
    preparePayment.mockRejectedValue(
      new ConflictError('taken', { code: 'CHECKOUT_PAYMENT_TAKEN', retryable: false })
    );

    const result = await prepareCheckoutPayment({ checkoutId: 'chk-1', revision: 3 });

    expect(result).toMatchObject({ ok: false, stale: false });
    expect(result.ok === false && result.message).toMatch(/already received/);
  });
});

describe('completeCheckoutSession compensation', () => {
  beforeEach(() => {
    complete.mockReset();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  const refusal = (status: string) =>
    new ConflictError('refused', {
      code: 'CHECKOUT_REVISION_CHANGED',
      retryable: false,
      compensation: { operationId: 'op-1', status },
    });

  it('says the payment is being returned only when the refund is under way', async () => {
    complete.mockRejectedValue(refusal('refund_accepted'));

    await expect(
      completeCheckoutSession({ checkoutId: 'chk-1', paymentIntentId: 'pi_1' })
    ).rejects.toThrow(/being returned/);
  });

  it('sends the shopper to support when the refund was refused', async () => {
    complete.mockRejectedValue(refusal('refused'));

    await expect(
      completeCheckoutSession({ checkoutId: 'chk-1', paymentIntentId: 'pi_1' })
    ).rejects.toThrow(/contact support/);
  });
});
