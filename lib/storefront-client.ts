import { createStorefrontClient, type AimeeStorefrontClient } from '@aimee.shop/sdk/storefront';

// Client-side counterpart to lib/sdk.ts. No lib/config.ts here -- that module is
// server-only; NEXT_PUBLIC_ vars are inlined into the browser bundle at build time.
//
// Lazily created on first use: components that import this module (via the cart
// store) are also server-rendered during prerender, where the factory would throw
// on a missing/invalid publishable key. Cart actions only run in the browser.
let client: AimeeStorefrontClient | undefined;

export function getStorefront(): AimeeStorefrontClient {
  if (!client) {
    const publishableKey = process.env.NEXT_PUBLIC_AIMEE_PUBLISHABLE_KEY;
    if (!publishableKey) {
      throw new Error(
        'NEXT_PUBLIC_AIMEE_PUBLISHABLE_KEY is not set. Create a publishable (pk_) key in the admin under Settings > API Keys and add it to .env.local.'
      );
    }
    client = createStorefrontClient({
      publishableKey,
      storeId: process.env.NEXT_PUBLIC_STORE_ID,
      baseUrl: process.env.NEXT_PUBLIC_CORE_API_URL,
    });
  }
  return client;
}
