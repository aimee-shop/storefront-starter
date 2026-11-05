import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CheckoutSession, TotalsBreakdown } from '@aimee.shop/sdk';

const createIntentMock = vi.fn();
const completeMock = vi.fn();
const createSessionMock = vi.fn();
const calculateTotalsMock = vi.fn();

vi.mock('@/app/checkout/actions', () => ({
  prepareCheckoutPayment: (...args: unknown[]) =>
    createIntentMock(...args),
  completeCheckoutSession: (...args: unknown[]) => completeMock(...args),
}));

vi.mock('@/lib/storefront-client', () => ({
  getStorefront: () => ({
    checkout: {
      create: (...args: unknown[]) => createSessionMock(...args),
      updateShippingAddress: vi.fn(),
      getShippingRates: vi.fn(),
      selectShippingMethod: vi.fn(),
      calculateTotals: (...args: unknown[]) => calculateTotalsMock(...args),
    },
  }),
}));

import { useCheckoutStore } from '@/stores/checkout-store';

function makeSession(overrides: Partial<CheckoutSession> = {}): CheckoutSession {
  return {
    id: 'chk-1',
    tenantId: 'tenant-1',
    storeId: 'store-1',
    cartId: 'cart-1',
    status: 'open',
    workflowState: 'payment_setup',
    revision: 1,
    useShippingAsBilling: true,
    subtotal: '2000',
    discountTotal: '0',
    taxTotal: '160',
    shippingTotal: '500',
    total: '2660',
    currency: 'USD',
    validationErrors: [],
    expiresAt: '2026-12-01T00:00:00.000Z',
    lastActivityAt: '2026-07-01T00:00:00.000Z',
    locale: 'en-US',
    countryCode: 'US',
    channel: 'web',
    metadata: {},
    createdAt: '2026-07-01T00:00:00.000Z',
    updatedAt: '2026-07-01T00:00:00.000Z',
    shippingAddress: {
      firstName: 'Ada',
      lastName: 'Lovelace',
      address1: '1 Analytical Way',
      city: 'London',
      country: 'GB',
      email: 'ada@example.com',
    },
    ...overrides,
  } as CheckoutSession;
}

function makeTotals(overrides: Partial<TotalsBreakdown> = {}): TotalsBreakdown {
  return {
    revision: 1,
    subtotal: '2000',
    discountTotal: '0',
    taxTotal: '160',
    shippingTotal: '500',
    total: '2660',
    currency: 'USD',
    lineItems: [],
    taxBreakdown: [],
    discountBreakdown: [],
    shippingBreakdown: [],
    calculationMetadata: {
      calculatedAt: '2026-01-01T00:00:00.000Z',
      snapshotType: 'live',
    },
    ...overrides,
  };
}

function seedPaymentReady() {
  useCheckoutStore.setState({
    checkoutId: 'chk-1',
    session: makeSession(),
    totals: makeTotals(),
    paymentIntent: null,
    completion: null,
    isLoading: false,
    error: null,
  });
}

beforeEach(() => {
  createIntentMock.mockReset();
  completeMock.mockReset();
  createSessionMock.mockReset();
  calculateTotalsMock.mockReset();
  useCheckoutStore.setState({
    checkoutId: null,
    session: null,
    shippingRates: null,
    totals: null,
    paymentIntent: null,
    completion: null,
    isLoading: false,
    error: null,
  });
});

