/**
 * Realm teardown guard for privileged remote scripts.
 *
 * Removing a script element does not undo execution: timers, listeners,
 * observers, and patched globals keep same-realm access to whatever renders
 * next. When a client-side navigation would land on a restricted path
 * (checkout, auth, payment settings) after any app script has executed in
 * this realm, we force a full document navigation so the realm is torn down
 * before restricted content is exposed.
 *
 * The flag is module state on purpose: it survives soft navigations within
 * one realm and resets naturally on every document navigation.
 *
 * Residual risk (accepted): the guard reacts to the pathname change, so the
 * router may have streamed the restricted route's RSC payload into the
 * tainted realm before reload() lands. The layout-effect fires before paint,
 * which narrows but does not close that window; closing it fully would
 * require intercepting navigation before the route transition starts.
 */

import { isRestrictedPath } from '../verify/page-scope';

let executed = false;

/** Call whenever an app script injection is attempted (execution may follow). */
export function markAppScriptExecuted(): void {
  executed = true;
}

export function hasAppScriptExecuted(): boolean {
  return executed;
}

export function resetRealmGuardForTests(): void {
  executed = false;
}

export interface RealmTeardownLocation {
  reload: () => void;
}

/**
 * Force a document navigation when entering a restricted path from a realm
 * where app scripts have executed. Returns true when a teardown was
 * triggered; callers must skip all injection work for the tick.
 *
 * The router has already updated the URL by the time usePathname fires, so
 * reload() re-requests the restricted page as a document navigation without
 * disturbing history. The fresh realm starts with the flag cleared, so the
 * reload cannot loop.
 */
export function enforceRestrictedNavigationTeardown(
  pathname: string,
  options: {
    restrictedPrefixes?: readonly string[];
    location?: RealmTeardownLocation;
  } = {},
): boolean {
  if (!executed) return false;
  if (!isRestrictedPath(pathname, options.restrictedPrefixes)) return false;
  const target =
    options.location ?? (typeof window !== 'undefined' ? window.location : undefined);
  if (!target) return false;
  target.reload();
  return true;
}
