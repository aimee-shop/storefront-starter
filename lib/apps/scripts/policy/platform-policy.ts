/**
 * Platform-pinned policy for privileged remote scripts.
 *
 * APPS_SCRIPT_ALLOWED_ORIGINS is the deploy-time origin allowlist. Certified
 * manifest origins are intersected with it, so neither a merchant mount
 * configuration nor a compromised projection can allowlist an arbitrary
 * origin. Empty or missing allowlist means no remote script resolves
 * (fail closed).
 */

export interface PlatformScriptPolicy {
  /** HTTPS origins app scripts may load from (deploy-time pinned). */
  allowedOrigins: string[];
  /** Applied when the certified manifest does not declare a page scope. */
  defaultPageScope: { allow: string[]; deny: string[] };
  /** Applied when the certified manifest does not declare a consent category. */
  defaultConsentCategory: string;
  /** Applied when the certified manifest does not declare a load budget. */
  defaultMaxLoadMs: number;
  /** Hard ceiling: no certified or merchant value may exceed this. */
  maxAllowedLoadMs: number;
}

/** Comma-separated HTTPS origins; invalid entries are dropped with a log. */
export function parseAllowedScriptOrigins(raw: string | undefined): string[] {
  if (!raw) return [];
  const origins = new Set<string>();
  for (const entry of raw.split(',')) {
    const trimmed = entry.trim();
    if (!trimmed) continue;
    let url: URL;
    try {
      url = new URL(trimmed);
    } catch {
      console.error(
        `[apps:policy] invalid APPS_SCRIPT_ALLOWED_ORIGINS entry dropped: ${trimmed}`,
      );
      continue;
    }
    if (url.protocol !== 'https:') {
      console.error(
        `[apps:policy] non-HTTPS APPS_SCRIPT_ALLOWED_ORIGINS entry dropped: ${trimmed}`,
      );
      continue;
    }
    origins.add(url.origin);
  }
  return [...origins];
}

export function loadPlatformScriptPolicy(
  env: Record<string, string | undefined> = process.env,
): PlatformScriptPolicy {
  return {
    allowedOrigins: parseAllowedScriptOrigins(env.APPS_SCRIPT_ALLOWED_ORIGINS),
    // Restricted pages (checkout, auth, payments) are hard-denied separately
    // in isPathInScriptScope, so the default deny list stays empty.
    defaultPageScope: { allow: ['/**'], deny: [] },
    defaultConsentCategory: 'marketing',
    defaultMaxLoadMs: 3000,
    maxAllowedLoadMs: 5000,
  };
}
