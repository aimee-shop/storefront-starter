import type { PlatformVersions, VerifiedMountRegistry, VerifiedPackage } from '../types';
import type { VerifiedScript } from '../scripts/types';

export function createEmptyRegistry(
  platform: PlatformVersions,
  deployCorrelationId: string,
): VerifiedMountRegistry {
  return {
    schemaVersion: '1',
    generatedAt: new Date().toISOString(),
    deployCorrelationId,
    platform,
    packages: [],
    scripts: [],
  };
}

export function buildRegistry(
  packages: VerifiedPackage[],
  platform: PlatformVersions,
  deployCorrelationId: string,
  scripts: VerifiedScript[] = [],
): VerifiedMountRegistry {
  return {
    schemaVersion: '1',
    generatedAt: new Date().toISOString(),
    deployCorrelationId,
    platform,
    packages,
    scripts,
  };
}
