import 'server-only';

import { unstable_cache } from 'next/cache';
import type { PublicContentEntry, PublicModulesResponse } from '@aimee.shop/sdk';
import { sdk } from './sdk';

/**
 * Tagged public CMS entry fetch. The cache webhook expires tag `cms`, so
 * every live page body must go through this (or another `cms`-tagged cache).
 * Errors are not stored -- unstable_cache only keeps a resolved value.
 */
export const getCachedPublicContent = unstable_cache(
  async (
    collection: string,
    slug: string,
  ): Promise<PublicContentEntry> => {
    return sdk.cms.public.getContent(collection, slug);
  },
  ['cms-public-entry'],
  // Forever until the cache webhook expires tag `cms`. A numeric
  // `revalidate` stamps x-nextjs-stale-time and Vercel keeps serving STALE
  // HTML after publish.
  { revalidate: false, tags: ['cms'] },
);

/**
 * Tagged public modules-by-entity fetch (pdp-content slot). Same cms tag
 * as entries so POST /api/revalidate drops module HTML with the rest.
 */
export const getCachedModulesByEntity = unstable_cache(
  async (
    entityType: string,
    entityId: string,
  ): Promise<PublicModulesResponse> => {
    return sdk.cms.public.getModulesByEntity({ entityType, entityId });
  },
  ['cms-public-modules'],
  { revalidate: false, tags: ['cms'] },
);
