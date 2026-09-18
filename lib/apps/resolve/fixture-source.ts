import { join } from 'node:path';
import type { ActiveStorefrontMount } from '../types';
import type { ActiveMountSource } from './types';

export interface FixtureMountSpec {
  packageDir: string;
  mountId?: string;
  installationId?: string;
  appVersionId?: string;
  surfaceId?: string;
  extensionId?: string;
  configuration?: unknown;
  expectedPackageSha256?: string;
}

/**
 * Fixture-driven mount source for CI and local verify.
 * When specs is empty, no packages are resolved (default production-safe).
 */
export class FixtureActiveMountSource implements ActiveMountSource {
  constructor(
    private readonly specs: FixtureMountSpec[],
    private readonly cwd: string = process.cwd(),
  ) {}

  async listStorefrontPackages(): Promise<ActiveStorefrontMount[]> {
    return this.specs.map((spec, index) => ({
      id: spec.mountId ?? `fixture-mount-${index}`,
      installationId: spec.installationId ?? `fixture-install-${index}`,
      appVersionId: spec.appVersionId ?? `fixture-version-${index}`,
      surfaceId: spec.surfaceId ?? 'storefront-package',
      extensionId: spec.extensionId ?? 'storefront-package',
      mountType: 'storefront_package',
      configRevision: 1,
      configuration: spec.configuration ?? { headline: 'Hello from fixture' },
      packageLocation: join(this.cwd, 'fixtures/apps/packages', spec.packageDir),
      expectedPackageSha256: spec.expectedPackageSha256,
    }));
  }
}

/** Empty source -- production default when no live mounts / fixtures selected. */
export class EmptyActiveMountSource implements ActiveMountSource {
  async listStorefrontPackages(): Promise<ActiveStorefrontMount[]> {
    return [];
  }
}
