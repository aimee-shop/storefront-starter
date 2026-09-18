import 'server-only';

import { PrivilegedScriptLoader } from '@/lib/apps/scripts/loader/PrivilegedScriptLoader';
import { isScriptMountableAtRuntime } from '@/lib/apps/scripts/mount/is-script-mountable';
import { resolveRuntimeScriptMountState } from '@/lib/apps/scripts/mount/runtime-state';
import { loadVerifiedMountRegistry } from '@/lib/apps/registry/load';
import { emitExtensionTelemetry } from '@/lib/apps/telemetry/extension-telemetry';
import { toScriptLoaderProps } from '@/lib/apps/scripts/types';
import { resolveRestrictedPathPrefixes } from '@/lib/apps/scripts/verify/page-scope';

/**
 * Server host for verified privileged remote scripts.
 *
 * Security model: script metadata is verified at build time; runtime re-checks
 * kill switches, then the client loader enforces page scope + customer consent
 * before injecting with SRI. Only ScriptLoaderProps reach the client (no config).
 */
export function AppScriptMounts() {
  const registry = loadVerifiedMountRegistry();
  const scripts = registry?.scripts ?? [];
  if (scripts.length === 0) {
    return null;
  }

  const loaderProps = [];
  for (const script of scripts) {
    const runtimeState = resolveRuntimeScriptMountState(script);
    if (!isScriptMountableAtRuntime(script, runtimeState)) {
      emitExtensionTelemetry({
        event: 'script_skipped',
        packageName: script.name,
        packageVersion: script.version,
        appVersionId: script.appVersionId,
        surfaceId: script.surfaceId,
        mountId: script.mountId,
        reason: 'not_mountable',
      });
      continue;
    }
    const props = toScriptLoaderProps(script);
    if (!props) {
      emitExtensionTelemetry({
        event: 'script_skipped',
        packageName: script.name,
        packageVersion: script.version,
        mountId: script.mountId,
        reason: 'missing_mount_id',
      });
      continue;
    }
    loaderProps.push(props);
  }

  if (loaderProps.length === 0) {
    return null;
  }

  // Consent grant-all is server-only and blocked in production.
  const grantAll =
    process.env.NODE_ENV !== 'production' &&
    process.env.APPS_SCRIPT_CONSENT_GRANT_ALL === '1';

  const restrictedPathPrefixes = resolveRestrictedPathPrefixes(
    process.env.APPS_EXTRA_RESTRICTED_PATH_PREFIXES,
  );

  return (
    <PrivilegedScriptLoader
      scripts={loaderProps}
      grantAllConsent={grantAll}
      restrictedPathPrefixes={restrictedPathPrefixes}
    />
  );
}
