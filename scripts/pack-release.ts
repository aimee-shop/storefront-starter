#!/usr/bin/env tsx
/**
 * Build a public starter archive from the tracked git tree.
 *
 *   npx tsx scripts/pack-release.ts
 *   npx tsx scripts/pack-release.ts --check
 *
 * Excludes private CI, secrets, caches, and local env files. Fails closed
 * if the staged tree still contains secret-like material.
 */

import { execFileSync } from 'node:child_process';
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
export const DEFAULT_REPO_ROOT = join(SCRIPT_DIR, '..');

const EXACT_EXCLUDE = new Set([
  '.gitlab-ci.yml',
  'renovate.json',
  'docs/public-release.md',
  'scripts/publish-public-release.sh',
]);

const PREFIX_EXCLUDE = [
  'node_modules/',
  '.next/',
  '.git/',
  '.vercel/',
  'coverage/',
  '.lighthouseci/',
  'lhci-reports/',
  'e2e/test-results/',
  'e2e/playwright-report/',
  'test-results/',
  'playwright-report/',
  '.generated/',
  '.worktrees/',
  'dist/',
  '.claude/',
];

const SECRET_KEY =
  /\b(?:sk|pk)_(?:(?:live|test)_)?[A-Za-z0-9]{12,}\b/;
const AWS_KEY = /\bAKIA[0-9A-Z]{16}\b/;
const GITHUB_TOKEN = /\b(?:ghp_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,})\b/;
const NPM_AUTH_TOKEN =
  /(?:\bnpm_[A-Za-z0-9]{20,}\b|:_authToken=(?!\$\{NPM_TOKEN\})[A-Za-z0-9._-]{8,})/;
const PRIVATE_KEY_BLOCK = /-----BEGIN (?:RSA |OPENSSH |EC )?PRIVATE KEY-----/;

export type PackOptions = {
  repoRoot: string;
  outDir: string;
  checkOnly?: boolean;
};

export type PackResult = {
  version: string;
  files: string[];
  archivePath: string | null;
};

function posix(path: string): string {
  return path.split(sep).join('/');
}

export function isExcluded(relativePath: string): boolean {
  const p = posix(relativePath).replace(/^\.\//, '');
  if (EXACT_EXCLUDE.has(p)) return true;
  if (PREFIX_EXCLUDE.some((prefix) => p === prefix.slice(0, -1) || p.startsWith(prefix))) {
    return true;
  }
  const base = p.split('/').pop() ?? p;
  if (base === '.env' || base.endsWith('.local') || base.endsWith('.pem')) {
    return true;
  }
  if (base === '.env.example') return false;
  if (base.startsWith('.env')) return true;
  if (base.endsWith('.tsbuildinfo')) return true;
  return false;
}

export function scanForSecrets(relativePath: string, content: string): string[] {
  const hits: string[] = [];
  const p = posix(relativePath);
  const base = p.split('/').pop() ?? p;
  if (base === '.env' || base === '.env.local' || /\.env\..*\.local$/.test(base)) {
    hits.push(`${p}: env file must not ship in the public archive`);
  }
  if (SECRET_KEY.test(content)) {
    hits.push(`${p}: looks like a live sk_/pk_ key`);
  }
  if (AWS_KEY.test(content)) {
    hits.push(`${p}: looks like an AWS access key id`);
  }
  if (GITHUB_TOKEN.test(content)) {
    hits.push(`${p}: looks like a GitHub token`);
  }
  if (NPM_AUTH_TOKEN.test(content)) {
    hits.push(`${p}: looks like an npm auth token`);
  }
  if (PRIVATE_KEY_BLOCK.test(content)) {
    hits.push(`${p}: looks like a private key block`);
  }
  return hits;
}

function gitLsFiles(repoRoot: string): string[] {
  const out = execFileSync('git', ['ls-files', '-z'], {
    cwd: repoRoot,
    encoding: 'utf8',
  });
  return out.split('\0').filter(Boolean);
}

function readVersion(repoRoot: string): string {
  const pkg = JSON.parse(
    readFileSync(join(repoRoot, 'package.json'), 'utf8'),
  ) as { version?: string };
  if (!pkg.version) {
    throw new Error('package.json is missing version');
  }
  return pkg.version;
}

function copyTrackedFiles(repoRoot: string, stagingDir: string, files: string[]): void {
  for (const file of files) {
    // Index blob, not the worktree: CI overwrites .npmrc with NPM_TOKEN.
    const blob = execFileSync('git', ['show', `:${file}`], { cwd: repoRoot });
    const to = join(stagingDir, file);
    mkdirSync(dirname(to), { recursive: true });
    writeFileSync(to, blob);
  }
}

function scanStaging(stagingDir: string, files: string[]): string[] {
  const hits: string[] = [];
  for (const file of files) {
    const buf = readFileSync(join(stagingDir, file));
    if (buf.includes(0)) continue;
    hits.push(...scanForSecrets(file, buf.toString('utf8')));
  }
  return hits;
}

export function packRelease(options: PackOptions): PackResult {
  const repoRoot = options.repoRoot;
  const version = readVersion(repoRoot);
  const tracked = gitLsFiles(repoRoot);
  const files = tracked.filter((file) => !isExcluded(file)).sort();
  if (files.length === 0) {
    throw new Error('pack-release: no files to archive');
  }

  const stagingDir = mkdtempSync(join(tmpdir(), 'storefront-starter-pack-'));
  try {
    copyTrackedFiles(repoRoot, stagingDir, files);
    const hits = scanStaging(stagingDir, files);
    if (hits.length > 0) {
      throw new Error(
        `pack-release: refusing to publish secrets:\n${hits.join('\n')}`,
      );
    }

    if (options.checkOnly) {
      return { version, files, archivePath: null };
    }

    mkdirSync(options.outDir, { recursive: true });
    const archivePath = join(
      options.outDir,
      `storefront-starter-${version}.tar.gz`,
    );
    execFileSync('tar', ['-czf', archivePath, '-C', stagingDir, '.'], {
      stdio: 'inherit',
    });
    writeFileSync(
      join(options.outDir, `storefront-starter-${version}.files.txt`),
      `${files.join('\n')}\n`,
    );
    return { version, files, archivePath };
  } finally {
    rmSync(stagingDir, { recursive: true, force: true });
  }
}

const invoked = process.argv[1] ? posix(process.argv[1]) : '';
if (invoked.endsWith('/pack-release.ts') || invoked.endsWith('/pack-release.js')) {
  const checkOnly = process.argv.includes('--check');
  const result = packRelease({
    repoRoot: DEFAULT_REPO_ROOT,
    outDir: join(DEFAULT_REPO_ROOT, 'dist'),
    checkOnly,
  });
  const mode = checkOnly ? 'check' : 'pack';
  console.log(
    `pack-release ${mode}: ${result.files.length} files, version ${result.version}` +
      (result.archivePath ? `, wrote ${result.archivePath}` : ''),
  );
}
