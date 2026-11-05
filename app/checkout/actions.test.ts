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

    expect(result).toMatchObject({ ok: false, reason: 'stale', revision: 4 });
  });

  it('sends a gone shipping rate back to shipping and retries a retiring attempt', async () => {
    preparePayment.mockRejectedValueOnce(
      new ConflictError('gone', { code: 'SHIPPING_RATE_UNAVAILABLE', retryable: false })
    );
    await expect(
      prepareCheckoutPayment({ checkoutId: 'chk-1', revision: 3 })
    ).resolves.toMatchObject({ ok: false, reason: 'shipping' });

    preparePayment.mockRejectedValueOnce(
      new ConflictError('retiring', {
        code: 'CHECKOUT_ATTEMPT_RETIRING',
        retryable: true,
        retryAfterSeconds: 1,
      })
    );
    await expect(
      prepareCheckoutPayment({ checkoutId: 'chk-1', revision: 3 })
    ).resolves.toMatchObject({ ok: false, reason: 'retry', retryAfterSeconds: 1 });
  });

  it('points to support when the payment was already taken', async () => {
    preparePayment.mockRejectedValue(
      new ConflictError('taken', { code: 'CHECKOUT_PAYMENT_TAKEN', retryable: false })
    );

    const result = await prepareCheckoutPayment({ checkoutId: 'chk-1', revision: 3 });

    expect(result).toMatchObject({ ok: false, reason: 'failed' });
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
    ).resolves.toEqual({
      ok: false,
      message: expect.stringMatching(/being returned/),
    });
  });

  it('sends the shopper to support when the refund was refused', async () => {
    complete.mockRejectedValue(refusal('refused'));

    await expect(
      completeCheckoutSession({ checkoutId: 'chk-1', paymentIntentId: 'pi_1' })
    ).resolves.toEqual({
      ok: false,
      message: expect.stringMatching(/contact support/),
    });
  });
});

describe('completeCheckoutSession', () => {
  beforeEach(() => {
    complete.mockReset();
  });

  it('completes with one idempotency key per checkout and payment', async () => {
    const completion = { status: 'success', orderId: 'ord-1' };
    complete.mockResolvedValue(
      completion as Awaited<ReturnType<Checkout['complete']>>
    );

    const input = { checkoutId: 'chk-1', paymentIntentId: 'pay-1' };
    await expect(completeCheckoutSession(input)).resolves.toEqual({
      ok: true,
      completion,
    });
    await completeCheckoutSession(input);

    expect(complete).toHaveBeenCalledWith(
      'chk-1',
      { paymentIntentId: 'pay-1', termsAccepted: true },
      { idempotencyKey: 'checkout-complete:chk-1:pay-1' }
    );
    const [first, second] = complete.mock.calls;
    expect(first?.[2]).toEqual(second?.[2]);
  });
});
