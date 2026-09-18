import { createHash, timingSafeEqual } from 'node:crypto';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const SIGNATURE_FILE = 'signature.json';

/**
 * Canonical package digest: sorted relative paths + file bytes.
 * signature.json is excluded so the signature can cover the package payload.
 */
export function computePackageSha256(packageRoot: string): string {
  const files = listPackageFiles(packageRoot).filter((f) => f !== SIGNATURE_FILE);
  const hash = createHash('sha256');
  for (const rel of files) {
    hash.update(rel);
    hash.update('\0');
    hash.update(readFileSync(join(packageRoot, rel)));
    hash.update('\0');
  }
  return hash.digest('hex');
}

export function listPackageFiles(packageRoot: string): string[] {
  return walk(packageRoot, packageRoot).sort();
}

function walk(dir: string, base: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir).sort()) {
    const abs = join(dir, name);
    const st = statSync(abs);
    if (st.isDirectory()) {
      out.push(...walk(abs, base));
    } else {
      out.push(relative(base, abs).split('\\').join('/'));
    }
  }
  return out;
}

export function timingSafeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  try {
    const ba = Buffer.from(a, 'hex');
    const bb = Buffer.from(b, 'hex');
    if (ba.length !== bb.length || ba.length === 0) return false;
    return timingSafeEqual(ba, bb);
  } catch {
    return false;
  }
}
