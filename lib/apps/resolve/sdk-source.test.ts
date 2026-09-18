import { describe, expect, it, vi } from 'vitest';
import type { PlatformScriptPolicy } from '../scripts/policy/platform-policy';
import {
  bindExtensionToSurface,
  hasAppVersionDrift,
  scriptManifestFromVersion,
} from './sdk-source';

const policy: PlatformScriptPolicy = {
  allowedOrigins: ['https://scripts.example.com'],
  defaultPageScope: { allow: ['/**'], deny: [] },
  defaultConsentCategory: 'marketing',
  defaultMaxLoadMs: 3000,
  maxAllowedLoadMs: 5000,
};

const surface = { id: 'surface-1' };
const extension = {
  id: 'ext-1',
  origin: 'https://scripts.example.com',
  mountPath: '/v1/app.js',
  integrity: 'sha384-abcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcd',
};

const integrity =
  'sha384-abcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcd';

describe('scriptManifestFromVersion (certified trust chain)', () => {
  it('resolves a certified script whose origin is platform-allowlisted', () => {
    const manifest = scriptManifestFromVersion(surface, extension, {}, 'ver-1', policy);
    expect(manifest).not.toBeNull();
    expect(manifest?.scriptUrl).toBe('https://scripts.example.com/v1/app.js');
    expect(manifest?.executableOrigins).toEqual(['https://scripts.example.com']);
    expect(manifest?.name).toBe('@app-script/surface-1');
    expect(manifest?.version).toBe('ver-1');
    expect(manifest?.pageScope).toEqual({ allow: ['/**'], deny: [] });
  });

  it('drops scripts whose origin is not in the platform allowlist', () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const manifest = scriptManifestFromVersion(
      surface,
      { ...extension, origin: 'https://evil.example.com' },
      {},
      'ver-1',
      policy,
    );
    expect(manifest).toBeNull();
    expect(err).toHaveBeenCalled();
  });

  it('drops everything when the allowlist is empty (fail closed)', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const manifest = scriptManifestFromVersion(surface, extension, {}, 'ver-1', {
      ...policy,
      allowedOrigins: [],
    });
    expect(manifest).toBeNull();
  });

  it('ignores self-declared origins in merchant configuration', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    // Merchant config claims its own origin is executable; it must not count.
    const evil = { ...extension, origin: 'https://evil.example.com' };
    const manifest = scriptManifestFromVersion(
      surface,
      evil,
      { executableOrigins: ['https://evil.example.com'] },
      'ver-1',
      policy,
    );
    expect(manifest).toBeNull();
  });

  it('lets merchant config narrow page scope but never widen it', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const certifiedScoped = {
      ...extension,
      pageScope: { allow: ['/blog/**'] },
    };
    const widened = scriptManifestFromVersion(
      surface,
      certifiedScoped,
      { allowPaths: ['/**'] },
      'ver-1',
      policy,
    );
    expect(widened).toBeNull();

    const narrowed = scriptManifestFromVersion(
      surface,
      certifiedScoped,
      { allowPaths: ['/blog/news'] },
      'ver-1',
      policy,
    );
    expect(narrowed?.pageScope.allow).toEqual(['/blog/news']);
  });

  it('ignores merchant consent/budget widening and capability grants', () => {
    const manifest = scriptManifestFromVersion(
      surface,
      extension,
      {
        consentCategory: 'essential',
        maxLoadMs: 60_000,
        restrictedPagesAllowed: true,
        name: 'spoofed',
        version: '9.9.9',
      },
      'ver-1',
      policy,
    );
    expect(manifest?.consentCategory).toBe('marketing');
    expect(manifest?.budgets.maxLoadMs).toBe(3000);
    expect(manifest?.restrictedPagesAllowed).toBe(false);
    expect(manifest?.name).toBe('@app-script/surface-1');
    expect(manifest?.version).toBe('ver-1');
  });

  it('lets merchant config lower the load budget', () => {
    const manifest = scriptManifestFromVersion(
      surface,
      extension,
      { maxLoadMs: 500 },
      'ver-1',
      policy,
    );
    expect(manifest?.budgets.maxLoadMs).toBe(500);
  });
});

describe('bindExtensionToSurface (surface-bound, not projection id)', () => {
  const scriptSurface = {
    id: 'analytics-script',
    kind: 'privileged-storefront-script' as const,
  };
  const boundExt = {
    id: 'analytics-script',
    surfaceKind: 'privileged-storefront-script',
    origin: 'https://scripts.example.com',
    mountPath: '/analytics.js',
    integrity,
    pageScope: { allow: ['/blog/**'] },
    restrictedPagesAllowed: false,
  };
  const privilegedExt = {
    id: 'checkout-helper',
    surfaceKind: 'privileged-storefront-script',
    origin: 'https://scripts.example.com',
    mountPath: '/checkout.js',
    integrity,
    restrictedPagesAllowed: true,
    pageScope: { allow: ['/**'] },
  };

  it('binds the extension that matches the surface id', () => {
    const result = bindExtensionToSurface(
      scriptSurface,
      [boundExt, privilegedExt],
      'analytics-script',
    );
    expect(result).not.toBeNull();
    expect(result?.extension?.id).toBe('analytics-script');
    expect(result?.extension?.restrictedPagesAllowed).toBe(false);
  });

  it('drops when mount extensionId belongs to a different surface', () => {
    const result = bindExtensionToSurface(
      scriptSurface,
      [boundExt, privilegedExt],
      'checkout-helper',
    );
    expect(result).toBeNull();
  });

  it('does not let a foreign extensionId inherit elevated restrictedPagesAllowed', () => {
    const result = bindExtensionToSurface(
      scriptSurface,
      [boundExt, privilegedExt],
      'checkout-helper',
    );
    // Old bug: e.id === m.extensionId would return privilegedExt.
    expect(result).toBeNull();
    // Surface-bound path still yields the analytics extension policy only.
    const ok = bindExtensionToSurface(
      scriptSurface,
      [boundExt, privilegedExt],
      'analytics-script',
    );
    expect(ok?.extension?.restrictedPagesAllowed).not.toBe(true);
  });

  it('allows standalone surface with extensionId equal to surface id', () => {
    const result = bindExtensionToSurface(
      scriptSurface,
      [],
      'analytics-script',
    );
    expect(result).not.toBeNull();
    expect(result?.extension).toBeUndefined();
  });

  it('rejects mismatched extensionId on standalone surface', () => {
    const result = bindExtensionToSurface(
      scriptSurface,
      [],
      'some-other-extension',
    );
    expect(result).toBeNull();
  });

  it('rejects extension whose surfaceKind does not match surface.kind', () => {
    const wrongKind = {
      ...boundExt,
      surfaceKind: 'admin-iframe',
    };
    const result = bindExtensionToSurface(
      scriptSurface,
      [wrongKind],
      'analytics-script',
    );
    // No matching extension; expected id is still surface.id, so matching
    // extensionId is accepted as standalone (no extension record).
    expect(result).not.toBeNull();
    expect(result?.extension).toBeUndefined();
  });
});

describe('hasAppVersionDrift', () => {
  it('returns false when mount and installation pin match', () => {
    expect(hasAppVersionDrift('ver-1', 'ver-1')).toBe(false);
  });

  it('returns true when mount claims a different version than the install pin', () => {
    expect(hasAppVersionDrift('ver-stale', 'ver-1')).toBe(true);
  });
});
