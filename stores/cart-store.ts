import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { NotFoundError } from '@aimee.shop/sdk/storefront';
// Type-only import (erased at build): the /storefront entry re-exports error
// classes but not the resource types, which live on the main entry.
import type { Cart } from '@aimee.shop/sdk';
import { getStorefront } from '@/lib/storefront-client';
import {
  buildCreateCartDto,
  isMarketCreateError,
} from '@/lib/market-context';
import { useMarketPreferenceStore } from '@/stores/market-preference-store';

const MARKET_PREFERENCE_HYDRATE_MS = 1_000;

/**
 * Resolve after market preference localStorage rehydrate (or immediately if done).
 * Caps wait so cart create cannot hang if onRehydrateStorage never fires
 * (storage failure / edge environments).
 */
function waitForMarketPreferenceHydration(): Promise<void> {
  if (useMarketPreferenceStore.getState()._hasHydrated) {
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    let settled = false;
    const timer = setTimeout(() => finish(), MARKET_PREFERENCE_HYDRATE_MS);

    const finish = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      unsub();
      if (!useMarketPreferenceStore.getState()._hasHydrated) {
        useMarketPreferenceStore.getState().setHasHydrated(true);
      }
      resolve();
    };

    const unsub = useMarketPreferenceStore.subscribe((state) => {
      if (state._hasHydrated) finish();
    });
    // Race: rehydrate may have completed between the check and subscribe.
    if (useMarketPreferenceStore.getState()._hasHydrated) {
      finish();
    }
  });
}

// Refresh is intentionally separate from the mutation lock: callers may ask
// for revalidation from both hydration and the cart page, but only one SDK GET
// should be in flight. A monotonic mutation revision prevents a refresh that
// started against older server state from overwriting a later mutation result.
let refreshRequest:
  | { id: number; cartId: string; mutationRevision: number; promise: Promise<void> }
  | null = null;
let nextRefreshRequestId = 0;
let mutationRevision = 0;
let nextMutationId = 0;
let activeMutationId: number | null = null;

// Test-only: resets module-level concurrency bookkeeping between tests.
export function resetCartStoreInternals() {
  refreshRequest = null;
  nextRefreshRequestId = 0;
  mutationRevision = 0;
  nextMutationId = 0;
  activeMutationId = null;
}

interface CartState {
  cartId: string | null;
  cart: Cart | null;
  isLoading: boolean;
  _hasHydrated: boolean;
  setHasHydrated: (hydrated: boolean) => void;
  addItem: (productId: string, productVariantId: string, quantity: number) => Promise<void>;
  updateItem: (itemId: string, quantity: number) => Promise<void>;
  removeItem: (itemId: string) => Promise<void>;
  refreshCart: () => Promise<void>;
  /** Drop local cart after successful checkout (persist clears localStorage). */
  clearCart: () => void;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      cartId: null,
      cart: null,
      isLoading: false,
      _hasHydrated: false,

      setHasHydrated: (hydrated) => set({ _hasHydrated: hydrated }),

      addItem: async (productId, productVariantId, quantity) => {
        // Share the mutation lock with update/remove so concurrent actions
        // cannot clobber optimistic snapshots or reconciled carts.
        if (get().isLoading) {
          throw new Error('Cart mutation already in progress');
        }
        mutationRevision += 1;
        const mutationId = ++nextMutationId;
        activeMutationId = mutationId;
        set({ isLoading: true });
        let activeCartId: string | null = null;
        try {
          let { cartId } = get();
          if (!cartId) {
            // The isLoading lock above serializes addItem calls, so the create
            // request never needs to be shared with a concurrent caller.
            // Market context: marketId (picker) or countryCode (geo/locale);
            // empty body keeps store default market.
            // Wait for market preference rehydrate so we do not create against
            // the store default while localStorage still holds a marketId.
            await waitForMarketPreferenceHydration();
            const pref = useMarketPreferenceStore.getState();
            if (!pref.marketId && !pref.countryCode) {
              useMarketPreferenceStore.getState().seedDerivedCountryCode();
            }
            const snapshot = useMarketPreferenceStore.getState();
            const createDto = buildCreateCartDto({
              marketId: snapshot.marketId,
              countryCode: snapshot.countryCode,
            });
            let created: Cart;
            try {
              created = await getStorefront().carts.create(createDto);
            } catch (error) {
              // Only market-resolution codes clear preference; unrelated 400s
              // (bad variant, qty) must not wipe the user's region selection.
              if (!isMarketCreateError(error)) {
                throw error;
              }
              // Bad market hint: drop preference and fall back once to store default.
              useMarketPreferenceStore.getState().clearMarketPreference();
              created = await getStorefront().carts.create({});
            }
            cartId = created.id;
            if (get().cartId === null) {
              set({ cartId, cart: created });
            } else if (get().cartId !== cartId) {
              return;
            }
          }
          activeCartId = cartId;
          const cart = await getStorefront().carts.addItem(cartId, {
            productId,
            productVariantId,
            quantity,
          });
          if (get().cartId === cartId) {
            set({ cart });
          }
        } catch (error) {
          // A mutation 404 may refer to a concurrently removed line rather
          // than the cart. Revalidate the cart resource before clearing it.
          if (!activeCartId || get().cartId === activeCartId) {
            // Release the mutation lock before revalidation. A refresh from
            // before this mutation has an older revision and will not be reused.
            if (activeMutationId === mutationId) {
              activeMutationId = null;
              set({ isLoading: false });
            }
            try {
              await get().refreshCart();
            } catch {
              // Preserve the mutation error and the last known snapshot offline.
            }
          }
          throw error;
        } finally {
          if (activeMutationId === mutationId) {
            activeMutationId = null;
            set({ isLoading: false });
          }
        }
      },

