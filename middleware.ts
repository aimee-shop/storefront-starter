import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import cspOriginsSnapshot from '@/lib/apps/csp/app-script-origins.generated.json';
import { buildStorefrontCsp, parseScriptCspOrigins } from '@/lib/apps/csp/build-csp';
import {
  isRestrictedPath,
  resolveRestrictedPathPrefixes,
} from '@/lib/apps/scripts/verify/page-scope';
import { GEO_COUNTRY_COOKIE, normalizeCountryCode } from '@/lib/geo-country';

/**
 * Per-request CSP with nonce. Edge-safe: app script origins come from a
 * committed build snapshot (static import), never node:fs.
 *
 * Restricted paths (checkout, auth, payment settings) are force-dynamic and
 * get a strict nonce'd script-src with app script origins excluded. Other
 * routes may be statically prerendered, so they use 'unsafe-inline' + host
 * allowlist (a per-request nonce cannot be attached to prerendered inline
 * bootstrap scripts).
 *
 * The CSP is set on the REQUEST headers as well: that is how the Next.js
 * App Router extracts the nonce and applies it to its own inline scripts on
 * dynamically rendered routes.
 */

// Env is read directly here (not via lib/config.ts): the Edge runtime cannot
// import the 'server-only' config module. Only NEXT_PUBLIC_* and the
// APPS_EXTRA_RESTRICTED_PATH_PREFIXES list are consumed -- no secrets.
function originOf(value: string | undefined): string | null {
  if (!value) return null;
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

function connectExtra(): string[] {
  const extra = new Set<string>(['https://api.stripe.com', 'https://js.stripe.com']);
  const api = originOf(process.env.NEXT_PUBLIC_CORE_API_URL);
  if (api) extra.add(api);
  // Customer auth calls the regional Cognito IDP endpoint directly.
  const region = process.env.NEXT_PUBLIC_AIMEE_COGNITO_USER_POOL_ID?.split('_')[0];
  if (region && /^[a-z]{2}-[a-z]+-\d$/.test(region)) {
    extra.add(`https://cognito-idp.${region}.amazonaws.com`);
  }
  return [...extra];
}

function imgExtra(): string[] {
  const extra = new Set<string>();
  const api = originOf(process.env.NEXT_PUBLIC_CORE_API_URL);
  if (api) extra.add(api);
  for (const entry of (process.env.NEXT_PUBLIC_IMAGE_ORIGINS ?? '').split(',')) {
    const origin = originOf(entry.trim() || undefined);
    if (origin?.startsWith('https://')) extra.add(origin);
  }
  return [...extra];
}

const APP_SCRIPT_ORIGINS = parseScriptCspOrigins(cspOriginsSnapshot);
const RESTRICTED_PREFIXES = resolveRestrictedPathPrefixes(
  process.env.APPS_EXTRA_RESTRICTED_PATH_PREFIXES,
);
const CONNECT_EXTRA = connectExtra();
const IMG_EXTRA = imgExtra();

export function middleware(request: NextRequest) {
  const restricted = isRestrictedPath(
    request.nextUrl.pathname,
    RESTRICTED_PREFIXES,
  );
  const nonce = restricted ? btoa(crypto.randomUUID()) : undefined;
  const csp = buildStorefrontCsp({
    nonce,
    appScriptOrigins: APP_SCRIPT_ORIGINS,
    restricted,
    connectExtra: CONNECT_EXTRA,
    imgExtra: IMG_EXTRA,
  });

  const requestHeaders = new Headers(request.headers);
  // CSP (with nonce) on request headers is how the App Router extracts the
  // nonce for its own inline scripts -- no separate x-nonce header.
  requestHeaders.set('content-security-policy', csp);

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });
  response.headers.set('Content-Security-Policy', csp);
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('X-Frame-Options', 'SAMEORIGIN');

  // Geo country for cart market resolution (Vercel / Cloudflare edge headers).
  // Client reads this cookie when no explicit market picker selection exists.
  const geoRaw =
    request.headers.get('x-vercel-ip-country') ??
    request.headers.get('cf-ipcountry');
  const geoCountry = normalizeCountryCode(geoRaw);
  // Skip edge placeholders: XX = unknown, T1 = Tor exit.
  if (geoCountry && geoCountry !== 'XX' && geoCountry !== 'T1') {
    response.cookies.set(GEO_COUNTRY_COOKIE, geoCountry, {
      path: '/',
      sameSite: 'lax',
      // Hint only; preference store may override. 1 day is enough for a session.
      maxAge: 60 * 60 * 24,
    });
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|js|css|map)$).*)',
  ],
};
