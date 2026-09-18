import 'server-only';

import { cache } from 'react';
import { unstable_cache } from 'next/cache';
import type { ThemeSettings } from '@aimee.shop/sdk';
import { sdk } from './sdk';
import { config } from './config';
import {
  FALLBACK_STORE_NAME,
  resolveTheme,
  type StorefrontTheme,
} from './theme';
import { readGuestCheckout } from './guest-checkout';

/**
 * Store configuration module (storefront-theming-spec.md section 6).
 *
 * Owns fetching store identity + theme settings from the platform. This file
 * is server-only (via lib/config.ts); pure theme resolution and CSS
 * generation live in lib/theme.ts, which client components may import.
 */

export interface StoreConfig {
  storeName: string;
  theme: ThemeSettings;
  /** When false, guests must sign in before checkout (core-api features.checkout.guestCheckout). */
  guestCheckout: boolean;
}

const FALLBACK_STORE_CONFIG: StoreConfig = {
  storeName: FALLBACK_STORE_NAME,
  theme: {},
  guestCheckout: true,
};

/**
 * Load store identity + theme + checkout feature flags from the platform.
 * Throws when BOTH sources fail so an outage is not cached as empty config.
 */
async function loadStoreConfig(storeId: string): Promise<StoreConfig> {
  const [mergedResult, storeResult] = await Promise.allSettled([
    sdk.stores.configuration.getMerged(storeId),
    sdk.stores.getDefault(),
  ]);

  if (mergedResult.status === 'rejected' && storeResult.status === 'rejected') {
    throw mergedResult.reason;
  }

  const theme =
    mergedResult.status === 'fulfilled'
      ? (mergedResult.value.themeSettings ?? {})
      : {};

  const guestCheckout =
    mergedResult.status === 'fulfilled'
      ? readGuestCheckout(mergedResult.value.features)
      : true;

  // Store name resolution chain per the theming spec:
  // themeSettings.branding.storeName -> store.name -> 'Acme Store'
  const storeName =
    theme.branding?.storeName ??
    (storeResult.status === 'fulfilled' ? storeResult.value.name : undefined) ??
    FALLBACK_STORE_NAME;

  return { storeName, theme, guestCheckout };
}

/**
 * Cross-request cached fetch (Next.js data cache, 300s revalidate per the
 * theming spec). Skipped when config.storeConfigRevalidate is 0 (e2e).
 */
const fetchStoreConfig =
  config.storeConfigRevalidate === 0
    ? loadStoreConfig
    : unstable_cache(loadStoreConfig, ['store-config'], {
        revalidate: config.storeConfigRevalidate,
        tags: ['cms', 'store-config'],
      });

/**
 * Fetch the store's configuration (identity + theme settings).
 *
 * Per-request deduplicated via React cache() on top of the 300s data cache,
 * so generateMetadata and the layout share one lookup. Never throws: the root
 * layout must always render (the error boundary depends on it), so failures
 * fall back to the default config.
 */
export const getStoreConfig = cache(async (): Promise<StoreConfig> => {
  if (!config.storeId) return FALLBACK_STORE_CONFIG;

  try {
    return await fetchStoreConfig(config.storeId);
  } catch {
    return FALLBACK_STORE_CONFIG;
  }
});

/**
 * Fetch and resolve the storefront theme.
 *
 * Composes getStoreConfig (300s data cache + per-request dedup) with the pure
 * resolution in lib/theme.ts and applies the resolved store name. Never
 * throws; falls back to default theme values when the platform is
 * unreachable or no theme is configured.
 */
export async function getStorefrontTheme(): Promise<StorefrontTheme> {
  const { storeName, theme } = await getStoreConfig();
  const resolved = resolveTheme(theme);
  return {
    ...resolved,
    branding: { ...resolved.branding, storeName },
  };
}
