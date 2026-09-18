import { PACKAGE_ERROR_CODES, PackageVerifyError } from '../errors';
import type { PlatformVersions, StorefrontPackageManifest } from '../types';

/**
 * Minimal semver range check for package compatibility.
 * Supports: exact "1.2.3", ">=x.y.z", ">x.y.z", "<=x.y.z", "<x.y.z", "*".
 * Compound ranges with spaces (">=1.0.0 <2.0.0") are AND-ed.
 */
export function assertCompatible(
  manifest: StorefrontPackageManifest,
  platform: PlatformVersions,
): void {
  if (
    !satisfiesRange(platform.storefrontStarter, manifest.compatible.storefrontStarter)
  ) {
    throw new PackageVerifyError(
      PACKAGE_ERROR_CODES.COMPAT_RANGE,
      `storefrontStarter ${platform.storefrontStarter} does not satisfy ${manifest.compatible.storefrontStarter}`,
    );
  }
  if (!satisfiesRange(platform.blocks, manifest.compatible.blocks)) {
    throw new PackageVerifyError(
      PACKAGE_ERROR_CODES.COMPAT_RANGE,
      `blocks ${platform.blocks} does not satisfy ${manifest.compatible.blocks}`,
    );
  }
}

export function satisfiesRange(version: string, range: string): boolean {
  const trimmed = range.trim();
  if (trimmed === '*' || trimmed === '') return true;
  const parts = trimmed.split(/\s+/).filter(Boolean);
  return parts.every((token) => satisfiesToken(version, token));
}

function satisfiesToken(version: string, token: string): boolean {
  const m = /^(>=|<=|>|<|=)?\s*(.+)$/.exec(token);
  if (!m) return false;
  const op = m[1] || '=';
  const target = m[2];
  const cmp = compareSemver(version, target);
  switch (op) {
    case '>=':
      return cmp >= 0;
    case '<=':
      return cmp <= 0;
    case '>':
      return cmp > 0;
    case '<':
      return cmp < 0;
    case '=':
      return cmp === 0;
    default:
      return false;
  }
}

/** Compare a.b.c numeric triples; non-numeric tails ignored for fixture simplicity. */
export function compareSemver(a: string, b: string): number {
  const pa = parseSemver(a);
  const pb = parseSemver(b);
  for (let i = 0; i < 3; i++) {
    if (pa[i] > pb[i]) return 1;
    if (pa[i] < pb[i]) return -1;
  }
  return 0;
}

function parseSemver(v: string): [number, number, number] {
  const core = v.replace(/^v/, '').split('-')[0] ?? '0.0.0';
  const [maj, min, pat] = core.split('.').map((x) => Number.parseInt(x, 10) || 0);
  return [maj, min, pat];
}
