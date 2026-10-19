import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PACKAGE_ERROR_CODES, PackageVerifyError } from '../errors';
import type { StorefrontPackageManifest } from '../types';

const MANIFEST_FILE = 'aimee.storefront-package.json';

export function loadPackageManifest(
  packageRoot: string,
): StorefrontPackageManifest {
  let raw: string;
  try {
    raw = readFileSync(join(packageRoot, MANIFEST_FILE), 'utf8');
  } catch {
    throw new PackageVerifyError(
      PACKAGE_ERROR_CODES.ARTIFACT_MISSING,
      `${MANIFEST_FILE} is missing`,
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new PackageVerifyError(
      PACKAGE_ERROR_CODES.MANIFEST_INVALID,
      `${MANIFEST_FILE} is not valid JSON`,
    );
  }

  return assertManifestShape(parsed);
}

function assertManifestShape(value: unknown): StorefrontPackageManifest {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new PackageVerifyError(
      PACKAGE_ERROR_CODES.MANIFEST_INVALID,
      'manifest must be an object',
    );
  }
  const m = value as Record<string, unknown>;
  if (typeof m.name !== 'string' || !m.name) {
    throw new PackageVerifyError(
      PACKAGE_ERROR_CODES.MANIFEST_INVALID,
      'manifest.name is required',
    );
  }
  if (typeof m.version !== 'string' || !m.version) {
    throw new PackageVerifyError(
      PACKAGE_ERROR_CODES.MANIFEST_INVALID,
      'manifest.version is required',
    );
  }
  if (typeof m.runtimeContractVersion !== 'string') {
    throw new PackageVerifyError(
      PACKAGE_ERROR_CODES.MANIFEST_INVALID,
      'manifest.runtimeContractVersion is required',
    );
  }
  if (
    typeof m.compatible !== 'object' ||
    m.compatible === null ||
    typeof (m.compatible as { storefrontStarter?: unknown }).storefrontStarter !==
      'string' ||
    typeof (m.compatible as { blocks?: unknown }).blocks !== 'string'
  ) {
    throw new PackageVerifyError(
      PACKAGE_ERROR_CODES.MANIFEST_INVALID,
      'manifest.compatible ranges are required',
    );
  }
  if (!Array.isArray(m.exports) || m.exports.length === 0) {
    throw new PackageVerifyError(
      PACKAGE_ERROR_CODES.MANIFEST_INVALID,
      'manifest.exports must be a non-empty array',
    );
  }
  if (
    typeof m.budgets !== 'object' ||
    m.budgets === null ||
    typeof (m.budgets as { maxBundleBytes?: unknown }).maxBundleBytes !== 'number'
  ) {
    throw new PackageVerifyError(
      PACKAGE_ERROR_CODES.MANIFEST_INVALID,
      'manifest.budgets.maxBundleBytes is required',
    );
  }
  if (typeof m.ssrCompatible !== 'boolean') {
    throw new PackageVerifyError(
      PACKAGE_ERROR_CODES.MANIFEST_INVALID,
      'manifest.ssrCompatible is required',
    );
  }

  // `value` is still unknown. The checks above run against the same object.
  return value as StorefrontPackageManifest;
}
