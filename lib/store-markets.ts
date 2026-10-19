import 'server-only';

import { cache } from 'react';
import { unstable_cache } from 'next/cache';
import { sdk } from './sdk';
import { config } from './config';
import type { StorefrontMarketOption } from './market-types';

/**
 * Load markets enabled for the current store (server-only).
 * Used to populate the region picker. Fail soft: empty list hides the picker
 * and cart create still works via countryCode or store default.
 */
async function loadEnabledMarkets(
  storeId: string
): Promise<StorefrontMarketOption[]> {
  try {
    const enabled = await sdk.pricing.storeMarkets.listEnabled(storeId);
    return enabled
      .filter((row) => row.isEnabled && row.market?.isActive !== false)
      .map((row) => ({
        id: row.marketId,
        name: row.market?.name ?? row.marketId,
        code: row.market?.code ?? '',
        defaultCurrency: row.market?.defaultCurrency ?? 'USD',
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  } catch {
    return [];
  }
}

const fetchEnabledMarkets =
  config.storeConfigRevalidate === 0
    ? loadEnabledMarkets
    : unstable_cache(loadEnabledMarkets, ['store-enabled-markets'], {
        revalidate: config.storeConfigRevalidate,
      });

export const getEnabledStoreMarkets = cache(
  async (): Promise<StorefrontMarketOption[]> => {
    if (!config.storeId) return [];
    return fetchEnabledMarkets(config.storeId);
  }
);
