import 'server-only';

import { AimeeSDK } from '@aimee.shop/sdk';
import { config } from './config';

/**
 * Build a request-scoped SDK instance bound to a customer access token.
 *
 * Sends the API key (`x-api-key`) AND the customer JWT (`Authorization:
 * Bearer`) on every request -- the same header pair
 * `sdk.storefront.withCustomer(token)` produces, applied SDK-wide.
 *
 * The JWT is injected via the `onRequest` hook, NOT `getAccessToken`: the
 * SDK's AuthChain uses the FIRST authenticator that yields headers (no
 * merging), so a token getter would silently replace `x-api-key` instead of
 * accompanying it. `onRequest` runs after auth headers are applied, so both
 * survive.
 *
 * PLATFORM GAP: `sdk.storefront.withCustomer(token)` exposes `.auth` and
 * `.orders` only. Customer-scoped address CRUD still uses this dual-header
 * `customers.*` client (storefront issue #6). Prefer
 * `withCustomer(token).orders.*` / a future `.customers` surface when those
 * land; do not hand-roll fetch.
 *
 * Never store the returned instance beyond the current request: it carries
 * the customer's token, and sharing it across requests would leak sessions.
 */
export function customerSdk(accessToken: string): AimeeSDK {
  return new AimeeSDK({
    apiKey: config.apiKey,
    coreApiUrl: config.coreApiUrl,
    storeId: config.storeId,
    debug: config.isDev,
    onRequest: (requestConfig) => {
      requestConfig.headers = {
        ...requestConfig.headers,
        Authorization: `Bearer ${accessToken}`,
      };
      return requestConfig;
    },
  });
}
