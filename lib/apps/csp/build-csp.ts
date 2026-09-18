/**
 * Pure CSP assembly for the storefront. No node imports: this module is
 * consumed by Edge middleware as well as tests.
 *
 * Policy split (hybrid):
 * - Restricted paths (checkout, auth, payment settings) are force-dynamic and
 *   get a strict per-request nonce; app script origins are EXCLUDED there.
 * - Other routes may be statically prerendered, so their inline Next.js
 *   bootstrap scripts cannot carry a per-request nonce; they use
 *   'unsafe-inline' plus the host allowlist instead.
 */

/** Parse a CSP origins snapshot payload (shared by Edge and Node readers). */
export function parseScriptCspOrigins(payload: unknown): string[] {
  const parsed = payload as { schemaVersion?: unknown; origins?: unknown } | null;
  if (!parsed || parsed.schemaVersion !== '1' || !Array.isArray(parsed.origins)) {
    return [];
  }
  return parsed.origins.filter(
    (o): o is string => typeof o === 'string' && o.length > 0 && o !== 'self',
  );
}

export interface StorefrontCspOptions {
  /** Per-request nonce; when set, script-src uses it instead of 'unsafe-inline'. */
  nonce?: string;
  /** Verified app script origins from the committed build snapshot. */
  appScriptOrigins: string[];
  /** True on restricted paths: app script origins are excluded entirely. */
  restricted: boolean;
  /** Extra connect-src origins (core API, payments, auth). */
  connectExtra?: string[];
  /** Extra img-src origins (core API, image CDNs). */
  imgExtra?: string[];
}

function cleanOrigins(origins: string[]): string[] {
  return [...new Set(origins.filter((o) => o && o !== 'self'))];
}

export function buildScriptSrcDirective(options: StorefrontCspOptions): string {
  const appOrigins = options.restricted ? [] : cleanOrigins(options.appScriptOrigins);
  const parts = [
    "'self'",
    options.nonce ? `'nonce-${options.nonce}'` : "'unsafe-inline'",
    'https://js.stripe.com',
    ...appOrigins,
  ];
  // No 'unsafe-eval', no 'strict-dynamic' (children of remote scripts must not inherit trust).
  return `script-src ${parts.join(' ')}`;
}

export function buildStorefrontCsp(options: StorefrontCspOptions): string {
  const appOrigins = options.restricted ? [] : cleanOrigins(options.appScriptOrigins);
  const connect = ["'self'", ...cleanOrigins(options.connectExtra ?? [])];
  // No bare https:; a compromised script must not get an open beacon channel.
  const img = [
    "'self'",
    'data:',
    'blob:',
    ...cleanOrigins(options.imgExtra ?? []),
    ...appOrigins,
  ];
  return [
    "default-src 'self'",
    buildScriptSrcDirective(options),
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    `img-src ${img.join(' ')}`,
    "font-src 'self' data: https://fonts.gstatic.com",
    `connect-src ${connect.join(' ')}`,
    "frame-src 'self' https://js.stripe.com https://hooks.stripe.com",
    "object-src 'none'",
    "base-uri 'self'",
    "frame-ancestors 'self'",
    "form-action 'self'",
  ].join('; ');
}
