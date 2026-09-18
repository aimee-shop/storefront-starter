/**
 * Sandbox/preview deployments must not be indexed. Production merchant
 * storefronts keep the default allow-list (account and /dev stay out).
 *
 * NEXT_PUBLIC_NOINDEX=true always noindexes.
 * NEXT_PUBLIC_AIMEE_ENV, when set to anything other than production/prod,
 * also noindexes. Unset env keeps production indexing so a live merchant
 * store is not noindexed by accident; sandbox Vercel must set NOINDEX.
 */

export type RobotsEnv = {
  NEXT_PUBLIC_NOINDEX?: string;
  NEXT_PUBLIC_AIMEE_ENV?: string;
};

function truthy(value: string | undefined): boolean {
  if (!value) return false;
  const v = value.trim().toLowerCase();
  return v === 'true' || v === '1' || v === 'yes';
}

export function isSandboxNoindex(
  env: RobotsEnv | NodeJS.Dict<string> = process.env,
): boolean {
  if (truthy(env.NEXT_PUBLIC_NOINDEX)) return true;
  const aimeeEnv = env.NEXT_PUBLIC_AIMEE_ENV?.trim().toLowerCase();
  if (!aimeeEnv) return false;
  return aimeeEnv !== 'production' && aimeeEnv !== 'prod';
}

export type RobotsConfig = {
  rules: { userAgent: string; allow?: string; disallow?: string | string[] };
  sitemap?: string;
};

export function buildRobots(
  siteUrl: string,
  env: RobotsEnv | NodeJS.Dict<string> = process.env,
): RobotsConfig {
  if (isSandboxNoindex(env)) {
    return { rules: { userAgent: '*', disallow: '/' } };
  }
  return {
    rules: { userAgent: '*', allow: '/', disallow: ['/account', '/dev'] },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
