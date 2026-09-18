import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type {
  ActivePrivilegedScriptMount,
  PrivilegedScriptManifest,
} from '../types';

export interface FixtureScriptSpec {
  /** Directory under fixtures/apps/scripts/ */
  scriptDir: string;
  mountId?: string;
  installationId?: string;
  appVersionId?: string;
  surfaceId?: string;
  extensionId?: string;
  configuration?: unknown;
  merchantConsentState?: ActivePrivilegedScriptMount['merchantConsentState'];
  healthStatus?: ActivePrivilegedScriptMount['healthStatus'];
}

export class FixturePrivilegedScriptSource {
  constructor(
    private readonly specs: FixtureScriptSpec[],
    private readonly cwd: string = process.cwd(),
  ) {}

  async listPrivilegedScripts(): Promise<ActivePrivilegedScriptMount[]> {
    return this.specs.map((spec, index) => {
      const fixtureRoot = join(this.cwd, 'fixtures/apps/scripts', spec.scriptDir);
      const raw = readFileSync(
        join(fixtureRoot, 'aimee.storefront-script.json'),
        'utf8',
      );
      const manifest = JSON.parse(raw) as PrivilegedScriptManifest;
      return {
        id: spec.mountId ?? `fixture-script-mount-${index}`,
        installationId: spec.installationId ?? `fixture-script-install-${index}`,
        appVersionId: spec.appVersionId ?? `fixture-script-version-${index}`,
        surfaceId: spec.surfaceId ?? 'privileged-storefront-script',
        extensionId: spec.extensionId ?? 'privileged-storefront-script',
        mountType: 'privileged_remote_script' as const,
        configRevision: 1,
        configuration: spec.configuration ?? {},
        merchantConsentState: spec.merchantConsentState ?? 'granted',
        healthStatus: spec.healthStatus ?? manifest.healthStatus ?? 'healthy',
        manifest: {
          ...manifest,
          healthStatus: spec.healthStatus ?? manifest.healthStatus ?? 'healthy',
        },
        fixtureRoot,
      };
    });
  }
}

export class EmptyPrivilegedScriptSource {
  async listPrivilegedScripts(): Promise<ActivePrivilegedScriptMount[]> {
    return [];
  }
}
