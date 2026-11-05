import { useEffect } from 'react';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ConfirmPaymentFn } from '@/components/checkout/CheckoutPaymentForm';

let confirmImpl: ConfirmPaymentFn;
const unmountCardForm = vi.fn();

// Stands in for the Stripe card form: hands confirm to the step and records
// unmounts (a real CardElement that unmounts mid-confirm loses the card).
function MockCardForm({
  onReady,
  savedMethodId,
}: {
  onReady?: (fn: ConfirmPaymentFn) => void;
  savedMethodId?: string | null;
}) {
  useEffect(() => {
    onReady?.((secret) => confirmImpl(secret));
    return () => unmountCardForm();
  }, [onReady]);
  return <div data-testid="card-form" data-saved-method={savedMethodId ?? ''} />;
}

vi.mock('next/dynamic', () => ({ default: () => MockCardForm }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace: vi.fn() }) }));
vi.mock('@/stores/cart-store', () => ({
  useCartStore: (selector: (s: { clearCart: () => void }) => unknown) =>
    selector({ clearCart: vi.fn() }),
}));

const checkoutState = {
  paymentIntent: {
    paymentIntentId: 'pay-1',
    clientSecret: 'pi_1_secret_x',
    publishableKey: 'pk_test_x',
  },
  completion: null,
  isLoading: false,
  error: null as string | null,
  session: null,
  ensurePaymentIntent: vi.fn(() => new Promise(() => {})),
  preparePaymentForConfirm: vi.fn(),
  completeCheckout: vi.fn(),
  clearPaymentIntent: vi.fn(),
};

vi.mock('@/stores/checkout-store', () => {
  const useCheckoutStore = (selector: (s: typeof checkoutState) => unknown) =>
    selector(checkoutState);
  useCheckoutStore.getState = () => checkoutState;
  return { useCheckoutStore };
});

import { CheckoutPaymentStep } from '@/components/checkout/CheckoutPaymentStep';
import type { SavedPaymentMethod } from '@/app/account/payment-methods/types';

const savedCard: SavedPaymentMethod = {
  id: 'vault-1',
  customerId: 'cust-1',
  provider: 'stripe',
  providerMethodId: 'pm_saved_1',
  type: 'card',
  cardBrand: 'visa',
  cardLastFour: '4242',
  cardExpMonth: 12,
  cardExpYear: 2030,
  isDefault: true,
};

describe('CheckoutPaymentStep', () => {
  // Base UI radios dispatch a PointerEvent on click; jsdom does not define one.
  beforeAll(() => {
    if (!window.PointerEvent) vi.stubGlobal('PointerEvent', MouseEvent);
  });

  beforeEach(() => {
    checkoutState.error = null;
    checkoutState.preparePaymentForConfirm.mockResolvedValue(
      checkoutState.paymentIntent
    );
  });

  it('confirms with the client secret prepared at Pay time', async () => {
    const confirm = vi.fn<ConfirmPaymentFn>(() =>
      Promise.resolve({ success: false, error: 'Your card was declined.' })
    );
    confirmImpl = confirm;
    checkoutState.preparePaymentForConfirm.mockResolvedValue({
      ...checkoutState.paymentIntent,
      clientSecret: 'pi_2_secret_y',
    });
    render(<CheckoutPaymentStep />);

    await userEvent.click(screen.getByRole('button', { name: 'Pay now' }));

    await waitFor(() => expect(confirm).toHaveBeenCalledWith('pi_2_secret_y'));
  });

  it('does not confirm when the re-price is refused', async () => {
    const confirm = vi.fn<ConfirmPaymentFn>();
    confirmImpl = confirm;
    checkoutState.preparePaymentForConfirm.mockImplementation(async () => {
      checkoutState.error = 'Your order total changed. Review the updated total and try again.';
      throw new Error(checkoutState.error);
    });
    render(<CheckoutPaymentStep />);

    await userEvent.click(screen.getByRole('button', { name: 'Pay now' }));

    await waitFor(() =>
      expect(checkoutState.preparePaymentForConfirm).toHaveBeenCalled()
    );
    expect(confirm).not.toHaveBeenCalled();
    expect(screen.getByTestId('card-form')).toBeTruthy();
  });

  it('keeps the card form mounted while the Stripe confirm is in flight', async () => {
    let settle: (r: Awaited<ReturnType<ConfirmPaymentFn>>) => void = () => {};
    confirmImpl = () => new Promise((resolve) => (settle = resolve));
    render(<CheckoutPaymentStep />);

    await userEvent.click(screen.getByRole('button', { name: 'Pay now' }));

    expect(screen.getByRole('button', { name: 'Processing...' })).toBeTruthy();
    expect(screen.getByTestId('card-form')).toBeTruthy();
    expect(unmountCardForm).not.toHaveBeenCalled();
    settle({ success: false, error: 'Your card was declined.' });
    expect(await screen.findByRole('alert')).toHaveTextContent('Your card was declined.');
  });

  it('shows the error when the Stripe confirm throws', async () => {
    confirmImpl = () => Promise.reject(new Error('Element is no longer mounted'));
    render(<CheckoutPaymentStep />);

    await userEvent.click(screen.getByRole('button', { name: 'Pay now' }));

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent('Element is no longer mounted')
    );
  });

  it('offers the saved card, preselected, and prepares the intent for it', async () => {
    confirmImpl = () => Promise.resolve({ success: false, error: 'declined' });
    render(<CheckoutPaymentStep savedCards={[savedCard]} />);

    expect(screen.getByText('Visa **** 4242')).toBeTruthy();
    expect(screen.getByText('Default')).toBeTruthy();
    expect(screen.getByText('We will charge the selected card.')).toBeTruthy();
    expect(screen.getByTestId('card-form').dataset.savedMethod).toBe('pm_saved_1');
    expect(checkoutState.ensurePaymentIntent).toHaveBeenLastCalledWith({
      savePaymentMethod: true,
    });

    await userEvent.click(screen.getByRole('button', { name: 'Pay now' }));

    await waitFor(() =>
      expect(checkoutState.preparePaymentForConfirm).toHaveBeenLastCalledWith({
        savePaymentMethod: true,
      })
    );
  });

  it('prepares a plain intent when the shopper chooses a new card', async () => {
    confirmImpl = () => Promise.resolve({ success: false, error: 'declined' });
    render(<CheckoutPaymentStep savedCards={[savedCard]} />);

    await userEvent.click(screen.getByRole('radio', { name: 'Use a new card' }));
    expect(screen.getByTestId('card-form').dataset.savedMethod).toBe('');
    expect(screen.queryByText('We will charge the selected card.')).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'Pay now' }));

    await waitFor(() =>
      expect(checkoutState.preparePaymentForConfirm).toHaveBeenLastCalledWith({
        savePaymentMethod: false,
      })
    );
  });
});
