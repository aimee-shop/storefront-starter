'use client';

import { useEffect, useLayoutEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { emitExtensionTelemetry } from '../../telemetry/extension-telemetry';
import {
  isCustomerConsentGranted,
  readConsentCategoriesFromDocumentCookie,
} from '../consent/customer-consent';
import { isPathInScriptScope } from '../verify/page-scope';
import type { ScriptLoaderProps } from '../types';
import { injectVerifiedScript } from './inject-script';
import {
  enforceRestrictedNavigationTeardown,
  markAppScriptExecuted,
} from './realm-guard';

// useLayoutEffect is a no-op on the server; swap to useEffect there to keep
// SSR renders warning-free (the guard only matters in the browser anyway).
const useIsomorphicLayoutEffect =
  typeof window === 'undefined' ? useEffect : useLayoutEffect;

export interface PrivilegedScriptLoaderProps {
  scripts: ScriptLoaderProps[];
  /**
   * Test-only server-provided grant-all. Production must leave this false.
   * Never driven by NEXT_PUBLIC_* env in production code paths.
   */
  grantAllConsent?: boolean;
  /** Server-resolved restricted path prefixes; defaults apply when omitted. */
  restrictedPathPrefixes?: string[];
}

/**
 * Client loader for verified privileged remote scripts.
 *
 * Security:
 * - Only injects mounts that already passed verifyScript
 * - Re-checks page scope (usePathname) and customer consent before inject
 * - Never receives configuration blobs, API keys, or tokens
 * - Failures are isolated; core UI stays mounted
 */
export function PrivilegedScriptLoader({
  scripts,
  grantAllConsent = false,
  restrictedPathPrefixes,
}: PrivilegedScriptLoaderProps) {
  const pathname = usePathname() || '/';
  const injected = useRef(new Set<string>());
  const circuitOpen = useRef(new Set<string>());
  const tearingDown = useRef(false);

  // Realm teardown must win over injection: entering a restricted path from a
  // realm where app code executed forces a document navigation before paint.
  // The ref gates the injection effect below within the same commit.
  useIsomorphicLayoutEffect(() => {
    if (tearingDown.current) return;
    if (
      enforceRestrictedNavigationTeardown(pathname, {
        restrictedPrefixes: restrictedPathPrefixes,
      })
    ) {
      tearingDown.current = true;
    }
  }, [pathname, restrictedPathPrefixes]);

  useEffect(() => {
    if (tearingDown.current) return;
    const categories = readConsentCategoriesFromDocumentCookie();
    const grantAll = grantAllConsent === true;

    for (const script of scripts) {
      const inScope = isPathInScriptScope(pathname, script.pageScope, {
        restrictedPagesAllowed: script.restrictedPagesAllowed,
        restrictedPrefixes: restrictedPathPrefixes,
      });

      // Soft isolation on client navigations: remove injected nodes on restricted pages.
      if (!inScope) {
        const el = document.getElementById(`aimee-app-script-${script.mountId}`);
        if (el) {
          el.remove();
          injected.current.delete(script.mountId);
          emitExtensionTelemetry({
            event: 'script_skipped',
            packageName: script.name,
            packageVersion: script.version,
            appVersionId: script.appVersionId,
            surfaceId: script.surfaceId,
            mountId: script.mountId,
            reason: 'page_scope_removed',
          });
        }
        continue;
      }

      if (injected.current.has(script.mountId)) continue;
      if (circuitOpen.current.has(script.mountId)) continue;
      void loadOne(
        script,
        pathname,
        categories,
        grantAll,
        injected,
        circuitOpen,
        restrictedPathPrefixes,
      );
    }
  }, [scripts, pathname, grantAllConsent, restrictedPathPrefixes]);

  return null;
}

async function loadOne(
  script: ScriptLoaderProps,
  pathname: string,
  categories: string[],
  grantAll: boolean,
  injected: { current: Set<string> },
  circuitOpen: { current: Set<string> },
  restrictedPrefixes?: readonly string[],
): Promise<void> {
  const base = {
    packageName: script.name,
    packageVersion: script.version,
    appVersionId: script.appVersionId,
    surfaceId: script.surfaceId,
    mountId: script.mountId,
    installationId: script.installationId,
  };

  if (
    !isPathInScriptScope(pathname, script.pageScope, {
      restrictedPagesAllowed: script.restrictedPagesAllowed,
      restrictedPrefixes,
    })
  ) {
    emitExtensionTelemetry({
      event: 'script_skipped',
      ...base,
      reason: 'page_scope',
    });
    return;
  }

  if (
    !isCustomerConsentGranted(script.consentCategory, categories, {
      grantAll,
    })
  ) {
    emitExtensionTelemetry({
      event: 'script_skipped',
      ...base,
      reason: 'customer_consent',
    });
    return;
  }

  try {
    // From this point the script may execute (even a timeout can execute
    // late); taint the realm before the fetch starts.
    markAppScriptExecuted();
    const result = await injectVerifiedScript({
      scriptUrl: script.scriptUrl,
      integrity: script.integrity,
      crossOrigin: script.crossOrigin,
      maxLoadMs: script.budgets.maxLoadMs,
      mountId: script.mountId,
    });

    if (result.ok) {
      injected.current.add(script.mountId);
      emitExtensionTelemetry({
        event: 'script_load',
        ...base,
        reason: `durationMs=${Math.round(result.durationMs)}`,
      });
      return;
    }

    if (result.reason === 'timeout') {
      circuitOpen.current.add(script.mountId);
      emitExtensionTelemetry({
        event: 'script_timeout',
        ...base,
        reason: result.message,
      });
      emitExtensionTelemetry({
        event: 'script_budget_exceeded',
        ...base,
        reason: result.message,
      });
      return;
    }

    if (result.reason === 'duplicate') {
      injected.current.add(script.mountId);
      return;
    }

    circuitOpen.current.add(script.mountId);
    emitExtensionTelemetry({
      event: 'script_error',
      ...base,
      reason: `${result.reason}:${result.message ?? ''}`,
    });
  } catch (err) {
    circuitOpen.current.add(script.mountId);
    emitExtensionTelemetry({
      event: 'script_error',
      ...base,
      reason: err instanceof Error ? err.message : 'exception',
    });
  }
}
