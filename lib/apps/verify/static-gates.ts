import { readFileSync, statSync } from 'node:fs';
import { join, normalize, relative, resolve, sep } from 'node:path';
import { PACKAGE_ERROR_CODES, PackageVerifyError } from '../errors';
import type { StorefrontPackageManifest } from '../types';
import { listPackageFiles } from './checksum';

/** Resolve entry path and reject traversal outside packageRoot. */
export function resolvePackageEntry(
  packageRoot: string,
  entry: string,
): string {
  const root = resolve(packageRoot);
  const abs = resolve(root, entry);
  const rel = relative(root, abs);
  if (rel.startsWith('..') || rel.startsWith(`..${sep}`) || normalize(entry).startsWith('..')) {
    throw new PackageVerifyError(
      PACKAGE_ERROR_CODES.MANIFEST_INVALID,
      `Export entry escapes package root: ${entry}`,
    );
  }
  if (!abs.startsWith(root + sep) && abs !== root) {
    throw new PackageVerifyError(
      PACKAGE_ERROR_CODES.MANIFEST_INVALID,
      `Export entry escapes package root: ${entry}`,
    );
  }
  return abs;
}

/** Node / browser APIs that storefront packages must not use. */
const FORBIDDEN_PATTERNS: Array<{ re: RegExp; reason: string }> = [
  { re: /\beval\s*\(/, reason: 'eval()' },
  { re: /\bnew\s+Function\s*\(/, reason: 'new Function()' },
  { re: /\bFunction\s*\(\s*['"`]/, reason: 'Function constructor' },
  { re: /\bFunction\s*\(/, reason: 'Function(' },
  { re: /child_process/, reason: 'child_process' },
  { re: /node:child_process/, reason: 'node:child_process' },
  { re: /process\.env/, reason: 'process.env access' },
  { re: /process\s*\[\s*['"]env['"]\s*\]/, reason: 'process[env] access' },
  { re: /AIMEE_API_KEY/, reason: 'AIMEE_API_KEY reference' },
  { re: /from\s+['"]node:fs['"]/, reason: 'node:fs import' },
  { re: /from\s+['"]fs['"]/, reason: 'fs import' },
  { re: /import\s*\(\s*['"]node:/, reason: 'dynamic import of node builtin' },
  { re: /require\s*\(\s*['"]fs['"]\s*\)/, reason: 'require(fs)' },
  { re: /require\s*\(\s*['"]node:fs['"]\s*\)/, reason: 'require(node:fs)' },
  { re: /from\s+['"]node:net['"]/, reason: 'node:net' },
  { re: /from\s+['"]node:http['"]/, reason: 'node:http' },
  { re: /from\s+['"]node:https['"]/, reason: 'node:https' },
  { re: /from\s+['"]node:worker_threads['"]/, reason: 'worker_threads' },
];

/** Remote executable loading patterns (undeclared dynamic code). */
const REMOTE_CODE_PATTERNS: Array<{ re: RegExp; reason: string }> = [
  { re: /import\s*\(\s*['"`]https?:\/\//, reason: 'dynamic import of remote URL' },
  { re: /from\s+['"]https?:\/\//, reason: 'static import of remote URL' },
  {
    re: /\.then\s*\(\s*eval\s*\)/,
    reason: 'eval of remote response',
  },
  {
    re: /document\.write\s*\(/,
    reason: 'document.write',
  },
  {
    re: /createElement\s*\(\s*['"]script['"]\s*\)/,
    reason: 'dynamic script element',
  },
];

const CODE_EXT = /\.(tsx?|jsx?|mjs|cjs)$/;

/**
 * Fail closed on forbidden APIs, undeclared remote code, budgets, and
 * server/client boundary violations.
 */
export function assertStaticGates(
  packageRoot: string,
  manifest: StorefrontPackageManifest,
): void {
  assertBudget(packageRoot, manifest);
  const files = listPackageFiles(packageRoot).filter((f) => CODE_EXT.test(f));

  for (const rel of files) {
    const source = readFileSync(join(packageRoot, rel), 'utf8');
    for (const { re, reason } of REMOTE_CODE_PATTERNS) {
      if (re.test(source)) {
        throw new PackageVerifyError(
          PACKAGE_ERROR_CODES.UNDECLARED_REMOTE,
          `Undeclared remote/executable code in ${rel}: ${reason}`,
          { file: rel, reason },
        );
      }
    }
    for (const { re, reason } of FORBIDDEN_PATTERNS) {
      if (re.test(source)) {
        throw new PackageVerifyError(
          PACKAGE_ERROR_CODES.FORBIDDEN_API,
          `Forbidden API in ${rel}: ${reason}`,
          { file: rel, reason },
        );
      }
    }
  }

  assertBoundaries(packageRoot, manifest);
}

function assertBudget(
  packageRoot: string,
  manifest: StorefrontPackageManifest,
): void {
  const max = manifest.budgets?.maxBundleBytes;
  if (typeof max !== 'number' || max < 0) {
    throw new PackageVerifyError(
      PACKAGE_ERROR_CODES.MANIFEST_INVALID,
      'budgets.maxBundleBytes is required',
    );
  }
  let total = 0;
  for (const rel of listPackageFiles(packageRoot)) {
    if (rel === 'signature.json') continue;
    total += statSync(join(packageRoot, rel)).size;
  }
  if (total > max) {
    throw new PackageVerifyError(
      PACKAGE_ERROR_CODES.BUDGET,
      `Package size ${total} bytes exceeds budget ${max}`,
      { total, max },
    );
  }
}

/**
 * Browser-only exports must not import Node built-ins.
 * (Server exports are still scanned for forbidden APIs above.)
 */
function assertBoundaries(
  packageRoot: string,
  manifest: StorefrontPackageManifest,
): void {
  const nodeBuiltin =
    /from\s+['"]node:|require\s*\(\s*['"]node:|from\s+['"]fs['"]|from\s+['"]path['"]|from\s+['"]os['"]|from\s+['"]crypto['"]/;

  for (const exp of manifest.exports) {
    const browserOnly =
      exp.environments.includes('browser') && !exp.environments.includes('server');
    if (!browserOnly) continue;
    const abs = resolvePackageEntry(packageRoot, exp.entry);
    let source: string;
    try {
      source = readFileSync(abs, 'utf8');
    } catch {
      throw new PackageVerifyError(
        PACKAGE_ERROR_CODES.MANIFEST_INVALID,
        `Export entry missing: ${exp.entry}`,
      );
    }
    if (nodeBuiltin.test(source)) {
      throw new PackageVerifyError(
        PACKAGE_ERROR_CODES.BOUNDARY,
        `Browser export "${exp.id}" imports Node built-ins`,
        { exportId: exp.id, entry: exp.entry },
      );
    }
  }
}
