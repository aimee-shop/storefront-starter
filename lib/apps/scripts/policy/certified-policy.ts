/**
 * Certified script policy: security-relevant fields sourced ONLY from the
 * platform-controlled AppVersion manifest, intersected with the deploy-time
 * origin allowlist. Merchant mount configuration may only NARROW the result
 * (subset page scope, lower load budget) -- never widen it.
 *
 * Manifest v1 does not yet model pageScope / consentCategory / budgets on
 * extensions (platform gap, tracked separately); when absent, fail-closed
 * platform defaults apply.
 */

import { normalizePathname } from '../verify/page-scope';
import type { PlatformScriptPolicy } from './platform-policy';

export interface CertifiedScriptPolicy {
  executableOrigins: string[];
  pageScope: { allow: string[]; deny: string[] };
  consentCategory: string;
  maxLoadMs: number;
  restrictedPagesAllowed: boolean;
}

/** Certified manifest extension fields consumed here (forward-compatible). */
export interface CertifiedManifestExtension {
  origin?: string;
  executableOrigins?: unknown;
  pageScope?: unknown;
  consentCategory?: unknown;
  budgets?: unknown;
  restrictedPagesAllowed?: unknown;
}

const MIN_LOAD_MS = 100;

function stringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === 'string' && v.length > 0);
}

function httpsOrigin(value: string): string | null {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' ? url.origin : null;
  } catch {
    return null;
  }
}

function clampLoadMs(value: number, policy: PlatformScriptPolicy): number {
  return Math.min(policy.maxAllowedLoadMs, Math.max(MIN_LOAD_MS, value));
}

/**
 * Derive the certified policy for one script from its manifest extension.
 * Origins = (certified manifest origins) INTERSECT (platform allowlist).
 */
export function certifiedPolicyFromManifest(
  extension: CertifiedManifestExtension | undefined,
  scriptOrigin: string,
  policy: PlatformScriptPolicy,
): CertifiedScriptPolicy {
  const certifiedOrigins = new Set<string>();
  certifiedOrigins.add(scriptOrigin);
  if (extension?.origin) {
    const o = httpsOrigin(extension.origin);
    if (o) certifiedOrigins.add(o);
  }
  for (const raw of stringArray(extension?.executableOrigins)) {
    const o = httpsOrigin(raw);
    if (o) certifiedOrigins.add(o);
  }
  const allowed = new Set(policy.allowedOrigins);
  const executableOrigins = [...certifiedOrigins].filter((o) => allowed.has(o));

  let pageScope = policy.defaultPageScope;
  const rawScope = extension?.pageScope;
  if (rawScope && typeof rawScope === 'object' && !Array.isArray(rawScope)) {
    const scope = rawScope as { allow?: unknown; deny?: unknown };
    const allow = stringArray(scope.allow);
    pageScope = {
      allow: allow.length > 0 ? allow : policy.defaultPageScope.allow,
      deny: stringArray(scope.deny),
    };
  }

  let maxLoadMs = policy.defaultMaxLoadMs;
  const rawBudgets = extension?.budgets;
  if (rawBudgets && typeof rawBudgets === 'object' && !Array.isArray(rawBudgets)) {
    const value = (rawBudgets as { maxLoadMs?: unknown }).maxLoadMs;
    if (typeof value === 'number' && Number.isFinite(value)) {
      maxLoadMs = clampLoadMs(value, policy);
    }
  }

  return {
    executableOrigins,
    pageScope: { allow: [...pageScope.allow], deny: [...pageScope.deny] },
    consentCategory:
      typeof extension?.consentCategory === 'string' && extension.consentCategory
        ? extension.consentCategory
        : policy.defaultConsentCategory,
    maxLoadMs,
    restrictedPagesAllowed: extension?.restrictedPagesAllowed === true,
  };
}

type ParsedPattern =
  | { literal: string[]; mode: 'subtree' | 'one' }
  | null;

function patternSegments(pattern: string): string[] {
  const normalized = normalizePathname(pattern.trim());
  return normalized === '/' ? [] : normalized.slice(1).split('/');
}

/** Bare patterns match the path and its subtree, same as a trailing '**'. */
function parsePattern(pattern: string): ParsedPattern {
  const segs = patternSegments(pattern);
  const globstar = segs.indexOf('**');
  if (globstar !== -1 && globstar !== segs.length - 1) return null;
  if (globstar !== -1) return { literal: segs.slice(0, -1), mode: 'subtree' };
  if (segs.length > 0 && segs[segs.length - 1] === '*') {
    return { literal: segs.slice(0, -1), mode: 'one' };
  }
  return { literal: segs, mode: 'subtree' };
}

function segmentCovers(cert: string, merchant: string): boolean {
  if (cert === '*') return true;
  return cert === merchant;
}

/** True when every path matched by merchantPattern is matched by certPattern. */
export function patternCovers(
  certPattern: string,
  merchantPattern: string,
): boolean {
  const cert = parsePattern(certPattern);
  const merchant = parsePattern(merchantPattern);
  if (!cert || !merchant) return false;

  if (cert.mode === 'subtree') {
    // Cert covers the subtree under its literal prefix. A 'one' merchant
    // pattern has one extra wildcard segment inside that subtree.
    const merchantLen =
      merchant.mode === 'one' ? merchant.literal.length + 1 : merchant.literal.length;
    if (cert.literal.length > merchantLen) return false;
    for (let i = 0; i < cert.literal.length; i++) {
      const m = i < merchant.literal.length ? merchant.literal[i]! : '*';
      if (!segmentCovers(cert.literal[i]!, m)) return false;
    }
    return true;
  }

  // cert.mode === 'one': fixed depth; cannot cover an unbounded subtree.
  if (merchant.mode !== 'one') return false;
  if (cert.literal.length !== merchant.literal.length) return false;
  return cert.literal.every((c, i) => segmentCovers(c, merchant.literal[i]!));
}

/**
 * Apply merchant mount configuration as a pure narrowing of the certified
 * policy. Returns null when the merchant supplied allow paths that escape the
 * certified scope (misconfigured or malicious -- drop the mount, never fall
 * back to a wider scope).
 */
export function narrowWithMerchantConfig(
  certified: CertifiedScriptPolicy,
  configuration: unknown,
  policy: PlatformScriptPolicy,
): CertifiedScriptPolicy | null {
  const cfg =
    configuration && typeof configuration === 'object' && !Array.isArray(configuration)
      ? (configuration as Record<string, unknown>)
      : {};

  let allow = certified.pageScope.allow;
  const merchantAllow = stringArray(cfg.allowPaths);
  if (Array.isArray(cfg.allowPaths)) {
    const kept = merchantAllow.filter((p) =>
      certified.pageScope.allow.some((cert) => patternCovers(cert, p)),
    );
    if (kept.length === 0) return null;
    allow = kept;
  }

  const deny = [...new Set([...certified.pageScope.deny, ...stringArray(cfg.denyPaths)])];

  let maxLoadMs = certified.maxLoadMs;
  if (typeof cfg.maxLoadMs === 'number' && Number.isFinite(cfg.maxLoadMs)) {
    maxLoadMs = Math.min(certified.maxLoadMs, clampLoadMs(cfg.maxLoadMs, policy));
  }

  return {
    executableOrigins: certified.executableOrigins,
    pageScope: { allow, deny },
    consentCategory: certified.consentCategory,
    maxLoadMs,
    restrictedPagesAllowed: certified.restrictedPagesAllowed,
  };
}
