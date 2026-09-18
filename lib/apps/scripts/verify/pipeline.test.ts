import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SCRIPT_ERROR_CODES } from '../errors';
import type { PrivilegedScriptManifest, ResolvedScriptCandidate } from '../types';
import { verifyScript } from './pipeline';

const cwd = process.cwd();

function loadManifest(dir: string): PrivilegedScriptManifest {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const raw = require('node:fs').readFileSync(
    join(cwd, 'fixtures/apps/scripts', dir, 'aimee.storefront-script.json'),
    'utf8',
  );
  return JSON.parse(raw) as PrivilegedScriptManifest;
}

function candidate(
  dir: string,
  overrides: Partial<ResolvedScriptCandidate> = {},
): ResolvedScriptCandidate {
  const baseManifest = loadManifest(dir);
  const { manifest: overrideManifest, ...rest } = overrides;
  return {
    mountId: `mount-${dir}`,
    installationId: 'install-1',
    appVersionId: 'version-1',
    merchantConsentState: 'granted',
    fixtureRoot: join(cwd, 'fixtures/apps/scripts', dir),
    fixtureMode: true,
    ...rest,
    manifest: overrideManifest ?? baseManifest,
  };
}

describe('verifyScript fail-closed gates', () => {
  it('mounts reference script fixture with integrity pin', () => {
    const result = verifyScript(candidate('reference-signed'), {
      fixtureMode: true,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.script.name).toBe('@aimee-fixtures/reference-script');
    expect(result.script.merchantConsentState).toBe('granted');
    expect(result.script.integrity).toMatch(/^sha384-/);
    expect(result.script.rollback?.integrity).toMatch(/^sha384-/);
    expect(result.script.restrictedPagesAllowed).toBe(false);
  });

  it('fails bad integrity with SCRIPT_INTEGRITY_INVALID', () => {
    const result = verifyScript(candidate('bad-integrity'), { fixtureMode: true });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe(SCRIPT_ERROR_CODES.INTEGRITY_INVALID);
  });

  it('fails http URL with SCRIPT_URL_INVALID', () => {
    const result = verifyScript(candidate('http-url'), { fixtureMode: true });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe(SCRIPT_ERROR_CODES.URL_INVALID);
  });

  it('fails missing merchant consent with SCRIPT_CONSENT_REQUIRED', () => {
    const result = verifyScript(
      candidate('missing-consent', { merchantConsentState: 'pending' }),
      { fixtureMode: true },
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe(SCRIPT_ERROR_CODES.CONSENT_REQUIRED);
  });

  it('fails unhealthy with SCRIPT_HEALTH_BLOCKED', () => {
    const result = verifyScript(candidate('unhealthy'), { fixtureMode: true });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe(SCRIPT_ERROR_CODES.HEALTH_BLOCKED);
  });

  it('fails undeclared origin with SCRIPT_ORIGIN_MISMATCH', () => {
    const result = verifyScript(candidate('undeclared-origin'), {
      fixtureMode: true,
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe(SCRIPT_ERROR_CODES.ORIGIN_MISMATCH);
  });

  it('fails over-budget meta with SCRIPT_BUDGET_INVALID', () => {
    const result = verifyScript(candidate('over-budget'), { fixtureMode: true });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe(SCRIPT_ERROR_CODES.BUDGET_INVALID);
  });

  it('rejects relative URLs outside fixture mode', () => {
    const result = verifyScript(
      candidate('reference-signed', { fixtureMode: false }),
      { fixtureMode: false },
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe(SCRIPT_ERROR_CODES.URL_INVALID);
  });
});

describe('verifyScript platform origin allowlist (defense in depth)', () => {
  const httpsManifest: PrivilegedScriptManifest = {
    name: '@app-script/surface-1',
    version: 'ver-1',
    scriptUrl: 'https://scripts.example.com/v1/app.js',
    integrity:
      'sha384-9ZkDOxyLpBxLRa1vAYIOvMOy6ddblTk5mH4vppXVL+eHS293nHzdukxXlIU+fImY',
    executableOrigins: ['https://scripts.example.com'],
    consentCategory: 'marketing',
    pageScope: { allow: ['/**'] },
    budgets: { maxLoadMs: 3000 },
    healthStatus: 'healthy',
  };

  function httpsCandidate(): ResolvedScriptCandidate {
    return {
      mountId: 'mount-https',
      installationId: 'install-1',
      appVersionId: 'version-1',
      merchantConsentState: 'granted',
      manifest: httpsManifest,
    };
  }

  it('rejects a script whose origin is outside the platform allowlist', () => {
    const result = verifyScript(httpsCandidate(), {
      fixtureMode: false,
      platformAllowedOrigins: ['https://other.example.com'],
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe(SCRIPT_ERROR_CODES.ORIGIN_MISMATCH);
  });

  it('passes and intersects origins when the allowlist covers the script', () => {
    const result = verifyScript(httpsCandidate(), {
      fixtureMode: false,
      platformAllowedOrigins: ['https://scripts.example.com'],
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.script.executableOrigins).toEqual(['https://scripts.example.com']);
  });
});

describe('verifyScript fixtureMode production guard', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('throws SCRIPT_CERTIFICATION when fixtureMode is on under NODE_ENV=production', () => {
    vi.stubEnv('NODE_ENV', 'production');
    const result = verifyScript(candidate('reference-signed'), {
      fixtureMode: true,
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe(SCRIPT_ERROR_CODES.CERTIFICATION);
    expect(result.message).toMatch(/fixtureMode.*production/i);
  });

  it('still allows fixtureMode outside production', () => {
    vi.stubEnv('NODE_ENV', 'test');
    const result = verifyScript(candidate('reference-signed'), {
      fixtureMode: true,
    });
    expect(result.ok).toBe(true);
  });
});
