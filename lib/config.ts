import 'server-only';

/**
 * Central environment configuration for the storefront.
 *
 * All process.env access lives here. The `server-only` import makes importing
 * this module from client code a build-time error, so AIMEE_API_KEY can never
 * leak into a browser bundle.
 *
 * Values are intentionally optional: the storefront renders with fallbacks
 * when unconfigured (default theme, empty content) rather than failing fast.
 */
// Guard against a malformed NEXT_PUBLIC_SITE_URL (e.g. missing protocol):
// layout.tsx passes siteUrl to new URL() on every request, so an invalid
// value must degrade to the fallback, not throw site-wide.
const rawSiteUrl = process.env.NEXT_PUBLIC_SITE_URL;
if (rawSiteUrl && !URL.canParse(rawSiteUrl)) {
  console.error(
    `[storefront] NEXT_PUBLIC_SITE_URL is not a valid URL: "${rawSiteUrl}" -- falling back to http://localhost:3010`
  );
}

/**
 * Resolve absolute site origin for metadata/canonicals.
 * Local defaults stay on http://; non-local hosts forced to https so
 * metadata never advertises http://store-dev.example style origins.
 */
function resolveSiteUrl(raw: string | undefined): string {
  if (!raw || !URL.canParse(raw)) {
    return 'http://localhost:3010';
  }
  const url = new URL(raw);
  const host = url.hostname;
  // URL.hostname for IPv6 is bare `::1` (no brackets).
  const isLocal =
    host === 'localhost' || host === '127.0.0.1' || host === '::1';
  if (!isLocal && url.protocol === 'http:') {
    url.protocol = 'https:';
    console.warn(
      `[storefront] NEXT_PUBLIC_SITE_URL used http for public host "${host}" -- upgrading to https`
    );
  }
  // Origin only (no path/query) -- metadataBase expects a site root.
  return url.origin;
}

function parseStoreConfigRevalidate(): number {
  const raw = process.env.STORE_CONFIG_REVALIDATE;
  if (raw === undefined || raw === '') return 300;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? n : 300;
}

export const config = Object.freeze({
  /** Core API base URL. Non-secret; the NEXT_PUBLIC_ form is also used client-side. */
  coreApiUrl: process.env.NEXT_PUBLIC_CORE_API_URL,
  /** Store ID identifying this storefront's store context. Non-secret. */
  storeId: process.env.NEXT_PUBLIC_STORE_ID,
  /** API key with the "Storefront (Default)" role. Server-only secret. */
  apiKey: process.env.AIMEE_API_KEY,
  /** Absolute site origin for sitemap/robots/canonical URLs. Non-secret. */
  siteUrl: resolveSiteUrl(rawSiteUrl),
  /**
   * Next.js data-cache revalidate seconds for store config (theme + flags).
   * Default 300 (theming spec). E2E sets 0 so mock flag flips apply immediately.
   */
  storeConfigRevalidate: parseStoreConfigRevalidate(),
  isDev: process.env.NODE_ENV === 'development',
  /** Sandbox/preview noindex flag. Non-secret. */
  noindexFlag: process.env.NEXT_PUBLIC_NOINDEX,
  /** Aimee environment label (local/sandbox/production). Non-secret. */
  aimeeEnv: process.env.NEXT_PUBLIC_AIMEE_ENV,
});
