import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useMarketPreferenceStore } from '@/stores/market-preference-store';

describe('useMarketPreferenceStore', () => {
  beforeEach(() => {
    useMarketPreferenceStore.setState({
      marketId: null,
      countryCode: null,
      _hasHydrated: true,
    });
    vi.restoreAllMocks();
  });

  it('setMarketId clears countryCode so marketId is the sole create hint', () => {
    useMarketPreferenceStore.setState({ countryCode: 'DE' });
    useMarketPreferenceStore.getState().setMarketId('mkt-eu');
    expect(useMarketPreferenceStore.getState()).toMatchObject({
      marketId: 'mkt-eu',
      countryCode: null,
    });
  });

  it('setCountryCode normalizes to uppercase alpha-2', () => {
    useMarketPreferenceStore.getState().setCountryCode('de');
    expect(useMarketPreferenceStore.getState().countryCode).toBe('DE');
  });

  it('setCountryCode rejects invalid codes as null', () => {
    useMarketPreferenceStore.getState().setCountryCode('usa');
    expect(useMarketPreferenceStore.getState().countryCode).toBeNull();
  });

  it('seedDerivedCountryCode no-ops when preference already set', () => {
    useMarketPreferenceStore.setState({ marketId: 'mkt-1', countryCode: null });
    useMarketPreferenceStore.getState().seedDerivedCountryCode();
    expect(useMarketPreferenceStore.getState().marketId).toBe('mkt-1');
    expect(useMarketPreferenceStore.getState().countryCode).toBeNull();
  });

  it('clearMarketPreference drops both hints', () => {
    useMarketPreferenceStore.setState({
      marketId: 'mkt-eu',
      countryCode: 'DE',
    });
    useMarketPreferenceStore.getState().clearMarketPreference();
    expect(useMarketPreferenceStore.getState()).toMatchObject({
      marketId: null,
      countryCode: null,
    });
  });
});
