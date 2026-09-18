/**
 * Pathname matching for privileged script page scope.
 * Deny rules win over allow. Restricted storefront pages are hard-denied
 * unless restrictedPagesAllowed is true (separately certified capability).
 */

/** Default restricted path prefixes (authentication, checkout, payments, security). */
export const DEFAULT_RESTRICTED_PATH_PREFIXES = [
  '/checkout',
  '/account/payment-methods',
  '/account/reset-password',
  '/account/security',
  '/account/login',
  '/account/register',
  '/login',
  '/register',
  '/sign-in',
  '/sign-up',
] as const;

export function normalizePathname(pathname: string): string {
  if (!pathname) return '/';
  const q = pathname.split('?')[0] ?? pathname;
  const h = q.split('#')[0] ?? q;
  if (!h.startsWith('/')) return `/${h}`;
  // collapse trailing slash except root
  if (h.length > 1 && h.endsWith('/')) return h.slice(0, -1);
  return h;
}

function toSegments(normalizedPath: string): string[] {
  return normalizedPath === '/' ? [] : normalizedPath.slice(1).split('/');
}

/**
 * Segment-based glob. '*' matches exactly one segment; '**' (final segment
 * only) matches zero or more segments. A bare pattern matches the path itself
 * and its subtree on segment boundaries, so '/foo' and '/foo/**' never match
 * '/foobar'. Patterns with a non-trailing '**' are rejected (fail closed).
 */
export function matchPathPattern(pathname: string, pattern: string): boolean {
  const trimmed = pattern.trim();
  if (!trimmed) return false;
  const pathSegs = toSegments(normalizePathname(pathname));
  const patSegs = toSegments(normalizePathname(trimmed));

  const globstar = patSegs.indexOf('**');
  if (globstar !== -1 && globstar !== patSegs.length - 1) return false;

  const hasGlobstar = globstar !== -1;
  const literal = hasGlobstar ? patSegs.slice(0, -1) : patSegs;
  const singleWildcardTail =
    !hasGlobstar && literal.length > 0 && literal[literal.length - 1] === '*';

  if (hasGlobstar) {
    if (pathSegs.length < literal.length) return false;
  } else if (singleWildcardTail) {
    // '/foo/*' matches exactly one segment under /foo.
    if (pathSegs.length !== literal.length) return false;
  } else {
    // Bare pattern: exact match or subtree on a segment boundary.
    if (pathSegs.length < literal.length) return false;
  }

  for (let i = 0; i < literal.length; i++) {
    const p = literal[i]!;
    if (p === '*') {
      if (pathSegs[i] === undefined) return false;
      continue;
    }
    if (p !== pathSegs[i]) return false;
  }
  return true;
}

/**
 * Merge extra restricted prefixes (comma-separated env value) with the
 * defaults. Entries must be absolute paths; trailing slashes are stripped.
 */
export function resolveRestrictedPathPrefixes(rawExtra?: string): string[] {
  const extras = (rawExtra ?? '')
    .split(',')
    .map((p) => p.trim())
    .filter((p) => p.startsWith('/') && p.length > 1)
    .map((p) => (p.endsWith('/') ? p.slice(0, -1) : p));
  return [...new Set([...DEFAULT_RESTRICTED_PATH_PREFIXES, ...extras])];
}

export function isRestrictedPath(
  pathname: string,
  restrictedPrefixes: readonly string[] = DEFAULT_RESTRICTED_PATH_PREFIXES,
): boolean {
  const path = normalizePathname(pathname);
  return restrictedPrefixes.some(
    (p) => path === p || path.startsWith(`${p}/`),
  );
}

export function isPathInScriptScope(
  pathname: string,
  pageScope: { allow?: string[]; deny?: string[] },
  options: {
    restrictedPagesAllowed?: boolean;
    restrictedPrefixes?: readonly string[];
  } = {},
): boolean {
  const path = normalizePathname(pathname);

  if (
    !options.restrictedPagesAllowed &&
    isRestrictedPath(path, options.restrictedPrefixes)
  ) {
    return false;
  }

  const deny = pageScope.deny ?? [];
  for (const d of deny) {
    if (matchPathPattern(path, d)) return false;
  }

  const allow = pageScope.allow;
  if (!allow || allow.length === 0) {
    // Empty allow => all non-denied, non-restricted paths
    return true;
  }
  return allow.some((a) => matchPathPattern(path, a));
}
