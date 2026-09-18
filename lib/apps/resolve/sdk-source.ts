/**
 * Live SDK mount resolution (build-time only).
 *
 * Uses @aimee.shop/sdk-platform when APPS_MOUNT_SOURCE=sdk.
 * Requires a credential with apps:read (Storefront Default role currently
 * lacks this -- use a dedicated build key or fixture mode).
 *
 * Lazy-requires the platform SDK so unit tests without the dep still load.
 */

import type { ActiveStorefrontMount } from '../types';
import type {
  ActivePrivilegedScriptMount,
  PrivilegedScriptManifest,
} from '../scripts/types';
import {
  certifiedPolicyFromManifest,
  narrowWithMerchantConfig,
  type CertifiedManifestExtension,
} from '../scripts/policy/certified-policy';
import {
  loadPlatformScriptPolicy,
  type PlatformScriptPolicy,
} from '../scripts/policy/platform-policy';
import type { ActiveMountSource } from './types';

export interface SdkMountSourceOptions {
  storeId: string;
  coreApiUrl: string;
  apiKey: string;
  /** Platform script policy; defaults to loadPlatformScriptPolicy() (env). */
  scriptPolicy?: PlatformScriptPolicy;
  /**
   * Map surface entrypoint / artifact name to a local package root or URL.
   * Live artifact download is left for a follow-up; callers supply locations.
   */
  resolvePackageLocation: (input: {
    installationId: string;
    appVersionId: string;
    surfaceId: string;
    entrypoint?: string;
  }) => string | Promise<string>;
}

type PlatformSdk = {
  apps: {
    installations: {
      list: (opts: { storeId: string }) => Promise<
        Array<{
          id: string;
          status: string;
          appId: string;
          appVersionId: string;
        }>
      >;
    };
    extensions: {
      getActive: (installationId: string) => Promise<{
        mounts: Array<{
          id: string;
          surfaceId: string;
          extensionId: string;
          mountType: string;
          configRevision: number;
          configuration: unknown;
          appVersionId: string;
          consentState?: string;
          healthStatus?: string;
        }>;
      }>;
    };
    versions: {
      get: (
        appId: string,
        versionId: string,
      ) => Promise<{
        manifest: unknown;
        artifactChecksums: Record<string, string> | null;
      }>;
    };
  };
};

type PlatformModule = {
  AimeePlatformSDK?: new (opts: {
    apiKey: string;
    coreApiUrl: string;
    storeId: string;
  }) => PlatformSdk;
};

type ManifestSurface = {
  id: string;
  kind?: string;
  entrypoint?: string;
  permissions?: string[];
};

type ManifestExtension = {
  id: string;
  surfaceKind?: string;
  origin?: string;
  integrity?: string;
  mountPath?: string;
} & CertifiedManifestExtension;

type ManifestShape = {
  surfaces?: Array<ManifestSurface>;
  extensions?: Array<ManifestExtension>;
};

/**
 * Bind a certified extension to the mount's surface (platform rule:
 * extension.id === surface.id and surfaceKind matches surface.kind).
 * Never select by projection-supplied extensionId alone -- that would let a
 * mount inherit another extension's restrictedPagesAllowed / pageScope.
 *
 * Returns null when mount.extensionId does not belong to this surface.
 * Exported for unit tests.
 */
export function bindExtensionToSurface(
  surface: { id: string; kind?: string },
  extensions: readonly ManifestExtension[],
  mountExtensionId: string | undefined,
): { extension: ManifestExtension | undefined } | null {
  const extension = extensions.find(
    (e) =>
      e.id === surface.id &&
      (!e.surfaceKind || !surface.kind || e.surfaceKind === surface.kind),
  );
  // Platform convention: declared extension id equals surface id; standalone
  // surfaces without an extensions[] entry use extensionId = surface.id.
  const expectedExtensionId = extension?.id ?? surface.id;
  if (mountExtensionId && mountExtensionId !== expectedExtensionId) {
    return null;
  }
  return { extension };
}

/** True when mount claims a different app version than the installation pin. */
export function hasAppVersionDrift(
  mountAppVersionId: string,
  installationAppVersionId: string,
): boolean {
  return mountAppVersionId !== installationAppVersionId;
}

