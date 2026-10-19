import { create } from 'zustand';
import type {
  CheckoutCompletionResult,
  CheckoutSession,
  CheckoutShippingRate,
  TotalsBreakdown,
  UpdateShippingAddressDto,
} from '@aimee.shop/sdk';
import {
  completeCheckoutSession,
  prepareCheckoutPayment,
} from '@/app/checkout/actions';
import {
  isValidPaymentIntent,
  type CheckoutPaymentIntent,
} from '@/lib/checkout-payment';
import { getStorefront } from '@/lib/storefront-client';

interface CheckoutState {
  checkoutId: string | null;
  session: CheckoutSession | null;
  shippingRates: CheckoutShippingRate[] | null;
  totals: TotalsBreakdown | null;
  paymentIntent: CheckoutPaymentIntent | null;
  completion: CheckoutCompletionResult | null;
  isLoading: boolean;
  error: string | null;
  createFromCart: (
    cartId: string,
    options?: { guestToken?: string | null }
  ) => Promise<void>;
  updateShippingAddress: (address: UpdateShippingAddressDto) => Promise<void>;
  fetchShippingRates: () => Promise<void>;
  selectShippingRate: (rate: CheckoutShippingRate) => Promise<void>;
  ensurePaymentIntent: () => Promise<CheckoutPaymentIntent>;
  clearPaymentIntent: () => void;
  completeCheckout: (paymentIntentId: string) => Promise<CheckoutCompletionResult>;
  reset: () => void;
}

function toErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

/** Recommended rates first; stable relative order otherwise. */
function sortRates(rates: CheckoutShippingRate[]): CheckoutShippingRate[] {
  return [...rates].sort((a, b) => {
    if (a.isRecommended === b.isRecommended) return 0;
    return a.isRecommended ? -1 : 1;
  });
}

const initialState = {
  checkoutId: null as string | null,
  session: null as CheckoutSession | null,
  shippingRates: null as CheckoutShippingRate[] | null,
  totals: null as TotalsBreakdown | null,
  paymentIntent: null as CheckoutPaymentIntent | null,
  completion: null as CheckoutCompletionResult | null,
  isLoading: false,
  error: null as string | null,
};

/** Refetch totals after a stale-total refusal; failures keep the old totals. */
async function refreshTotals(checkoutId: string): Promise<void> {
  try {
    const totals = await getStorefront().checkout.calculateTotals(checkoutId, {
      includeShipping: true,
      includeTax: true,
    });
    useCheckoutStore.setState({ totals });
  } catch {
    // The payment error below still tells the shopper to review the total.
  }
}

/** In-flight ensurePaymentIntent so concurrent calls share one create. */
let ensurePaymentIntentInFlight: Promise<CheckoutPaymentIntent> | null = null;

