import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { normalizeCountryCode } from '@/lib/geo-country';
import { resolveDerivedCountryCode } from '@/lib/market-context';

interface MarketPreferenceState {
  marketId: string | null;
  countryCode: string | null;
  /** True after localStorage rehydrate completes. */
  _hasHydrated: boolean;
  setHasHydrated: (hydrated: boolean) => void;
  /**
   * Explicit region picker selection. Clears countryCode so marketId is the
   * sole create hint. Caller must clear the cart (market is immutable).
   */
  setMarketId: (marketId: string | null) => void;
  /**
   * Soft country hint (geo/locale or country-style override). Does not clear
   * an explicit marketId.
   */
  setCountryCode: (countryCode: string | null) => void;
  /**
   * Seed countryCode once from geo cookie / locale when nothing is stored yet.
   * Safe to call on every hydrate; no-ops when preference already exists.
   */
  seedDerivedCountryCode: () => void;
  /** Drop bad market selection after MARKET_* create errors. */
  clearMarketPreference: () => void;
}

export const useMarketPreferenceStore = create<MarketPreferenceState>()(
  persist(
    (set, get) => ({
      marketId: null,
      countryCode: null,
      _hasHydrated: false,

      setHasHydrated: (hydrated) => set({ _hasHydrated: hydrated }),

      setMarketId: (marketId) => {
        set({
          marketId: marketId || null,
          // Explicit market wins; drop country so create payload is unambiguous.
          countryCode: marketId ? null : get().countryCode,
        });
      },

      setCountryCode: (countryCode) => {
        set({ countryCode: normalizeCountryCode(countryCode) });
      },

      seedDerivedCountryCode: () => {
        const { marketId, countryCode } = get();
        if (marketId || countryCode) return;
        const derived = resolveDerivedCountryCode();
        if (derived) set({ countryCode: derived });
      },

      clearMarketPreference: () => {
        set({ marketId: null, countryCode: null });
      },
    }),
    {
      name: 'aimee-market',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        marketId: state.marketId,
        countryCode: state.countryCode,
      }),
      onRehydrateStorage: () => (state) => {
        // Prefer the rehydrated state handle (matches cart-store). Calling
        // getState().set during finish has hung cart create in e2e before.
        state?.setHasHydrated(true);
        state?.seedDerivedCountryCode();
      },
    }
  )
);
