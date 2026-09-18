import { describe, expect, it } from 'vitest';
import {
  buildGuestConfirmationHandoff,
  isGuestHandoffValidForOrder,
  isOrderOwnedByCustomer,
  resolveConfirmationOrderParam,
  shouldRedirectAwayFromConfirmation,
} from './checkout-confirmation';

describe('resolveConfirmationOrderParam', () => {
  it('uses orderSummary.orderNumber', () => {
    expect(
      resolveConfirmationOrderParam({
        orderId: 'uuid-order',
        orderSummary: {
          orderNumber: 'ORD-000042',
          itemsCount: 1,
          totalAmount: '1000',
          currency: 'usd',
        },
      })
    ).toBe('ORD-000042');
  });

  it('does not fall back to orderId UUID', () => {
    expect(
      resolveConfirmationOrderParam({
        orderId: 'uuid-order',
        orderSummary: {
          orderNumber: '  ',
          itemsCount: 1,
          totalAmount: '1000',
          currency: 'usd',
        },
      })
    ).toBeNull();
  });

  it('returns null when orderNumber is missing', () => {
    expect(
      resolveConfirmationOrderParam({
        orderId: 'uuid-order',
        orderSummary: {
          orderNumber: '',
          itemsCount: 0,
          totalAmount: '0',
          currency: 'usd',
        },
      })
    ).toBeNull();
  });
});

describe('isOrderOwnedByCustomer', () => {
  it('matches customer ids', () => {
    expect(isOrderOwnedByCustomer({ customerId: 'cust-1' }, 'cust-1')).toBe(
      true
    );
    expect(isOrderOwnedByCustomer({ customerId: 'cust-1' }, 'cust-2')).toBe(
      false
    );
  });
});

describe('shouldRedirectAwayFromConfirmation', () => {
  const ownedOrder = { customerId: 'cust-1' };

  it('redirects when order param is missing', () => {
    expect(
      shouldRedirectAwayFromConfirmation({
        orderParam: null,
        hasSession: true,
        lookupFailed: false,
        order: ownedOrder,
        customerId: 'cust-1',
      })
    ).toBe(true);
  });

  it('redirects when there is no session', () => {
    expect(
      shouldRedirectAwayFromConfirmation({
        orderParam: 'ORD-1',
        hasSession: false,
        lookupFailed: false,
        order: ownedOrder,
        customerId: null,
      })
    ).toBe(true);
  });

  it('redirects when lookup failed', () => {
    expect(
      shouldRedirectAwayFromConfirmation({
        orderParam: 'ORD-1',
        hasSession: true,
        lookupFailed: true,
        order: null,
        customerId: 'cust-1',
      })
    ).toBe(true);
  });

  it('redirects when customer does not own the order', () => {
    expect(
      shouldRedirectAwayFromConfirmation({
        orderParam: 'ORD-1',
        hasSession: true,
        lookupFailed: false,
        order: { customerId: 'other' },
        customerId: 'cust-1',
      })
    ).toBe(true);
  });

  it('allows owned order with session and valid param', () => {
    expect(
      shouldRedirectAwayFromConfirmation({
        orderParam: 'ORD-1',
        hasSession: true,
        lookupFailed: false,
        order: ownedOrder,
        customerId: 'cust-1',
      })
    ).toBe(false);
  });
});

describe('buildGuestConfirmationHandoff', () => {
  it('builds handoff from completion summary', () => {
    const handoff = buildGuestConfirmationHandoff(
      {
        orderSummary: {
          orderNumber: 'ZS-9',
          itemsCount: 2,
          totalAmount: '5000',
          currency: 'usd',
        },
        completedAt: '2026-07-01T00:00:00.000Z',
      },
      { email: 'guest@example.com' }
    );
    expect(handoff).toEqual({
      orderNumber: 'ZS-9',
      totalAmount: '5000',
      currency: 'usd',
      itemsCount: 2,
      email: 'guest@example.com',
      completedAt: '2026-07-01T00:00:00.000Z',
    });
  });

  it('returns null without order number', () => {
    expect(
      buildGuestConfirmationHandoff({
        orderSummary: {
          orderNumber: '  ',
          itemsCount: 0,
          totalAmount: '0',
          currency: 'usd',
        },
        completedAt: '2026-07-01T00:00:00.000Z',
      })
    ).toBeNull();
  });
});

describe('isGuestHandoffValidForOrder', () => {
  const handoff = {
    orderNumber: 'ZS-9',
    totalAmount: '100',
    currency: 'usd',
    itemsCount: 1,
    completedAt: '2026-07-01T00:00:00.000Z',
  };

  it('matches order param', () => {
    expect(isGuestHandoffValidForOrder(handoff, 'ZS-9')).toBe(true);
    expect(isGuestHandoffValidForOrder(handoff, 'other')).toBe(false);
    expect(isGuestHandoffValidForOrder(null, 'ZS-9')).toBe(false);
  });
});
