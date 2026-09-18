import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { isExcluded, packRelease, scanForSecrets } from './pack-release';

describe('isExcluded', () => {
  it('keeps template source and .env.example', () => {
    expect(isExcluded('app/page.tsx')).toBe(false);
    expect(isExcluded('.env.example')).toBe(false);
    expect(isExcluded('package-lock.json')).toBe(false);
  });

  it('drops private CI, env files, and caches', () => {
    expect(isExcluded('.gitlab-ci.yml')).toBe(true);
    expect(isExcluded('renovate.json')).toBe(true);
    expect(isExcluded('docs/public-release.md')).toBe(true);
    expect(isExcluded('scripts/publish-public-release.sh')).toBe(true);
    expect(isExcluded('.env.local')).toBe(true);
    expect(isExcluded('.env')).toBe(true);
    expect(isExcluded('node_modules/left-pad/index.js')).toBe(true);
    expect(isExcluded('lhci-reports/manifest.json')).toBe(true);
  });
});

describe('scanForSecrets', () => {
  it('allows placeholders and prefix documentation', () => {
    expect(
      scanForSecrets(
        '.env.example',
        'AIMEE_API_KEY=<your-storefront-api-key>\n# pk_test_/pk_live_ prefix\n',
      ),
    ).toEqual([]);
  });

  it('flags live-looking keys', () => {
    const live = ['sk_live_', 'abcdefghijklmnop'].join('');
    const hits = scanForSecrets('oops.txt', `AIMEE_API_KEY=${live}\n`);
    expect(hits.length).toBeGreaterThan(0);
  });

  it('flags sk_ keys that omit live/test', () => {
    const raw = ['sk_', 'abcdefghijklmnop'].join('');
    const hits = scanForSecrets('oops.txt', `AIMEE_API_KEY=${raw}\n`);
    expect(hits.length).toBeGreaterThan(0);
  });
});

describe('packRelease', () => {
  it('archives tracked template files and refuses gitlab-ci', () => {
    const dir = mkdtempSync(join(tmpdir(), 'pack-release-test-'));
    try {
      execFileSync('git', ['init'], { cwd: dir });
      execFileSync('git', ['config', 'user.email', 'pack@test.local'], {
        cwd: dir,
      });
      execFileSync('git', ['config', 'user.name', 'Pack Test'], { cwd: dir });
      writeFileSync(
        join(dir, 'package.json'),
        JSON.stringify({ name: 'storefront-starter', version: '0.1.0' }),
      );
      writeFileSync(
        join(dir, '.env.example'),
        'AIMEE_API_KEY=<your-storefront-api-key>\n',
      );
      writeFileSync(join(dir, '.gitlab-ci.yml'), 'image: node:24-alpine\n');
      writeFileSync(join(dir, 'renovate.json'), '{}\n');
      mkdirSync(join(dir, 'docs'), { recursive: true });
      writeFileSync(join(dir, 'docs/public-release.md'), '# internal\n');
      mkdirSync(join(dir, 'scripts'), { recursive: true });
      writeFileSync(join(dir, 'scripts/publish-public-release.sh'), '#!/bin/sh\n');
      mkdirSync(join(dir, 'app'), { recursive: true });
      writeFileSync(join(dir, 'app/page.tsx'), 'export default function Page() { return null; }\n');
      execFileSync('git', ['add', '-A'], { cwd: dir });
      execFileSync('git', ['commit', '-m', 'fixture'], { cwd: dir });

      const result = packRelease({
        repoRoot: dir,
        outDir: join(dir, 'dist'),
        checkOnly: true,
      });
      expect(result.files).toContain('app/page.tsx');
      expect(result.files).toContain('.env.example');
      expect(result.files).not.toContain('.gitlab-ci.yml');
      expect(result.files).not.toContain('renovate.json');
      expect(result.files).not.toContain('docs/public-release.md');
      expect(result.files).not.toContain('scripts/publish-public-release.sh');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
