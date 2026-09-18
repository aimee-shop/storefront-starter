#!/usr/bin/env tsx
/**
 * Build-time signed storefront package + privileged script verification.
 *
 * Usage:
 *   npm run apps:verify
 *   npm run apps:verify -- --fixture reference-signed
 *   npm run apps:verify -- --script-fixture reference-signed
 *   npm run apps:verify -- --dry-run
 *   APPS_MOUNT_SOURCE=sdk npm run apps:verify   # requires sdk-platform + apps:read
 *
 * Exit non-zero on any fail-closed gate. Writes .generated/app-mounts.json unless --dry-run.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  buildRegistry,
  createEmptyRegistry,
  EmptyActiveMountSource,
  EmptyPrivilegedScriptSource,
  FixtureActiveMountSource,
  FixturePrivilegedScriptSource,
  loadPlatformScriptPolicy,
  loadTrustRegistry,
  verifyPackage,
  verifyScript,
  writeRegistry,
  type ActiveMountSource,
  type PlatformVersions,
  type ResolvedPackageCandidate,
  type VerifiedPackage,
  type VerifiedScript,
} from '../lib/apps/server';
import { emitExtensionTelemetry } from '../lib/apps/telemetry/extension-telemetry';

function parseArgs(argv: string[]) {
  const dryRun = argv.includes('--dry-run');
  const fixtures: string[] = [];
  const scriptFixtures: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--fixture' && argv[i + 1]) {
      fixtures.push(argv[i + 1]!);
      i += 1;
    } else if (argv[i] === '--script-fixture' && argv[i + 1]) {
      scriptFixtures.push(argv[i + 1]!);
      i += 1;
    }
  }
  return { dryRun, fixtures, scriptFixtures };
}

function platformVersions(cwd: string): PlatformVersions {
  let storefrontStarter = '0.1.0';
  let blocks = '0.1.0';
  try {
    const pkg = JSON.parse(readFileSync(join(cwd, 'package.json'), 'utf8')) as {
      version?: string;
      dependencies?: Record<string, string>;
    };
    if (pkg.version) storefrontStarter = pkg.version;
    const blocksDep = pkg.dependencies?.['@aimee.shop/blocks'];
    if (blocksDep) {
      blocks = blocksDep.replace(/^[\^~>=<\s]+/, '') || blocks;
    }
  } catch {
    // defaults
  }
  return { storefrontStarter, blocks };
}

async function resolvePackageSource(
  cwd: string,
  fixtures: string[],
): Promise<ActiveMountSource> {
  const mode = process.env.APPS_MOUNT_SOURCE ?? 'empty';
  if (fixtures.length > 0) {
    return new FixtureActiveMountSource(
      fixtures.map((packageDir) => ({ packageDir })),
      cwd,
    );
  }
  if (mode === 'fixture' || mode === 'fixtures') {
    return new FixtureActiveMountSource(
      [{ packageDir: 'reference-signed' }],
      cwd,
    );
  }
  if (mode === 'sdk') {
    const { SdkActiveMountSource } = await import('../lib/apps/resolve/sdk-source');
    const storeId = process.env.NEXT_PUBLIC_STORE_ID;
    const coreApiUrl = process.env.NEXT_PUBLIC_CORE_API_URL;
    const apiKey = process.env.AIMEE_API_KEY;
    if (!storeId || !coreApiUrl || !apiKey) {
      throw new Error(
        'APPS_MOUNT_SOURCE=sdk requires NEXT_PUBLIC_STORE_ID, NEXT_PUBLIC_CORE_API_URL, AIMEE_API_KEY',
      );
    }
    const packageRoot = process.env.APPS_PACKAGE_ROOT;
    return new SdkActiveMountSource({
      storeId,
      coreApiUrl,
      apiKey,
      resolvePackageLocation: ({ entrypoint }) => {
        if (packageRoot) return packageRoot;
        if (entrypoint && !entrypoint.startsWith('http')) {
          return join(cwd, entrypoint);
        }
        throw new Error(
          'Set APPS_PACKAGE_ROOT or surface entrypoint to a local package path for sdk mode',
        );
      },
    });
  }
  return new EmptyActiveMountSource();
}

async function resolveScriptSource(
  cwd: string,
  scriptFixtures: string[],
) {
  const mode = process.env.APPS_SCRIPT_SOURCE ?? process.env.APPS_MOUNT_SOURCE ?? 'empty';
  if (scriptFixtures.length > 0) {
    return new FixturePrivilegedScriptSource(
      scriptFixtures.map((scriptDir) => ({ scriptDir })),
      cwd,
    );
  }
  if (mode === 'fixture' || mode === 'fixtures') {
    return new FixturePrivilegedScriptSource(
      [{ scriptDir: 'reference-signed' }],
      cwd,
    );
  }
  if (mode === 'sdk') {
    const { SdkActiveMountSource } = await import('../lib/apps/resolve/sdk-source');
    const storeId = process.env.NEXT_PUBLIC_STORE_ID;
    const coreApiUrl = process.env.NEXT_PUBLIC_CORE_API_URL;
    const apiKey = process.env.AIMEE_API_KEY;
    if (!storeId || !coreApiUrl || !apiKey) {
      throw new Error(
        'APPS_SCRIPT_SOURCE=sdk requires NEXT_PUBLIC_STORE_ID, NEXT_PUBLIC_CORE_API_URL, AIMEE_API_KEY',
      );
    }
    const source = new SdkActiveMountSource({
      storeId,
      coreApiUrl,
      apiKey,
      resolvePackageLocation: () => {
        throw new Error('package location unused for script list');
      },
    });
    return {
      listPrivilegedScripts: () => source.listPrivilegedScripts(),
    };
  }
  return new EmptyPrivilegedScriptSource();
}

async function main() {
  const cwd = process.cwd();
  const { dryRun, fixtures, scriptFixtures } = parseArgs(process.argv.slice(2));
  const platform = platformVersions(cwd);
  const packageSource = await resolvePackageSource(cwd, fixtures);
  const scriptSource = await resolveScriptSource(cwd, scriptFixtures);
  const mounts = await packageSource.listStorefrontPackages();
  const scriptMounts = await scriptSource.listPrivilegedScripts();

  const usingFixtures =
    fixtures.length > 0 ||
    scriptFixtures.length > 0 ||
    process.env.APPS_MOUNT_SOURCE === 'fixture' ||
    process.env.APPS_MOUNT_SOURCE === 'fixtures' ||
    process.env.APPS_SCRIPT_SOURCE === 'fixture' ||
    process.env.APPS_SCRIPT_SOURCE === 'fixtures';
  // Fixture mode skips the platform origin allowlist and fixture trust pins.
  // Hard-refuse in production (same fail-closed pattern as non-prod-only escapes).
  if (usingFixtures && process.env.NODE_ENV === 'production') {
    throw new Error(
      'APPS_MOUNT_SOURCE/APPS_SCRIPT_SOURCE=fixture (and --fixture flags) are not allowed when NODE_ENV=production',
    );
  }
  const trust =
    mounts.length === 0
      ? { keys: [] }
      : loadTrustRegistry(cwd, { allowFixtureTrust: usingFixtures });

  const deployCorrelationId =
    process.env.CI_PIPELINE_ID ??
    process.env.VERCEL_GIT_COMMIT_SHA ??
    `local-${Date.now()}`;

  if (mounts.length === 0 && scriptMounts.length === 0) {
    const empty = createEmptyRegistry(platform, deployCorrelationId);
    if (!dryRun) {
      const path = writeRegistry(empty, cwd);
      console.log(
        `[apps:verify] no packages/scripts; wrote empty registry ${path}`,
      );
    } else {
      console.log('[apps:verify] no packages/scripts (dry-run)');
    }
    process.exit(0);
  }

  const verified: VerifiedPackage[] = [];
  const verifiedScripts: VerifiedScript[] = [];
  let failed = false;

  for (const mount of mounts) {
    const candidate: ResolvedPackageCandidate = {
      packageRoot: mount.packageLocation,
      mountId: mount.id,
      installationId: mount.installationId,
      appVersionId: mount.appVersionId,
      surfaceId: mount.surfaceId,
      extensionId: mount.extensionId,
      configuration: mount.configuration,
      expectedPackageSha256: mount.expectedPackageSha256,
    };
    const result = verifyPackage(candidate, { platform, trust });
    if (!result.ok) {
      failed = true;
      emitExtensionTelemetry({
        event: 'verify_fail',
        mountId: mount.id,
        installationId: mount.installationId,
        appVersionId: mount.appVersionId,
        surfaceId: mount.surfaceId,
        reason: result.code,
      });
      console.error(`[apps:verify] FAIL ${result.code}: ${result.message}`);
      continue;
    }
    verified.push({
      ...result.package,
      configRevision: mount.configRevision,
    });
    emitExtensionTelemetry({
      event: 'verify_pass',
      packageName: result.package.packageName,
      packageVersion: result.package.packageVersion,
      packageSha256: result.package.packageSha256,
      mountId: mount.id,
      appVersionId: mount.appVersionId,
      surfaceId: mount.surfaceId,
      deployCorrelationId,
    });
    console.log(
      `[apps:verify] OK package ${result.package.packageName}@${result.package.packageVersion} sha256=${result.package.packageSha256.slice(0, 12)}…`,
    );
  }

  for (const mount of scriptMounts) {
    const result = verifyScript(
      {
        manifest: {
          ...mount.manifest,
          healthStatus: mount.healthStatus,
        },
        mountId: mount.id,
        installationId: mount.installationId,
        appVersionId: mount.appVersionId,
        surfaceId: mount.surfaceId,
        extensionId: mount.extensionId,
        configRevision: mount.configRevision,
        configuration: mount.configuration,
        merchantConsentState: mount.merchantConsentState,
        fixtureRoot: mount.fixtureRoot,
        fixtureMode: usingFixtures,
      },
      {
        fixtureMode: usingFixtures,
        // Defense in depth behind the certified resolve layer; fixtures use
        // local relative URLs so the deploy allowlist does not apply there.
        platformAllowedOrigins: usingFixtures
          ? undefined
          : loadPlatformScriptPolicy().allowedOrigins,
      },
    );
    if (!result.ok) {
      failed = true;
      emitExtensionTelemetry({
        event: 'script_verify_fail',
        mountId: mount.id,
        installationId: mount.installationId,
        appVersionId: mount.appVersionId,
        surfaceId: mount.surfaceId,
        reason: result.code,
      });
      console.error(`[apps:verify] FAIL script ${result.code}: ${result.message}`);
      continue;
    }
    verifiedScripts.push(result.script);
    emitExtensionTelemetry({
      event: 'script_verify_pass',
      packageName: result.script.name,
      packageVersion: result.script.version,
      mountId: mount.id,
      appVersionId: mount.appVersionId,
      surfaceId: mount.surfaceId,
      deployCorrelationId,
    });
    console.log(
      `[apps:verify] OK script ${result.script.name}@${result.script.version} integrity=${result.script.integrity.slice(0, 24)}…`,
    );
  }

  if (failed) {
    process.exit(1);
  }

  const registry = buildRegistry(
    verified,
    platform,
    deployCorrelationId,
    verifiedScripts,
  );
  if (!dryRun) {
    const path = writeRegistry(registry, cwd);
    console.log(
      `[apps:verify] wrote registry ${path} (${verified.length} package(s), ${verifiedScripts.length} script(s))`,
    );
  } else {
    console.log(
      `[apps:verify] dry-run ok (${verified.length} package(s), ${verifiedScripts.length} script(s)); registry not written`,
    );
  }
}

main().catch((err) => {
  console.error('[apps:verify] error', err);
  process.exit(1);
});
