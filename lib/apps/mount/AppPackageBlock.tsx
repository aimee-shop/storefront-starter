import type { ReactNode } from 'react';
import type { VerifiedPackage } from '../types';
import { emitExtensionTelemetry } from '../telemetry/extension-telemetry';
import {
  isMountableAtRuntime,
  type RuntimeMountState,
} from './is-mountable';

export interface AppPackageBlockProps {
  pkg: VerifiedPackage;
  exportId: string;
  /** Pre-rendered children from a verified package entry (host supplies). */
  children: ReactNode;
  runtimeState?: RuntimeMountState | null;
}

/**
 * Host for a verified build-time package export.
 *
 * Security:
 * - Never receives API keys, admin tokens, or other installation configs
 * - Renders nothing when runtime mountability fails (suspend/uninstall)
 * - Emits non-PII telemetry only
 */
export function AppPackageBlock({
  pkg,
  exportId,
  children,
  runtimeState,
}: AppPackageBlockProps) {
  if (!isMountableAtRuntime(pkg, runtimeState)) {
    emitExtensionTelemetry({
      event: 'mount_skipped',
      packageName: pkg.packageName,
      packageVersion: pkg.packageVersion,
      appVersionId: pkg.appVersionId,
      surfaceId: pkg.surfaceId,
      mountId: pkg.mountId,
      exportId,
      reason: 'not_mountable',
    });
    return null;
  }

  emitExtensionTelemetry({
    event: 'mount_render',
    packageName: pkg.packageName,
    packageVersion: pkg.packageVersion,
    appVersionId: pkg.appVersionId,
    surfaceId: pkg.surfaceId,
    mountId: pkg.mountId,
    exportId,
  });

  return (
    <div
      data-app-package={pkg.packageName}
      data-app-version={pkg.packageVersion}
      data-app-export={exportId}
      data-app-mount={pkg.mountId ?? ''}
    >
      {children}
    </div>
  );
}