describe('ensurePaymentIntent', () => {
  it('prepares payment via server action with the accepted revision', async () => {
    seedPaymentReady();
    createIntentMock.mockResolvedValue({
      ok: true,
      intent: {
        clientSecret: 'pi_test_secret',
        paymentIntentId: 'pay-1',
        revision: 1,
        publishableKey: 'pk_test_1',
        status: 'pending',
      },
    });

    const intent = await useCheckoutStore.getState().ensurePaymentIntent();

    expect(createIntentMock).toHaveBeenCalledWith({
      checkoutId: 'chk-1',
      revision: 1,
    });
    expect(intent.clientSecret).toBe('pi_test_secret');
    expect(useCheckoutStore.getState().paymentIntent?.publishableKey).toBe(
      'pk_test_1'
    );
    expect(useCheckoutStore.getState().error).toBeNull();
  });

  it('reuses a valid existing intent without re-creating', async () => {
    seedPaymentReady();
    useCheckoutStore.setState({
      paymentIntent: {
        clientSecret: 'pi_existing_secret',
        paymentIntentId: 'pay-existing',
        revision: 1,
        publishableKey: 'pk_test_1',
        status: 'pending',
      },
    });

    const intent = await useCheckoutStore.getState().ensurePaymentIntent();

    expect(createIntentMock).not.toHaveBeenCalled();
    expect(intent.paymentIntentId).toBe('pay-existing');
  });

  it('recreates when prior intent is not reusable (e.g. failed)', async () => {
    seedPaymentReady();
    useCheckoutStore.setState({
      paymentIntent: {
        clientSecret: 'pi_old',
        paymentIntentId: 'pay-old',
        revision: 1,
        publishableKey: 'pk_test_1',
        status: 'failed',
      },
    });
    createIntentMock.mockResolvedValue({
      ok: true,
      intent: {
        clientSecret: 'pi_new',
        paymentIntentId: 'pay-new',
        revision: 1,
        publishableKey: 'pk_test_2',
        status: 'pending',
      },
    });

    const intent = await useCheckoutStore.getState().ensurePaymentIntent();

    expect(createIntentMock).toHaveBeenCalledOnce();
    expect(intent.paymentIntentId).toBe('pay-new');
  });

  it('surfaces refusals and does not leave a half-ready intent', async () => {
    seedPaymentReady();
    createIntentMock.mockResolvedValue({
      ok: false,
      reason: 'failed',
      message: 'Could not start payment. Please try again.',
    });

    await expect(
      useCheckoutStore.getState().ensurePaymentIntent()
    ).rejects.toThrow(/Could not start payment/);

    const state = useCheckoutStore.getState();
    expect(state.paymentIntent).toBeNull();
    expect(state.error).toMatch(/Could not start payment/);
    expect(state.isLoading).toBe(false);
  });

  it('refetches totals when the accepted total went stale', async () => {
    seedPaymentReady();
    createIntentMock.mockResolvedValue({
      ok: false,
      reason: 'stale',
      message: 'Your order total changed. Review the updated total and try again.',
    });
    calculateTotalsMock.mockResolvedValue(makeTotals({ revision: 2, total: '2700' }));

    await expect(
      useCheckoutStore.getState().ensurePaymentIntent()
    ).rejects.toThrow(/total changed/);

    expect(useCheckoutStore.getState().totals?.revision).toBe(2);
  });
});

describe('preparePaymentForConfirm', () => {
  const readyIntent = {
    clientSecret: 'pi_1_secret',
    paymentIntentId: 'pay-1',
    revision: 1,
    publishableKey: 'pk_test_1',
    status: 'pending',
  };

  it('shows the new total and keeps the card form when the price moved', async () => {
    seedPaymentReady();
    useCheckoutStore.setState({ paymentIntent: readyIntent });
    createIntentMock.mockResolvedValue({
      ok: false,
      reason: 'stale',
      message: 'Your order total changed. Review the updated total and try again.',
      revision: 2,
      totals: {
        subtotal: '2000',
        discountTotal: '0',
        taxTotal: '160',
        shippingTotal: '900',
        total: '3060',
        currency: 'USD',
      },
    });

    await expect(
      useCheckoutStore.getState().preparePaymentForConfirm()
    ).rejects.toThrow(/total changed/);

    expect(createIntentMock).toHaveBeenCalledWith({ checkoutId: 'chk-1', revision: 1 });
    const state = useCheckoutStore.getState();
    expect(state.totals).toMatchObject({ revision: 2, total: '3060', shippingTotal: '900' });
    expect(state.paymentIntent).toEqual(readyIntent);
    expect(state.error).toMatch(/total changed/);
    expect(calculateTotalsMock).not.toHaveBeenCalled();
  });

  it('sends the shopper back to shipping when the rate is gone', async () => {
    seedPaymentReady();
    useCheckoutStore.setState({ paymentIntent: readyIntent });
    createIntentMock.mockResolvedValue({
      ok: false,
      reason: 'shipping',
      message: 'That shipping method is no longer available. Choose another.',
    });

    await expect(
      useCheckoutStore.getState().preparePaymentForConfirm()
    ).rejects.toThrow(/no longer available/);

    const state = useCheckoutStore.getState();
    expect(state.session?.workflowState).toBe('shipping_selection');
    expect(state.paymentIntent).toBeNull();
  });

  it('retries a retiring attempt and returns the fresh intent', async () => {
    seedPaymentReady();
    createIntentMock
      .mockResolvedValueOnce({
        ok: false,
        reason: 'retry',
        message: 'Could not start payment. Please try again.',
        retryAfterSeconds: 0,
      })
      .mockResolvedValueOnce({ ok: true, intent: { ...readyIntent, paymentIntentId: 'pay-2' } });

    const intent = await useCheckoutStore.getState().preparePaymentForConfirm();

    expect(createIntentMock).toHaveBeenCalledTimes(2);
    expect(intent.paymentIntentId).toBe('pay-2');
    expect(useCheckoutStore.getState().paymentIntent?.paymentIntentId).toBe('pay-2');
  });
});

