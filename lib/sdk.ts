import { AimeeSDK } from '@aimee.shop/sdk';
import { config } from './config';

/**
 * Server-side SDK instance for storefront data fetching.
 *
 * Authenticates via API key (assigned the "Storefront (Default)" RBAC role).
 * Used in React Server Components and server actions for fetching products,
 * CMS content, categories, etc.
 *
 * For client-side customer-authenticated operations (cart, checkout),
 * use getStorefront() from lib/storefront-client.ts
 * (@aimee.shop/sdk/storefront + createStorefrontClient).
 */
export const sdk = new AimeeSDK({
  apiKey: config.apiKey,
  coreApiUrl: config.coreApiUrl,
  storeId: config.storeId,
  debug: config.isDev,
});