async function loadPlatformSdk(options: SdkMountSourceOptions): Promise<PlatformSdk> {
  let mod: PlatformModule;
  try {
    const req = (await import('node:module')).createRequire(import.meta.url);
    mod = req('@aimee.shop/sdk-platform') as PlatformModule;
  } catch (err) {
    // Surface the underlying loader error: "not installed" and "ESM export
    // map rejected require()" need different fixes.
    const cause = err instanceof Error ? ` (${err.message})` : '';
    throw new Error(
      `APPS_MOUNT_SOURCE=sdk requires @aimee.shop/sdk-platform. Install it or use fixture mode.${cause}`,
    );
  }
  const PlatformCtor = mod.AimeePlatformSDK;
  if (!PlatformCtor) {
    throw new Error(
      '@aimee.shop/sdk-platform must export AimeePlatformSDK for apps resolution',
    );
  }
  return new PlatformCtor({
    apiKey: options.apiKey,
    coreApiUrl: options.coreApiUrl,
    storeId: options.storeId,
  });
}

/**
 * Build a script manifest from CERTIFIED sources only: the AppVersion manifest
 * (surface entrypoint, extension origin/integrity + policy fields) intersected
 * with the platform origin allowlist. Merchant mount configuration may only
 * narrow page scope and load budget; it can never contribute origins, consent
 * category, restricted-page capability, or identity fields.
 *
 * Exported for tests; production callers go through SdkActiveMountSource.
 */
export function scriptManifestFromVersion(
  surface: { id: string; entrypoint?: string },
  extension:
    | ({ origin?: string; integrity?: string; mountPath?: string } & CertifiedManifestExtension)
    | undefined,
  configuration: unknown,
  appVersionId: string,
  policy: PlatformScriptPolicy,
): PrivilegedScriptManifest | null {
  const scriptUrl =
    surface.entrypoint ??
    (extension?.origin
      ? `${extension.origin.replace(/\/$/, '')}${extension.mountPath ?? ''}`
      : undefined);
  const integrity = extension?.integrity;
  if (!scriptUrl || !integrity) return null;

  let origin: string;
  try {
    origin = new URL(scriptUrl).origin;
  } catch {
    return null;
  }

  const certified = certifiedPolicyFromManifest(extension, origin, policy);
  if (!certified.executableOrigins.includes(origin)) {
    console.error(
      `[apps:resolve] script surface ${surface.id} dropped: origin ${origin} not in APPS_SCRIPT_ALLOWED_ORIGINS`,
    );
    return null;
  }

  const narrowed = narrowWithMerchantConfig(certified, configuration, policy);
  if (!narrowed) {
    console.error(
      `[apps:resolve] script surface ${surface.id} dropped: merchant allowPaths escape the certified page scope`,
    );
    return null;
  }

  return {
    name: `@app-script/${surface.id}`,
    version: appVersionId || '0.0.0',
    scriptUrl,
    integrity,
    crossOrigin: 'anonymous',
    executableOrigins: narrowed.executableOrigins,
    consentCategory: narrowed.consentCategory,
    pageScope: narrowed.pageScope,
    restrictedPagesAllowed: narrowed.restrictedPagesAllowed,
    budgets: { maxLoadMs: narrowed.maxLoadMs },
    healthStatus: 'healthy',
  };
}

function narrowConsentState(
  value: string | undefined,
): ActivePrivilegedScriptMount['merchantConsentState'] {
  if (
    value === 'granted' ||
    value === 'pending' ||
    value === 'revoked' ||
    value === 'not_required'
  ) {
    return value;
  }
  return 'pending';
}

function narrowHealthStatus(
  value: string | undefined,
): ActivePrivilegedScriptMount['healthStatus'] {
  if (
    value === 'healthy' ||
    value === 'unknown' ||
    value === 'degraded' ||
    value === 'unhealthy'
  ) {
    return value;
  }
  return 'unknown';
}

export class SdkActiveMountSource implements ActiveMountSource {
  constructor(private readonly options: SdkMountSourceOptions) {}