describe('createFromCart', () => {
  it('passes guestToken when provided', async () => {
    createSessionMock.mockResolvedValue(makeSession({ cartId: 'cart-guest' }));

    await useCheckoutStore.getState().createFromCart('cart-guest', {
      guestToken: 'guest-tok-1',
    });

    expect(createSessionMock).toHaveBeenCalledWith({
      cartId: 'cart-guest',
      guestToken: 'guest-tok-1',
    });
    expect(useCheckoutStore.getState().checkoutId).toBe('chk-1');
  });

  it('omits guestToken when absent', async () => {
    createSessionMock.mockResolvedValue(makeSession());

    await useCheckoutStore.getState().createFromCart('cart-1');

    expect(createSessionMock).toHaveBeenCalledWith({ cartId: 'cart-1' });
  });
});

describe('completeCheckout', () => {
  it('calls completeCheckoutSession server action with ids only', async () => {
    seedPaymentReady();
    useCheckoutStore.setState({
      paymentIntent: {
        clientSecret: 'pi_x_secret',
        paymentIntentId: 'pay-1',
        revision: 1,
        publishableKey: 'pk_test',
        status: 'pending',
      },
    });
    completeMock.mockResolvedValue({ ok: true, completion: {
      status: 'success',
      orderId: 'ord-1',
      paymentConfirmation: {
        paymentIntentId: 'pi_stripe_123',
        paymentStatus: 'succeeded',
        amountPaid: '2660',
        currency: 'usd',
        paymentMethod: 'card',
      },
      orderSummary: {
        orderNumber: 'ZS-100',
        itemsCount: 1,
        totalAmount: '2660',
        currency: 'usd',
      },
      completionMetadata: {},
      checkoutSessionId: 'chk-1',
      completedAt: '2026-07-01T00:00:00.000Z',
    } });

    const result = await useCheckoutStore
      .getState()
      .completeCheckout('pi_stripe_123');

    expect(completeMock).toHaveBeenCalledWith({
      checkoutId: 'chk-1',
      paymentIntentId: 'pi_stripe_123',
    });
    expect(result.orderId).toBe('ord-1');
    expect(useCheckoutStore.getState().completion?.orderSummary.orderNumber).toBe(
      'ZS-100'
    );
    expect(useCheckoutStore.getState().paymentIntent).toBeNull();
    expect(useCheckoutStore.getState().session?.workflowState).toBe('complete');
  });

  it('keeps error visible when complete fails after confirm', async () => {
    seedPaymentReady();
    completeMock.mockResolvedValue({
      ok: false,
      message:
        'This checkout session has expired. Return to your cart and try again.',
    });

    await expect(
      useCheckoutStore.getState().completeCheckout('pi_stripe_123')
    ).rejects.toThrow(/session has expired/);

    const state = useCheckoutStore.getState();
    expect(state.completion).toBeNull();
    expect(state.error).toMatch(/session has expired/);
    expect(state.isLoading).toBe(false);
  });
});
