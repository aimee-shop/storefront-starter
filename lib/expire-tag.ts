import { revalidateTag } from 'next/cache';

/**
 * Next 16.2.6 types require a profile. No-profile is the documented
 * no-lifetime delete path (deprecated but supported). Vercel cache-status
 * docs: deletion requires revalidateTag without a lifetime. `{ expire: 0 }`
 * is immediate in Next source but unproven on Vercel (profile presence may
 * map to tag invalidation / SWR).
 */
export function expireTagNow(tag: string): void {
  const revalidateWithoutProfile = revalidateTag as (tag: string) => undefined;
  revalidateWithoutProfile(tag);
}
