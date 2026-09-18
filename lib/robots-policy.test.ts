import { describe, expect, it } from 'vitest';
import { buildRobots, isSandboxNoindex } from './robots-policy';

describe('isSandboxNoindex', () => {
  it('indexes when env is unset', () => {
    expect(isSandboxNoindex({})).toBe(false);
  });

  it('indexes production', () => {
    expect(isSandboxNoindex({ NEXT_PUBLIC_AIMEE_ENV: 'production' })).toBe(
      false,
    );
    expect(isSandboxNoindex({ NEXT_PUBLIC_AIMEE_ENV: 'prod' })).toBe(false);
  });

  it('noindexes local/sandbox and explicit flag', () => {
    expect(isSandboxNoindex({ NEXT_PUBLIC_AIMEE_ENV: 'local' })).toBe(true);
    expect(isSandboxNoindex({ NEXT_PUBLIC_AIMEE_ENV: 'sandbox' })).toBe(true);
    expect(isSandboxNoindex({ NEXT_PUBLIC_NOINDEX: 'true' })).toBe(true);
    expect(
      isSandboxNoindex({
        NEXT_PUBLIC_AIMEE_ENV: 'production',
        NEXT_PUBLIC_NOINDEX: '1',
      }),
    ).toBe(true);
  });
});

describe('buildRobots', () => {
  it('omits sitemap and disallows all when noindex', () => {
    const robots = buildRobots('https://preview.example', {
      NEXT_PUBLIC_NOINDEX: 'true',
    });
    expect(robots.sitemap).toBeUndefined();
    expect(robots.rules.disallow).toBe('/');
  });

  it('keeps catalog allow-list in production', () => {
    const robots = buildRobots('https://store.example', {
      NEXT_PUBLIC_AIMEE_ENV: 'production',
    });
    expect(robots.sitemap).toBe('https://store.example/sitemap.xml');
    expect(robots.rules.disallow).toEqual(['/account', '/dev']);
  });
});
