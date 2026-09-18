import 'server-only';

import { AppPackageBlock } from '@/lib/apps/mount/AppPackageBlock';
import { resolveRuntimeMountState } from '@/lib/apps/mount/runtime-state';
import { loadVerifiedMountRegistry } from '@/lib/apps/registry/load';
import type { VerifiedPackage } from '@/lib/apps/types';
import { ReferenceBanner } from './ReferenceBanner';

/**
 * Renders verified build-time app package exports from the mount registry.
 *
 * Security model: package artifacts are verified at build time; runtime never
 * evals package source. Only host allowlisted renderers bound to packageName +
 * exportId may render, using validated configuration from the registry.
 */
export function AppPackageMounts() {
  const registry = loadVerifiedMountRegistry();
  if (!registry || registry.packages.length === 0) {
    return null;
  }

  return (
    <>
      {registry.packages.map((pkg) => (
        <PackageExports
          key={`${pkg.packageName}@${pkg.packageVersion}:${pkg.mountId ?? ''}`}
          pkg={pkg}
        />
      ))}
    </>
  );
}

function PackageExports({ pkg }: { pkg: VerifiedPackage }) {
  const runtimeState = resolveRuntimeMountState(pkg);
  return (
    <>
      {pkg.exports.map((exp) => {
        const child = renderExport(pkg, exp.id);
        if (!child) return null;
        return (
          <AppPackageBlock
            key={exp.id}
            pkg={pkg}
            exportId={exp.id}
            runtimeState={runtimeState}
          >
            {child}
          </AppPackageBlock>
        );
      })}
    </>
  );
}

function renderExport(pkg: VerifiedPackage, exportId: string) {
  // Host allowlist: only known packages/exports. Verified digest is recorded in
  // the registry; we intentionally do not execute package entry files.
  if (
    pkg.packageName === '@aimee-fixtures/reference-banner' &&
    exportId === 'reference-banner'
  ) {
    const headline =
      typeof pkg.configuration.headline === 'string'
        ? pkg.configuration.headline
        : 'App package';
    return <ReferenceBanner config={{ headline }} />;
  }
  return null;
}
