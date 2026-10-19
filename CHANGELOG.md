# Changelog

## Unreleased

- next.config.ts: ship `images.remotePatterns` for the Aimee asset CDN (assets-dev / assets-staging / assets .aimee.shop) so platform media renders with zero config. Storefronts that added a per-env bucket pattern can drop it.
- Checkout: country is a native select and US/CA state is a select; the shipping payload sends ISO-2 `country`/`state` plus `countryName`/`stateName` (lib/address-codes.ts).
- Blocks: product ids for product_card / product_grid are collected with `collectBlockProductIds` from `@aimee.shop/blocks`, so products nested in columns/container blocks resolve.
- Removed the dead `StorefrontMarketOption` re-export from lib/store-markets.ts.