      updateItem: async (itemId, quantity) => {
        const { cartId, cart, isLoading } = get();
        if (!cartId || !cart) return;
        // Serialize mutations so overlapping row actions cannot corrupt rollback.
        if (isLoading) {
          throw new Error('Cart mutation already in progress');
        }

        mutationRevision += 1;
        const mutationId = ++nextMutationId;
        activeMutationId = mutationId;
        const snapshot = cart;
        // Optimistic UX: patch quantity only. Never invent money/totals.
        set({
          isLoading: true,
          cart: {
            ...cart,
            items: cart.items.map((item) =>
              item.id === itemId ? { ...item, quantity } : item
            ),
          },
        });

        try {
          const next = await getStorefront().carts.updateItem(cartId, itemId, { quantity });
          if (get().cartId === cartId) {
            set({ cart: next });
          }
        } catch (error) {
          if (get().cartId === cartId) {
            // Single await since the lock was taken, so this mutation still
            // owns it here. Release before revalidating.
            activeMutationId = null;
            set({ cart: snapshot, isLoading: false });
            try {
              await get().refreshCart();
            } catch {
              // Preserve the mutation error and optimistic rollback offline.
            }
          }
          throw error;
        } finally {
          if (activeMutationId === mutationId) {
            activeMutationId = null;
            set({ isLoading: false });
          }
        }
      },

      removeItem: async (itemId) => {
        const { cartId, cart, isLoading } = get();
        if (!cartId || !cart) return;
        if (isLoading) {
          throw new Error('Cart mutation already in progress');
        }

        mutationRevision += 1;
        const mutationId = ++nextMutationId;
        activeMutationId = mutationId;
        const snapshot = cart;
        // Optimistic UX: drop the line locally. Totals stay server-authoritative.
        set({
          isLoading: true,
          cart: {
            ...cart,
            items: cart.items.filter((item) => item.id !== itemId),
          },
        });

        try {
          const next = await getStorefront().carts.removeItem(cartId, itemId);
          if (get().cartId === cartId) {
            set({ cart: next });
          }
        } catch (error) {
          if (get().cartId === cartId) {
            // Single await since the lock was taken, so this mutation still
            // owns it here. Release before revalidating.
            activeMutationId = null;
            set({ cart: snapshot, isLoading: false });
            try {
              await get().refreshCart();
            } catch {
              // Preserve the mutation error and optimistic rollback offline.
            }
          }
          throw error;
        } finally {
          if (activeMutationId === mutationId) {
            activeMutationId = null;
            set({ isLoading: false });
          }
        }
      },

      clearCart: () => {
        // Invalidate in-flight refresh so a late GET cannot resurrect the cart.
        mutationRevision += 1;
        refreshRequest = null;
        set({ cartId: null, cart: null, isLoading: false });
      },

      refreshCart: async () => {
        const { cartId, isLoading } = get();
        // A successful mutation returns the authoritative cart, so a refresh
        // during that mutation is both redundant and capable of reading stale
        // server state. A refresh already in flight is invalidated below when
        // the mutation increments mutationRevision.
        if (!cartId || isLoading) return;
        if (
          refreshRequest?.cartId === cartId &&
          refreshRequest.mutationRevision === mutationRevision
        ) {
          return refreshRequest.promise;
        }

        const refreshCartId = cartId;
        const refreshRevision = mutationRevision;
        const refreshId = ++nextRefreshRequestId;
        const request = (async () => {
          try {
            const cart = await getStorefront().carts.get(refreshCartId);
            if (
              refreshRequest?.id === refreshId &&
              mutationRevision === refreshRevision &&
              get().cartId === refreshCartId
            ) {
              set({ cart });
            }
          } catch (error) {
            // Expired, converted, or deleted server-side: start fresh, but
            // only if no mutation or cart replacement happened meanwhile.
            if (error instanceof NotFoundError) {
              if (
                refreshRequest?.id === refreshId &&
                mutationRevision === refreshRevision &&
                get().cartId === refreshCartId
              ) {
                set({ cartId: null, cart: null });
              }
              return;
            }
            throw error;
          }
        })();
        refreshRequest = {
          id: refreshId,
          cartId: refreshCartId,
          mutationRevision: refreshRevision,
          promise: request,
        };
        try {
          await request;
        } finally {
          if (refreshRequest?.id === refreshId) {
            refreshRequest = null;
          }
        }
      },
    }),
    {
      name: 'aimee-cart',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ cartId: state.cartId, cart: state.cart }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
        // Revalidate the persisted cart against the server (prices, expiry)
        if (state?.cartId) {
          void state.refreshCart().catch(() => {
            // Keep the persisted snapshot if revalidation fails (e.g. offline)
          });
        }
      },
    }
  )
);
