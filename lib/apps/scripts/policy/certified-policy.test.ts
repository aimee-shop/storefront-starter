import { describe, expect, it } from 'vitest';
import {
  certifiedPolicyFromManifest,
  narrowWithMerchantConfig,
  patternCovers,
} from './certified-policy';
import type { PlatformScriptPolicy } from './platform-policy';

const policy: PlatformScriptPolicy = {
  allowedOrigins: ['https://scripts.example.com', 'https://cdn.example.com'],
  defaultPageScope: { allow: ['/**'], deny: [] },
  defaultConsentCategory: 'marketing',
  defaultMaxLoadMs: 3000,
  maxAllowedLoadMs: 5000,
};

const ORIGIN = 'https://scripts.example.com';

describe('patternCovers', () => {
  it('globstar root covers everything', () => {
    expect(patternCovers('/**', '/blog/**')).toBe(true);
    expect(patternCovers('/**', '/a/b/c')).toBe(true);
    expect(patternCovers('/**', '/x/*')).toBe(true);
  });

  it('subtree covers descendants on segment boundaries only', () => {
    expect(patternCovers('/foo/**', '/foo/bar')).toBe(true);
    expect(patternCovers('/foo/**', '/foo/bar/**')).toBe(true);
    expect(patternCovers('/foo/**', '/foobar')).toBe(false);
    expect(patternCovers('/foo', '/foo/bar')).toBe(true);
    expect(patternCovers('/foo', '/foobar')).toBe(false);
  });

  it('never lets a wider merchant pattern pass', () => {
    expect(patternCovers('/blog/**', '/**')).toBe(false);
    expect(patternCovers('/blog/news', '/blog/**')).toBe(false);
    expect(patternCovers('/foo/*', '/foo/**')).toBe(false);
    expect(patternCovers('/foo', '/*')).toBe(false);
  });

  it('rejects invalid patterns (non-trailing globstar)', () => {
    expect(patternCovers('/**', '/a/**/b')).toBe(false);
    expect(patternCovers('/a/**/b', '/a/x/b')).toBe(false);
  });
});

describe('certifiedPolicyFromManifest', () => {
  it('intersects certified origins with the platform allowlist', () => {
    const certified = certifiedPolicyFromManifest(
      {
        origin: ORIGIN,
        executableOrigins: ['https://cdn.example.com', 'https://evil.example.com'],
      },
      ORIGIN,
      policy,
    );
    expect(certified.executableOrigins.sort()).toEqual([
      'https://cdn.example.com',
      'https://scripts.example.com',
    ]);
  });

  it('yields no origins when the platform allowlist is empty', () => {
    const certified = certifiedPolicyFromManifest({ origin: ORIGIN }, ORIGIN, {
      ...policy,
      allowedOrigins: [],
    });
    expect(certified.executableOrigins).toEqual([]);
  });

  it('applies fail-closed defaults when the manifest lacks policy fields', () => {
    const certified = certifiedPolicyFromManifest({ origin: ORIGIN }, ORIGIN, policy);
    expect(certified.pageScope).toEqual({ allow: ['/**'], deny: [] });
    expect(certified.consentCategory).toBe('marketing');
    expect(certified.maxLoadMs).toBe(3000);
    expect(certified.restrictedPagesAllowed).toBe(false);
  });

  it('honors certified manifest policy fields and clamps the budget', () => {
    const certified = certifiedPolicyFromManifest(
      {
        origin: ORIGIN,
        pageScope: { allow: ['/blog/**'], deny: ['/blog/private/**'] },
        consentCategory: 'analytics',
        budgets: { maxLoadMs: 60_000 },
      },
      ORIGIN,
      policy,
    );
    expect(certified.pageScope.allow).toEqual(['/blog/**']);
    expect(certified.pageScope.deny).toEqual(['/blog/private/**']);
    expect(certified.consentCategory).toBe('analytics');
    expect(certified.maxLoadMs).toBe(policy.maxAllowedLoadMs);
  });
});

describe('narrowWithMerchantConfig', () => {
  const certified = certifiedPolicyFromManifest(
    { origin: ORIGIN, pageScope: { allow: ['/blog/**'], deny: [] } },
    ORIGIN,
    policy,
  );

  it('rejects merchant allow paths that escape the certified scope', () => {
    expect(
      narrowWithMerchantConfig(certified, { allowPaths: ['/**'] }, policy),
    ).toBeNull();
    expect(
      narrowWithMerchantConfig(certified, { allowPaths: ['/products/**'] }, policy),
    ).toBeNull();
  });

  it('keeps merchant paths covered by the certified scope', () => {
    const narrowed = narrowWithMerchantConfig(
      certified,
      { allowPaths: ['/blog/news', '/blog/press/**'] },
      policy,
    );
    expect(narrowed?.pageScope.allow).toEqual(['/blog/news', '/blog/press/**']);
  });

  it('unions merchant deny paths and takes the minimum budget', () => {
    const narrowed = narrowWithMerchantConfig(
      certified,
      { denyPaths: ['/blog/drafts/**'], maxLoadMs: 60_000 },
      policy,
    );
    expect(narrowed?.pageScope.deny).toEqual(['/blog/drafts/**']);
    expect(narrowed?.maxLoadMs).toBe(certified.maxLoadMs);
    const lowered = narrowWithMerchantConfig(certified, { maxLoadMs: 500 }, policy);
    expect(lowered?.maxLoadMs).toBe(500);
  });

  it('ignores merchant attempts to change origins, consent, or capability', () => {
    const narrowed = narrowWithMerchantConfig(
      certified,
      {
        executableOrigins: ['https://evil.example.com'],
        consentCategory: 'essential',
        restrictedPagesAllowed: true,
      },
      policy,
    );
    expect(narrowed?.executableOrigins).toEqual(certified.executableOrigins);
    expect(narrowed?.consentCategory).toBe(certified.consentCategory);
    expect(narrowed?.restrictedPagesAllowed).toBe(false);
  });
});
