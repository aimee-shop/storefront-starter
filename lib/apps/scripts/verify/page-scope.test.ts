import { describe, expect, it } from 'vitest';
import {
  DEFAULT_RESTRICTED_PATH_PREFIXES,
  isPathInScriptScope,
  isRestrictedPath,
  matchPathPattern,
  normalizePathname,
  resolveRestrictedPathPrefixes,
} from './page-scope';

describe('page-scope', () => {
  it('normalizes pathnames', () => {
    expect(normalizePathname('/products/')).toBe('/products');
    expect(normalizePathname('products')).toBe('/products');
    expect(normalizePathname('/checkout?x=1')).toBe('/checkout');
  });

  it('matches patterns', () => {
    expect(matchPathPattern('/products/a', '/products/*')).toBe(true);
    expect(matchPathPattern('/products/a/b', '/products/*')).toBe(false);
    expect(matchPathPattern('/products/a/b', '/products/**')).toBe(true);
    expect(matchPathPattern('/anything', '/**')).toBe(true);
  });

  it('matches on segment boundaries only', () => {
    expect(matchPathPattern('/foobar', '/foo/**')).toBe(false);
    expect(matchPathPattern('/foobar', '/foo')).toBe(false);
    expect(matchPathPattern('/foo', '/foo/**')).toBe(true);
    expect(matchPathPattern('/foo/bar', '/foo')).toBe(true);
  });

  it("'/*' matches exactly one segment, not everything", () => {
    expect(matchPathPattern('/a', '/*')).toBe(true);
    expect(matchPathPattern('/a/b', '/*')).toBe(false);
    expect(matchPathPattern('/', '/*')).toBe(false);
  });

  it('rejects patterns with a non-trailing globstar (fail closed)', () => {
    expect(matchPathPattern('/a/x/b', '/a/**/b')).toBe(false);
  });

  it('merges extra restricted prefixes from env config', () => {
    const merged = resolveRestrictedPathPrefixes('/en/checkout, /fr/checkout/');
    expect(merged).toContain('/en/checkout');
    expect(merged).toContain('/fr/checkout');
    for (const p of DEFAULT_RESTRICTED_PATH_PREFIXES) {
      expect(merged).toContain(p);
    }
    // Invalid entries (relative, empty) are dropped.
    expect(resolveRestrictedPathPrefixes('checkout,,/')).toEqual([
      ...DEFAULT_RESTRICTED_PATH_PREFIXES,
    ]);
  });

  it('forwards custom restricted prefixes through isPathInScriptScope', () => {
    expect(
      isPathInScriptScope('/en/checkout', { allow: ['/**'] }, {
        restrictedPrefixes: [...DEFAULT_RESTRICTED_PATH_PREFIXES, '/en/checkout'],
      }),
    ).toBe(false);
    expect(
      isPathInScriptScope('/en/checkout', { allow: ['/**'] }),
    ).toBe(true);
  });

  it('identifies restricted paths', () => {
    expect(isRestrictedPath('/checkout')).toBe(true);
    expect(isRestrictedPath('/checkout/confirmation')).toBe(true);
    expect(isRestrictedPath('/account/payment-methods')).toBe(true);
    expect(isRestrictedPath('/account/reset-password')).toBe(true);
    expect(isRestrictedPath('/products/hat')).toBe(false);
  });

  it('blocks restricted pages unless capability set', () => {
    expect(
      isPathInScriptScope('/checkout', { allow: ['/**'] }, { restrictedPagesAllowed: false }),
    ).toBe(false);
    expect(
      isPathInScriptScope('/checkout', { allow: ['/**'] }, { restrictedPagesAllowed: true }),
    ).toBe(true);
  });

  it('deny wins over allow', () => {
    expect(
      isPathInScriptScope(
        '/blog/secret',
        { allow: ['/**'], deny: ['/blog/**'] },
        { restrictedPagesAllowed: false },
      ),
    ).toBe(false);
  });

  it('allow list restricts when present', () => {
    expect(
      isPathInScriptScope('/products/x', { allow: ['/blog/**'] }),
    ).toBe(false);
    expect(
      isPathInScriptScope('/blog/x', { allow: ['/blog/**'] }),
    ).toBe(true);
  });
});