export const useCheckoutStore = create<CheckoutState>()((set, get) => ({
  ...initialState,

  createFromCart: async (cartId, options) => {
    const existing = get();
    // Reuse an in-memory session for the same cart (e.g. Strict Mode remount).
    if (existing.checkoutId && existing.session?.cartId === cartId) {
      return;
    }

    set({ isLoading: true, error: null });
    try {
      const guestToken = options?.guestToken?.trim() || undefined;
      const session = await getStorefront().checkout.create({
        cartId,
        ...(guestToken ? { guestToken } : {}),
      });
      set({
        checkoutId: session.id,
        session,
        shippingRates: null,
        totals: null,
        paymentIntent: null,
        completion: null,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      set({
        isLoading: false,
        error: toErrorMessage(error, 'Could not start checkout. Please try again.'),
      });
      throw error;
    }
  },

  updateShippingAddress: async (address) => {
    const { checkoutId } = get();
    if (!checkoutId) {
      throw new Error('No checkout session');
    }

    set({ isLoading: true, error: null });
    try {
      const session = await getStorefront().checkout.updateShippingAddress(
        checkoutId,
        address
      );
      set({
        session,
        shippingRates: null,
        totals: null,
        paymentIntent: null,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      set({
        isLoading: false,
        error: toErrorMessage(
          error,
          'Could not save shipping address. Please try again.'
        ),
      });
      throw error;
    }
  },

  fetchShippingRates: async () => {
    const { checkoutId } = get();
    if (!checkoutId) {
      throw new Error('No checkout session');
    }

    // Address is already on the session from updateShippingAddress.
    // SDK GetShippingRatesOptions.shippingAddress is not serialized on the wire.
    set({ isLoading: true, error: null, shippingRates: null });
    try {
      const rates = await getStorefront().checkout.getShippingRates(checkoutId);
      set({
        shippingRates: sortRates(rates),
        isLoading: false,
        error: null,
      });
    } catch (error) {
      set({
        isLoading: false,
        shippingRates: null,
        error: toErrorMessage(
          error,
          'Could not load shipping options. Please try again.'
        ),
      });
      throw error;
    }
  },

  selectShippingRate: async (rate) => {
    const { checkoutId } = get();
    if (!checkoutId) {
      throw new Error('No checkout session');
    }

    set({ isLoading: true, error: null });
    const checkout = getStorefront().checkout;

    let session;
    try {
      session = await checkout.selectShippingMethod(checkoutId, {
        shippingMethod: rate.name,
        shippingRateId: rate.id,
      });
    } catch (error) {
      set({
        isLoading: false,
        error: toErrorMessage(
          error,
          'Could not select shipping method. Please try again.'
        ),
      });
      throw error;
    }

    // Method is selected server-side; keep session even if totals fail.
    set({ session, paymentIntent: null });

    try {
      const totals = await checkout.calculateTotals(checkoutId, {
        includeShipping: true,
        includeTax: true,
      });
      set({
        totals,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      set({
        isLoading: false,
        error: toErrorMessage(
          error,
          'Shipping saved, but totals could not be updated. Please try again.'
        ),
      });
      throw error;
    }
  },

  ensurePaymentIntent: async () => {
    const { checkoutId, session, paymentIntent } = get();
    if (!checkoutId || !session) {
      throw new Error('No checkout session');
    }

    if (
      isValidPaymentIntent(paymentIntent) &&
      paymentIntent.revision === (get().totals?.revision ?? session.revision)
    ) {
      return paymentIntent;
    }

    if (ensurePaymentIntentInFlight) {
      return ensurePaymentIntentInFlight;
    }

    set({ isLoading: true, error: null });
    ensurePaymentIntentInFlight = (async () => {
      try {
        // The platform prices the session; the client only names the revision
        // of the total the shopper accepted.
        const revision = get().totals?.revision ?? session.revision;
        const result = await prepareCheckoutPayment({ checkoutId, revision });
        if (!result.ok) {
          if (result.stale) {
            // Total moved under the shopper: show the new one before retrying.
            await refreshTotals(checkoutId);
          }
          throw new Error(result.message);
        }
        const intent = result.intent;
        set({
          paymentIntent: intent,
          isLoading: false,
          error: null,
        });
        return intent;
      } catch (error) {
        set({
          isLoading: false,
          paymentIntent: null,
          error: toErrorMessage(
            error,
            'Could not start payment. Please try again.'
          ),
        });
        throw error;
      } finally {
        ensurePaymentIntentInFlight = null;
      }
    })();

    return ensurePaymentIntentInFlight;
  },

  clearPaymentIntent: () => set({ paymentIntent: null }),

  completeCheckout: async (paymentIntentId) => {
    const { checkoutId } = get();
    if (!checkoutId) {
      throw new Error('No checkout session');
    }
    if (!paymentIntentId) {
      throw new Error('Missing payment confirmation');
    }

    set({ isLoading: true, error: null });
    try {
      // Server action (sk) -- checkout:complete is not on the pk ceiling.
      const completion = await completeCheckoutSession({
        checkoutId,
        paymentIntentId,
      });
      const currentSession = get().session;
      set({
        completion,
        paymentIntent: null,
        isLoading: false,
        error: null,
        // Reflect completed workflow when API does not return a full session.
        session: currentSession
          ? {
              ...currentSession,
              status: 'complete',
              workflowState: 'complete',
              completedOrderId: completion.orderId,
              paymentIntentId,
            }
          : null,
      });
      return completion;
    } catch (error) {
      set({
        isLoading: false,
        error: toErrorMessage(
          error,
          'Payment succeeded but order completion failed. Please contact support.'
        ),
      });
      throw error;
    }
  },

  reset: () => set({ ...initialState }),
}));