  async listStorefrontPackages(): Promise<ActiveStorefrontMount[]> {
    const sdk = await loadPlatformSdk(this.options);
    const installations = await sdk.apps.installations.list({
      storeId: this.options.storeId,
    });

    const active = installations.filter((i) => i.status === 'active');
    const mounts: ActiveStorefrontMount[] = [];

    for (const installation of active) {
      const projection = await sdk.apps.extensions.getActive(installation.id);
      const version = await sdk.apps.versions.get(
        installation.appId,
        installation.appVersionId,
      );

      const manifest = version.manifest as ManifestShape;
      const surfaces = manifest.surfaces ?? [];

      for (const m of projection.mounts) {
        const surface = surfaces.find((s) => s.id === m.surfaceId);
        if (surface?.kind !== 'storefront-package') {
          continue;
        }

        const packageLocation = await this.options.resolvePackageLocation({
          installationId: installation.id,
          appVersionId: m.appVersionId,
          surfaceId: m.surfaceId,
          entrypoint: surface?.entrypoint,
        });

        const checksums = version.artifactChecksums;
        const expectedPackageSha256 =
          checksums?.packageSha256 ?? checksums?.['storefront-package'];

        mounts.push({
          id: m.id,
          installationId: installation.id,
          appVersionId: m.appVersionId,
          surfaceId: m.surfaceId,
          extensionId: m.extensionId,
          mountType: m.mountType,
          configRevision: m.configRevision,
          configuration: m.configuration,
          packageLocation,
          expectedPackageSha256,
        });
      }
    }

    return mounts;
  }

  /** Privileged remote scripts (#21) from active projection + manifest. */
  async listPrivilegedScripts(): Promise<ActivePrivilegedScriptMount[]> {
    const policy = this.options.scriptPolicy ?? loadPlatformScriptPolicy();
    const sdk = await loadPlatformSdk(this.options);
    const installations = await sdk.apps.installations.list({
      storeId: this.options.storeId,
    });
    const active = installations.filter((i) => i.status === 'active');
    const scripts: ActivePrivilegedScriptMount[] = [];

    for (const installation of active) {
      const projection = await sdk.apps.extensions.getActive(installation.id);
      const version = await sdk.apps.versions.get(
        installation.appId,
        installation.appVersionId,
      );
      const manifest = version.manifest as ManifestShape;
      const surfaces = manifest.surfaces ?? [];
      const extensions = manifest.extensions ?? [];

      for (const m of projection.mounts) {
        const surface = surfaces.find((s) => s.id === m.surfaceId);
        const isScript =
          surface?.kind === 'privileged-storefront-script' ||
          m.mountType === 'privileged_remote_script' ||
          m.mountType === 'privileged-remote-script';
        if (!isScript || !surface) continue;

        // Certified policy/integrity come from the installation-pinned version.
        // Drop when the mount claims a different version.
        if (hasAppVersionDrift(m.appVersionId, installation.appVersionId)) {
          console.error(
            `[apps:resolve] script mount ${m.id} dropped: appVersionId drift (mount=${m.appVersionId}, installation=${installation.appVersionId})`,
          );
          continue;
        }

        const bound = bindExtensionToSurface(
          surface,
          extensions,
          m.extensionId,
        );
        if (!bound) {
          console.error(
            `[apps:resolve] script mount ${m.id} dropped: extensionId ${m.extensionId} does not belong to surface ${surface.id}`,
          );
          continue;
        }
        const { extension } = bound;
        const scriptManifest = scriptManifestFromVersion(
          surface,
          extension,
          m.configuration,
          m.appVersionId,
          policy,
        );
        if (!scriptManifest) continue;

        const consentState = narrowConsentState(m.consentState);
        const healthStatus = narrowHealthStatus(m.healthStatus);

        scripts.push({
          id: m.id,
          installationId: installation.id,
          appVersionId: m.appVersionId,
          surfaceId: m.surfaceId,
          extensionId: m.extensionId,
          mountType: 'privileged_remote_script',
          configRevision: m.configRevision,
          configuration: m.configuration,
          merchantConsentState: consentState,
          healthStatus,
          manifest: {
            ...scriptManifest,
            healthStatus,
          },
        });
      }
    }

    return scripts;
  }
}
