import { PACKAGE_ERROR_CODES, PackageVerifyError } from '../errors';
import type {
  PlatformVersions,
  ResolvedPackageCandidate,
  TrustRegistry,
  VerifiedPackage,
  VerifyResult,
} from '../types';
import { assertCompatible } from './compatibility';
import { assertConfigValid } from './config';
import { loadPackageManifest } from './manifest';
import { assertPackageSignature } from './signature';
import { assertStaticGates } from './static-gates';

export interface VerifyOptions {
  platform: PlatformVersions;
  trust: TrustRegistry;
}

/**
 * Ordered fail-closed verification for one storefront package artifact.
 */
export function verifyPackage(
  candidate: ResolvedPackageCandidate,
  options: VerifyOptions,
): VerifyResult {
  try {
    const manifest = loadPackageManifest(candidate.packageRoot);

    const { packageSha256, keyId } = assertPackageSignature(
      candidate.packageRoot,
      options.trust,
      candidate.expectedPackageSha256,
    );

    assertCompatible(manifest, options.platform);
    assertStaticGates(candidate.packageRoot, manifest);

    let configuration: Record<string, unknown> = {};
    const requireConfig = candidate.requireConfig !== false;
    if (requireConfig) {
      // Validate configuration against the first export schema when present
      // (mounts typically pin one primary block export).
      const primary = manifest.exports[0];
      if (primary) {
        configuration = assertConfigValid(primary, candidate.configuration ?? {});
      } else if (
        candidate.configuration &&
        typeof candidate.configuration === 'object' &&
        !Array.isArray(candidate.configuration)
      ) {
        configuration = candidate.configuration as Record<string, unknown>;
      }
    }

    const verified: VerifiedPackage = {
      packageName: manifest.name,
      packageVersion: manifest.version,
      packageSha256,
      signatureKeyId: keyId,
      runtimeContractVersion: manifest.runtimeContractVersion,
      exports: manifest.exports.map((e) => ({
        id: e.id,
        entry: e.entry,
        environments: e.environments,
      })),
      ssrCompatible: manifest.ssrCompatible,
      mountId: candidate.mountId,
      installationId: candidate.installationId,
      appVersionId: candidate.appVersionId,
      surfaceId: candidate.surfaceId,
      extensionId: candidate.extensionId,
      configuration,
    };

    return { ok: true, package: verified };
  } catch (err) {
    if (err instanceof PackageVerifyError) {
      return {
        ok: false,
        code: err.code,
        message: err.message,
        details: err.details,
      };
    }
    return {
      ok: false,
      code: PACKAGE_ERROR_CODES.MANIFEST_INVALID,
      message: err instanceof Error ? err.message : 'Unknown package verify error',
    };
  }
}

/**
 * Verify many candidates; fails closed on the first error when failFast.
 * Returns all results when failFast is false.
 */
export function verifyPackages(
  candidates: ResolvedPackageCandidate[],
  options: VerifyOptions,
  failFast = true,
): VerifyResult[] {
  const results: VerifyResult[] = [];
  for (const c of candidates) {
    const result = verifyPackage(c, options);
    results.push(result);
    if (!result.ok && failFast) break;
  }
  return results;
}
