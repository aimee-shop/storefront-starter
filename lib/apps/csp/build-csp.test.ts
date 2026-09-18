import { describe, expect, it } from 'vitest';
import { buildScriptSrcDirective, buildStorefrontCsp } from './build-csp';

const base = {
  appScriptOrigins: ['https://scripts.example.com'],
  restricted: false,
  connectExtra: ['https://api.example.com'],
  imgExtra: ['https://images.example.com'],
};

describe('buildScriptSrcDirective', () => {
  it('uses unsafe-inline + host allowlist on non-restricted routes', () => {
    const dir = buildScriptSrcDirective(base);
    expect(dir).toContain("'unsafe-inline'");
    expect(dir).toContain('https://scripts.example.com');
    expect(dir).not.toContain('nonce-');
    expect(dir).not.toContain('unsafe-eval');
    expect(dir).not.toContain('strict-dynamic');
  });

  it('uses the nonce and drops app origins on restricted routes', () => {
    const dir = buildScriptSrcDirective({ ...base, restricted: true, nonce: 'abc123' });
    expect(dir).toContain("'nonce-abc123'");
    expect(dir).not.toContain("'unsafe-inline'");
    expect(dir).not.toContain('https://scripts.example.com');
  });
});

describe('buildStorefrontCsp', () => {
  it('keeps hardened baseline directives', () => {
    const csp = buildStorefrontCsp(base);
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("base-uri 'self'");
    expect(csp).toContain("frame-ancestors 'self'");
    expect(csp).toContain('https://api.example.com');
  });

  it('img-src has no open https: wildcard and includes declared hosts', () => {
    const csp = buildStorefrontCsp(base);
    const img = csp.split('; ').find((d) => d.startsWith('img-src'));
    expect(img).toBeDefined();
    expect(img).not.toMatch(/ https:( |$)/);
    expect(img).toContain('https://images.example.com');
    expect(img).toContain('https://scripts.example.com');
  });

  it('font-src has no open https: wildcard', () => {
    const font = buildStorefrontCsp(base)
      .split('; ')
      .find((d) => d.startsWith('font-src'));
    expect(font).not.toMatch(/ https:( |$)/);
  });

  it('excludes app script origins everywhere on restricted routes', () => {
    const csp = buildStorefrontCsp({ ...base, restricted: true, nonce: 'abc123' });
    expect(csp).not.toContain('https://scripts.example.com');
    expect(csp).toContain("'nonce-abc123'");
  });
});
