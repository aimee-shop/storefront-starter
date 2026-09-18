import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { PACKAGE_ERROR_CODES } from '../errors';
import { loadTrustRegistry } from '../trust/registry';
import type { PlatformVersions, ResolvedPackageCandidate } from '../types';
import { verifyPackage } from './pipeline';

const cwd = process.cwd();
const platform: PlatformVersions = {
  storefrontStarter: '0.1.0',
  blocks: '0.1.0',
};

function candidate(
  dir: string,
  configuration: unknown = { headline: 'Hello' },
): ResolvedPackageCandidate {
  return {
    packageRoot: join(cwd, 'fixtures/apps/packages', dir),
    configuration,
    mountId: `mount-${dir}`,
    installationId: 'install-1',
    appVersionId: 'version-1',
  };
}

function trust() {
  return loadTrustRegistry(cwd, { allowFixtureTrust: true });
}

describe('verifyPackage fail-closed gates', () => {
  it('mounts reference-signed package at pinned version and config', () => {
    const result = verifyPackage(candidate('reference-signed'), {
      platform,
      trust: trust(),
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.package.packageName).toBe('@aimee-fixtures/reference-banner');
    expect(result.package.packageVersion).toBe('1.0.0');
    expect(result.package.packageSha256).toMatch(/^[a-f0-9]{64}$/);
    expect(result.package.configuration).toEqual({ headline: 'Hello' });
    expect(result.package.exports[0]?.id).toBe('reference-banner');
  });

  it('fails bad signature with PACKAGE_SIGNATURE_INVALID', () => {
    const result = verifyPackage(candidate('bad-signature'), {
      platform,
      trust: trust(),
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe(PACKAGE_ERROR_CODES.SIGNATURE_INVALID);
  });

  it('fails bad checksum claim with PACKAGE_CHECKSUM_MISMATCH', () => {
    const result = verifyPackage(candidate('bad-checksum'), {
      platform,
      trust: trust(),
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe(PACKAGE_ERROR_CODES.CHECKSUM_MISMATCH);
  });

  it('fails incompatible platform range with PACKAGE_COMPAT_RANGE', () => {
    const result = verifyPackage(candidate('incompatible-range'), {
      platform,
      trust: trust(),
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe(PACKAGE_ERROR_CODES.COMPAT_RANGE);
  });

  it('fails undeclared remote code with PACKAGE_UNDECLARED_REMOTE', () => {
    const result = verifyPackage(candidate('undeclared-remote'), {
      platform,
      trust: trust(),
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe(PACKAGE_ERROR_CODES.UNDECLARED_REMOTE);
  });

  it('fails forbidden API with PACKAGE_FORBIDDEN_API', () => {
    const result = verifyPackage(candidate('forbidden-api'), {
      platform,
      trust: trust(),
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe(PACKAGE_ERROR_CODES.FORBIDDEN_API);
  });

  it('fails over-budget with PACKAGE_BUDGET', () => {
    const result = verifyPackage(candidate('over-budget'), {
      platform,
      trust: trust(),
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe(PACKAGE_ERROR_CODES.BUDGET);
  });

  it('fails server/client boundary with PACKAGE_SERVER_CLIENT_BOUNDARY', () => {
    const result = verifyPackage(candidate('boundary-violation'), {
      platform,
      trust: trust(),
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe(PACKAGE_ERROR_CODES.BOUNDARY);
  });

  it('fails invalid configuration with PACKAGE_CONFIG_INVALID', () => {
    const result = verifyPackage(candidate('reference-signed', { headline: '' }), {
      platform,
      trust: trust(),
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe(PACKAGE_ERROR_CODES.CONFIG_INVALID);
  });

  it('fails when expected AppVersion digest mismatches', () => {
    const result = verifyPackage(
      {
        ...candidate('reference-signed'),
        expectedPackageSha256: '0'.repeat(64),
      },
      { platform, trust: trust() },
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe(PACKAGE_ERROR_CODES.CHECKSUM_MISMATCH);
  });
});
