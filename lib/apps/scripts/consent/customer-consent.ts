/**
 * Customer consent gate for privileged remote scripts.
 *
 * Merchant consent is enforced at verify time. Customer consent is a
 * category cookie set by the host CMP (or test harness).
 *
 * Cookie: aimee_consent_categories = JSON string array, e.g. ["marketing"]
 * Test only: APPS_SCRIPT_CONSENT_GRANT_ALL=1 grants every category.
 */

export const CUSTOMER_CONSENT_COOKIE = 'aimee_consent_categories';

export function parseConsentCategories(raw: string | undefined | null): string[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((c): c is string => typeof c === 'string' && c.length > 0);
  } catch {
    // comma-separated fallback
    return raw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }
}

export function isCustomerConsentGranted(
  category: string,
  grantedCategories: readonly string[],
  options: { grantAll?: boolean } = {},
): boolean {
  if (options.grantAll) return true;
  if (!category) return false;
  return grantedCategories.includes(category);
}

/** Browser-side: read cookie document.cookie (no tokens). */
export function readConsentCategoriesFromDocumentCookie(
  cookieHeader: string | undefined = typeof document !== 'undefined' ? document.cookie : '',
): string[] {
  if (!cookieHeader) return [];
  const parts = cookieHeader.split(';');
  for (const part of parts) {
    const idx = part.indexOf('=');
    if (idx < 0) continue;
    const key = part.slice(0, idx).trim();
    if (key !== CUSTOMER_CONSENT_COOKIE) continue;
    const value = decodeURIComponent(part.slice(idx + 1).trim());
    return parseConsentCategories(value);
  }
  return [];
}

export function isConsentGrantAllEnvEnabled(
  env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env,
): boolean {
  return env.APPS_SCRIPT_CONSENT_GRANT_ALL === '1';
}
